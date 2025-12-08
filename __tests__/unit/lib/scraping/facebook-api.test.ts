/**
 * Tests for Facebook Graph API Client
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock fetch globally
global.fetch = vi.fn();

// Import after mocks
const {
    getFacebookOAuthUrl,
    exchangeFacebookCode,
    getFacebookLongLivedToken,
    getFacebookPages,
    fetchFacebookPosts,
    fetchFacebookFeed,
    extractTextFromFacebookPosts,
} = await import("@/lib/scraping/facebook-api");

describe("Facebook Graph API Client", () => {
    const mockConfig = {
        appId: "test-app-id",
        appSecret: "test-app-secret",
        redirectUri: "https://example.com/callback",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getFacebookOAuthUrl", () => {
        it("generates correct OAuth URL with proper parameters", () => {
            const state = "random-state-token";
            const url = getFacebookOAuthUrl(mockConfig, state);

            expect(url).toContain("https://www.facebook.com/v18.0/dialog/oauth");
            expect(url).toContain(`client_id=${mockConfig.appId}`);
            expect(url).toContain(
                `redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`
            );
            expect(url).toContain(`state=${state}`);
            expect(url).toContain("response_type=code");
            expect(url).toContain("scope=pages_read_engagement");
        });

        it("includes all required scopes", () => {
            const url = getFacebookOAuthUrl(mockConfig, "state");

            expect(url).toContain("pages_read_engagement");
            expect(url).toContain("pages_manage_posts");
            expect(url).toContain("public_profile");
        });
    });

    describe("exchangeFacebookCode", () => {
        it("exchanges code for access token successfully", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: "test-access-token",
                    expires_in: 3600,
                }),
            });

            const result = await exchangeFacebookCode("test-code", mockConfig);

            expect(result.accessToken).toBe("test-access-token");
            expect(result.expiresIn).toBe(3600);
            expect(global.fetch).toHaveBeenCalled();
        });

        it("handles default expiry when not provided", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: "test-token",
                }),
            });

            const result = await exchangeFacebookCode("test-code", mockConfig);

            expect(result.expiresIn).toBe(3600);
        });

        it("throws error when exchange fails", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid code" },
                }),
            });

            await expect(
                exchangeFacebookCode("invalid-code", mockConfig)
            ).rejects.toThrow("Invalid code");
        });

        it("throws error when network request fails", async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

            await expect(exchangeFacebookCode("test-code", mockConfig)).rejects.toThrow(
                "Network error"
            );
        });
    });

    describe("getFacebookLongLivedToken", () => {
        it("exchanges short-lived token for long-lived token", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: "long-lived-token",
                    expires_in: 5184000,
                }),
            });

            const result = await getFacebookLongLivedToken("short-token", mockConfig);

            expect(result.accessToken).toBe("long-lived-token");
            expect(result.expiresIn).toBe(5184000);
        });

        it("uses default expiry for long-lived tokens", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: "long-lived-token",
                }),
            });

            const result = await getFacebookLongLivedToken("short-token", mockConfig);

            expect(result.expiresIn).toBe(5184000); // 60 days
        });

        it("throws error on failure", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid token" },
                }),
            });

            await expect(
                getFacebookLongLivedToken("invalid-token", mockConfig)
            ).rejects.toThrow("Invalid token");
        });
    });

    describe("getFacebookPages", () => {
        it("fetches user pages successfully", async () => {
            const mockPages = [
                { id: "page1", name: "Page 1", access_token: "token1" },
                { id: "page2", name: "Page 2", access_token: "token2" },
            ];

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockPages }),
            });

            const result = await getFacebookPages("user-token");

            expect(result).toEqual(mockPages);
            expect(result).toHaveLength(2);
        });

        it("returns empty array when no pages", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [] }),
            });

            const result = await getFacebookPages("user-token");

            expect(result).toEqual([]);
        });

        it("handles missing data field", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            });

            const result = await getFacebookPages("user-token");

            expect(result).toEqual([]);
        });

        it("throws error on API failure", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Access denied" },
                }),
            });

            await expect(getFacebookPages("invalid-token")).rejects.toThrow(
                "Access denied"
            );
        });
    });

    describe("fetchFacebookPosts", () => {
        it("fetches posts with engagement metrics", async () => {
            const mockPosts = [
                {
                    id: "post1",
                    message: "Test post",
                    created_time: "2024-01-01T00:00:00Z",
                    permalink_url: "https://facebook.com/post1",
                    reactions: { summary: { total_count: 10 } },
                    comments: { summary: { total_count: 5 } },
                    shares: { count: 2 },
                },
            ];

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockPosts }),
            });

            const result = await fetchFacebookPosts("page-id", "token");

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("post1");
            expect(result[0].message).toBe("Test post");
            expect(result[0].reactions?.summary.total_count).toBe(10);
        });

        it("respects limit parameter", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [] }),
            });

            await fetchFacebookPosts("page-id", "token", 10);

            const callUrl = (global.fetch as any).mock.calls[0][0];
            expect(callUrl).toContain("limit=10");
        });

        it("handles posts without optional fields", async () => {
            const mockPosts = [
                {
                    id: "post1",
                    created_time: "2024-01-01T00:00:00Z",
                },
            ];

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockPosts }),
            });

            const result = await fetchFacebookPosts("page-id", "token");

            expect(result[0].message).toBeUndefined();
            expect(result[0].reactions).toBeUndefined();
        });

        it("throws error on API failure", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid page" },
                }),
            });

            await expect(fetchFacebookPosts("invalid-page", "token")).rejects.toThrow(
                "Invalid page"
            );
        });
    });

    describe("fetchFacebookFeed", () => {
        it("fetches feed posts successfully", async () => {
            const mockFeed = [
                {
                    id: "feed1",
                    message: "Feed post",
                    created_time: "2024-01-01T00:00:00Z",
                },
            ];

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockFeed }),
            });

            const result = await fetchFacebookFeed("page-id", "token");

            expect(result).toHaveLength(1);
            expect(result[0].message).toBe("Feed post");
        });

        it("uses feed endpoint instead of posts", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [] }),
            });

            await fetchFacebookFeed("page-id", "token");

            const callUrl = (global.fetch as any).mock.calls[0][0];
            expect(callUrl).toContain("/feed?");
        });
    });

    describe("extractTextFromFacebookPosts", () => {
        it("extracts text from posts with messages", () => {
            const posts = [
                {
                    id: "1",
                    message: "This is a long enough message to be extracted",
                    createdTime: "2024-01-01T00:00:00Z",
                },
                { id: "2", message: "Short", createdTime: "2024-01-01T00:00:00Z" },
                {
                    id: "3",
                    message: "Another substantial post that should be included",
                    createdTime: "2024-01-01T00:00:00Z",
                },
            ];

            const result = extractTextFromFacebookPosts(posts as any);

            expect(result).toHaveLength(2);
            expect(result[0]).toBe("This is a long enough message to be extracted");
        });

        it("extracts text from story when message is missing", () => {
            const posts = [
                {
                    id: "1",
                    story: "User shared a photo with substantial content",
                    createdTime: "2024-01-01T00:00:00Z",
                },
            ];

            const result = extractTextFromFacebookPosts(posts as any);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe("User shared a photo with substantial content");
        });

        it("filters out posts with insufficient content", () => {
            const posts = [
                { id: "1", message: "Hi", createdTime: "2024-01-01T00:00:00Z" },
                { id: "2", message: "   ", createdTime: "2024-01-01T00:00:00Z" },
                {
                    id: "3",
                    message: "This message is long enough to pass",
                    createdTime: "2024-01-01T00:00:00Z",
                },
            ];

            const result = extractTextFromFacebookPosts(posts as any);

            expect(result).toHaveLength(1);
        });

        it("limits results to 20 posts", () => {
            const posts = Array.from({ length: 30 }, (_, i) => ({
                id: `${i}`,
                message: `This is post number ${i} with substantial content`,
                createdTime: "2024-01-01T00:00:00Z",
            }));

            const result = extractTextFromFacebookPosts(posts as any);

            expect(result).toHaveLength(20);
        });

        it("handles posts with both message and story", () => {
            const posts = [
                {
                    id: "1",
                    message: "This is the message which should be preferred",
                    story: "This is the story",
                    createdTime: "2024-01-01T00:00:00Z",
                },
            ];

            const result = extractTextFromFacebookPosts(posts as any);

            expect(result[0]).toBe("This is the message which should be preferred");
        });
    });
});
