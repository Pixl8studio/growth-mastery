/**
 * Integration Tests: VAPI Initiate Call API
 * Tests for app/api/vapi/initiate-call/route.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/vapi/initiate-call/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/vapi/client", () => ({
    createCall: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("POST /api/vapi/initiate-call", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should initiate call successfully", async () => {
        const { createCall } = await import("@/lib/vapi/client");
        (createCall as any).mockResolvedValue({
            callId: "call-123",
        });

        const request = new NextRequest("http://localhost:3000/api/vapi/initiate-call", {
            method: "POST",
            body: JSON.stringify({
                assistantId: "asst-123",
                customerId: "+1234567890",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("callId");
    });

    it("should handle call creation errors", async () => {
        const { createCall } = await import("@/lib/vapi/client");
        (createCall as any).mockRejectedValue(new Error("Call failed"));

        const request = new NextRequest("http://localhost:3000/api/vapi/initiate-call", {
            method: "POST",
            body: JSON.stringify({}),
        });

        const response = await POST(request);

        expect(response.status).toBeGreaterThanOrEqual(400);
    });
});
