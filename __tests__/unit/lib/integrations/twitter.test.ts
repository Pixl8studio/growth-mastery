/**
 * Tests for Twitter Integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "crypto";

// Mock environment variables
vi.mock("@/lib/env", () => ({
    env: {
        TWITTER_CLIENT_ID: "test-twitter-client-id",
        TWITTER_CLIENT_SECRET: "test-twitter-client-secret",
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
    getTwitterAuthUrl,
    exchangeCodeForToken,
    refreshAccessToken,
    getUserInfo,
    verifyToken,
    generateCodeChallenge,
} = await import("@/lib/integrations/twitter");

describe("Twitter Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getTwitterAuthUrl", () => {
        it("generates OAuth 2.0 auth URL with PKCE", () => {
            const codeChallenge = "test-code-challenge";
            const url = getTwitterAuthUrl(
                "project-123",
                "https://example.com/callback",
                codeChallenge
            );

            expect(url).toContain("https://twitter.com/i/oauth2/authorize");
            expect(url).toContain("client_id=test-twitter-client-id");
            expect(url).toContain("redirect_uri=https%3A%2F%2Fexample.com%2Fcallback");
            expect(url).toContain("state=project-123");
            expect(url).toContain("code_challenge=test-code-challenge");
            expect(url).toContain("code_challenge_method=S256");
            expect(url).toContain(
                "scope=tweet.read+tweet.write+users.read+offline.access"
            );
        });
    });

    describe("exchangeCodeForToken", () => {
        it("exchanges authorization code for access token", async () => {
            const mockToken = {
                access_token: "twitter-token-123",
                token_type: "bearer",
                expires_in: 7200,
                refresh_token: "refresh-token-123",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockToken,
            });

            const result = await exchangeCodeForToken(
                "auth-code-123",
                "https://example.com/callback",
                "code-verifier-123"
            );

            expect(result.access_token).toBe("twitter-token-123");
            expect(result.refresh_token).toBe("refresh-token-123");
            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.twitter.com/2/oauth2/token",
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        Authorization: expect.stringContaining("Basic"),
                    }),
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
                exchangeCodeForToken(
                    "invalid-code",
                    "https://example.com/callback",
                    "verifier"
                )
            ).rejects.toThrow("Twitter token exchange failed");
        });
    });

    describe("refreshAccessToken", () => {
        it("refreshes access token using refresh token", async () => {
            const mockToken = {
                access_token: "new-twitter-token-456",
                token_type: "bearer",
                expires_in: 7200,
                refresh_token: "new-refresh-token-456",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockToken,
            });

            const result = await refreshAccessToken("refresh-token-123");

            expect(result.access_token).toBe("new-twitter-token-456");
            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.twitter.com/2/oauth2/token",
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
                "Twitter token refresh failed"
            );
        });
    });

    describe("getUserInfo", () => {
        it("fetches Twitter user information", async () => {
            const mockUser = {
                id: "user-123",
                username: "testuser",
                name: "Test User",
                profile_image_url: "https://example.com/pic.jpg",
                verified: false,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockUser }),
            });

            const result = await getUserInfo("access-token-123");

            expect(result.id).toBe("user-123");
            expect(result.username).toBe("testuser");
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/users/me"),
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
                    detail: "Unauthorized",
                }),
            });

            await expect(getUserInfo("invalid-token")).rejects.toThrow(
                "Failed to fetch Twitter user"
            );
        });
    });

    describe("verifyToken", () => {
        it("returns true for valid token", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { id: "user-123" } }),
            });

            const result = await verifyToken("valid-token");

            expect(result).toBe(true);
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

    describe("generateCodeChallenge", () => {
        it("generates PKCE code verifier and challenge", () => {
            const { verifier, challenge } = generateCodeChallenge();

            expect(verifier).toBeDefined();
            expect(verifier.length).toBe(128);
            expect(challenge).toBeDefined();
            expect(challenge.length).toBeGreaterThan(0);

            // Verify the verifier contains only valid characters
            expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);

            // Verify the challenge is base64url encoded
            expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
        });

        it("generates unique values each time", () => {
            const first = generateCodeChallenge();
            const second = generateCodeChallenge();

            expect(first.verifier).not.toBe(second.verifier);
            expect(first.challenge).not.toBe(second.challenge);
        });
    });
});
