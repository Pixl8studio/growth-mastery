/**
 * Queue Processor for Follow-Up Deliveries
 *
 * Processes pending deliveries from the queue with:
 * - Compliance checks (consent, quiet hours, sending limits)
 * - Timezone-aware scheduling
 * - Rate limiting and throttling
 * - Error handling and retry logic
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { sendDelivery } from "./delivery-service";

/**
 * Process pending deliveries in the queue.
 *
 * Fetches deliveries ready to send, applies compliance checks,
 * and processes them in batches.
 */
export async function processPendingDeliveries(options?: {
    batchSize?: number;
    maxProcessTime?: number;
}): Promise<{
    success: boolean;
    processed?: number;
    sent?: number;
    skipped?: number;
    failed?: number;
    error?: string;
}> {
    const batchSize = options?.batchSize || 100;
    const maxProcessTime = options?.maxProcessTime || 60_000; // 1 minute default

    const startTime = Date.now();

    logger.info({ batchSize, maxProcessTime }, "🚀 Starting delivery queue processor");

    try {
        const supabase = await createClient();
        const now = new Date().toISOString();

        // Fetch pending deliveries ready to send
        const { data: deliveries, error: fetchError } = await supabase
            .from("followup_deliveries")
            .select(
                `
                id,
                prospect_id,
                channel,
                scheduled_send_at,
                followup_prospects (
                    id,
                    email,
                    first_name,
                    phone,
                    timezone,
                    consent_state,
                    total_touches,
                    last_touch_at
                )
            `
            )
            .eq("delivery_status", "pending")
            .lte("scheduled_send_at", now)
            .order("scheduled_send_at", { ascending: true })
            .limit(batchSize);

        if (fetchError) {
            logger.error(
                { error: fetchError },
                "❌ Failed to fetch pending deliveries"
            );
            return { success: false, error: fetchError.message };
        }

        if (!deliveries || deliveries.length === 0) {
            logger.info({}, "✅ No pending deliveries to process");
            return { success: true, processed: 0, sent: 0, skipped: 0, failed: 0 };
        }

        logger.info({ count: deliveries.length }, "📨 Processing deliveries");

        let processed = 0;
        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (const delivery of deliveries) {
            // Check if we've exceeded max process time
            if (Date.now() - startTime > maxProcessTime) {
                logger.warn(
                    { processed, remaining: deliveries.length - processed },
                    "⏰ Max process time reached, stopping"
                );
                break;
            }

            processed++;

            try {
                // Pre-flight compliance checks
                const complianceCheck = await checkDeliveryCompliance(delivery);

                if (!complianceCheck.allowed) {
                    logger.info(
                        {
                            deliveryId: delivery.id,
                            reason: complianceCheck.reason,
                        },
                        "⏭️  Skipping delivery due to compliance"
                    );

                    // Mark as failed with reason
                    await supabase
                        .from("followup_deliveries")
                        .update({
                            delivery_status: "failed",
                            error_message: complianceCheck.reason,
                        })
                        .eq("id", delivery.id);

                    skipped++;
                    continue;
                }

                // Send the delivery
                const result = await sendDelivery(delivery.id);

                if (result.success) {
                    sent++;
                    logger.info({ deliveryId: delivery.id }, "✅ Delivery sent");
                } else {
                    failed++;
                    logger.error(
                        { deliveryId: delivery.id, error: result.error },
                        "❌ Delivery failed"
                    );
                }
            } catch (error) {
                failed++;
                logger.error(
                    { error, deliveryId: delivery.id },
                    "❌ Exception processing delivery"
                );
            }

            // Small delay to avoid overwhelming email providers
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const duration = Date.now() - startTime;

        logger.info(
            {
                processed,
                sent,
                skipped,
                failed,
                durationMs: duration,
            },
            "✅ Delivery queue processing complete"
        );

        return {
            success: true,
            processed,
            sent,
            skipped,
            failed,
        };
    } catch (error) {
        logger.error({ error }, "❌ Error in queue processor");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Check if delivery passes compliance requirements.
 */
async function checkDeliveryCompliance(delivery: any): Promise<{
    allowed: boolean;
    reason?: string;
}> {
    const prospect = delivery.followup_prospects;

    if (!prospect) {
        return { allowed: false, reason: "Prospect data not found" };
    }

    // Check consent state
    if (prospect.consent_state === "opted_out") {
        return { allowed: false, reason: "Prospect has opted out" };
    }

    if (prospect.consent_state === "bounced") {
        return { allowed: false, reason: "Email bounced previously" };
    }

    if (prospect.consent_state === "complained") {
        return { allowed: false, reason: "Spam complaint filed" };
    }

    // Check quiet hours (if timezone available)
    if (prospect.timezone) {
        const isQuiet = isWithinQuietHours(
            new Date(delivery.scheduled_send_at),
            prospect.timezone
        );

        if (isQuiet) {
            return {
                allowed: false,
                reason: "Within quiet hours (22:00-07:00 local time)",
            };
        }
    }

    // Check daily sending limits per prospect
    const dailyLimit = delivery.channel === "email" ? 3 : 2;
    const recentTouches = await countRecentTouches(prospect.id, delivery.channel, 24);

    if (recentTouches >= dailyLimit) {
        return {
            allowed: false,
            reason: `Daily ${delivery.channel} limit reached (${dailyLimit} per day)`,
        };
    }

    return { allowed: true };
}

/**
 * Check if scheduled time falls within quiet hours.
 *
 * Quiet hours: 22:00 - 07:00 in prospect's local timezone.
 */
function isWithinQuietHours(scheduledTime: Date, timezone: string): boolean {
    try {
        // Convert to prospect's timezone
        const localTime = new Date(
            scheduledTime.toLocaleString("en-US", { timeZone: timezone })
        );

        const hour = localTime.getHours();

        // Quiet hours: 22:00 (10 PM) to 07:00 (7 AM)
        return hour >= 22 || hour < 7;
    } catch (error) {
        logger.error({ error, timezone }, "❌ Error checking quiet hours");
        // Default to safe: treat as quiet hours if timezone conversion fails
        return true;
    }
}

/**
 * Count recent touches to a prospect via specific channel.
 */
async function countRecentTouches(
    prospectId: string,
    channel: string,
    hoursBack: number
): Promise<number> {
    const supabase = await createClient();

    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from("followup_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("prospect_id", prospectId)
        .eq("channel", channel)
        .in("delivery_status", ["sent", "delivered", "opened"])
        .gte("actual_sent_at", cutoffTime);

    if (error) {
        logger.error({ error, prospectId }, "❌ Error counting recent touches");
        return 0;
    }

    return data || 0;
}

/**
 * Reschedule deliveries that fall within quiet hours.
 *
 * Moves scheduled_send_at to 09:00 local time.
 */
export async function rescheduleQuietHourDeliveries(): Promise<{
    success: boolean;
    rescheduled?: number;
    error?: string;
}> {
    logger.info({}, "🕐 Checking for quiet hour deliveries to reschedule");

    try {
        const supabase = await createClient();

        // Fetch pending deliveries with prospect timezone
        const { data: deliveries, error: fetchError } = await supabase
            .from("followup_deliveries")
            .select(
                `
                id,
                scheduled_send_at,
                followup_prospects (
                    timezone
                )
            `
            )
            .eq("delivery_status", "pending")
            .limit(200);

        if (fetchError || !deliveries) {
            return {
                success: false,
                error: fetchError?.message || "No deliveries found",
            };
        }

        let rescheduled = 0;

        for (const delivery of deliveries) {
            const prospect = delivery.followup_prospects as any;

            if (!prospect?.timezone) {
                continue;
            }

            const scheduledTime = new Date(delivery.scheduled_send_at);
            const isQuiet = isWithinQuietHours(scheduledTime, prospect.timezone);

            if (isQuiet) {
                // Reschedule to 09:00 local time
                const rescheduledTime = new Date(scheduledTime);
                rescheduledTime.setHours(9, 0, 0, 0);

                // If that's in the past, schedule for tomorrow
                if (rescheduledTime < new Date()) {
                    rescheduledTime.setDate(rescheduledTime.getDate() + 1);
                }

                await supabase
                    .from("followup_deliveries")
                    .update({ scheduled_send_at: rescheduledTime.toISOString() })
                    .eq("id", delivery.id);

                rescheduled++;
            }
        }

        logger.info({ rescheduled }, "✅ Quiet hour deliveries rescheduled");

        return { success: true, rescheduled };
    } catch (error) {
        logger.error({ error }, "❌ Error rescheduling quiet hour deliveries");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
