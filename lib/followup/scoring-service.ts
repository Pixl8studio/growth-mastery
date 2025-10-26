/**
 * Scoring Service
 *
 * Calculates and updates prospect intent scores based on engagement data.
 * Uses the database calculate_intent_score function for consistency.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type {
    ScoringServiceResponse,
    CalculateIntentScoreInput,
} from "@/types/followup";

/**
 * Calculate intent score using engagement factors.
 *
 * Uses the PostgreSQL function for consistency with database logic.
 * Returns intent score, fit score, combined score, and engagement level.
 */
export async function calculateIntentScore(
    input: CalculateIntentScoreInput
): Promise<ScoringServiceResponse> {
    const supabase = await createClient();

    logger.info(
        {
            watchPercentage: input.watch_percentage,
            replayCount: input.replay_count,
            offerClicks: input.offer_clicks,
        },
        "🧮 Calculating intent score"
    );

    const { data, error } = await supabase.rpc("calculate_intent_score", {
        p_watch_percentage: input.watch_percentage,
        p_replay_count: input.replay_count,
        p_offer_clicks: input.offer_clicks,
        p_email_opens: input.email_opens,
        p_email_clicks: input.email_clicks,
        p_response_speed_hours: input.response_speed_hours,
    });

    if (error) {
        logger.error({ error, input }, "❌ Failed to calculate intent score");

        // Fallback to manual calculation
        const intentScore = calculateIntentScoreManually(input);
        const fitScore = 50; // Default fit score
        const combinedScore = Math.round(intentScore * 0.7 + fitScore * 0.3);

        return {
            success: true,
            intent_score: intentScore,
            fit_score: fitScore,
            combined_score: combinedScore,
            factors: extractScoreFactors(input, intentScore),
            segment: determineSegment(input.watch_percentage),
            engagement_level: determineEngagementLevel(combinedScore),
        };
    }

    const intentScore = data as number;
    const fitScore = 50; // Default - will be enhanced later
    const combinedScore = Math.round(intentScore * 0.7 + fitScore * 0.3);

    return {
        success: true,
        intent_score: intentScore,
        fit_score: fitScore,
        combined_score: combinedScore,
        factors: extractScoreFactors(input, intentScore),
        segment: determineSegment(input.watch_percentage),
        engagement_level: determineEngagementLevel(combinedScore),
    };
}

/**
 * Recalculate and update intent score for a prospect.
 *
 * Fetches current prospect data, recalculates score, updates prospect record,
 * and records score history.
 */
