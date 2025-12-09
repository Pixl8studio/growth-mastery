/**
 * Delivery Service
 *
 * Orchestrates actual message delivery via email/SMS providers.
 * Handles sending, tracking, and updating delivery status.
 */

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getEmailProvider } from "./providers/email-provider";
import { getSMSProvider } from "./providers/sms-provider";
import type { FollowupDelivery } from "@/types/followup";

/**
 * Process pending deliveries.
 *
 * Fetches deliveries ready to send and processes each one.
 * Returns count of successfully sent messages.
 */
export async function processPendingDeliveries(): Promise<{
    success: boolean;
    sent_count?: number;
    error?: string;
}> {
    const supabase = await createClient();

    logger.info({}, "🚀 Processing pending deliveries");

    const now = new Date().toISOString();

    // Get deliveries ready to send
    const { data: deliveries, error: fetchError } = await supabase
        .from("followup_deliveries")
        .select("*")
        .eq("delivery_status", "pending")
        .lte("scheduled_send_at", now)
        .order("scheduled_send_at", { ascending: true })
        .limit(100); // Process in batches

    if (fetchError) {
        logger.error({ error: fetchError }, "❌ Failed to fetch pending deliveries");

        Sentry.captureException(fetchError, {
            tags: {
                service: "delivery",
                operation: "fetch_pending_deliveries",
            },
        });

        return { success: false, error: fetchError.message };
    }

    if (!deliveries || deliveries.length === 0) {
        logger.info({}, "✅ No deliveries to process");
        return { success: true, sent_count: 0 };
    }

    logger.info({ count: deliveries.length }, "📨 Found deliveries to send");

    let sentCount = 0;

    for (const delivery of deliveries) {
        const result = await sendDelivery(delivery.id);
        if (result.success) {
            sentCount++;
        }
    }

    logger.info(
        { sentCount, totalProcessed: deliveries.length },
        "✅ Deliveries processed"
    );

    return { success: true, sent_count: sentCount };
}

/**
 * Send a single delivery.
 *
 * Sends via appropriate provider (email or SMS) and updates status.
 */
export async function sendDelivery(
    deliveryId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Fetch delivery with prospect data
    const { data: delivery, error: fetchError } = await supabase
        .from("followup_deliveries")
        .select("*, followup_prospects(*)")
        .eq("id", deliveryId)
        .single();

    if (fetchError || !delivery) {
        logger.error({ error: fetchError, deliveryId }, "❌ Failed to fetch delivery");
        return { success: false, error: "Delivery not found" };
    }

    const prospect = delivery.followup_prospects as unknown as Record<string, unknown>;

    // Check compliance before sending
    const complianceCheck = checkSendCompliance(prospect, delivery);
    if (!complianceCheck.allowed) {
        logger.warn(
            { deliveryId, reason: complianceCheck.reason },
            "⚠️  Delivery blocked by compliance"
        );

        // Mark as failed
        await supabase
            .from("followup_deliveries")
            .update({
                delivery_status: "failed",
                error_message: complianceCheck.reason,
            })
            .eq("id", deliveryId);

        return { success: false, error: complianceCheck.reason };
    }

    // Add tracking and opt-out links to content
    const enhancedBody = enhanceMessageWithLinks(
        delivery.personalized_body,
        deliveryId,
        prospect.id as string
    );

    // Send via appropriate channel
    if (delivery.channel === "email") {
        return await sendEmailDelivery(deliveryId, delivery, prospect, enhancedBody);
    } else if (delivery.channel === "sms") {
        return await sendSMSDelivery(deliveryId, delivery, prospect, enhancedBody);
    }

    return { success: false, error: "Unknown channel type" };
}

/**
 * Send email delivery.
 */
