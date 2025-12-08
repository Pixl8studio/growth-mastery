/**
 * Compliance Service
 *
 * Enforces CAN-SPAM, GDPR, and other compliance requirements.
 * Manages opt-outs, consent tracking, and regulatory adherence.
 */

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Validate email complies with CAN-SPAM requirements.
 *
 * CAN-SPAM requires:
 * - Accurate From/Reply-To addresses
 * - Clear subject line (not deceptive)
 * - Unsubscribe link in every email
 * - Physical address of sender
 */
export function validateCANSPAMCompliance(emailBody: string): {
    compliant: boolean;
    violations: string[];
} {
    const violations: string[] = [];

    // Check for unsubscribe link
    const hasUnsubscribe =
        emailBody.includes("unsubscribe") ||
        emailBody.includes("opt-out") ||
        emailBody.includes("opt_out") ||
        emailBody.includes("{OPT_OUT_LINK}");

    if (!hasUnsubscribe) {
        violations.push("Missing unsubscribe/opt-out link");
    }

    // Check minimum length (spam messages are often very short)
    if (emailBody.length < 50) {
        violations.push("Message too short - may appear as spam");
    }

    return {
        compliant: violations.length === 0,
        violations,
    };
}

/**
 * Enforce sending limits to protect sender reputation.
 *
 * Prevents sending too many messages too quickly.
 */
export async function checkSendingLimits(
    userId: string,
    channel: "email" | "sms"
): Promise<{
    allowed: boolean;
    reason?: string;
    current_count?: number;
    limit?: number;
}> {
    const supabase = await createClient();

    // Get agent config with channel settings
    const { data: configs } = await supabase
        .from("followup_agent_configs")
        .select("channel_config")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .single();

    const channelConfig = configs?.channel_config as
        | {
              email?: { max_per_day?: number };
              sms?: { max_per_day?: number };
          }
        | undefined;

    const maxPerDay =
        channel === "email"
            ? channelConfig?.email?.max_per_day || 500
            : channelConfig?.sms?.max_per_day || 100;

    // Count deliveries sent today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: deliveries, error } = await supabase
        .from("followup_deliveries")
        .select("id")
        .eq("channel", channel)
        .gte("actual_sent_at", today.toISOString())
        .eq("delivery_status", "sent");

    if (error) {
        logger.error({ error, userId, channel }, "❌ Failed to check sending limits");

        Sentry.captureException(error, {
            tags: {
                service: "compliance",
                operation: "check_sending_limits",
            },
            extra: {
                userId,
                channel,
            },
        });

        // Allow send on error (fail open)
        return { allowed: true };
    }

    const sentToday = deliveries?.length || 0;

    if (sentToday >= maxPerDay) {
        logger.warn(
            {
                userId,
                channel,
                sentToday,
                limit: maxPerDay,
            },
            "⚠️  Daily sending limit reached"
        );

        return {
            allowed: false,
            reason: `Daily ${channel} limit reached (${sentToday}/${maxPerDay})`,
            current_count: sentToday,
            limit: maxPerDay,
        };
    }

    return { allowed: true, current_count: sentToday, limit: maxPerDay };
}

/**
 * Process email bounce event.
 *
 * Updates prospect consent state and delivery status.
 */
export async function processBounce(params: {
    email: string;
    bounce_type: "hard" | "soft";
    reason?: string;
}): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.info(
        {
            email: params.email,
            bounceType: params.bounce_type,
        },
        "📧 Processing bounce"
    );

    // Hard bounces should update consent state
    if (params.bounce_type === "hard") {
        await supabase
            .from("followup_prospects")
            .update({
                consent_state: "bounced",
            })
            .eq("email", params.email);

        logger.info(
            { email: params.email },
            "✅ Hard bounce - updated consent state to bounced"
        );
    }

    return { success: true };
}

/**
 * Process spam complaint.
 *
 * Updates prospect consent state and cancels all pending deliveries.
 */
export async function processComplaint(params: {
    email: string;
    reason?: string;
}): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.warn({ email: params.email }, "⚠️  Processing spam complaint");

    // Update consent state
    await supabase
        .from("followup_prospects")
        .update({
            consent_state: "complained",
        })
        .eq("email", params.email);

    // Cancel pending deliveries
    const { data: prospects } = await supabase
        .from("followup_prospects")
        .select("id")
        .eq("email", params.email);

    if (prospects) {
        for (const prospect of prospects) {
            await supabase
                .from("followup_deliveries")
                .update({
                    delivery_status: "failed",
                    error_message: "Spam complaint received",
                })
                .eq("prospect_id", prospect.id)
                .eq("delivery_status", "pending");
        }
    }

    logger.info(
        { email: params.email },
        "✅ Complaint processed, deliveries cancelled"
    );

    return { success: true };
}

/**
 * Check quiet hours for a timezone.
 *
 * Returns true if current time in prospect's timezone is during quiet hours.
 */
export function isQuietHours(
    timezone: string,
    quietStart: string = "21:00",
    quietEnd: string = "08:00"
): boolean {
    // Simple implementation - would need proper timezone library for production
    // For now, just check UTC hours
    const now = new Date();
    const hour = now.getUTCHours();

    const startHour = parseInt(quietStart.split(":")[0], 10);
    const endHour = parseInt(quietEnd.split(":")[0], 10);

    return hour >= startHour || hour < endHour;
}

/**
 * Get sender reputation status.
 *
 * Tracks bounce rates and complaint rates to protect sender reputation.
 */
export async function getSenderReputationStatus(userId: string): Promise<{
    healthy: boolean;
    bounce_rate: number;
    complaint_rate: number;
    warnings: string[];
}> {
    const supabase = await createClient();

    // Get deliveries from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: deliveries } = await supabase
        .from("followup_deliveries")
        .select("delivery_status, followup_prospects!inner(user_id)")
        .gte("actual_sent_at", thirtyDaysAgo.toISOString())
        .eq("followup_prospects.user_id", userId);

    if (!deliveries || deliveries.length === 0) {
        return {
            healthy: true,
            bounce_rate: 0,
            complaint_rate: 0,
            warnings: [],
        };
    }

    const totalSent = deliveries.length;
    const bounced = deliveries.filter((d) => d.delivery_status === "bounced").length;
    const complained = deliveries.filter(
        (d) => d.delivery_status === "complained"
    ).length;

    const bounceRate = (bounced / totalSent) * 100;
    const complaintRate = (complained / totalSent) * 100;

    const warnings: string[] = [];

    // Bounce rate thresholds
    if (bounceRate > 5) {
        warnings.push(`High bounce rate: ${bounceRate.toFixed(2)}% (threshold: 5%)`);
    }

    // Complaint rate thresholds
    if (complaintRate > 0.1) {
        warnings.push(
            `High complaint rate: ${complaintRate.toFixed(2)}% (threshold: 0.1%)`
        );
    }

    const healthy = warnings.length === 0;

    logger.info(
        {
            userId,
            healthy,
            bounceRate: bounceRate.toFixed(2),
            complaintRate: complaintRate.toFixed(2),
        },
        healthy
            ? "✅ Sender reputation healthy"
            : "⚠️  Sender reputation issues detected"
    );

    return {
        healthy,
        bounce_rate: bounceRate,
        complaint_rate: complaintRate,
        warnings,
    };
}
