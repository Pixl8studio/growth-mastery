import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/followup/gmail/callback/route";
import { createMockRequest } from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/gmail-oauth-service", () => ({
    exchangeCodeForTokens: vi.fn(),
    getGmailUserInfo: vi.fn(),
    storeGmailTokens: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
    exchangeCodeForTokens,
    getGmailUserInfo,
    storeGmailTokens,
} from "@/lib/followup/gmail-oauth-service";

const mockUser = { id: "user-123", email: "test@example.com" };

describe("GET /api/followup/gmail/callback", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    });

    it("should process OAuth callback successfully", async () => {
        const state = Buffer.from(
            JSON.stringify({
                agentConfigId: "config-123",
                userId: "user-123",
            })
        ).toString("base64");

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

        const mockTokens = {
            access_token: "access-token-123",
            refresh_token: "refresh-token-123",
            expiry_date: Date.now() + 3600000,
        };

        const mockUserInfo = {
            email: "john@example.com",
            verified_email: true,
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(exchangeCodeForTokens).mockResolvedValue(mockTokens);
        vi.mocked(getGmailUserInfo).mockResolvedValue(mockUserInfo);
        vi.mocked(storeGmailTokens).mockResolvedValue(undefined);

        const request = createMockRequest({
            url: `http://localhost:3000/api/followup/gmail/callback?code=auth-code-123&state=${state}`,
        });

        const response = await GET(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain(
            "gmail_connected=true"
        );
        expect(exchangeCodeForTokens).toHaveBeenCalledWith("auth-code-123");
        expect(getGmailUserInfo).toHaveBeenCalledWith("access-token-123");
        expect(storeGmailTokens).toHaveBeenCalledWith(
            "config-123",
            mockTokens,
            mockUserInfo
        );
    });

    it("should redirect with error when user denies access", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/gmail/callback?error=access_denied",
        });

        const response = await GET(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain(
            "error=gmail_denied"
        );
    });

    it("should redirect with error when code is missing", async () => {
        const state = Buffer.from(
            JSON.stringify({
                agentConfigId: "config-123",
                userId: "user-123",
            })
        ).toString("base64");

        const request = createMockRequest({
            url: `http://localhost:3000/api/followup/gmail/callback?state=${state}`,
        });

        const response = await GET(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain(
            "error=invalid_callback"
        );
    });

    it("should redirect with error when state is missing", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/followup/gmail/callback?code=auth-code-123",
        });

        const response = await GET(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain(
            "error=invalid_callback"
        );
    });

    it("should redirect with error when user mismatch", async () => {
        const state = Buffer.from(
            JSON.stringify({
                agentConfigId: "config-123",
                userId: "user-456",
            })
        ).toString("base64");

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: `http://localhost:3000/api/followup/gmail/callback?code=auth-code-123&state=${state}`,
        });

        const response = await GET(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain(
            "error=unauthorized"
        );
    });

    it("should redirect with error when accessing other user's config", async () => {
        const state = Buffer.from(
            JSON.stringify({
                agentConfigId: "config-123",
                userId: "user-123",
            })
        ).toString("base64");

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
            url: `http://localhost:3000/api/followup/gmail/callback?code=auth-code-123&state=${state}`,
        });

        const response = await GET(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain(
            "error=unauthorized"
        );
    });

    it("should redirect with error when token exchange fails", async () => {
        const state = Buffer.from(
            JSON.stringify({
                agentConfigId: "config-123",
                userId: "user-123",
            })
        ).toString("base64");

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
        vi.mocked(exchangeCodeForTokens).mockRejectedValue(
            new Error("Token exchange failed")
        );

        const request = createMockRequest({
            url: `http://localhost:3000/api/followup/gmail/callback?code=auth-code-123&state=${state}`,
        });

        const response = await GET(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain(
            "error=gmail_connection_failed"
        );
    });
});
