import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/followup/gmail/connect/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/gmail-oauth-service", () => ({
    generateGmailOAuthUrl: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { generateGmailOAuthUrl } from "@/lib/followup/gmail-oauth-service";

const mockUser = { id: "user-123", email: "test@example.com" };

describe("GET /api/followup/gmail/connect", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should return Gmail OAuth URL successfully", async () => {
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

        const mockAuthUrl =
            "https://accounts.google.com/o/oauth2/v2/auth?client_id=...";

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateGmailOAuthUrl).mockReturnValue(mockAuthUrl);

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/gmail/connect?agent_config_id=config-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.authUrl).toBe(mockAuthUrl);
        expect(generateGmailOAuthUrl).toHaveBeenCalledWith(
            "config-123",
            "user-123"
        );
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
            url: "http://localhost:3000/api/followup/gmail/connect",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

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
            url: "http://localhost:3000/api/followup/gmail/connect?agent_config_id=config-123",
        });

        const response = await GET(request);
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
            url: "http://localhost:3000/api/followup/gmail/connect?agent_config_id=config-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to agent config");
    });

    it("should return 503 for missing OAuth credentials", async () => {
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
        vi.mocked(generateGmailOAuthUrl).mockImplementation(() => {
            throw new Error("GOOGLE_CLIENT_ID is not configured");
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/gmail/connect?agent_config_id=config-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(503);
        expect(data.error).toBe("Gmail OAuth not configured");
        expect(data.setupRequired).toBe(true);
    });

    it("should return 500 for other errors", async () => {
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
        vi.mocked(generateGmailOAuthUrl).mockImplementation(() => {
            throw new Error("Unexpected error");
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/gmail/connect?agent_config_id=config-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to initiate Gmail connection");
    });
});
