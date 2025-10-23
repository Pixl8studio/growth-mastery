/**
 * VAPI Webhook Handler
 * Receives webhook events from VAPI (call status updates, transcripts)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/vapi/client";
import { logger as pinoLogger } from "@/lib/logger";
import { env } from "@/lib/env";
import type { VapiWebhookEvent } from "@/lib/vapi/types";

// Environment-aware logging: console in dev, Pino in production
const isDev = process.env.NODE_ENV === "development";
const log = isDev
    ? {
          info: (msg: string, data?: any) => console.log(`ℹ️ ${msg}`, data || ""),
          error: (msg: string, data?: any) => console.error(`❌ ${msg}`, data || ""),
          warn: (msg: string, data?: any) => console.warn(`⚠️ ${msg}`, data || ""),
          debug: (msg: string, data?: any) => console.log(`🔍 ${msg}`, data || ""),
      }
    : {
          info: (msg: string, data?: any) => pinoLogger.info(data || {}, msg),
          error: (msg: string, data?: any) => pinoLogger.error(data || {}, msg),
          warn: (msg: string, data?: any) => pinoLogger.warn(data || {}, msg),
          debug: (msg: string, data?: any) => pinoLogger.debug(data || {}, msg),
      };

export async function POST(request: NextRequest) {
    try {
        console.log("📡 VAPI Webhook handler called");
        const rawBody = await request.text();
        const data = JSON.parse(rawBody);

        // Check if this is a client-initiated call (with callId or timestamp)
        // or a VAPI webhook event (with type field)
        if (data.type) {
            // This is a VAPI webhook event
            const signature = request.headers.get("x-vapi-signature");

            // Verify webhook signature
            if (env.VAPI_WEBHOOK_SECRET && signature) {
                const isValid = verifyWebhookSignature(
                    rawBody,
                    signature,
                    env.VAPI_WEBHOOK_SECRET
                );

                if (!isValid) {
                    log.warn("Invalid webhook signature");
                    return NextResponse.json(
                        { error: "Invalid signature" },
                        { status: 401 }
                    );
                }
            }

            const event: VapiWebhookEvent = data;
            log.info("Received VAPI webhook", {
                eventType: event.type,
                callId: event.call?.id,
            });

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
                    log.info("Unhandled webhook event type", { eventType: event.type });
            }

            return NextResponse.json({ success: true });
        } else {
            // This is a client-initiated request to save a transcript
            const { callId, callStartTimestamp, projectId, userId } = data;

            log.info("Client requesting transcript save", {
                callId,
                callStartTimestamp,
                projectId,
                userId,
            });

            return await handleClientTranscriptRequest(
                callId,
                callStartTimestamp,
                projectId,
                userId
            );
        }
    } catch (error) {
        log.error("Failed to process VAPI webhook", error);
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
    try {
        console.log("📞 Processing call started event:", event.call.id);

        const supabase = await createClient();

        // Extract funnel project ID from metadata
        const funnelProjectId = event.call.metadata?.funnelProjectId as
            | string
            | undefined;
        const userId = event.call.metadata?.userId as string | undefined;

        if (!funnelProjectId || !userId) {
            console.warn("⚠️ Missing funnel project ID or user ID in metadata");
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

        console.log("✅ Call started event processed:", event.call.id);
    } catch (error) {
        console.error("❌ Failed to handle call started event:", error);
    }
}

/**
 * Handle call ended event
 */
