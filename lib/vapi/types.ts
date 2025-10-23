/**
 * VAPI Types
 * Type definitions for VAPI AI calling system
 */

// Call status
export type CallStatus = "queued" | "ringing" | "in-progress" | "forwarding" | "ended";

// Call end reasons
export type EndReason =
    | "assistant-ended-call"
    | "assistant-forwarded-call"
    | "assistant-join-timeout"
    | "customer-ended-call"
    | "customer-did-not-answer"
    | "pipeline-error-openai-voice-failed"
    | "silence-timed-out"
    | "voicemail";

// VAPI call configuration
export interface VapiCallConfig {
    assistantId?: string;
    assistant?: VapiAssistant;
    phoneNumberId?: string;
    customerId?: string;
    metadata?: Record<string, unknown>;
}

// VAPI assistant configuration
export interface VapiAssistant {
    name: string;
    model: {
        provider: "openai";
        model: string;
        temperature?: number;
        messages?: Array<{
            role: "system" | "user" | "assistant";
            content: string;
        }>;
    };
    voice: {
        provider: "11labs" | "openai" | "playht";
        voiceId: string;
    };
    firstMessage?: string;
    endCallMessage?: string;
    endCallPhrases?: string[];
}

// VAPI webhook events
export interface VapiWebhookEvent {
    type: "call.started" | "call.ended" | "transcript" | "function-call";
    call: VapiCall;
    timestamp: string;
}

// VAPI call object
export interface VapiCall {
    id: string;
    orgId: string;
    type: "inboundPhoneCall" | "outboundPhoneCall" | "webCall";
    status: CallStatus;
    startedAt?: string;
    endedAt?: string;
    endedReason?: EndReason;
    cost?: number;
    costBreakdown?: {
        transport: number;
        stt: number;
        llm: number;
        tts: number;
        vapi: number;
        total: number;
    };
    messages?: VapiMessage[];
    transcript?: string;
    recordingUrl?: string;
    stereoRecordingUrl?: string;
    artifact?: {
        transcript?: string;
        messages?: VapiMessage[];
        messagesOpenAIFormatted?: Array<{
            role: string;
            content: string;
        }>;
    };
    metadata?: Record<string, unknown>;
}

// VAPI message
export interface VapiMessage {
    role: "system" | "user" | "assistant" | "function";
    message: string;
    time: number;
    endTime?: number;
    secondsFromStart: number;
}

// Extracted data from transcript
export interface ExtractedCallData {
    businessName?: string;
    industry?: string;
    targetAudience?: string;
    mainProblem?: string;
    currentSolution?: string;
    desiredOutcome?: string;
    pricePoint?: number;
    timeline?: string;
    [key: string]: unknown;
}

// Call summary for storage
export interface CallSummary {
    callId: string;
    duration: number;
    transcript: string;
    extractedData: ExtractedCallData;
    recordingUrl?: string;
    cost?: number;
}
