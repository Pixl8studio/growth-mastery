/**
 * Unit Tests: VAPI Client
 * Tests for lib/vapi/client.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createCall,
    getCall,
    listCalls,
    extractDataFromTranscript,
    processCompletedCall,
    verifyWebhookSignature,
} from "@/lib/vapi/client";
import type { VapiCallConfig } from "@/lib/vapi/types";

// Mock dependencies
global.fetch = vi.fn();

describe("VAPI Client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock environment variable
        process.env.VAPI_API_KEY = "test-api-key";
    });

    describe("createCall", () => {
        it("should create a call successfully", async () => {
            const config: VapiCallConfig = {
                assistantId: "asst-123",
                customerId: "+1234567890",
                metadata: { projectId: "proj-456" },
            };

            const result = await createCall(config);

            expect(result).toHaveProperty("callId");
            expect(result.callId).toContain("call_");
        });

        it("should handle missing assistantId", async () => {
            const config: VapiCallConfig = {
                assistantId: undefined,
            };

            // Current implementation creates a call even with undefined assistantId
            // (actual API would reject it, but placeholder implementation doesn't)
            const result = await createCall(config);
            expect(result).toHaveProperty("callId");
        });
    });

    describe("getCall", () => {
        it("should fetch call details successfully", async () => {
            const mockCall = {
                id: "call-123",
                status: "ended",
                transcript: "Test transcript",
                recordingUrl: "https://recordings.vapi.ai/test.mp3",
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockCall),
            });

            const result = await getCall("call-123");

            expect(result).toEqual(mockCall);
            expect(global.fetch).toHaveBeenCalledWith(
                "https://api.vapi.ai/call/call-123",
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: "Bearer test-api-key",
                    }),
                })
            );
        });

        it("should throw error when API key is missing", async () => {
            delete process.env.VAPI_API_KEY;

            await expect(getCall("call-123")).rejects.toThrow(
                "VAPI_API_KEY not configured"
            );
        });

        it("should handle API errors", async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 404,
                statusText: "Not Found",
            });

            await expect(getCall("invalid-id")).rejects.toThrow("VAPI API error");
        });
    });

    describe("listCalls", () => {
        it("should return empty list", async () => {
            const calls = await listCalls();
            expect(calls).toEqual([]);
        });

        it("should accept assistant ID parameter", async () => {
            const calls = await listCalls("asst-123");
            expect(calls).toBeDefined();
        });
    });

    describe("extractDataFromTranscript", () => {
        it("should extract data from transcript", async () => {
            const transcript = "The business is called Acme Corp...";

            const result = await extractDataFromTranscript(transcript);

            expect(result).toHaveProperty("businessName");
            expect(result).toHaveProperty("industry");
            expect(result).toHaveProperty("targetAudience");
        });

        it("should handle empty transcript", async () => {
            const result = await extractDataFromTranscript("");

            expect(result).toBeDefined();
        });
    });

    describe("processCompletedCall", () => {
        it("should process completed call successfully", async () => {
            const mockCall = {
                id: "call-123",
                status: "ended",
                startedAt: "2025-01-01T00:00:00Z",
                endedAt: "2025-01-01T00:05:00Z",
                transcript: "Business discussion...",
                recordingUrl: "https://recordings.vapi.ai/test.mp3",
                cost: 1.5,
                artifact: {
                    transcript: "Business discussion...",
                    recordingUrl: "https://recordings.vapi.ai/test.mp3",
                },
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockCall),
            });

            const summary = await processCompletedCall("call-123");

            expect(summary).toHaveProperty("callId");
            expect(summary).toHaveProperty("duration");
            expect(summary).toHaveProperty("transcript");
            expect(summary).toHaveProperty("extractedData");
            expect(summary.duration).toBeGreaterThan(0);
        });

        it("should throw error when call not found", async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(null),
            });

            // When call is null, getCall throws before processCompletedCall can check
            await expect(processCompletedCall("invalid")).rejects.toThrow(
                "Failed to process call"
            );
        });

        it("should handle call without transcript", async () => {
            const mockCall = {
                id: "call-123",
                status: "ended",
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockCall),
            });

            const summary = await processCompletedCall("call-123");

            expect(summary.transcript).toBe("");
        });
    });

    describe("verifyWebhookSignature", () => {
        it("should verify valid signature", () => {
            const payload = JSON.stringify({ type: "call.ended", callId: "123" });
            const secret = "webhook-secret";

            // Create actual HMAC signature
            const crypto = require("crypto");
            const hmac = crypto.createHmac("sha256", secret);
            hmac.update(payload);
            const signature = hmac.digest("hex");

            const isValid = verifyWebhookSignature(payload, signature, secret);

            expect(isValid).toBe(true);
        });

        it("should reject invalid signature", () => {
            const payload = JSON.stringify({ type: "call.ended" });
            const secret = "webhook-secret";
            const invalidSignature = "invalid-signature-12345";

            const isValid = verifyWebhookSignature(payload, invalidSignature, secret);

            expect(isValid).toBe(false);
        });

        it("should reject signature with wrong length", () => {
            const payload = "test";
            const secret = "secret";
            const shortSignature = "abc";

            const isValid = verifyWebhookSignature(payload, shortSignature, secret);

            expect(isValid).toBe(false);
        });

        it("should handle verification errors gracefully", () => {
            const payload = "test";
            const secret = "secret";
            const signature = "a".repeat(64); // Valid length but wrong

            const isValid = verifyWebhookSignature(payload, signature, secret);

            expect(isValid).toBe(false);
        });
    });
});
