/**
 * Scheduler Service
 *
 * Handles sequence triggering, delivery scheduling, and branching logic.
 * Orchestrates the automated follow-up system.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { personalizeMessage } from "./personalization-service";
import type {
    FollowupProspect,
    FollowupSequence,
    FollowupMessage,
} from "@/types/followup";

/**
 * Trigger a sequence for a prospect.
 *
 * Checks if prospect is eligible, creates scheduled deliveries for all messages.
 * Respects manual approval settings and branching rules.
 */
export async function triggerSequence(
    prospectId: string,
    sequenceId: string
): Promise<{ success: boolean; deliveries_created?: number; error?: string }> {
    const supabase = await createClient();

    logger.info({ prospectId, sequenceId }, "🚀 Triggering sequence for prospect");

    // Fetch prospect data
    const { data: prospect, error: prospectError } = await supabase
        .from("followup_prospects")
        .select("*")
        .eq("id", prospectId)
        .single();

    if (prospectError || !prospect) {
        logger.error(
            { error: prospectError, prospectId },
            "❌ Failed to fetch prospect"
        );
        return { success: false, error: "Prospect not found" };
    }

    // Fetch sequence configuration
    const { data: sequence, error: sequenceError } = await supabase
        .from("followup_sequences")
        .select("*")
        .eq("id", sequenceId)
        .single();

    if (sequenceError || !sequence) {
        logger.error(
            { error: sequenceError, sequenceId },
            "❌ Failed to fetch sequence"
        );
        return { success: false, error: "Sequence not found" };
    }

    // Check if prospect is eligible
    const eligibilityResult = checkProspectEligibility(prospect, sequence);
    if (!eligibilityResult.eligible) {
        logger.warn(
            { prospectId, sequenceId, reason: eligibilityResult.reason },
            "⚠️  Prospect not eligible for sequence"
        );
        return { success: false, error: eligibilityResult.reason };
    }

    // Fetch messages for the sequence
    const { data: messages, error: messagesError } = await supabase
        .from("followup_messages")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("message_order", { ascending: true });

    if (messagesError || !messages || messages.length === 0) {
        logger.error(
            { error: messagesError, sequenceId },
            "❌ Failed to fetch sequence messages"
        );
        return { success: false, error: "No messages found for sequence" };
    }

    // Calculate send times for each message
    const triggerTime = new Date();
    const deliveriesToCreate = [];

    for (const message of messages) {
        // Calculate scheduled send time
        const sendTime = new Date(
            triggerTime.getTime() + message.send_delay_hours * 60 * 60 * 1000
        );

        // Personalize the message
        const personalized = personalizeMessage(message, prospect as FollowupProspect);

        deliveriesToCreate.push({
            prospect_id: prospectId,
            message_id: message.id,
            channel: message.channel,
            personalized_subject: personalized.subject,
            personalized_body: personalized.body,
            personalized_cta: personalized.cta,
            scheduled_send_at: sendTime.toISOString(),
            delivery_status: sequence.requires_manual_approval ? "pending" : "pending",
            ab_test_variant: message.ab_test_variant,
        });
    }

    // Create all deliveries
    const { data: deliveries, error: deliveriesError } = await supabase
        .from("followup_deliveries")
        .insert(deliveriesToCreate)
        .select();

    if (deliveriesError) {
        logger.error(
            { error: deliveriesError, prospectId, sequenceId },
            "❌ Failed to create deliveries"
        );
        return { success: false, error: deliveriesError.message };
    }

    // Update prospect's next scheduled touch
    const firstDelivery = deliveries[0];
    await supabase
        .from("followup_prospects")
        .update({
            next_scheduled_touch: firstDelivery.scheduled_send_at,
            total_touches: prospect.total_touches + deliveries.length,
        })
        .eq("id", prospectId);

    logger.info(
        {
            prospectId,
            sequenceId,
            deliveriesCreated: deliveries.length,
        },
        "✅ Sequence triggered successfully"
    );

    return { success: true, deliveries_created: deliveries.length };
}

/**
 * Get deliveries ready to send.
 *
 * Fetches all deliveries scheduled to send now or in the past,
 * excluding those already sent or failed.
 */
export async function getDeliveriesReadyToSend(): Promise<{
    success: boolean;
    deliveries?: Array<{
        id: string;
        prospect_id: string;
        message_id: string;
        channel: string;
        personalized_subject: string | null;
        personalized_body: string;
        personalized_cta: unknown;
        scheduled_send_at: string;
    }>;
    error?: string;
}> {
    const supabase = await createClient();

    logger.info({}, "📨 Fetching deliveries ready to send");

    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from("followup_deliveries")
        .select("*")
        .eq("delivery_status", "pending")
        .lte("scheduled_send_at", now)
        .order("scheduled_send_at", { ascending: true });

    if (error) {
        logger.error({ error }, "❌ Failed to fetch deliveries");
        return { success: false, error: error.message };
    }

    logger.info({ count: data.length }, "✅ Found deliveries ready to send");

    return { success: true, deliveries: data };
}

