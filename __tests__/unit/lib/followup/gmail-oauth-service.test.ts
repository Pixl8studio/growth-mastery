/**
 * Tests for Gmail OAuth Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSupabase = {
    from: vi.fn(),
};

const mockCreateClient = vi.fn().mockResolvedValue(mockSupabase);

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: mockCreateClient,
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock env
vi.mock("@/lib/env", () => ({
    env: {
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-client-secret",
        NEXT_PUBLIC_APP_URL: "https://example.com",
        GMAIL_REDIRECT_URI: "https://example.com/api/followup/gmail/callback",
    },
}));

// Mock fetch
global.fetch = vi.fn();

// Import after mocks are defined
const {
    generateGmailOAuthUrl,
    exchangeCodeForTokens,
    refreshGmailToken,
    getGmailUserInfo,
    storeGmailTokens,
    getValidGmailToken,
    disconnectGmail,
} = await import("@/lib/followup/gmail-oauth-service");

describe("Gmail OAuth Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateGmailOAuthUrl", () => {
        it("generates valid OAuth URL", () => {
            const url = generateGmailOAuthUrl("agent-123", "user-123");

            expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
            expect(url).toContain("client_id=test-client-id");
            expect(url).toContain("access_type=offline");
            expect(url).toContain("prompt=consent");
        });

        it("includes state parameter with agent and user IDs", () => {
            const url = generateGmailOAuthUrl("agent-123", "user-123");
            const urlObj = new URL(url);
            const state = urlObj.searchParams.get("state");

            expect(state).toBeDefined();
            const decoded = JSON.parse(Buffer.from(state!, "base64").toString());
            expect(decoded.agentConfigId).toBe("agent-123");
            expect(decoded.userId).toBe("user-123");
        });
    });

    describe("exchangeCodeForTokens", () => {
        it("exchanges code for tokens successfully", async () => {
            const mockTokens = {
                access_token: "access-123",
                refresh_token: "refresh-123",
                expires_in: 3600,
                token_type: "Bearer",
                scope: "gmail.send userinfo.email",
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockTokens,
            });

            const result = await exchangeCodeForTokens("auth-code-123");

            expect(result.access_token).toBe("access-123");
            expect(result.refresh_token).toBe("refresh-123");
            expect(global.fetch).toHaveBeenCalledWith(
                "https://oauth2.googleapis.com/token",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        it("throws error when exchange fails", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: async () => "Invalid code",
            });

            await expect(exchangeCodeForTokens("invalid-code")).rejects.toThrow(
                "Gmail OAuth token exchange failed"
            );
        });
    });

    describe("refreshGmailToken", () => {
        it("refreshes access token successfully", async () => {
            const mockResponse = {
                access_token: "new-access-token",
                expires_in: 3600,
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await refreshGmailToken("refresh-token-123");

            expect(result.access_token).toBe("new-access-token");
            expect(result.expires_in).toBe(3600);
        });

        it("throws error when refresh fails", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                text: async () => "Invalid refresh token",
            });

            await expect(refreshGmailToken("invalid-token")).rejects.toThrow(
                "Gmail token refresh failed"
            );
        });
    });

    describe("getGmailUserInfo", () => {
        it("fetches user info successfully", async () => {
            const mockUserInfo = {
                email: "test@gmail.com",
                verified_email: true,
                name: "Test User",
                picture: "https://example.com/photo.jpg",
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockUserInfo,
            });

            const result = await getGmailUserInfo("access-token-123");

            expect(result.email).toBe("test@gmail.com");
            expect(result.verified_email).toBe(true);
            expect(result.name).toBe("Test User");
        });

        it("throws error when fetch fails", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                text: async () => "Unauthorized",
            });

            await expect(getGmailUserInfo("invalid-token")).rejects.toThrow(
                "Failed to fetch Gmail user info"
            );
        });
    });

    describe("storeGmailTokens", () => {
        it("stores tokens successfully", async () => {
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        error: null,
                    }),
                }),
            });

            const tokens = {
                access_token: "access-123",
                refresh_token: "refresh-123",
                expires_in: 3600,
                token_type: "Bearer",
                scope: "test",
            };

            const userInfo = {
                email: "test@gmail.com",
                verified_email: true,
                name: "Test User",
            };

            await expect(
                storeGmailTokens("agent-123", tokens, userInfo)
            ).resolves.not.toThrow();
        });

        it("throws error when database update fails", async () => {
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        error: { message: "Database error" },
                    }),
                }),
            });

            const tokens = {
                access_token: "access-123",
                expires_in: 3600,
                token_type: "Bearer",
                scope: "test",
            };

            const userInfo = {
                email: "test@gmail.com",
                verified_email: true,
            };

            await expect(
                storeGmailTokens("agent-123", tokens, userInfo)
            ).rejects.toThrow();
        });
    });

    describe("getValidGmailToken", () => {
        it("returns valid token when not expired", async () => {
            const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: {
                                gmail_access_token: "valid-token",
                                gmail_refresh_token: "refresh-token",
                                gmail_token_expires_at: futureDate.toISOString(),
                                gmail_user_email: "test@gmail.com",
                            },
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await getValidGmailToken("agent-123");

            expect(result.access_token).toBe("valid-token");
            expect(result.user_email).toBe("test@gmail.com");
        });

        it("refreshes token when expired", async () => {
            const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: {
                                gmail_access_token: "old-token",
                                gmail_refresh_token: "refresh-token",
                                gmail_token_expires_at: pastDate.toISOString(),
                                gmail_user_email: "test@gmail.com",
                            },
                            error: null,
                        }),
                    }),
                }),
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            });

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: "new-token",
                    expires_in: 3600,
                }),
            });

            const result = await getValidGmailToken("agent-123");

            expect(result.access_token).toBe("new-token");
        });

        it("throws error when Gmail not connected", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: {
                                gmail_access_token: null,
                                gmail_user_email: null,
                            },
                            error: null,
                        }),
                    }),
                }),
            });

            await expect(getValidGmailToken("agent-123")).rejects.toThrow(
                "Gmail not connected"
            );
        });
    });

    describe("disconnectGmail", () => {
        it("disconnects Gmail successfully", async () => {
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        error: null,
                    }),
                }),
            });

            await expect(disconnectGmail("agent-123")).resolves.not.toThrow();
        });

        it("throws error when database update fails", async () => {
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        error: { message: "Database error" },
                    }),
                }),
            });

            await expect(disconnectGmail("agent-123")).rejects.toThrow();
        });
    });
});