async function sendEmailDelivery(
    deliveryId: string,
    delivery: FollowupDelivery,
    prospect: Record<string, unknown>,
    enhancedBody: string
): Promise<{ success: boolean; error?: string }> {
    return await Sentry.startSpan(
        { op: "delivery.email.send", name: "Send Email Delivery" },
        async (span) => {
            const supabase = await createClient();

            span.setAttribute("delivery_id", deliveryId);
            span.setAttribute("prospect_email", prospect.email as string);

            // Get agentConfigId from delivery
            const { data: deliveryData } = await supabase
                .from("followup_deliveries")
                .select("followup_queues(agent_config_id)")
                .eq("id", deliveryId)
                .single();

            const agentConfigId = (deliveryData?.followup_queues as any)
                ?.agent_config_id;
            const emailProvider = await getEmailProvider(agentConfigId);

            span.setAttribute("provider", emailProvider.name);

            logger.info(
                {
                    deliveryId,
                    to: prospect.email,
                    provider: emailProvider.name,
                },
                "📧 Sending email"
            );

            const result = await emailProvider.sendEmail({
                to: prospect.email as string,
                from: process.env.FOLLOWUP_FROM_EMAIL || "followup@example.com",
                subject: delivery.personalized_subject || "Follow-up",
                html_body: enhancedBody,
                tracking_enabled: true,
                metadata: {
                    delivery_id: deliveryId,
                    prospect_id: prospect.id,
                },
            });

            if (!result.success) {
                logger.error(
                    { error: result.error, deliveryId },
                    "❌ Email send failed"
                );

                Sentry.captureException(
                    new Error(result.error || "Email send failed"),
                    {
                        tags: {
                            service: "delivery",
                            operation: "send_email",
                            provider: emailProvider.name,
                        },
                        extra: {
                            deliveryId,
                            prospectId: prospect.id,
                            prospectEmail: prospect.email,
                        },
                    }
                );

                await supabase
                    .from("followup_deliveries")
                    .update({
                        delivery_status: "failed",
                        error_message: result.error,
                    })
                    .eq("id", deliveryId);

                return { success: false, error: result.error };
            }

            // Update delivery status
            await supabase
                .from("followup_deliveries")
                .update({
                    delivery_status: "sent",
                    actual_sent_at: new Date().toISOString(),
                    email_provider_id: result.provider_message_id,
                })
                .eq("id", deliveryId);

            logger.info(
                { deliveryId, providerId: result.provider_message_id },
                "✅ Email sent"
            );

            span.setStatus({ code: 1, message: "Success" });

            return { success: true };
        }
    );
}

/**
 * Send SMS delivery.
 */
