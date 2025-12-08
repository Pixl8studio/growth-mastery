/**
 * Follow-Up Sequence Generation API
 *
 * Generates AI-powered follow-up message templates based on deck content and offer.
 * POST /api/followup/sequences/generate
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateFollowupTemplates } from "@/lib/followup/template-generator-service";
import type { FollowupSegment } from "@/types/followup";

export const dynamic = "force-dynamic";

/**
 * Generate follow-up sequence templates
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    try {
        // Authenticate user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            logger.warn(
                { error: authError },
                "Unauthorized sequence generation request"
            );
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse request body
        const body = await request.json();
        const {
            funnel_project_id,
            offer_id,
            agent_config_id,
            segment,
            use_defaults,
        }: {
            funnel_project_id: string;
            offer_id: string;
            agent_config_id?: string;
            segment?: FollowupSegment;
            use_defaults?: boolean;
        } = body;

        // Validate required fields
        if (!funnel_project_id || !offer_id) {
            return NextResponse.json(
                { error: "Missing required fields: funnel_project_id and offer_id" },
                { status: 400 }
            );
        }

        // Verify user has access to the funnel project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id, user_id")
            .eq("id", funnel_project_id)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            logger.warn(
                {
                    error: projectError,
                    userId: user.id,
                    funnelProjectId: funnel_project_id,
                },
                "User does not have access to funnel project"
            );
            return NextResponse.json(
                { error: "Funnel project not found or access denied" },
                { status: 404 }
            );
        }

        // Verify offer exists and belongs to user
        const { data: offer, error: offerError } = await supabase
            .from("offers")
            .select("id, user_id")
            .eq("id", offer_id)
            .eq("user_id", user.id)
            .single();

        if (offerError || !offer) {
            logger.warn(
                { error: offerError, userId: user.id, offerId: offer_id },
                "User does not have access to offer"
            );
            return NextResponse.json(
                { error: "Offer not found or access denied" },
                { status: 404 }
            );
        }

        logger.info(
            {
                userId: user.id,
                funnelProjectId: funnel_project_id,
                offerId: offer_id,
                segment,
                useDefaults: use_defaults,
            },
            "🎨 Starting template generation"
        );

        // Generate templates
        const result = await generateFollowupTemplates(user.id, {
            funnel_project_id,
            offer_id,
            agent_config_id,
            segment,
            use_defaults,
        });

        if (!result.success) {
            logger.error(
                { error: result.error, userId: user.id },
                "❌ Template generation failed"
            );
            return NextResponse.json(
                { error: result.error || "Template generation failed" },
                { status: 500 }
            );
        }

        logger.info(
            {
                userId: user.id,
                sequenceId: result.sequence_id,
                messageCount: result.message_ids?.length,
                method: result.generation_method,
            },
            "✅ Templates generated successfully"
        );

        return NextResponse.json({
            success: true,
            sequence_id: result.sequence_id,
            message_ids: result.message_ids,
            generation_method: result.generation_method,
            message_count: result.message_ids?.length || 0,
        });
    } catch (error) {
        logger.error({ error }, "❌ Unexpected error in template generation");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate_sequence_templates",
                endpoint: "POST /api/followup/sequences/generate",
            },
        });

        return NextResponse.json(
            {
                error: "Internal server error during template generation",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