export async function recalculateIntentScore(
    prospectId: string,
    changeReason: string
): Promise<ScoringServiceResponse> {
    const supabase = await createClient();

    logger.info({ prospectId, changeReason }, "🔄 Recalculating intent score");

    // Fetch current prospect data
    const { data: prospect, error: fetchError } = await supabase
        .from("followup_prospects")
        .select("*")
        .eq("id", prospectId)
        .single();

    if (fetchError) {
        logger.error(
            { error: fetchError, prospectId },
            "❌ Failed to fetch prospect for score calculation"
        );
        return {
            success: false,
            intent_score: 0,
            fit_score: 0,
            combined_score: 0,
            factors: {
                watch_percentage_contribution: 0,
                replay_count_contribution: 0,
                cta_clicks_contribution: 0,
                email_engagement_contribution: 0,
                response_speed_contribution: 0,
            },
            segment: "no_show",
            engagement_level: "cold",
        };
    }

    // Get email engagement stats
    const { data: deliveries } = await supabase
        .from("followup_deliveries")
        .select("opened_at, total_clicks, replied_at, created_at")
        .eq("prospect_id", prospectId);

    const emailOpens = deliveries?.filter((d) => d.opened_at).length || 0;
    const emailClicks =
        deliveries?.reduce((sum, d) => sum + (d.total_clicks || 0), 0) || 0;

    // Calculate response speed (hours from first touch to first reply)
    const firstReply = deliveries?.find((d) => d.replied_at);
    const firstTouch = deliveries?.[deliveries.length - 1];
    let responseSpeedHours = 999; // Default high value

    if (firstReply && firstTouch) {
        const replyTime = new Date(firstReply.replied_at!).getTime();
        const touchTime = new Date(firstTouch.created_at).getTime();
        responseSpeedHours = Math.round((replyTime - touchTime) / (1000 * 60 * 60));
    }

    // Calculate new scores
    const scoreResult = await calculateIntentScore({
        watch_percentage: prospect.watch_percentage,
        replay_count: prospect.replay_count,
        offer_clicks: prospect.offer_clicks,
        email_opens: emailOpens,
        email_clicks: emailClicks,
        response_speed_hours: responseSpeedHours,
    });

    if (!scoreResult.success) {
        return scoreResult;
    }

    // Update prospect with new scores
    const { error: updateError } = await supabase
        .from("followup_prospects")
        .update({
            intent_score: scoreResult.intent_score,
            fit_score: scoreResult.fit_score,
            combined_score: scoreResult.combined_score,
            engagement_level: scoreResult.engagement_level,
        })
        .eq("id", prospectId);

    if (updateError) {
        logger.error(
            { error: updateError, prospectId },
            "❌ Failed to update prospect scores"
        );
        return scoreResult; // Return calculated scores even if update failed
    }

    // Record score history
    const { error: historyError } = await supabase
        .from("followup_intent_scores")
        .insert({
            prospect_id: prospectId,
            intent_score: scoreResult.intent_score,
            fit_score: scoreResult.fit_score,
            combined_score: scoreResult.combined_score,
            score_factors: scoreResult.factors,
            change_reason: changeReason,
            change_delta: scoreResult.combined_score - prospect.combined_score,
        });

    if (historyError) {
        logger.warn(
            { error: historyError, prospectId },
            "⚠️  Failed to record score history"
        );
    }

    logger.info(
        {
            prospectId,
            oldScore: prospect.combined_score,
            newScore: scoreResult.combined_score,
            delta: scoreResult.combined_score - prospect.combined_score,
        },
        "✅ Intent score recalculated"
    );

    return scoreResult;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Manual intent score calculation (fallback if database function fails).
 */
function calculateIntentScoreManually(input: CalculateIntentScoreInput): number {
    // Watch percentage contribution (40 points max)
    const watchScore = Math.min(40, (input.watch_percentage * 40) / 100);

    // Replay count contribution (10 points max)
    const replayScore = Math.min(10, input.replay_count * 5);

    // CTA clicks contribution (20 points max)
    const ctaScore = Math.min(20, input.offer_clicks * 10);

    // Email engagement contribution (15 points max)
    const emailScore = Math.min(15, input.email_opens * 5 + input.email_clicks * 10);

    // Response speed contribution (15 points max)
    let speedScore = 0;
    if (input.response_speed_hours <= 1) speedScore = 15;
    else if (input.response_speed_hours <= 6) speedScore = 12;
    else if (input.response_speed_hours <= 24) speedScore = 8;
    else if (input.response_speed_hours <= 48) speedScore = 4;

    const totalScore = watchScore + replayScore + ctaScore + emailScore + speedScore;

    return Math.min(100, Math.round(totalScore));
}

/**
 * Extract score factors for transparency.
 */
function extractScoreFactors(input: CalculateIntentScoreInput, totalScore: number) {
    return {
        watch_percentage_contribution: Math.min(
            40,
            (input.watch_percentage * 40) / 100
        ),
        replay_count_contribution: Math.min(10, input.replay_count * 5),
        cta_clicks_contribution: Math.min(20, input.offer_clicks * 10),
        email_engagement_contribution: Math.min(
            15,
            input.email_opens * 5 + input.email_clicks * 10
        ),
        response_speed_contribution:
            totalScore -
            Math.min(
                85,
                Math.round(
                    Math.min(40, (input.watch_percentage * 40) / 100) +
                        Math.min(10, input.replay_count * 5) +
                        Math.min(20, input.offer_clicks * 10) +
                        Math.min(15, input.email_opens * 5 + input.email_clicks * 10)
                )
            ),
    };
}

/**
 * Determine segment based on watch percentage.
 */
function determineSegment(
    watchPercentage: number
): "no_show" | "skimmer" | "sampler" | "engaged" | "hot" {
    if (watchPercentage === 0) return "no_show";
    if (watchPercentage <= 24) return "skimmer";
    if (watchPercentage <= 49) return "sampler";
    if (watchPercentage <= 89) return "engaged";
    return "hot";
}

/**
 * Determine engagement level based on combined score.
 */
function determineEngagementLevel(combinedScore: number): "cold" | "warm" | "hot" {
    if (combinedScore >= 70) return "hot";
    if (combinedScore >= 40) return "warm";
    return "cold";
}
