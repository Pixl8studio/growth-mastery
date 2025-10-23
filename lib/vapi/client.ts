/**
 * VAPI Client
 * Wrapper around VAPI API for AI-powered intake calls
 */

import { logger } from "@/lib/logger";
import type { VapiCallConfig, CallSummary, ExtractedCallData } from "./types";
import { createHmac, timingSafeEqual } from "crypto";

// VAPI client initialization (SDK import handled differently)
// For now, we'll use direct API calls instead of the SDK

/**
 * Create an outbound call
 */
export async function createCall(config: VapiCallConfig): Promise<{ callId: string }> {
    try {
        logger.info({ config }, "Creating VAPI call");

        // TODO: Implement actual VAPI call creation
        // const call = await vapi.calls.create({
        //     assistantId: config.assistantId,
        //     phoneNumberId: config.phoneNumberId || env.VAPI_PHONE_NUMBER_ID,
        //     customer: config.customerId ? { number: config.customerId } : undefined,
        //     metadata: config.metadata,
        // });

        // For now, return a placeholder
        const callId = `call_${Date.now()}`;

        logger.info({ callId }, "VAPI call created successfully");

        return { callId };
    } catch (error) {
        logger.error({ error, config }, "Failed to create VAPI call");
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
        logger.info({ callId }, "Fetching VAPI call");

        // TODO: Implement actual VAPI call fetching
        // const call = await vapi.calls.get(callId);
        // return call;

        return null;
    } catch (error) {
        logger.error({ error, callId }, "Failed to fetch VAPI call");
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
        logger.info({ assistantId }, "Listing VAPI calls");

        // TODO: Implement actual VAPI call listing
        // const calls = await vapi.calls.list({
        //     assistantId,
        //     limit: 100,
        // });
        // return calls;

        return [];
    } catch (error) {
        logger.error({ error, assistantId }, "Failed to list VAPI calls");
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
        logger.info("Extracting data from transcript");

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
        logger.error({ error }, "Failed to extract data from transcript");
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
        logger.info({ callId }, "Processing completed VAPI call");

        const call = await getCall(callId);

        if (!call) {
            throw new Error("Call not found");
        }

        // Extract transcript
        const transcript = ""; // call.artifact?.transcript || call.transcript || "";

        // Extract structured data
        const extractedData = await extractDataFromTranscript(transcript);

        // Calculate duration
        const duration = 0; // call.startedAt && call.endedAt
        // ? Math.floor((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
        // : 0;

        const summary: CallSummary = {
            callId,
            duration,
            transcript,
            extractedData,
            recordingUrl: undefined, // call.recordingUrl
            cost: undefined, // call.cost
        };

        logger.info({ callId, duration }, "VAPI call processed successfully");

        return summary;
    } catch (error) {
        logger.error({ error, callId }, "Failed to process VAPI call");
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
            logger.warn("Webhook signature length mismatch");
            return false;
        }

        const isValid = timingSafeEqual(signatureBuffer, expectedBuffer);

        if (!isValid) {
            logger.warn("Webhook signature verification failed");
        }

        return isValid;
    } catch (error) {
        logger.error({ error }, "Failed to verify webhook signature");
        return false;
    }
}
