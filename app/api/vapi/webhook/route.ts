/**
 * VAPI Webhook Handler
 * Receives webhook events from VAPI (call status updates, transcripts)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { verifyWebhookSignature, processCompletedCall } from "@/lib/vapi/client";
import { env } from "@/lib/env";
import type { VapiWebhookEvent } from "@/lib/vapi/types";

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "vapi-webhook" });

    try {
        // Get webhook signature for verification
        const signature = request.headers.get("x-vapi-signature");
        const rawBody = await request.text();

        // Verify webhook signature
        if (env.VAPI_WEBHOOK_SECRET && signature) {
            const isValid = verifyWebhookSignature(
                rawBody,
                signature,
                env.VAPI_WEBHOOK_SECRET
            );

            if (!isValid) {
                requestLogger.warn("Invalid webhook signature");
                return NextResponse.json(
                    { error: "Invalid signature" },
                    { status: 401 }
                );
            }
        }

        const event: VapiWebhookEvent = JSON.parse(rawBody);
        requestLogger.info(
            { eventType: event.type, callId: event.call?.id },
            "Received VAPI webhook"
        );

        // Handle different event types
        switch (event.type) {
            case "call.started":
                await handleCallStarted(event);
                break;

            case "call.ended":
                await handleCallEnded(event);
                break;

            case "transcript":
                await handleTranscript(event);
                break;

            default:
                requestLogger.info(
                    { eventType: event.type },
                    "Unhandled webhook event type"
                );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        requestLogger.error({ error }, "Failed to process VAPI webhook");
        return NextResponse.json(
            { error: "Failed to process webhook" },
            { status: 500 }
        );
    }
}

/**
 * Handle call started event
 */
async function handleCallStarted(event: VapiWebhookEvent) {
    const requestLogger = logger.child({
        handler: "call-started",
        callId: event.call.id,
    });

    try {
        requestLogger.info("Processing call started event");

        const supabase = await createClient();

        // Extract funnel project ID from metadata
        const funnelProjectId = event.call.metadata?.funnelProjectId as
            | string
            | undefined;
        const userId = event.call.metadata?.userId as string | undefined;

        if (!funnelProjectId || !userId) {
            requestLogger.warn("Missing funnel project ID or user ID in metadata");
            return;
        }

        // Update or create transcript record with pending status
        const { error } = await supabase.from("vapi_transcripts").upsert({
            funnel_project_id: funnelProjectId,
            user_id: userId,
            call_id: event.call.id,
            call_status: "in_progress",
            transcript_text: "",
        });

        if (error) {
            throw error;
        }

        requestLogger.info("Call started event processed");
    } catch (error) {
        requestLogger.error({ error }, "Failed to handle call started event");
    }
}

/**
 * Handle call ended event
 */
async function handleCallEnded(event: VapiWebhookEvent) {
    const requestLogger = logger.child({
        handler: "call-ended",
        callId: event.call.id,
    });

    try {
        requestLogger.info("Processing call ended event");

        // Process the completed call
        const summary = await processCompletedCall(event.call.id);

        const supabase = await createClient();

        // Extract funnel project ID from metadata
        const funnelProjectId = event.call.metadata?.funnelProjectId as
            | string
            | undefined;
        const userId = event.call.metadata?.userId as string | undefined;

        if (!funnelProjectId || !userId) {
            requestLogger.warn("Missing funnel project ID or user ID in metadata");
            return;
        }

        // Calculate duration
        const duration =
            event.call.startedAt && event.call.endedAt
                ? Math.floor(
                      (new Date(event.call.endedAt).getTime() -
                          new Date(event.call.startedAt).getTime()) /
                          1000
                  )
                : 0;

        // Save transcript to database
        const { error } = await supabase.from("vapi_transcripts").upsert(
            {
                funnel_project_id: funnelProjectId,
                user_id: userId,
                call_id: event.call.id,
                transcript_text: event.call.artifact?.transcript || summary.transcript,
                extracted_data: summary.extractedData,
                call_duration: duration,
                call_status: "completed",
                metadata: {
                    endedReason: event.call.endedReason,
                    cost: event.call.cost,
                    recordingUrl: summary.recordingUrl,
                },
            },
            {
                onConflict: "call_id",
            }
        );

        if (error) {
            throw error;
        }

        requestLogger.info(
            { callId: event.call.id, duration },
            "Call ended event processed"
        );
    } catch (error) {
        requestLogger.error({ error }, "Failed to handle call ended event");
    }
}

/**
 * Handle transcript event (real-time)
 */
async function handleTranscript(event: VapiWebhookEvent) {
    const requestLogger = logger.child({
        handler: "transcript",
        callId: event.call.id,
    });

    try {
        requestLogger.info("Processing transcript event");

        // TODO: Handle real-time transcript updates
        // This could update the database with partial transcripts
        // or provide real-time feedback during the call

        requestLogger.info("Transcript event processed");
    } catch (error) {
        requestLogger.error({ error }, "Failed to handle transcript event");
    }
}
