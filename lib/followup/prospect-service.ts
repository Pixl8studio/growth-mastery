/**
 * Prospect Service
 *
 * Manages AI follow-up prospects: creation, updates, and tracking.
 * Handles prospect lifecycle from webinar registration through conversion.
 */

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type {
    CreateProspectInput,
    FollowupProspect,
    ProspectServiceResponse,
    UpdateProspectIntakeData,
    UpdateProspectWatchData,
} from "@/types/followup";

/**
 * Create a new follow-up prospect from webinar registration.
 *
 * Automatically determines initial segment based on watch_percentage (defaults to no_show).
 * Links to existing contact if contact_id provided, creates engagement tracking record.
 */
export async function createProspect(
    userId: string,
    input: CreateProspectInput
): Promise<ProspectServiceResponse> {
    const supabase = await createClient();

    logger.info(
        {
            userId,
            email: input.email,
            funnelProjectId: input.funnel_project_id,
        },
        "📝 Creating new follow-up prospect"
    );

    const { data, error } = await supabase
        .from("followup_prospects")
        .insert({
            user_id: userId,
            funnel_project_id: input.funnel_project_id,
            contact_id: input.contact_id || null,
            agent_config_id: input.agent_config_id || null,
            email: input.email,
            first_name: input.first_name || null,
            phone: input.phone || null,
            timezone: input.timezone || "UTC",
            locale: input.locale || "en-US",
            watch_percentage: 0,
            watch_duration_seconds: 0,
            segment: "no_show",
            intent_score: 0,
            fit_score: 0,
            combined_score: 0,
            engagement_level: "cold",
            consent_state: "implied",
            metadata: input.metadata || {},
        })
        .select()
        .single();

    if (error) {
        logger.error(
            { error, userId, email: input.email },
            "❌ Failed to create prospect"
        );

        Sentry.captureException(error, {
            tags: {
                service: "prospect",
                operation: "create_prospect",
            },
            extra: {
                userId,
                email: input.email,
                funnelProjectId: input.funnel_project_id,
            },
        });

        return { success: false, error: error.message };
    }

    logger.info(
        {
            prospectId: data.id,
            userId,
            email: input.email,
        },
        "✅ Prospect created successfully"
    );

    return { success: true, prospect: data as FollowupProspect };
}

/**
 * Update prospect watch data from video engagement.
 *
 * Automatically updates segment based on new watch_percentage.
 * Triggers intent score recalculation if enabled.
 */
export async function updateProspectWatchData(
    prospectId: string,
    watchData: UpdateProspectWatchData
): Promise<ProspectServiceResponse> {
    const supabase = await createClient();

    logger.info(
        {
            prospectId,
            watchPercentage: watchData.watch_percentage,
            durationSeconds: watchData.watch_duration_seconds,
        },
        "📊 Updating prospect watch data"
    );

    const { data, error } = await supabase
        .from("followup_prospects")
        .update({
            watch_percentage: watchData.watch_percentage,
            watch_duration_seconds: watchData.watch_duration_seconds,
            last_watched_at: watchData.last_watched_at,
            replay_count: watchData.replay_count || 0,
        })
        .eq("id", prospectId)
        .select()
        .single();

    if (error) {
        logger.error({ error, prospectId }, "❌ Failed to update watch data");

        Sentry.captureException(error, {
            tags: {
                service: "prospect",
                operation: "update_watch_data",
            },
            extra: {
                prospectId,
                watchPercentage: watchData.watch_percentage,
            },
        });

        return { success: false, error: error.message };
    }

    logger.info(
        {
            prospectId,
            newSegment: data.segment,
            watchPercentage: data.watch_percentage,
        },
        "✅ Watch data updated successfully"
    );

    return { success: true, prospect: data as FollowupProspect };
}

/**
 * Update prospect intake data from conversational forms.
 *
 * Stores challenge/goal notes and detected objection hints.
 * Used for personalizing follow-up messages.
 */
export async function updateProspectIntakeData(
    prospectId: string,
    intakeData: UpdateProspectIntakeData
): Promise<ProspectServiceResponse> {
    const supabase = await createClient();

    logger.info(
        { prospectId, hasChallenge: !!intakeData.challenge_notes },
        "📝 Updating prospect intake data"
    );

    const { data, error } = await supabase
        .from("followup_prospects")
        .update({
            challenge_notes: intakeData.challenge_notes || null,
            goal_notes: intakeData.goal_notes || null,
            objection_hints: intakeData.objection_hints || null,
        })
        .eq("id", prospectId)
        .select()
        .single();

    if (error) {
        logger.error({ error, prospectId }, "❌ Failed to update intake data");

        Sentry.captureException(error, {
            tags: {
                service: "prospect",
                operation: "update_intake_data",
            },
            extra: {
                prospectId,
            },
        });

        return { success: false, error: error.message };
    }

    logger.info({ prospectId }, "✅ Intake data updated successfully");

    return { success: true, prospect: data as FollowupProspect };
}

/**
 * Increment offer clicks for a prospect.
 *
 * Tracks when prospects click on offer CTAs during webinar.
 * Contributes to intent scoring.
 */
