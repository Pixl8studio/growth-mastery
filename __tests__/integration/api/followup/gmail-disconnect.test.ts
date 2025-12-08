import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/followup/gmail/disconnect/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/gmail-oauth-service", () => ({
    disconnectGmail: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { disconnectGmail } from "@/lib/followup/gmail-oauth-service";

const mockUser = { id: "user-123", email: "test@example.com" };

describe("POST /api/followup/gmail/disconnect", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should disconnect Gmail successfully", async () => {
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
                            data: { user_id: "user-123" },
                            error: null,
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(disconnectGmail).mockResolvedValue(undefined);

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean; message: string }>(
            response
        );

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe("Gmail disconnected successfully");
        expect(disconnectGmail).toHaveBeenCalledWith("config-123");
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
            body: {},
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("agent_config_id is required");
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
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

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
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to agent config");
    });

    it("should return 500 when disconnect fails", async () => {
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
                            data: { user_id: "user-123" },
                            error: null,
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(disconnectGmail).mockRejectedValue(new Error("Disconnect failed"));

        const request = createMockRequest({
            method: "POST",
            body: {
                agent_config_id: "config-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to disconnect Gmail");
    });
});
