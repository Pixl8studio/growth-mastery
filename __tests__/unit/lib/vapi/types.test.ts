/**
 * Unit Tests: VAPI Types
 * Tests for lib/vapi/types.ts
 */

import { describe, it, expect } from "vitest";
import type {
    CallStatus,
    EndReason,
    VapiCallConfig,
    VapiAssistant,
    VapiWebhookEvent,
    VapiCall,
    VapiMessage,
    ExtractedCallData,
    CallSummary,
} from "@/lib/vapi/types";

describe("VAPI Types", () => {
    describe("CallStatus", () => {
        it("should accept valid call status values", () => {
            const statuses: CallStatus[] = [
                "queued",
                "ringing",
                "in-progress",
                "forwarding",
                "ended",
            ];

            statuses.forEach((status) => {
                expect([
                    "queued",
                    "ringing",
                    "in-progress",
                    "forwarding",
                    "ended",
                ]).toContain(status);
            });
        });
    });

    describe("EndReason", () => {
        it("should accept valid end reason values", () => {
            const reasons: EndReason[] = [
                "assistant-ended-call",
                "customer-ended-call",
                "voicemail",
            ];

            reasons.forEach((reason) => {
                expect(typeof reason).toBe("string");
            });
        });
    });

    describe("VapiCallConfig", () => {
        it("should have correct structure", () => {
            const config: VapiCallConfig = {
                assistantId: "asst-123",
                phoneNumberId: "phone-456",
                customerId: "+1234567890",
                metadata: {
                    projectId: "proj-789",
                    userId: "user-123",
                },
            };

            expect(config.assistantId).toBe("asst-123");
            expect(config.metadata).toHaveProperty("projectId");
        });

        it("should allow minimal config", () => {
            const config: VapiCallConfig = {};

            expect(config).toBeDefined();
        });
    });

    describe("VapiAssistant", () => {
        it("should have correct structure", () => {
            const assistant: VapiAssistant = {
                name: "Test Assistant",
                model: {
                    provider: "openai",
                    model: "gpt-4",
                    temperature: 0.7,
                },
                voice: {
                    provider: "11labs",
                    voiceId: "voice-123",
                },
                firstMessage: "Hello, how can I help?",
            };

            expect(assistant.name).toBe("Test Assistant");
            expect(assistant.model.provider).toBe("openai");
            expect(assistant.voice.provider).toBe("11labs");
        });
    });

    describe("VapiCall", () => {
        it("should have correct structure for completed call", () => {
            const call: VapiCall = {
                id: "call-123",
                orgId: "org-456",
                type: "outboundPhoneCall",
                status: "ended",
                startedAt: "2025-01-01T00:00:00Z",
                endedAt: "2025-01-01T00:05:00Z",
                endedReason: "customer-ended-call",
                cost: 1.5,
                costBreakdown: {
                    transport: 0.5,
                    stt: 0.2,
                    llm: 0.5,
                    tts: 0.2,
                    vapi: 0.1,
                    total: 1.5,
                },
                transcript: "Full call transcript...",
                recordingUrl: "https://recordings.vapi.ai/call-123.mp3",
            };

            expect(call.status).toBe("ended");
            expect(call.cost).toBe(1.5);
            expect(call.costBreakdown).toHaveProperty("total");
        });

        it("should handle call with artifact", () => {
            const call: VapiCall = {
                id: "call-123",
                orgId: "org-456",
                type: "webCall",
                status: "ended",
                artifact: {
                    transcript: "Artifact transcript",
                    recordingUrl: "https://recordings.vapi.ai/call-123.mp3",
                    messagesOpenAIFormatted: [
                        { role: "user", content: "Hello" },
                        { role: "assistant", content: "Hi there!" },
                    ],
                },
            };

            expect(call.artifact).toBeDefined();
            expect(call.artifact?.messagesOpenAIFormatted).toHaveLength(2);
        });
    });

    describe("VapiMessage", () => {
        it("should have correct structure", () => {
            const message: VapiMessage = {
                role: "user",
                message: "Hello",
                time: 1000,
                endTime: 2000,
                secondsFromStart: 1,
            };

            expect(message.role).toBe("user");
            expect(message.secondsFromStart).toBe(1);
        });
    });

    describe("ExtractedCallData", () => {
        it("should have correct structure", () => {
            const data: ExtractedCallData = {
                businessName: "Acme Corp",
                industry: "Technology",
                targetAudience: "Small businesses",
                mainProblem: "Manual processes",
                currentSolution: "Spreadsheets",
                desiredOutcome: "Automation",
                pricePoint: 99,
                timeline: "3 months",
            };

            expect(data.businessName).toBe("Acme Corp");
            expect(data.pricePoint).toBe(99);
        });

        it("should allow partial data", () => {
            const data: ExtractedCallData = {
                businessName: "Test Corp",
            };

            expect(data).toBeDefined();
            expect(data.industry).toBeUndefined();
        });

        it("should allow custom fields", () => {
            const data: ExtractedCallData = {
                customField: "custom value",
            };

            expect(data.customField).toBe("custom value");
        });
    });

    describe("CallSummary", () => {
        it("should have correct structure", () => {
            const summary: CallSummary = {
                callId: "call-123",
                duration: 300,
                transcript: "Full transcript...",
                extractedData: {
                    businessName: "Test Corp",
                },
                recordingUrl: "https://recordings.vapi.ai/call-123.mp3",
                cost: 1.5,
            };

            expect(summary.callId).toBe("call-123");
            expect(summary.duration).toBe(300);
            expect(summary.extractedData).toBeDefined();
        });

        it("should allow including full call object", () => {
            const call: VapiCall = {
                id: "call-123",
                orgId: "org-456",
                type: "outboundPhoneCall",
                status: "ended",
            };

            const summary: CallSummary = {
                callId: "call-123",
                duration: 300,
                transcript: "",
                extractedData: {},
                call,
            };

            expect(summary.call).toBeDefined();
            expect(summary.call?.id).toBe("call-123");
        });
    });

    describe("VapiWebhookEvent", () => {
        it("should have correct structure", () => {
            const event: VapiWebhookEvent = {
                type: "call.ended",
                call: {
                    id: "call-123",
                    orgId: "org-456",
                    type: "outboundPhoneCall",
                    status: "ended",
                },
                timestamp: "2025-01-01T00:00:00Z",
            };

            expect(event.type).toBe("call.ended");
            expect(event.call.id).toBe("call-123");
        });

        it("should support all event types", () => {
            const eventTypes: Array<VapiWebhookEvent["type"]> = [
                "call.started",
                "call.ended",
                "transcript",
                "function-call",
            ];

            eventTypes.forEach((type) => {
                expect([
                    "call.started",
                    "call.ended",
                    "transcript",
                    "function-call",
                ]).toContain(type);
            });
        });
    });
});
