/**
 * Email Webhook Handler
 *
 * Processes webhook events from email providers (SendGrid, etc.).
 * Handles deliveries, opens, clicks, bounces, and complaints.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getEmailProvider } from "@/lib/followup/providers/email-provider";
import { processBounce, processComplaint } from "@/lib/followup/compliance-service";

/**
 * POST /api/followup/webhooks/email
 *
 * Process webhook events from email providers.
 * Public endpoint - providers call this with event data.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const signature = request.headers.get("x-signature") || "";

        logger.info(
            { eventCount: Array.isArray(body) ? body.length : 1 },
            "📧 Email webhook received"
        );

        const emailProvider = getEmailProvider();

        // Verify webhook signature
        if (!emailProvider.verifyWebhook(body, signature)) {
            logger.warn({}, "⚠️  Invalid webhook signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // Process events (SendGrid sends arrays)
        const events = Array.isArray(body) ? body : [body];
        let processedCount = 0;

        for (const eventData of events) {
            const event = emailProvider.processWebhookEvent(eventData);

            if (!event) {
                logger.warn({ eventData }, "⚠️  Could not parse email event");
                continue;
            }

            await processEmailEvent(event);
            processedCount++;
        }

        logger.info({ processedCount }, "✅ Email webhook events processed");

        return NextResponse.json({
            success: true,
            processed: processedCount,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in email webhook handler");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Process a single email event.
 */
async function processEmailEvent(event: {
    provider_message_id: string;
    event_type:
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "complained"
        | "unsubscribed";
    email: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    const supabase = await createClient();

    logger.info(
        {
            eventType: event.event_type,
            email: event.email,
            providerId: event.provider_message_id,
        },
        "📊 Processing email event"
    );

    // Find delivery by provider message ID
    const { data: delivery } = await supabase
        .from("followup_deliveries")
        .select("id, prospect_id, delivery_status")
        .eq("email_provider_id", event.provider_message_id)
        .single();

    if (!delivery) {
        logger.warn(
            { providerId: event.provider_message_id },
            "⚠️  Delivery not found for provider message ID"
        );
        return;
    }

    // Update delivery based on event type
    switch (event.event_type) {
        case "delivered":
            await supabase
                .from("followup_deliveries")
                .update({ delivery_status: "delivered" })
                .eq("id", delivery.id);
            break;

        case "opened":
            await supabase
                .from("followup_deliveries")
                .update({
                    delivery_status: "opened",
                    opened_at: event.timestamp,
                })
                .eq("id", delivery.id);
            break;

        case "clicked":
            await supabase
                .from("followup_deliveries")
                .update({
                    delivery_status: "clicked",
                    first_click_at: event.timestamp,
                    total_clicks: 1, // Increment in real implementation
                })
                .eq("id", delivery.id);
            break;

        case "bounced":
            const bounceType = (event.metadata?.bounce_type as string) || "hard";
            await supabase
                .from("followup_deliveries")
                .update({
                    delivery_status: "bounced",
                    bounce_type: bounceType,
                    bounce_reason: (event.metadata?.reason as string) || "Unknown",
                })
                .eq("id", delivery.id);

            // Process bounce for compliance
            await processBounce({
                email: event.email,
                bounce_type: bounceType as "hard" | "soft",
                reason: (event.metadata?.reason as string) || undefined,
            });
            break;

        case "complained":
            await supabase
                .from("followup_deliveries")
                .update({ delivery_status: "complained" })
                .eq("id", delivery.id);

            // Process complaint for compliance
            await processComplaint({
                email: event.email,
                reason: (event.metadata?.reason as string) || undefined,
            });
            break;

        case "unsubscribed":
            // Update prospect consent
            await supabase
                .from("followup_prospects")
                .update({
                    consent_state: "opted_out",
                    opted_out_at: event.timestamp,
                    opt_out_reason: "Unsubscribed via email",
                })
                .eq("email", event.email);
            break;
    }

    logger.info(
        {
            deliveryId: delivery.id,
            eventType: event.event_type,
        },
        "✅ Email event processed"
    );
}
