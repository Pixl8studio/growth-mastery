/**
 * Tests for Gmail Integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock environment variables
vi.mock("@/lib/env", () => ({
    env: {
        GOOGLE_CLIENT_ID: "test-google-client-id",
        GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks are defined
const {
    getGmailAuthUrl,
    exchangeCodeForToken,
    refreshAccessToken,
    getUserInfo,
    verifyToken,
    sendEmail,
} = await import("@/lib/integrations/gmail");

describe("Gmail Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getGmailAuthUrl", () => {
        it("generates Google OAuth URL with Gmail scopes", () => {
            const url = getGmailAuthUrl("project-123", "https://example.com/callback");

            expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
            expect(url).toContain("client_id=test-google-client-id");
            expect(url).toContain("redirect_uri=https%3A%2F%2Fexample.com%2Fcallback");
            expect(url).toContain("state=project-123");
            expect(url).toContain("gmail.send");
            expect(url).toContain("userinfo.email");
            expect(url).toContain("userinfo.profile");
            expect(url).toContain("access_type=offline");
            expect(url).toContain("prompt=consent");
        });
    });

    describe("exchangeCodeForToken", () => {
        it("exchanges authorization code for access token", async () => {
            const mockToken = {
                access_token: "gmail-token-123",
                refresh_token: "refresh-token-123",
                expires_in: 3600,
                token_type: "Bearer",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockToken,
            });

            const result = await exchangeCodeForToken(
                "auth-code-123",
                "https://example.com/callback"
            );

            expect(result.access_token).toBe("gmail-token-123");
            expect(result.refresh_token).toBe("refresh-token-123");
            expect(mockFetch).toHaveBeenCalledWith(
                "https://oauth2.googleapis.com/token",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        it("throws error when token exchange fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error_description: "Invalid authorization code",
                }),
            });

            await expect(
                exchangeCodeForToken("invalid-code", "https://example.com/callback")
            ).rejects.toThrow("Gmail token exchange failed");
        });
    });

    describe("refreshAccessToken", () => {
        it("refreshes access token using refresh token", async () => {
            const mockToken = {
                access_token: "new-gmail-token-456",
                expires_in: 3600,
                token_type: "Bearer",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockToken,
            });

            const result = await refreshAccessToken("refresh-token-123");

            expect(result.access_token).toBe("new-gmail-token-456");
            expect(mockFetch).toHaveBeenCalledWith(
                "https://oauth2.googleapis.com/token",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        it("throws error when token refresh fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error_description: "Invalid refresh token",
                }),
            });

            await expect(refreshAccessToken("invalid-refresh-token")).rejects.toThrow(
                "Gmail token refresh failed"
            );
        });
    });

    describe("getUserInfo", () => {
        it("fetches Google user information", async () => {
            const mockUser = {
                id: "user-123",
                email: "user@example.com",
                name: "Test User",
                picture: "https://example.com/pic.jpg",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser,
            });

            const result = await getUserInfo("access-token-123");

            expect(result.id).toBe("user-123");
            expect(result.email).toBe("user@example.com");
            expect(result.name).toBe("Test User");
            expect(mockFetch).toHaveBeenCalledWith(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                expect.objectContaining({
                    headers: {
                        Authorization: "Bearer access-token-123",
                    },
                })
            );
        });

        it("throws error when fetching user info fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Unauthorized" },
                }),
            });

            await expect(getUserInfo("invalid-token")).rejects.toThrow(
                "Failed to fetch Gmail user info"
            );
        });
    });

    describe("verifyToken", () => {
        it("returns true for valid token", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ emailAddress: "user@example.com" }),
            });

            const result = await verifyToken("valid-token");

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/profile"),
                expect.objectContaining({
                    headers: {
                        Authorization: "Bearer valid-token",
                    },
                })
            );
        });

        it("returns false for invalid token", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
            });

            const result = await verifyToken("invalid-token");

            expect(result).toBe(false);
        });

        it("returns false when fetch throws error", async () => {
            mockFetch.mockRejectedValueOnce(new Error("Network error"));

            const result = await verifyToken("some-token");

            expect(result).toBe(false);
        });
    });

    describe("sendEmail", () => {
        it("sends email successfully", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "message-123" }),
            });

            await sendEmail(
                "access-token-123",
                "recipient@example.com",
                "Test Subject",
                "<p>Test email body</p>"
            );

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/messages/send"),
                expect.objectContaining({
                    method: "POST",
                    headers: {
                        Authorization: "Bearer access-token-123",
                        "Content-Type": "application/json",
                    },
                })
            );

            // Verify the email was properly encoded
            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody.raw).toBeDefined();
            expect(typeof callBody.raw).toBe("string");
        });

        it("properly encodes email with special characters", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "message-456" }),
            });

            await sendEmail(
                "access-token-123",
                "recipient@example.com",
                "Special: Subject & More!",
                "<p>Body with <strong>HTML</strong> & special chars: ñ, ü, é</p>"
            );

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody.raw).toBeDefined();

            // Verify base64url encoding (no +, /, or =)
            expect(callBody.raw).not.toContain("+");
            expect(callBody.raw).not.toContain("/");
            expect(callBody.raw).not.toContain("=");
        });

        it("throws error when sending email fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Insufficient permission" },
                }),
            });

            await expect(
                sendEmail("invalid-token", "test@example.com", "Subject", "Body")
            ).rejects.toThrow("Failed to send email");
        });
    });
});
