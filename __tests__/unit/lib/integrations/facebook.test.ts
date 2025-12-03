/**
 * Tests for Facebook Integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock environment variables
vi.mock("@/lib/env", () => ({
    env: {
        FACEBOOK_APP_ID: "test-app-id",
        FACEBOOK_APP_SECRET: "test-app-secret",
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
    getFacebookAuthUrl,
    exchangeCodeForToken,
    getUserPages,
    verifyToken,
    getLongLivedToken,
} = await import("@/lib/integrations/facebook");

describe("Facebook Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getFacebookAuthUrl", () => {
        it("generates auth URL with organic scopes", () => {
            const url = getFacebookAuthUrl(
                "project-123",
                "https://example.com/callback",
                false
            );

            expect(url).toContain("https://www.facebook.com/v18.0/dialog/oauth");
            expect(url).toContain("client_id=test-app-id");
            expect(url).toContain("redirect_uri=https%3A%2F%2Fexample.com%2Fcallback");
            expect(url).toContain("state=project-123");
            expect(url).toContain("pages_show_list");
            expect(url).toContain("instagram_basic");
            expect(url).not.toContain("ads_management");
        });

        it("generates auth URL with ads scopes when requested", () => {
            const url = getFacebookAuthUrl(
                "project-123",
                "https://example.com/callback",
                true
            );

            expect(url).toContain("ads_management");
            expect(url).toContain("ads_read");
            expect(url).toContain("business_management");
        });
    });

    describe("exchangeCodeForToken", () => {
        it("exchanges code for access token successfully", async () => {
            const mockToken = {
                access_token: "fb-token-123",
                token_type: "bearer",
                expires_in: 3600,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockToken,
            });

            const result = await exchangeCodeForToken(
                "auth-code-123",
                "https://example.com/callback"
            );

            expect(result.access_token).toBe("fb-token-123");
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining(
                    "https://graph.facebook.com/v18.0/oauth/access_token"
                )
            );
        });

        it("throws error when token exchange fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid authorization code" },
                }),
            });

            await expect(
                exchangeCodeForToken("invalid-code", "https://example.com/callback")
            ).rejects.toThrow("Facebook token exchange failed");
        });
    });

    describe("getUserPages", () => {
        it("fetches user pages successfully", async () => {
            const mockPages = [
                { id: "page-1", name: "Page 1", access_token: "page-token-1" },
                { id: "page-2", name: "Page 2", access_token: "page-token-2" },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockPages }),
            });

            const result = await getUserPages("access-token-123");

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe("page-1");
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/me/accounts")
            );
        });

        it("returns empty array when no pages found", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: null }),
            });

            const result = await getUserPages("access-token-123");

            expect(result).toEqual([]);
        });

        it("throws error when fetching pages fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Permission denied" },
                }),
            });

            await expect(getUserPages("invalid-token")).rejects.toThrow(
                "Failed to fetch Facebook pages"
            );
        });
    });

    describe("verifyToken", () => {
        it("returns true for valid token", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "user-123", name: "Test User" }),
            });

            const result = await verifyToken("valid-token");

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/me"));
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

    describe("getLongLivedToken", () => {
        it("exchanges short-lived token for long-lived token", async () => {
            const mockLongLivedToken = {
                access_token: "long-lived-token-123",
                token_type: "bearer",
                expires_in: 5184000, // 60 days
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockLongLivedToken,
            });

            const result = await getLongLivedToken("short-lived-token");

            expect(result.access_token).toBe("long-lived-token-123");
            expect(result.expires_in).toBe(5184000);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("grant_type=fb_exchange_token")
            );
        });

        it("throws error when exchange fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid short-lived token" },
                }),
            });

            await expect(getLongLivedToken("invalid-token")).rejects.toThrow(
                "Failed to get long-lived token"
            );
        });
    });
});