export async function incrementOfferClicks(
    prospectId: string
): Promise<ProspectServiceResponse> {
    const supabase = await createClient();

    logger.info({ prospectId }, "🎯 Incrementing offer clicks");

    const { data, error } = await supabase.rpc("increment_offer_clicks", {
        p_prospect_id: prospectId,
    });

    if (error) {
        // If RPC doesn't exist, do it manually
        const { data: prospect, error: fetchError } = await supabase
            .from("followup_prospects")
            .select("offer_clicks")
            .eq("id", prospectId)
            .single();

        if (fetchError) {
            logger.error(
                { error: fetchError, prospectId },
                "❌ Failed to fetch prospect for click increment"
            );
            return { success: false, error: fetchError.message };
        }

        const { data: updated, error: updateError } = await supabase
            .from("followup_prospects")
            .update({ offer_clicks: (prospect?.offer_clicks || 0) + 1 })
            .eq("id", prospectId)
            .select()
            .single();

        if (updateError) {
            logger.error(
                { error: updateError, prospectId },
                "❌ Failed to increment offer clicks"
            );
            return { success: false, error: updateError.message };
        }

        logger.info(
            { prospectId, newCount: updated.offer_clicks },
            "✅ Offer clicks incremented"
        );
        return { success: true, prospect: updated as FollowupProspect };
    }

    return { success: true, prospect: data as FollowupProspect };
}

/**
 * Mark prospect as converted.
 *
 * Records conversion event, timestamp, and optionally conversion value.
 * Stops all pending follow-up sequences.
 */
export async function markProspectConverted(
    prospectId: string,
    conversionValue?: number
): Promise<ProspectServiceResponse> {
    const supabase = await createClient();

    logger.info({ prospectId, conversionValue }, "💰 Marking prospect as converted");

    const { data, error } = await supabase
        .from("followup_prospects")
        .update({
            converted: true,
            converted_at: new Date().toISOString(),
            conversion_value: conversionValue || null,
            next_scheduled_touch: null,
        })
        .eq("id", prospectId)
        .select()
        .single();

    if (error) {
        logger.error({ error, prospectId }, "❌ Failed to mark prospect as converted");

        Sentry.captureException(error, {
            tags: {
                service: "prospect",
                operation: "mark_converted",
            },
            extra: {
                prospectId,
                conversionValue,
            },
        });

        return { success: false, error: error.message };
    }

    // Cancel any pending deliveries
    await supabase
        .from("followup_deliveries")
        .update({
            delivery_status: "failed",
            error_message: "Prospect converted - sequence stopped",
        })
        .eq("prospect_id", prospectId)
        .eq("delivery_status", "pending");

    logger.info(
        { prospectId },
        "✅ Prospect marked as converted, pending deliveries cancelled"
    );

    return { success: true, prospect: data as FollowupProspect };
}

/**
 * Handle prospect opt-out.
 *
 * Records opt-out timestamp and reason.
 * Triggers automatic cancellation of pending deliveries.
 */
export async function optOutProspect(
    prospectId: string,
    reason?: string
): Promise<ProspectServiceResponse> {
    const supabase = await createClient();

    logger.info({ prospectId, reason }, "🚫 Processing prospect opt-out");

    const { data, error } = await supabase
        .from("followup_prospects")
        .update({
            consent_state: "opted_out",
            opted_out_at: new Date().toISOString(),
            opt_out_reason: reason || "User requested",
            next_scheduled_touch: null,
        })
        .eq("id", prospectId)
        .select()
        .single();

    if (error) {
        logger.error({ error, prospectId }, "❌ Failed to process opt-out");

        Sentry.captureException(error, {
            tags: {
                service: "prospect",
                operation: "opt_out",
            },
            extra: {
                prospectId,
                reason,
            },
        });

        return { success: false, error: error.message };
    }

    logger.info({ prospectId }, "✅ Prospect opted out successfully");

    return { success: true, prospect: data as FollowupProspect };
}

/**
 * Get prospect by ID.
 */
export async function getProspect(
    prospectId: string
): Promise<ProspectServiceResponse> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("followup_prospects")
        .select("*")
        .eq("id", prospectId)
        .single();

    if (error) {
        logger.error({ error, prospectId }, "❌ Failed to fetch prospect");
        return { success: false, error: error.message };
    }

    return { success: true, prospect: data as FollowupProspect };
}

/**
 * Get prospect by email and funnel project.
 */
export async function getProspectByEmail(
    email: string,
    funnelProjectId: string
): Promise<ProspectServiceResponse> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("followup_prospects")
        .select("*")
        .eq("email", email)
        .eq("funnel_project_id", funnelProjectId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            // Not found is not an error
            return { success: true };
        }
        logger.error(
            { error, email, funnelProjectId },
            "❌ Failed to fetch prospect by email"
        );
        return { success: false, error: error.message };
    }

    return { success: true, prospect: data as FollowupProspect };
}

/**
 * List prospects for a funnel project with optional filtering.
 */
export async function listProspects(
    userId: string,
    funnelProjectId: string,
    filters?: {
        segment?: string;
        min_intent_score?: number;
        converted?: boolean;
    }
): Promise<{ success: boolean; prospects?: FollowupProspect[]; error?: string }> {
    const supabase = await createClient();

    let query = supabase
        .from("followup_prospects")
        .select("*")
        .eq("user_id", userId)
        .eq("funnel_project_id", funnelProjectId)
        .order("created_at", { ascending: false });

    if (filters?.segment) {
        query = query.eq("segment", filters.segment);
    }

    if (filters?.min_intent_score !== undefined) {
        query = query.gte("intent_score", filters.min_intent_score);
    }

    if (filters?.converted !== undefined) {
        query = query.eq("converted", filters.converted);
    }

    const { data, error } = await query;

    if (error) {
        logger.error({ error, userId, funnelProjectId }, "❌ Failed to list prospects");
        return { success: false, error: error.message };
    }

    return { success: true, prospects: data as FollowupProspect[] };
}
