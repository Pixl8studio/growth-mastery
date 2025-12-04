/**
 * Integration Tests: VAPI Webhook API
 * Tests for app/api/vapi/webhook/route.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/vapi/webhook/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/vapi/client", () => ({
    verifyWebhookSignature: vi.fn(),
    processCompletedCall: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("POST /api/vapi/webhook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should process webhook event successfully", async () => {
        const { verifyWebhookSignature, processCompletedCall } = await import(
            "@/lib/vapi/client"
        );
        (verifyWebhookSignature as any).mockReturnValue(true);
        (processCompletedCall as any).mockResolvedValue({
            callId: "call-123",
            duration: 300,
            transcript: "Test transcript",
            extractedData: {},
        });

        const webhookPayload = {
            type: "call.ended",
            call: { id: "call-123", status: "ended" },
            timestamp: "2025-01-01T00:00:00Z",
        };

        const request = new NextRequest("http://localhost:3000/api/vapi/webhook", {
            method: "POST",
            headers: {
                "x-vapi-signature": "valid-signature",
            },
            body: JSON.stringify(webhookPayload),
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
    });

    it("should reject invalid signature", async () => {
        const { verifyWebhookSignature } = await import("@/lib/vapi/client");
        (verifyWebhookSignature as any).mockReturnValue(false);

        const request = new NextRequest("http://localhost:3000/api/vapi/webhook", {
            method: "POST",
            headers: {
                "x-vapi-signature": "invalid-signature",
            },
            body: JSON.stringify({ type: "call.ended" }),
        });

        const response = await POST(request);

        expect(response.status).toBe(401);
    });
});