async function sendSMSDelivery(
    deliveryId: string,
    delivery: FollowupDelivery,
    prospect: Record<string, unknown>,
    enhancedBody: string
): Promise<{ success: boolean; error?: string }> {
    return await Sentry.startSpan(
        { op: "delivery.sms.send", name: "Send SMS Delivery" },
        async (span) => {
            const supabase = await createClient();
            const smsProvider = getSMSProvider();

            span.setAttribute("delivery_id", deliveryId);
            span.setAttribute("provider", smsProvider.name);

            // Verify prospect has phone number
            if (!prospect.phone) {
                logger.warn(
                    { deliveryId, prospectId: prospect.id },
                    "⚠️  No phone number for SMS"
                );

                const error = new Error("No phone number available");
                Sentry.captureException(error, {
                    tags: {
                        service: "delivery",
                        operation: "send_sms",
                        provider: smsProvider.name,
                    },
                    extra: {
                        deliveryId,
                        prospectId: prospect.id,
                    },
                });

                await supabase
                    .from("followup_deliveries")
                    .update({
                        delivery_status: "failed",
                        error_message: "No phone number available",
                    })
                    .eq("id", deliveryId);

                return { success: false, error: "No phone number" };
            }

            span.setAttribute("prospect_phone", prospect.phone as string);

            logger.info(
                {
                    deliveryId,
                    to: prospect.phone,
                    provider: smsProvider.name,
                },
                "📱 Sending SMS"
            );

            const result = await smsProvider.sendSMS({
                to: prospect.phone as string,
                from: process.env.FOLLOWUP_FROM_PHONE || "+15555551234",
                body: enhancedBody,
                metadata: {
                    delivery_id: deliveryId,
                    prospect_id: prospect.id,
                },
            });

            if (!result.success) {
                logger.error({ error: result.error, deliveryId }, "❌ SMS send failed");

                Sentry.captureException(new Error(result.error || "SMS send failed"), {
                    tags: {
                        service: "delivery",
                        operation: "send_sms",
                        provider: smsProvider.name,
                    },
                    extra: {
                        deliveryId,
                        prospectId: prospect.id,
                        prospectPhone: prospect.phone,
                    },
                });

                await supabase
                    .from("followup_deliveries")
                    .update({
                        delivery_status: "failed",
                        error_message: result.error,
                    })
                    .eq("id", deliveryId);

                return { success: false, error: result.error };
            }

            // Update delivery status
            await supabase
                .from("followup_deliveries")
                .update({
                    delivery_status: "sent",
                    actual_sent_at: new Date().toISOString(),
                    sms_provider_id: result.provider_message_id,
                })
                .eq("id", deliveryId);

            logger.info(
                { deliveryId, providerId: result.provider_message_id },
                "✅ SMS sent"
            );

            span.setStatus({ code: 1, message: "Success" });

            return { success: true };
        }
    );
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Check if scheduled time falls within quiet hours.
 *
 * Quiet hours: 22:00 - 07:00 in prospect's local timezone.
 */
export function isWithinQuietHours(
    scheduledTime: Date,
    timezone: string,
    quietHoursStart: string = "22:00",
    quietHoursEnd: string = "07:00"
): boolean {
    try {
        // Parse quiet hours
        const [startHour, startMin] = quietHoursStart.split(":").map(Number);
        const [endHour, endMin] = quietHoursEnd.split(":").map(Number);

        // Convert to prospect's timezone
        const localTime = new Date(
            scheduledTime.toLocaleString("en-US", { timeZone: timezone })
        );

        const hour = localTime.getHours();
        const minute = localTime.getMinutes();
        const timeInMinutes = hour * 60 + minute;

        const startTimeInMinutes = startHour * 60 + startMin;
        const endTimeInMinutes = endHour * 60 + endMin;

        // Handle overnight quiet hours (22:00 - 07:00)
        if (startTimeInMinutes > endTimeInMinutes) {
            return (
                timeInMinutes >= startTimeInMinutes || timeInMinutes < endTimeInMinutes
            );
        } else {
            return (
                timeInMinutes >= startTimeInMinutes && timeInMinutes < endTimeInMinutes
            );
        }
    } catch (error) {
        logger.error({ error, timezone }, "❌ Error checking quiet hours");
        // Default to safe: treat as quiet hours if timezone conversion fails
        return true;
    }
}

/**
 * Check if delivery is compliant and allowed to send.
 */
function checkSendCompliance(
    prospect: Record<string, unknown>,
    delivery: FollowupDelivery
): { allowed: boolean; reason?: string } {
    // Check consent state
    const consentState = prospect.consent_state as string;
    if (consentState === "opted_out" || consentState === "complained") {
        return { allowed: false, reason: "Prospect has opted out" };
    }

    // Check quiet hours if timezone available
    if (prospect.timezone) {
        const scheduledTime = new Date(delivery.scheduled_send_at);
        const inQuietHours = isWithinQuietHours(
            scheduledTime,
            prospect.timezone as string
        );

        if (inQuietHours) {
            return {
                allowed: false,
                reason: "Within quiet hours (22:00-07:00 local time)",
            };
        }
    }

    // Check if already converted
    if (prospect.converted === true) {
        return { allowed: false, reason: "Prospect already converted" };
    }

    // Check quiet hours (if configured)
    const _timezone = prospect.timezone as string;
    const now = new Date();
    const hour = now.getHours();

    // Simple quiet hours check (8 PM to 8 AM)
    if (hour >= 21 || hour < 8) {
        // Allow send if not respecting timezone setting
        // This would be enhanced with actual timezone conversion
        logger.info(
            { deliveryId: delivery.id, hour },
            "📅 Sending during quiet hours (timezone not enforced)"
        );
    }

    return { allowed: true };
}

/**
 * Enhance message with tracking and opt-out links.
 */
function enhanceMessageWithLinks(
    body: string,
    deliveryId: string,
    prospectId: string
): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://example.com";

    // Replace URL placeholders with actual tracking links
    let enhanced = body;

    // Tracking pixel for email opens (invisible 1x1 image)
    const trackingPixel = `<img src="${baseUrl}/api/followup/track/pixel/${deliveryId}" width="1" height="1" alt="" />`;

    // Opt-out link
    const optOutLink = `${baseUrl}/api/followup/prospects/${prospectId}/opt-out`;

    // Replace placeholders
    enhanced = enhanced.replace(/{OPT_OUT_LINK}/g, optOutLink);
    enhanced = enhanced.replace(/{opt_out_link}/g, optOutLink);

    // Add tracking pixel to end of HTML emails
    if (enhanced.includes("<html") || enhanced.includes("<body")) {
        enhanced = enhanced.replace("</body>", `${trackingPixel}</body>`);
    } else {
        // Plain text or simple HTML - append opt-out link
        enhanced = `${enhanced}\n\n---\nUnsubscribe: ${optOutLink}`;
    }

    return enhanced;
}

