import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/followup/test-message/route";
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
vi.mock("@/lib/followup/providers/sms-provider", () => ({
    getSMSProvider: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getEmailProvider } from "@/lib/followup/providers/email-provider";
import { getSMSProvider } from "@/lib/followup/providers/sms-provider";

const mockUser = { id: "user-123", email: "test@example.com" };

describe("POST /api/followup/test-message", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should send test email successfully", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                user_id: "user-123",
                                sender_name: "John Doe",
                                sender_email: "john@example.com",
                            },
                            error: null,
                        }),
                    };
                }
                return {};
            }),
        };

        const mockEmailProvider = {
            sendEmail: vi.fn().mockResolvedValue({
                success: true,
                provider_message_id: "msg-123",
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getEmailProvider).mockResolvedValue(
            mockEmailProvider as any
        );

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
                channel: "email",
                recipient_email: "test@example.com",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.channel).toBe("email");
        expect(data.delivery_id).toBe("msg-123");
    });

    it("should send test SMS successfully", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                user_id: "user-123",
                                sender_name: "John Doe",
                            },
                            error: null,
                        }),
                    };
                }
                return {};
            }),
        };

        const mockSMSProvider = {
            sendSMS: vi.fn().mockResolvedValue({
                success: true,
                provider_message_id: "sms-123",
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getSMSProvider).mockReturnValue(mockSMSProvider as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
                channel: "sms",
                recipient_phone: "+15551234567",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.channel).toBe("sms");
        expect(data.delivery_id).toBe("sms-123");
    });

    it("should return 400 for missing agent_config_id", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: { channel: "email" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("agent_config_id is required");
    });

    it("should return 400 for invalid channel", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
                channel: "invalid",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("channel must be 'email' or 'sms'");
    });

    it("should return 400 for missing recipient_phone for SMS", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                user_id: "user-123",
                                sender_name: "John Doe",
                            },
                            error: null,
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
                channel: "sms",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Recipient phone is required for SMS");
    });

    it("should return 401 for unauthenticated users", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "Unauthorized" },
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
                channel: "email",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 401 for accessing other user's config", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { user_id: "other-user" },
                            error: null,
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
                channel: "email",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to agent config");
    });

    it("should return 500 when email send fails", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                user_id: "user-123",
                                sender_name: "John Doe",
                            },
                            error: null,
                        }),
                    };
                }
                return {};
            }),
        };

        const mockEmailProvider = {
            sendEmail: vi.fn().mockResolvedValue({
                success: false,
                error: "Failed to send email",
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getEmailProvider).mockResolvedValue(
            mockEmailProvider as any
        );

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
                channel: "email",
                recipient_email: "test@example.com",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to send email");
    });
});
