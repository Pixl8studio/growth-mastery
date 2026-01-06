/**
 * Funnel Map Node Approval API
 * POST /api/funnel-map/approve
 *
 * Explicitly approve a node's content, enabling downstream step integration.
 * Issue #407 - Priority 2: Explicit Approval Workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/middleware/rate-limit";
import type { FunnelNodeType } from "@/types/funnel-map";

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

        // Create Supabase client
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    },
                },
            }
        );

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

        // Fetch the node data
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

        // Get the content to approve (prefer refined, fall back to draft)
        const contentToApprove =
            Object.keys(nodeData.refined_content || {}).length > 0
                ? nodeData.refined_content
                : nodeData.draft_content;

        // Update node with approval
        const { error: updateError } = await supabase
            .from("funnel_node_data")
            .update({
                is_approved: true,
                approved_at: new Date().toISOString(),
                approved_content: contentToApprove,
                status: "completed",
            })
            .eq("id", nodeData.id);

        if (updateError) {
            requestLogger.error({ error: updateError }, "Failed to approve node");
            Sentry.captureException(updateError, {
                tags: { action: "approve_node" },
                extra: { projectId, nodeType },
            });
            return NextResponse.json(
                { error: "Failed to approve node" },
                { status: 500 }
            );
        }

        // Update funnel map config approval count
        const { data: allNodes } = await supabase
            .from("funnel_node_data")
            .select("is_approved")
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id);

        const approvedCount = (allNodes || []).filter((n) => n.is_approved).length + 1;
        const totalCount = (allNodes || []).length;

        await supabase
            .from("funnel_map_config")
            .update({
                nodes_approved_count: approvedCount,
                total_nodes_count: totalCount,
                all_nodes_approved: approvedCount >= totalCount,
            })
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id);

        requestLogger.info(
            { projectId, nodeType, approvedCount, totalCount },
            "Node approved successfully"
        );

        return NextResponse.json({
            success: true,
            approvedAt: new Date().toISOString(),
            approvedContent: contentToApprove,
            progress: {
                approved: approvedCount,
                total: totalCount,
                allApproved: approvedCount >= totalCount,
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
