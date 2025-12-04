import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSupabase = {
    auth: {
        getUser: vi.fn(),
    },
};

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        })),
    },
}));

vi.mock("@/lib/webhook-service", () => ({
    sendWebhookDirect: vi.fn(),
}));

const { POST } = await import("@/app/api/user/webhook/test/route");

describe("Webhook Test API Route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("POST /api/user/webhook/test", () => {
        it("requires authentication", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
            });

            const request = new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({}),
            });

            const response = await POST(request as any);
            expect(response.status).toBe(401);
        });

        it("sends test webhook when authenticated", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: "user-123" } },
            });

            const { sendWebhookDirect } = await import("@/lib/webhook-service");
            (sendWebhookDirect as any).mockResolvedValue({
                success: true,
                statusCode: 200,
            });

            const request = new Request("http://localhost", {
                method: "POST",
                body: JSON.stringify({
                    webhookUrl: "https://example.com/webhook",
                }),
            });

            const response = await POST(request as any);
            const data = await response.json();

            expect(data.success).toBe(true);
        });
    });
});
