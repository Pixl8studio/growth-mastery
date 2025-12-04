import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/followup/webhooks/email/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/providers/email-provider", () => ({
    getEmailProvider: vi.fn(),
}));
vi.mock("@/lib/followup/compliance-service", () => ({
    processBounce: vi.fn(),
    processComplaint: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getEmailProvider } from "@/lib/followup/providers/email-provider";

describe("POST /api/followup/webhooks/email", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should process delivered event successfully", async () => {
        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "followup_deliveries") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "delivery-123",
                                prospect_id: "prospect-123",
                            },
                            error: null,
                        }),
                        update: vi.fn().mockReturnThis(),
                    };
                }
                return {};
            }),
        };

        const mockEmailProvider = {
            verifyWebhook: vi.fn().mockReturnValue(true),
            processWebhookEvent: vi.fn().mockReturnValue({
                provider_message_id: "msg-123",
                event_type: "delivered",
                email: "test@example.com",
                timestamp: new Date().toISOString(),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getEmailProvider).mockResolvedValue(
            mockEmailProvider as any
        );

        const request = createMockRequest({
            method: "POST",
            body: {
                event: "delivered",
                email: "test@example.com",
                message_id: "msg-123",
            },
            headers: {
                "x-signature": "valid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.processed).toBe(1);
    });

    it("should process opened event successfully", async () => {
        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "followup_deliveries") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "delivery-123",
                                prospect_id: "prospect-123",
                            },
                            error: null,
                        }),
                        update: vi.fn().mockReturnThis(),
                    };
                }
                return {};
            }),
        };

        const mockEmailProvider = {
            verifyWebhook: vi.fn().mockReturnValue(true),
            processWebhookEvent: vi.fn().mockReturnValue({
                provider_message_id: "msg-123",
                event_type: "opened",
                email: "test@example.com",
                timestamp: new Date().toISOString(),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getEmailProvider).mockResolvedValue(
            mockEmailProvider as any
        );

        const request = createMockRequest({
            method: "POST",
            body: {
                event: "opened",
                email: "test@example.com",
                message_id: "msg-123",
            },
            headers: {
                "x-signature": "valid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should process multiple events in batch", async () => {
        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "followup_deliveries") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "delivery-123",
                                prospect_id: "prospect-123",
                            },
                            error: null,
                        }),
                        update: vi.fn().mockReturnThis(),
                    };
                }
                return {};
            }),
        };

        const mockEmailProvider = {
            verifyWebhook: vi.fn().mockReturnValue(true),
            processWebhookEvent: vi
                .fn()
                .mockReturnValueOnce({
                    provider_message_id: "msg-1",
                    event_type: "delivered",
                    email: "test1@example.com",
                    timestamp: new Date().toISOString(),
                })
                .mockReturnValueOnce({
                    provider_message_id: "msg-2",
                    event_type: "opened",
                    email: "test2@example.com",
                    timestamp: new Date().toISOString(),
                }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getEmailProvider).mockResolvedValue(
            mockEmailProvider as any
        );

        const request = createMockRequest({
            method: "POST",
            body: [
                { event: "delivered", message_id: "msg-1" },
                { event: "opened", message_id: "msg-2" },
            ],
            headers: {
                "x-signature": "valid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.processed).toBe(2);
    });

    it("should return 401 for invalid signature", async () => {
        const mockEmailProvider = {
            verifyWebhook: vi.fn().mockReturnValue(false),
        };

        vi.mocked(getEmailProvider).mockResolvedValue(
            mockEmailProvider as any
        );

        const request = createMockRequest({
            method: "POST",
            body: { event: "delivered" },
            headers: {
                "x-signature": "invalid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Invalid signature");
    });

    it("should handle unparseable events gracefully", async () => {
        const mockSupabase = {
            from: vi.fn(() => ({})),
        };

        const mockEmailProvider = {
            verifyWebhook: vi.fn().mockReturnValue(true),
            processWebhookEvent: vi.fn().mockReturnValue(null),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getEmailProvider).mockResolvedValue(
            mockEmailProvider as any
        );

        const request = createMockRequest({
            method: "POST",
            body: { invalid: "data" },
            headers: {
                "x-signature": "valid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.processed).toBe(0);
    });

    it("should handle delivery not found gracefully", async () => {
        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "followup_deliveries") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Not found" },
                        }),
                    };
                }
                return {};
            }),
        };

        const mockEmailProvider = {
            verifyWebhook: vi.fn().mockReturnValue(true),
            processWebhookEvent: vi.fn().mockReturnValue({
                provider_message_id: "msg-123",
                event_type: "delivered",
                email: "test@example.com",
                timestamp: new Date().toISOString(),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getEmailProvider).mockResolvedValue(
            mockEmailProvider as any
        );

        const request = createMockRequest({
            method: "POST",
            body: { event: "delivered", message_id: "msg-123" },
            headers: {
                "x-signature": "valid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
