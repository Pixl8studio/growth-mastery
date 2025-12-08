/**
 * SMS Webhook Handler
 *
 * Processes webhook events from SMS providers (Twilio, etc.).
 * Handles delivery status, failures, and opt-outs.
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getSMSProvider } from "@/lib/followup/providers/sms-provider";

/**
 * POST /api/followup/webhooks/sms
 *
 * Process webhook events from SMS providers.
 * Public endpoint - providers call this with event data.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const signature = request.headers.get("x-twilio-signature") || "";

        logger.info({}, "📱 SMS webhook received");

        const smsProvider = getSMSProvider();

        // Verify webhook signature
        if (!smsProvider.verifyWebhook(body, signature)) {
            logger.warn({}, "⚠️  Invalid SMS webhook signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // Process event
        const event = smsProvider.processWebhookEvent(body);

        if (!event) {
            logger.warn({ body }, "⚠️  Could not parse SMS event");
            return NextResponse.json(
                { error: "Invalid event format" },
                { status: 400 }
            );
        }

        await processSMSEvent(event);

        logger.info({ eventType: event.event_type }, "✅ SMS webhook event processed");

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in SMS webhook handler");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "process_sms_webhook",
                endpoint: "POST /api/followup/webhooks/sms",
            },
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Process a single SMS event.
 */
async function processSMSEvent(event: {
    provider_message_id: string;
    event_type: "delivered" | "failed" | "unsubscribed";
    phone: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    const supabase = await createClient();

    logger.info(
        {
            eventType: event.event_type,
            phone: event.phone,
            providerId: event.provider_message_id,
        },
        "📊 Processing SMS event"
    );

    // Find delivery by provider message ID
    const { data: delivery } = await supabase
        .from("followup_deliveries")
        .select("id, prospect_id")
        .eq("sms_provider_id", event.provider_message_id)
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

        case "failed":
            await supabase
                .from("followup_deliveries")
                .update({
                    delivery_status: "failed",
                    error_message:
                        (event.metadata?.error as string) || "SMS delivery failed",
                })
                .eq("id", delivery.id);
            break;

        case "unsubscribed":
            // Handle STOP keyword - update prospect consent
            await supabase
                .from("followup_prospects")
                .update({
                    consent_state: "opted_out",
                    opted_out_at: event.timestamp,
                    opt_out_reason: "Replied STOP to SMS",
                })
                .eq("phone", event.phone);

            // Cancel pending SMS deliveries
            await supabase
                .from("followup_deliveries")
                .update({
                    delivery_status: "failed",
                    error_message: "Prospect opted out via STOP",
                })
                .eq("prospect_id", delivery.prospect_id)
                .eq("channel", "sms")
                .eq("delivery_status", "pending");
            break;
    }

    logger.info(
        {
            deliveryId: delivery.id,
            eventType: event.event_type,
        },
        "✅ SMS event processed"
    );
}
