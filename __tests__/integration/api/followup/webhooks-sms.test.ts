import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/followup/webhooks/sms/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/providers/sms-provider", () => ({
    getSMSProvider: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getSMSProvider } from "@/lib/followup/providers/sms-provider";

describe("POST /api/followup/webhooks/sms", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should process delivered SMS event successfully", async () => {
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

        const mockSMSProvider = {
            verifyWebhook: vi.fn().mockReturnValue(true),
            processWebhookEvent: vi.fn().mockReturnValue({
                provider_message_id: "sms-123",
                event_type: "delivered",
                phone: "+15551234567",
                timestamp: new Date().toISOString(),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getSMSProvider).mockReturnValue(mockSMSProvider as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                MessageSid: "sms-123",
                MessageStatus: "delivered",
                To: "+15551234567",
            },
            headers: {
                "x-twilio-signature": "valid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should process failed SMS event successfully", async () => {
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

        const mockSMSProvider = {
            verifyWebhook: vi.fn().mockReturnValue(true),
            processWebhookEvent: vi.fn().mockReturnValue({
                provider_message_id: "sms-123",
                event_type: "failed",
                phone: "+15551234567",
                timestamp: new Date().toISOString(),
                metadata: { error: "Invalid phone number" },
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getSMSProvider).mockReturnValue(mockSMSProvider as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                MessageSid: "sms-123",
                MessageStatus: "failed",
                To: "+15551234567",
            },
            headers: {
                "x-twilio-signature": "valid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should process unsubscribed SMS event successfully", async () => {
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
                if (table === "followup_prospects") {
                    return {
                        update: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return {};
            }),
        };

        const mockSMSProvider = {
            verifyWebhook: vi.fn().mockReturnValue(true),
            processWebhookEvent: vi.fn().mockReturnValue({
                provider_message_id: "sms-123",
                event_type: "unsubscribed",
                phone: "+15551234567",
                timestamp: new Date().toISOString(),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getSMSProvider).mockReturnValue(mockSMSProvider as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                MessageSid: "sms-123",
                Body: "STOP",
                To: "+15551234567",
            },
            headers: {
                "x-twilio-signature": "valid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 401 for invalid signature", async () => {
        const mockSMSProvider = {
            verifyWebhook: vi.fn().mockReturnValue(false),
        };

        vi.mocked(getSMSProvider).mockReturnValue(mockSMSProvider as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                MessageSid: "sms-123",
                MessageStatus: "delivered",
            },
            headers: {
                "x-twilio-signature": "invalid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Invalid signature");
    });

    it("should return 400 for unparseable event", async () => {
        const mockSMSProvider = {
            verifyWebhook: vi.fn().mockReturnValue(true),
            processWebhookEvent: vi.fn().mockReturnValue(null),
        };

        vi.mocked(getSMSProvider).mockReturnValue(mockSMSProvider as any);

        const request = createMockRequest({
            method: "POST",
            body: { invalid: "data" },
            headers: {
                "x-twilio-signature": "valid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Invalid event format");
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

        const mockSMSProvider = {
            verifyWebhook: vi.fn().mockReturnValue(true),
            processWebhookEvent: vi.fn().mockReturnValue({
                provider_message_id: "sms-123",
                event_type: "delivered",
                phone: "+15551234567",
                timestamp: new Date().toISOString(),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getSMSProvider).mockReturnValue(mockSMSProvider as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                MessageSid: "sms-123",
                MessageStatus: "delivered",
            },
            headers: {
                "x-twilio-signature": "valid-signature",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
