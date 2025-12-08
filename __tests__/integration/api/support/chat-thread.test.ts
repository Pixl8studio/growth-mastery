/**
 * Integration Tests: Support Chat Thread API
 * Tests for app/api/support/chat/thread/route.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/support/chat/thread/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/openai/assistants-client", () => ({
    createThread: vi.fn(),
    getMessages: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("POST /api/support/chat/thread", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should create thread successfully", async () => {
        const { createThread } = await import("@/lib/openai/assistants-client");
        (createThread as any).mockResolvedValue("thread-123");

        const request = new NextRequest(
            "http://localhost:3000/api/support/chat/thread",
            {
                method: "POST",
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("threadId");
    });

    it("should handle thread creation errors", async () => {
        const { createThread } = await import("@/lib/openai/assistants-client");
        (createThread as any).mockRejectedValue(new Error("Failed to create thread"));

        const request = new NextRequest(
            "http://localhost:3000/api/support/chat/thread",
            {
                method: "POST",
            }
        );

        const response = await POST(request);

        expect(response.status).toBeGreaterThanOrEqual(400);
    });
});
