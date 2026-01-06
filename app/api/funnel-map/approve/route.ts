/**
 * Funnel Map Node Approval API
 * POST /api/funnel-map/approve
 *
 * Explicitly approve a node's content, enabling downstream step integration.
 * Issue #407 - Priority 2: Explicit Approval Workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/middleware/rate-limit";
import type { FunnelNodeType } from "@/types/funnel-map";
import { getNodeDefinition, getEffectiveContent } from "@/types/funnel-map";

const approveRequestSchema = z.object({
    projectId: z.string().uuid(),
    nodeType: z.string() as z.ZodType<FunnelNodeType>,
});

export async function POST(request: NextRequest) {
    const requestId = crypto.randomUUID();
    const requestLogger = logger.child({ requestId, route: "funnel-map/approve" });

    try {
        // Parse request first to get user for rate limiting
        const body = await request.json();
        const parseResult = approveRequestSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parseResult.error.issues },
                { status: 400 }
            );
        }

        const { projectId, nodeType } = parseResult.data;

        // Create Supabase client using shared helper
        const supabase = await createClient();

        // Verify authentication
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        // Rate limiting - use funnel-chat endpoint (lighter weight operations)
        const rateLimitIdentifier = getRateLimitIdentifier(request, user.id);
        const rateLimitResponse = await checkRateLimit(
            rateLimitIdentifier,
            "funnel-chat"
        );
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        requestLogger.info({ userId: user.id, projectId, nodeType }, "Approving node");

        // Fetch the node data to validate content before approval
        const { data: nodeData, error: fetchError } = await supabase
            .from("funnel_node_data")
            .select("*")
            .eq("funnel_project_id", projectId)
            .eq("node_type", nodeType)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !nodeData) {
            requestLogger.warn({ projectId, nodeType }, "Node not found");
            return NextResponse.json({ error: "Node not found" }, { status: 404 });
        }

        // Check if already approved
        if (nodeData.is_approved) {
            return NextResponse.json({
                success: true,
                message: "Node already approved",
                approvedAt: nodeData.approved_at,
            });
        }

        // Get the content to approve using shared helper
        const contentToApprove = getEffectiveContent({
            draft_content: nodeData.draft_content,
            refined_content: nodeData.refined_content,
            approved_content: nodeData.approved_content,
        });

        // Validate required fields are present before approval
        const nodeDef = getNodeDefinition(nodeType);
        if (nodeDef) {
            const requiredFields = nodeDef.fields.filter((f) => f.required);
            const missingFields = requiredFields.filter((f) => {
                const value = (contentToApprove as Record<string, unknown>)[f.key];
                return value === undefined || value === null || value === "";
            });

            if (missingFields.length > 0) {
                return NextResponse.json(
                    {
                        error: "Cannot approve incomplete content",
                        missingFields: missingFields.map((f) => f.label),
                    },
                    { status: 400 }
                );
            }
        }

        // Use atomic database function to approve node and update counts
        // This prevents race conditions and ensures transaction safety
        const { data: approvalResult, error: approvalError } = await supabase.rpc(
            "approve_funnel_node",
            {
                p_project_id: projectId,
                p_node_type: nodeType,
                p_user_id: user.id,
                p_content_to_approve: contentToApprove,
            }
        );

        if (approvalError) {
            requestLogger.error({ error: approvalError }, "Failed to approve node");
            Sentry.captureException(approvalError, {
                tags: { action: "approve_node" },
                extra: { projectId, nodeType },
            });
            return NextResponse.json(
                { error: "Failed to approve node" },
                { status: 500 }
            );
        }

        // The RPC returns an array with one row
        const result = Array.isArray(approvalResult)
            ? approvalResult[0]
            : approvalResult;

        if (!result?.success) {
            return NextResponse.json(
                { error: result?.error_message || "Failed to approve node" },
                { status: 500 }
            );
        }

        requestLogger.info(
            {
                projectId,
                nodeType,
                approvedCount: result.approved_count,
                totalCount: result.total_count,
            },
            "Node approved successfully"
        );

        return NextResponse.json({
            success: true,
            approvedAt: result.approved_at,
            approvedContent: contentToApprove,
            progress: {
                approved: result.approved_count,
                total: result.total_count,
                allApproved: result.all_approved,
            },
        });
    } catch (error) {
        requestLogger.error({ error }, "Unexpected error in approval");
        Sentry.captureException(error, {
            tags: { route: "funnel-map/approve" },
        });
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
