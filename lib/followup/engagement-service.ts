/**
 * Engagement Service
 *
 * Tracks prospect engagement events and triggers intent score updates.
 * Captures video watching, email opens, link clicks, and conversions.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { recalculateIntentScore } from "./scoring-service";
import type {
    EngagementServiceResponse,
    FollowupEvent,
    TrackEngagementInput,
} from "@/types/followup";

/**
 * Track an engagement event for a prospect.
 *
 * Records the event and triggers intent score recalculation.
 * Returns the created event and updated score information.
 */
export async function trackEngagement(
    input: TrackEngagementInput
): Promise<EngagementServiceResponse> {
    const supabase = await createClient();

    logger.info(
        {
            prospectId: input.prospect_id,
            eventType: input.event_type,
            eventSubtype: input.event_subtype,
        },
        "📊 Tracking engagement event"
    );

    // Insert the event
    const { data: event, error: eventError } = await supabase
        .from("followup_events")
        .insert({
            prospect_id: input.prospect_id,
            delivery_id: input.event_data?.delivery_id || null,
            event_type: input.event_type,
            event_subtype: input.event_subtype || null,
            event_data: input.event_data || {},
            user_agent: input.user_agent || null,
            ip_address: input.ip_address || null,
        })
        .select()
        .single();

    if (eventError) {
        logger.error(
            { error: eventError, prospectId: input.prospect_id },
            "❌ Failed to track engagement event"
        );
        return { success: false, error: eventError.message };
    }

    logger.info(
        {
            prospectId: input.prospect_id,
            eventType: input.event_type,
            eventId: event.id,
        },
        "✅ Engagement event tracked"
    );

    // Recalculate intent score if event affects scoring
    const scoringEvents = [
        "video_watch",
        "video_replay",
        "offer_click",
        "email_open",
        "link_click",
        "reply",
    ];

    if (scoringEvents.includes(input.event_type)) {
        logger.info(
            { prospectId: input.prospect_id },
            "🔄 Triggering intent score recalculation"
        );

        const scoreResult = await recalculateIntentScore(
            input.prospect_id,
            input.event_type
        );

        if (scoreResult.success) {
            return {
                success: true,
                event: event as FollowupEvent,
                score_updated: true,
                new_score: scoreResult.combined_score,
            };
        }

        logger.warn(
            { prospectId: input.prospect_id },
            "⚠️  Score recalculation failed, but event tracked"
        );
    }

    return {
        success: true,
        event: event as FollowupEvent,
        score_updated: false,
    };
}

/**
 * Track video watch progress.
 *
 * Updates both prospect watch data and creates engagement event.
 * Percentage should be 0-100 integer.
 */
export async function trackVideoWatch(
    prospectId: string,
    watchPercentage: number,
    durationSeconds: number,
    userAgent?: string,
    ipAddress?: string
): Promise<EngagementServiceResponse> {
    const supabase = await createClient();

    logger.info(
        {
            prospectId,
            watchPercentage,
            durationSeconds,
        },
        "📹 Tracking video watch progress"
    );

    // Get current prospect data
    const { data: prospect, error: fetchError } = await supabase
        .from("followup_prospects")
        .select("watch_percentage, watch_duration_seconds, replay_count")
        .eq("id", prospectId)
        .single();

    if (fetchError) {
        logger.error(
            { error: fetchError, prospectId },
            "❌ Failed to fetch prospect for watch tracking"
        );
        return { success: false, error: fetchError.message };
    }

    // Determine if this is a replay (watch % going down or restarting)
    const isReplay = prospect && watchPercentage < prospect.watch_percentage;
    const newReplayCount = isReplay
        ? (prospect.replay_count || 0) + 1
        : prospect?.replay_count || 0;

    // Update watch data
    const { error: updateError } = await supabase
        .from("followup_prospects")
        .update({
            watch_percentage: watchPercentage,
            watch_duration_seconds: durationSeconds,
            last_watched_at: new Date().toISOString(),
            replay_count: newReplayCount,
        })
        .eq("id", prospectId);

    if (updateError) {
        logger.error(
            { error: updateError, prospectId },
            "❌ Failed to update watch data"
        );
        return { success: false, error: updateError.message };
    }

    // Track the engagement event
    const eventType = isReplay ? "video_replay" : "video_watch";
    const engagementResult = await trackEngagement({
        prospect_id: prospectId,
        event_type: eventType,
        event_data: {
            watch_percentage: watchPercentage,
            duration_seconds: durationSeconds,
            is_replay: isReplay,
        },
        user_agent: userAgent,
        ip_address: ipAddress,
    });

    return engagementResult;
}

/**
 * Track offer CTA click.
 *
 * Increments offer click count and creates engagement event.
 * High signal for purchase intent.
 */
export async function trackOfferClick(
    prospectId: string,
    offerId?: string,
    ctaText?: string,
    userAgent?: string,
    ipAddress?: string
): Promise<EngagementServiceResponse> {
    const supabase = await createClient();

    logger.info({ prospectId, offerId }, "🎯 Tracking offer click");

    // Get current offer clicks
    const { data: prospect, error: fetchError } = await supabase
        .from("followup_prospects")
        .select("offer_clicks")
        .eq("id", prospectId)
        .single();

    if (fetchError) {
        logger.error(
            { error: fetchError, prospectId },
            "❌ Failed to fetch prospect for offer click"
        );
        return { success: false, error: fetchError.message };
    }

    // Increment offer clicks
    const { error: updateError } = await supabase
        .from("followup_prospects")
        .update({ offer_clicks: (prospect?.offer_clicks || 0) + 1 })
        .eq("id", prospectId);

    if (updateError) {
        logger.error(
            { error: updateError, prospectId },
            "❌ Failed to increment offer clicks"
        );
        return { success: false, error: updateError.message };
    }

    // Track the engagement event
    return await trackEngagement({
        prospect_id: prospectId,
        event_type: "offer_click",
        event_data: {
            offer_id: offerId,
            cta_text: ctaText,
            click_count: (prospect?.offer_clicks || 0) + 1,
        },
        user_agent: userAgent,
        ip_address: ipAddress,
    });
}

/**
 * Get engagement summary for a prospect.
 *
 * Aggregates all engagement metrics using the database function.
 */
export async function getEngagementSummary(prospectId: string): Promise<{
    success: boolean;
    summary?: Record<string, unknown>;
    error?: string;
}> {
    const supabase = await createClient();

    logger.info({ prospectId }, "📊 Fetching engagement summary");

    const { data, error } = await supabase.rpc("get_prospect_engagement_summary", {
        p_prospect_id: prospectId,
    });

    if (error) {
        logger.error({ error, prospectId }, "❌ Failed to get engagement summary");
        return { success: false, error: error.message };
    }

    return { success: true, summary: data };
}

/**
 * Get recent events for a prospect.
 */
export async function getProspectEvents(
    prospectId: string,
    limit: number = 50
): Promise<{
    success: boolean;
    events?: FollowupEvent[];
    error?: string;
}> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("followup_events")
        .select("*")
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        logger.error({ error, prospectId }, "❌ Failed to fetch prospect events");
        return { success: false, error: error.message };
    }

    return { success: true, events: data as FollowupEvent[] };
}