/**
 * Create parallel email + SMS deliveries for a message.
 *
 * Creates two delivery records (email and SMS) scheduled for the same time.
 * Both send simultaneously if channels are enabled.
 */
export async function createParallelDeliveries(params: {
    prospectId: string;
    messageId: string;
    scheduledSendAt: Date;
    personalizedSubject: string | null;
    personalizedBody: string;
    personalizedCTA: Record<string, unknown> | null;
}): Promise<{
    success: boolean;
    emailDeliveryId?: string;
    smsDeliveryId?: string;
    error?: string;
}> {
    const supabase = await createClient();

    logger.info(
        { prospectId: params.prospectId, messageId: params.messageId },
        "📮 Creating parallel email + SMS deliveries"
    );

    try {
        // Create email delivery
        const { data: emailDelivery, error: emailError } = await supabase
            .from("followup_deliveries")
            .insert({
                prospect_id: params.prospectId,
                message_id: params.messageId,
                channel: "email",
                personalized_subject: params.personalizedSubject,
                personalized_body: params.personalizedBody,
                personalized_cta: params.personalizedCTA,
                scheduled_send_at: params.scheduledSendAt.toISOString(),
                delivery_status: "pending",
            })
            .select()
            .single();

        if (emailError) {
            logger.error({ error: emailError }, "❌ Failed to create email delivery");
            return { success: false, error: emailError.message };
        }

        // Create SMS delivery
        // Shorten body for SMS (max 320 chars)
        const smsBody = params.personalizedBody
            .replace(/<[^>]*>/g, "") // Strip HTML tags
            .substring(0, 320);

        const { data: smsDelivery, error: smsError } = await supabase
            .from("followup_deliveries")
            .insert({
                prospect_id: params.prospectId,
                message_id: params.messageId,
                channel: "sms",
                personalized_subject: null, // SMS has no subject
                personalized_body: smsBody,
                personalized_cta: params.personalizedCTA,
                scheduled_send_at: params.scheduledSendAt.toISOString(),
                delivery_status: "pending",
            })
            .select()
            .single();

        if (smsError) {
            logger.warn(
                { error: smsError },
                "⚠️  Failed to create SMS delivery (email still scheduled)"
            );
            // Don't fail completely - email was created
            return {
                success: true,
                emailDeliveryId: emailDelivery.id,
            };
        }

        logger.info(
            {
                emailDeliveryId: emailDelivery.id,
                smsDeliveryId: smsDelivery.id,
            },
            "✅ Parallel deliveries created"
        );

        return {
            success: true,
            emailDeliveryId: emailDelivery.id,
            smsDeliveryId: smsDelivery.id,
        };
    } catch (error) {
        logger.error({ error }, "❌ Error creating parallel deliveries");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
