/**
 * Mailgun Webhook Handler
 *
 * Processes delivery, bounce, open, click, and other email events from Mailgun.
 * Updates followup_deliveries and followup_events tables.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { MailgunEmailProvider } from "@/lib/followup/providers/mailgun-provider";

/**
 * POST /api/webhooks/mailgun
 * Handle Mailgun webhook events
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Verify webhook signature
        const mailgunProvider = new MailgunEmailProvider(
            process.env.MAILGUN_API_KEY || "",
            "dummy.domain.com" // Domain not needed for webhook verification
        );

        const signature = request.headers.get("x-mailgun-signature") || "";
        const isValid = mailgunProvider.verifyWebhook(body, signature);

        if (!isValid) {
            logger.warn({ body }, "⚠️  Invalid Mailgun webhook signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // Process webhook event
        const event = mailgunProvider.processWebhookEvent(body);
        if (!event) {
            logger.warn({ body }, "⚠️  Could not process Mailgun webhook event");
            return NextResponse.json({ error: "Invalid event" }, { status: 400 });
        }

        logger.info(
            {
                event: event.event_type,
                email: event.email,
                messageId: event.provider_message_id,
            },
            "📨 Mailgun webhook event received"
        );

        // Get delivery ID from metadata
        const deliveryId = event.metadata?.delivery_id as string | undefined;
        if (!deliveryId) {
            logger.warn({ event }, "⚠️  No delivery_id in webhook metadata");
            return NextResponse.json({ success: true, message: "No delivery_id" });
        }

        const supabase = await createClient();

        // Update delivery status
        const statusUpdates: Record<string, string> = {
            delivered: "sent",
            bounced: "failed",
        };

        if (statusUpdates[event.event_type]) {
            const { error: updateError } = await supabase
                .from("followup_deliveries")
                .update({
                    delivery_status: statusUpdates[event.event_type],
                    ...(event.event_type === "bounced"
                        ? { error_message: "Email bounced or failed" }
                        : {}),
                })
                .eq("id", deliveryId);

            if (updateError) {
                logger.error(
                    { error: updateError, deliveryId },
                    "❌ Failed to update delivery"
                );
            }
        }

        // Get prospect_id from delivery
        const { data: delivery } = await supabase
            .from("followup_deliveries")
            .select("followup_queues(prospect_id)")
            .eq("id", deliveryId)
            .single();

        const prospectId = (delivery?.followup_queues as { prospect_id?: string })
            ?.prospect_id;

        // Create followup event
        if (prospectId) {
            const eventTypeMap: Record<string, string> = {
                delivered: "email_delivered",
                opened: "email_opened",
                clicked: "email_clicked",
                bounced: "email_bounced",
                complained: "email_complained",
                unsubscribed: "email_unsubscribed",
            };

            const followupEventType = eventTypeMap[event.event_type];
            if (followupEventType) {
                const { error: eventError } = await supabase
                    .from("followup_events")
                    .insert({
                        prospect_id: prospectId,
                        event_type: followupEventType,
                        event_data: {
                            email: event.email,
                            message_id: event.provider_message_id,
                            delivery_id: deliveryId,
                            timestamp: event.timestamp,
                        },
                        occurred_at: event.timestamp,
                    });

                if (eventError) {
                    logger.error(
                        { error: eventError, prospectId },
                        "❌ Failed to create event"
                    );
                }
            }

            // Handle unsubscribe
            if (event.event_type === "unsubscribed") {
                const { error: unsubError } = await supabase
                    .from("followup_prospects")
                    .update({
                        unsubscribed: true,
                        unsubscribed_at: event.timestamp,
                    })
                    .eq("id", prospectId);

                if (unsubError) {
                    logger.error(
                        { error: unsubError, prospectId },
                        "❌ Failed to unsubscribe"
                    );
                }
            }
        }

        logger.info(
            { event: event.event_type, deliveryId, prospectId },
            "✅ Mailgun webhook processed"
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ error }, "❌ Failed to process Mailgun webhook");

        // Return 200 to prevent Mailgun from retrying
        return NextResponse.json(
            { success: false, error: "Processing failed" },
            { status: 200 }
        );
    }
}
