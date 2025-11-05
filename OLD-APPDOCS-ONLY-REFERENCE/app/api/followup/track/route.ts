/**
 * Engagement Tracking API Endpoint
 *
 * Tracks prospect engagement events from public pages.
 * Supports video watching, offer clicks, email opens, and link clicks.
 * Public endpoint - no authentication required for tracking.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import {
    trackEngagement,
    trackVideoWatch,
    trackOfferClick,
} from "@/lib/followup/engagement-service";
import type { TrackEngagementInput } from "@/types/followup";

/**
 * POST /api/followup/track
 *
 * Track an engagement event for a prospect.
 * Public endpoint for tracking from watch pages, emails, etc.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.prospect_id) {
            throw new ValidationError("prospect_id is required");
        }

        if (!body.event_type) {
            throw new ValidationError("event_type is required");
        }

        // Get user agent and IP from request
        const userAgent = request.headers.get("user-agent") || undefined;
        const ipAddress =
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            undefined;

        // Handle specific event types with specialized tracking
        if (body.event_type === "video_watch" && body.watch_data) {
            const result = await trackVideoWatch(
                body.prospect_id,
                body.watch_data.watch_percentage,
                body.watch_data.duration_seconds,
                userAgent,
                ipAddress
            );

            if (!result.success) {
                logger.error(
                    { error: result.error, prospectId: body.prospect_id },
                    "❌ Video watch tracking failed"
                );
                return NextResponse.json({ error: result.error }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                event: result.event,
                score_updated: result.score_updated,
                new_score: result.new_score,
            });
        }

        if (body.event_type === "offer_click") {
            const result = await trackOfferClick(
                body.prospect_id,
                body.offer_id,
                body.cta_text,
                userAgent,
                ipAddress
            );

            if (!result.success) {
                logger.error(
                    { error: result.error, prospectId: body.prospect_id },
                    "❌ Offer click tracking failed"
                );
                return NextResponse.json({ error: result.error }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                event: result.event,
                score_updated: result.score_updated,
                new_score: result.new_score,
            });
        }

        // Generic event tracking
        const trackInput: TrackEngagementInput = {
            prospect_id: body.prospect_id,
            event_type: body.event_type,
            event_subtype: body.event_subtype,
            event_data: body.event_data || {},
            user_agent: userAgent,
            ip_address: ipAddress,
        };

        const result = await trackEngagement(trackInput);

        if (!result.success) {
            logger.error(
                { error: result.error, prospectId: body.prospect_id },
                "❌ Engagement tracking failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            {
                prospectId: body.prospect_id,
                eventType: body.event_type,
                scoreUpdated: result.score_updated,
            },
            "✅ Engagement tracked via API"
        );

        return NextResponse.json({
            success: true,
            event: result.event,
            score_updated: result.score_updated,
            new_score: result.new_score,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in POST /api/followup/track");

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
