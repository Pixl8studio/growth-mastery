/**
 * Integration Tests: Support Chat Message API
 * Tests for app/api/support/chat/message/route.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/support/chat/message/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/openai/assistants-client", () => ({
    sendMessage: vi.fn(),
    runAssistant: vi.fn(),
    getRunStatus: vi.fn(),
    getMessages: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("POST /api/support/chat/message", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should send message and get response", async () => {
        const { sendMessage, runAssistant, getRunStatus, getMessages } = await import(
            "@/lib/openai/assistants-client"
        );

        (sendMessage as any).mockResolvedValue(undefined);
        (runAssistant as any).mockResolvedValue("run-123");
        (getRunStatus as any).mockResolvedValue({ status: "completed" });
        (getMessages as any).mockResolvedValue([
            {
                role: "assistant",
                content: [{ text: { value: "Hello, how can I help?" } }],
            },
        ]);

        const request = new NextRequest(
            "http://localhost:3000/api/support/chat/message",
            {
                method: "POST",
                body: JSON.stringify({
                    threadId: "thread-123",
                    message: "I need help",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("response");
    });

    it("should handle missing threadId", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/support/chat/message",
            {
                method: "POST",
                body: JSON.stringify({
                    message: "Test",
                }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle message sending errors", async () => {
        const { sendMessage } = await import("@/lib/openai/assistants-client");
        (sendMessage as any).mockRejectedValue(new Error("Failed to send"));

        const request = new NextRequest(
            "http://localhost:3000/api/support/chat/message",
            {
                method: "POST",
                body: JSON.stringify({
                    threadId: "thread-123",
                    message: "Test",
                }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBeGreaterThanOrEqual(400);
    });
});
