/**
 * Create Brief from Trend API
 * Create a content brief from a trending topic
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, NotFoundError } from "@/lib/errors";
import { markTrendUsed } from "@/lib/marketing/trend-scanner-service";

type RouteContext = {
    params: Promise<{ trendId: string }>;
};

/**
 * POST /api/marketing/trends/[trendId]/brief
 * Create a content brief from a trend
 */
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { trendId } = await context.params;
        const body = await request.json();

        // Get trend
        const { data: trend, error: trendError } = await supabase
            .from("marketing_trend_signals")
            .select("*")
            .eq("id", trendId)
            .single();

        if (trendError || !trend) {
            throw new NotFoundError("Trend");
        }

        // Get suggested angle from body or use default
        const suggestedAngles = trend.suggested_angles as any;
        const selectedAngle = body.selected_angle || "founder_perspective";
        const angleContent = suggestedAngles[selectedAngle] || trend.topic;

        // Create brief from trend
        const { data: brief, error: briefError } = await supabase
            .from("marketing_content_briefs")
            .insert({
                user_id: user.id,
                funnel_project_id: body.funnel_project_id || null,
                marketing_profile_id: body.marketing_profile_id || null,
                name: `Trend: ${trend.topic}`,
                goal: body.goal || "drive_registrations",
                topic: trend.topic,
                icp_description: body.icp_description || null,
                tone_constraints: body.tone_constraints || null,
                transformation_focus: angleContent,
                target_platforms: body.target_platforms || [
                    "instagram",
                    "facebook",
                    "linkedin",
                    "twitter",
                ],
                preferred_framework: body.preferred_framework || "current_event",
                funnel_entry_point: body.funnel_entry_point || "step_1_registration",
                space: body.space || "sandbox",
                status: "draft",
                metadata: {
                    from_trend_id: trendId,
                    trend_topic: trend.topic,
                    selected_angle: selectedAngle,
                },
            })
            .select()
            .single();

        if (briefError || !brief) {
            logger.error({ briefError, trendId }, "Failed to create brief from trend");
            return NextResponse.json(
                { error: "Failed to create brief" },
                { status: 500 }
            );
        }

        // Mark trend as used
        await markTrendUsed(trendId);

        logger.info(
            { briefId: brief.id, trendId, userId: user.id },
            "Brief created from trend"
        );

        return NextResponse.json({
            success: true,
            brief,
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/marketing/trends/[trendId]/brief");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/marketing/trends/[trendId]/brief",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
