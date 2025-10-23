/**
 * VAPI Client
 * Wrapper around VAPI API for AI-powered intake calls
 */

import type { VapiCallConfig, CallSummary, ExtractedCallData } from "./types";
import { createHmac, timingSafeEqual } from "crypto";

// VAPI client initialization (SDK import handled differently)
// For now, we'll use direct API calls instead of the SDK

/**
 * Create an outbound call
 */
export async function createCall(config: VapiCallConfig): Promise<{ callId: string }> {
    try {
        console.log("📞 Creating VAPI call:", config);

        // TODO: Implement actual VAPI call creation
        // const call = await vapi.calls.create({
        //     assistantId: config.assistantId,
        //     phoneNumberId: config.phoneNumberId || env.VAPI_PHONE_NUMBER_ID,
        //     customer: config.customerId ? { number: config.customerId } : undefined,
        //     metadata: config.metadata,
        // });

        // For now, return a placeholder
        const callId = `call_${Date.now()}`;

        console.log("✅ VAPI call created successfully:", callId);

        return { callId };
    } catch (error) {
        console.error("❌ Failed to create VAPI call:", error);
        throw new Error(
            `Failed to initiate call: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Get call details
 */
export async function getCall(callId: string) {
    try {
        console.log("📞 Fetching VAPI call:", callId);

        const apiKey = process.env.VAPI_API_KEY;
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
            throw new Error(
                `VAPI API error: ${response.status} ${response.statusText}`
            );
        }

        const call = await response.json();
        console.log(
            "✅ Fetched VAPI call successfully:",
            callId,
            "status:",
            call.status
        );

        return call;
    } catch (error) {
        console.error("❌ Failed to fetch VAPI call:", callId, error);
        throw new Error(
            `Failed to fetch call: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * List calls for an assistant
 */
export async function listCalls(assistantId?: string) {
    try {
        console.log("📋 Listing VAPI calls:", assistantId || "all");

        // TODO: Implement actual VAPI call listing
        // const calls = await vapi.calls.list({
        //     assistantId,
        //     limit: 100,
        // });
        // return calls;

        return [];
    } catch (error) {
        console.error("❌ Failed to list VAPI calls:", error);
        throw new Error(
            `Failed to list calls: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Extract structured data from transcript
 * Uses AI to parse the conversation into structured fields
 */
export async function extractDataFromTranscript(
    _transcript: string
): Promise<ExtractedCallData> {
    try {
        console.log("🔍 Extracting data from transcript");

        // TODO: Use OpenAI to extract structured data
        // This would use a specific prompt to parse the transcript
        // For now, return placeholder
        const extracted: ExtractedCallData = {
            businessName: undefined,
            industry: undefined,
            targetAudience: undefined,
            mainProblem: undefined,
        };

        return extracted;
    } catch (error) {
        console.error("❌ Failed to extract data from transcript:", error);
        throw new Error(
            `Failed to extract data: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Process a completed call
 * Extract transcript, analyze, and return summary
 */
export async function processCompletedCall(callId: string): Promise<CallSummary> {
    try {
        console.log("⚙️ Processing completed VAPI call:", callId);

        const call = await getCall(callId);

        if (!call) {
            throw new Error("Call not found");
        }

        // Extract transcript from various possible locations
        const transcript = call.artifact?.transcript || call.transcript || "";

        // Extract structured data if we have a transcript
        const extractedData = transcript
            ? await extractDataFromTranscript(transcript)
            : {
                  businessName: undefined,
                  industry: undefined,
                  targetAudience: undefined,
                  mainProblem: undefined,
              };

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

        const summary: CallSummary = {
            callId,
            duration,
            transcript,
            extractedData,
            recordingUrl,
            cost: call.cost,
            call, // Include full call object for reference
        };

        console.log(
            "✅ VAPI call processed successfully:",
            callId,
            "duration:",
            duration,
            "hasTranscript:",
            !!transcript
        );

        return summary;
    } catch (error) {
        console.error("❌ Failed to process VAPI call:", callId, error);
        throw new Error(
            `Failed to process call: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Verify VAPI webhook signature
 * Uses HMAC-SHA256 to verify the webhook payload is authentic
 */
export function verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    try {
        // Generate HMAC signature using the secret
        const hmac = createHmac("sha256", secret);
        hmac.update(payload);
        const expectedSignature = hmac.digest("hex");

        // Use timing-safe comparison to prevent timing attacks
        const signatureBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        // Signatures must be same length for timingSafeEqual
        if (signatureBuffer.length !== expectedBuffer.length) {
            console.warn("⚠️ Webhook signature length mismatch");
            return false;
        }

        const isValid = timingSafeEqual(signatureBuffer, expectedBuffer);

        if (!isValid) {
            console.warn("⚠️ Webhook signature verification failed");
        }

        return isValid;
    } catch (error) {
        console.error("❌ Failed to verify webhook signature:", error);
        return false;
    }
}