async function handleCallEnded(event: VapiWebhookEvent) {
    try {
        console.log("🔴 Processing call ended event:", event.call.id);

        // Process the completed call
        const summary = await processCompletedCallSimple(event.call.id);

        const supabase = await createClient();

        // Extract funnel project ID from metadata
        const funnelProjectId = event.call.metadata?.funnelProjectId as
            | string
            | undefined;
        const userId = event.call.metadata?.userId as string | undefined;

        if (!funnelProjectId || !userId) {
            console.warn("⚠️ Missing funnel project ID or user ID in metadata");
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

        // Check if transcript already exists
        const { data: existing } = await supabase
            .from("vapi_transcripts")
            .select("id")
            .eq("call_id", event.call.id)
            .single();

        if (existing) {
            // Update existing record
            const { error } = await supabase
                .from("vapi_transcripts")
                .update({
                    transcript_text:
                        event.call.artifact?.transcript || summary.transcript,
                    extracted_data: summary.extractedData,
                    call_duration: duration,
                    call_status: "completed",
                    metadata: {
                        endedReason: event.call.endedReason,
                        cost: event.call.cost,
                        recordingUrl: summary.recordingUrl,
                    },
                })
                .eq("call_id", event.call.id);

            if (error) throw error;
        } else {
            // Insert new record
            const { error } = await supabase.from("vapi_transcripts").insert({
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
            });

            if (error) throw error;
        }

        console.log(
            "✅ Call ended event processed:",
            event.call.id,
            "duration:",
            duration
        );
    } catch (error) {
        console.error("❌ Failed to handle call ended event:", error);
    }
}

/**
 * Handle transcript event (real-time)
 */
async function handleTranscript(event: VapiWebhookEvent) {
    try {
        console.log("📝 Processing transcript event:", event.call.id);

        // TODO: Handle real-time transcript updates
        // This could update the database with partial transcripts
        // or provide real-time feedback during the call

        console.log("✅ Transcript event processed");
    } catch (error) {
        console.error("❌ Failed to handle transcript event:", error);
    }
}

/**
 * Handle client-initiated transcript request
 * This function fetches the call from VAPI and saves it to the database
 */
async function handleClientTranscriptRequest(
    callId: string | null,
    callStartTimestamp: string | null,
    projectId: string,
    userId: string
) {
    try {
        let targetCallId = callId;

        // If no call ID provided, try to find it by timestamp
        if (!targetCallId && callStartTimestamp) {
            log.info("No call ID provided, searching by timestamp", {
                callStartTimestamp,
            });

            // Fetch recent calls from VAPI
            const vapiApiKey = env.VAPI_API_KEY;
            if (!vapiApiKey) {
                throw new Error("VAPI API key not configured");
            }

            const listResponse = await fetch("https://api.vapi.ai/call", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${vapiApiKey}`,
                    "Content-Type": "application/json",
                },
            });

            if (!listResponse.ok) {
                throw new Error(
                    `Failed to list VAPI calls: ${listResponse.statusText}`
                );
            }

            const calls = await listResponse.json();
            log.info("Retrieved calls from VAPI", { totalCalls: calls.length });

            // Match by timestamp (within 3 minutes)
            const targetTime = new Date(callStartTimestamp);
            const matchWindow = 3 * 60 * 1000; // 3 minutes

            for (const call of calls) {
                if (!call.startedAt) continue;

                const callTime = new Date(call.startedAt);
                const timeDiff = Math.abs(targetTime.getTime() - callTime.getTime());

                log.debug("Checking call timestamp", {
                    callId: call.id,
                    diffSeconds: Math.round(timeDiff / 1000),
                });

                if (timeDiff <= matchWindow) {
                    targetCallId = call.id;
                    log.info("Found matching call by timestamp", {
                        callId: targetCallId,
                        diffSeconds: Math.round(timeDiff / 1000),
                    });
                    break;
                }
            }

            if (!targetCallId) {
                log.warn("No matching call found by timestamp");
                return NextResponse.json(
                    { error: "Call not found by timestamp" },
                    { status: 404 }
                );
            }
        }

        if (!targetCallId) {
            return NextResponse.json(
                { error: "No call ID or timestamp provided" },
                { status: 400 }
            );
        }

        log.info("Processing call transcript", { callId: targetCallId });

        // Fetch and process the call (using simple fetch, not the helper)
        const summary = await processCompletedCallSimple(targetCallId);

        const supabase = await createClient();

        // Calculate duration
        const duration =
            summary.call?.startedAt && summary.call?.endedAt
                ? Math.floor(
                      (new Date(summary.call.endedAt).getTime() -
                          new Date(summary.call.startedAt).getTime()) /
                          1000
                  )
                : 0;

        // Check if transcript already exists
        const { data: existing } = await supabase
            .from("vapi_transcripts")
            .select("id")
            .eq("call_id", targetCallId)
            .single();

        if (existing) {
            console.log("ℹ️ Transcript already exists for call:", targetCallId);
            // Update existing record
            const { error } = await supabase
                .from("vapi_transcripts")
                .update({
                    transcript_text: summary.transcript,
                    extracted_data: summary.extractedData,
                    call_duration: duration,
                    call_status: "completed",
                    metadata: {
                        recordingUrl: summary.recordingUrl,
                        processedAt: new Date().toISOString(),
                    },
                })
                .eq("call_id", targetCallId);

            if (error) throw error;
        } else {
            // Insert new record
            const { error } = await supabase.from("vapi_transcripts").insert({
                funnel_project_id: projectId,
                user_id: userId,
                call_id: targetCallId,
                transcript_text: summary.transcript,
                extracted_data: summary.extractedData,
                call_duration: duration,
                call_status: "completed",
                metadata: {
                    recordingUrl: summary.recordingUrl,
                    processedAt: new Date().toISOString(),
                },
            });

            if (error) throw error;
        }

        log.info("Transcript saved successfully", { callId: targetCallId, duration });

        return NextResponse.json({
            success: true,
            callId: targetCallId,
            transcript: summary.transcript,
            duration,
        });
    } catch (error) {
        log.error("Failed to handle client transcript request", error);
        return NextResponse.json(
            { error: "Failed to process transcript" },
            { status: 500 }
        );
    }
}

/**
 * Simplified version of processCompletedCall that doesn't use the logger
 */
async function processCompletedCallSimple(callId: string) {
    console.log("📞 Fetching call from VAPI:", callId);

    const apiKey = env.VAPI_API_KEY;
    if (!apiKey) {
        throw new Error("VAPI_API_KEY not configured");
    }

    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`VAPI API error: ${response.status} ${response.statusText}`);
    }

    const call = await response.json();
    console.log("✅ Fetched call successfully:", { callId, status: call.status });

    // Extract transcript from various possible locations
    const transcript = call.artifact?.transcript || call.transcript || "";

    // Calculate duration
    const duration =
        call.startedAt && call.endedAt
            ? Math.floor(
                  (new Date(call.endedAt).getTime() -
                      new Date(call.startedAt).getTime()) /
                      1000
              )
            : 0;

    // Get recording URL from various possible locations
    const recordingUrl =
        call.artifact?.recordingUrl || call.recordingUrl || call.recording?.url;

    return {
        callId,
        duration,
        transcript,
        extractedData: {},
        recordingUrl,
        cost: call.cost,
        call,
    };
}
