import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSupabase = {
    from: vi.fn(),
};

const mockCreateClient = vi.fn().mockResolvedValue(mockSupabase);

vi.mock("@/lib/supabase/server", () => ({
    createClient: mockCreateClient,
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

vi.mock("@/lib/utils", () => ({
    retry: vi.fn((fn) => fn()),
}));

vi.mock("@/lib/config", () => ({
    WEBHOOK_CONFIG: {
        MAX_RETRIES: 3,
        TIMEOUT_MS: 5000,
    },
}));

const { getWebhookConfig } = await import("@/lib/webhook-service");

describe("Webhook Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getWebhookConfig", () => {
        it("returns global config when no page context", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: {
                                webhook_enabled: true,
                                crm_webhook_url: "https://example.com/webhook",
                                webhook_secret: "secret123",
                            },
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await getWebhookConfig("user-123");

            expect(result.enabled).toBe(true);
            expect(result.url).toBe("https://example.com/webhook");
            expect(result.isInherited).toBe(false);
        });

        it("returns disabled config when profile not found", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Not found" },
                        }),
                    }),
                }),
            });

            const result = await getWebhookConfig("invalid-user");

            expect(result.enabled).toBe(false);
            expect(result.url).toBeNull();
        });
    });
});