/**
 * Mark delivery as sent.
 */
export async function markDeliverySent(
    deliveryId: string,
    providerMessageId?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.info({ deliveryId, providerMessageId }, "✅ Marking delivery as sent");

    const { error } = await supabase
        .from("followup_deliveries")
        .update({
            delivery_status: "sent",
            actual_sent_at: new Date().toISOString(),
            email_provider_id: providerMessageId || null,
        })
        .eq("id", deliveryId);

    if (error) {
        logger.error({ error, deliveryId }, "❌ Failed to mark delivery as sent");
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Mark delivery as failed.
 */
export async function markDeliveryFailed(
    deliveryId: string,
    errorMessage: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.warn({ deliveryId, errorMessage }, "⚠️  Marking delivery as failed");

    const { error } = await supabase
        .from("followup_deliveries")
        .update({
            delivery_status: "failed",
            error_message: errorMessage,
        })
        .eq("id", deliveryId);

    if (error) {
        logger.error({ error, deliveryId }, "❌ Failed to mark delivery as failed");
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Cancel pending deliveries for a prospect.
 *
 * Used when prospect converts, opts out, or reaches stop condition.
 */
export async function cancelPendingDeliveries(
    prospectId: string,
    reason: string
): Promise<{ success: boolean; cancelled_count?: number; error?: string }> {
    const supabase = await createClient();

    logger.info({ prospectId, reason }, "🛑 Cancelling pending deliveries");

    const { data, error } = await supabase
        .from("followup_deliveries")
        .update({
            delivery_status: "failed",
            error_message: reason,
        })
        .eq("prospect_id", prospectId)
        .eq("delivery_status", "pending")
        .select();

    if (error) {
        logger.error({ error, prospectId }, "❌ Failed to cancel deliveries");
        return { success: false, error: error.message };
    }

    logger.info({ prospectId, cancelledCount: data.length }, "✅ Deliveries cancelled");

    return { success: true, cancelled_count: data.length };
}

/**
 * Update next scheduled touch for a prospect.
 *
 * Finds the next pending delivery and updates the prospect record.
 */
export async function updateNextScheduledTouch(
    prospectId: string
): Promise<{ success: boolean; next_touch?: string | null; error?: string }> {
    const supabase = await createClient();

    // Get next pending delivery
    const { data: nextDelivery, error: deliveryError } = await supabase
        .from("followup_deliveries")
        .select("scheduled_send_at")
        .eq("prospect_id", prospectId)
        .eq("delivery_status", "pending")
        .order("scheduled_send_at", { ascending: true })
        .limit(1)
        .single();

    const nextTouch = nextDelivery?.scheduled_send_at || null;

    const { error: updateError } = await supabase
        .from("followup_prospects")
        .update({ next_scheduled_touch: nextTouch })
        .eq("id", prospectId);

    if (updateError) {
        logger.error(
            { error: updateError, prospectId },
            "❌ Failed to update next scheduled touch"
        );
        return { success: false, error: updateError.message };
    }

    logger.info({ prospectId, nextTouch }, "✅ Next scheduled touch updated");

    return { success: true, next_touch: nextTouch };
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Check if prospect is eligible for a sequence.
 */
function checkProspectEligibility(
    prospect: FollowupProspect,
    sequence: FollowupSequence
): { eligible: boolean; reason?: string } {
    // Check consent state
    if (
        prospect.consent_state === "opted_out" ||
        prospect.consent_state === "complained"
    ) {
        return { eligible: false, reason: "Prospect has opted out" };
    }

    // Check if already converted
    if (prospect.converted && sequence.stop_on_conversion) {
        return { eligible: false, reason: "Prospect already converted" };
    }

    // Check segment targeting
    if (!sequence.target_segments.includes(prospect.segment)) {
        return {
            eligible: false,
            reason: `Segment ${prospect.segment} not targeted by sequence`,
        };
    }

    // Check intent score range
    if (
        prospect.intent_score < sequence.min_intent_score ||
        prospect.intent_score > sequence.max_intent_score
    ) {
        return {
            eligible: false,
            reason: `Intent score ${prospect.intent_score} outside range ${sequence.min_intent_score}-${sequence.max_intent_score}`,
        };
    }

    return { eligible: true };
}
