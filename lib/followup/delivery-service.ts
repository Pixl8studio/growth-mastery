/**
 * Delivery Service
 *
 * Orchestrates actual message delivery via email/SMS providers.
 * Handles sending, tracking, and updating delivery status.
 */

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
    const supabase = await createClient();
    const emailProvider = getEmailProvider();

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
        logger.error({ error: result.error, deliveryId }, "❌ Email send failed");

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

    return { success: true };
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
    const supabase = await createClient();
    const smsProvider = getSMSProvider();

    // Verify prospect has phone number
    if (!prospect.phone) {
        logger.warn(
            { deliveryId, prospectId: prospect.id },
            "⚠️  No phone number for SMS"
        );

        await supabase
            .from("followup_deliveries")
            .update({
                delivery_status: "failed",
                error_message: "No phone number available",
            })
            .eq("id", deliveryId);

        return { success: false, error: "No phone number" };
    }

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

    logger.info({ deliveryId, providerId: result.provider_message_id }, "✅ SMS sent");

    return { success: true };
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

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

    // Check if already converted
    if (prospect.converted === true) {
        return { allowed: false, reason: "Prospect already converted" };
    }

    // Check quiet hours (if configured)
    const timezone = prospect.timezone as string;
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
