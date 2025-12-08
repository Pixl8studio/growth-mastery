/**
 * Tests for Instagram Graph API Client
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
    getInstagramOAuthUrl,
    exchangeInstagramCode,
    getLongLivedToken,
    getFacebookPages,
    fetchInstagramPosts,
    getInstagramContentFromPage,
    extractTextFromPosts,
} = await import("@/lib/scraping/instagram-api");

describe("Instagram Graph API Client", () => {
    const mockConfig = {
        appId: "test-app-id",
        appSecret: "test-app-secret",
        redirectUri: "https://example.com/callback",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getInstagramOAuthUrl", () => {
        it("generates correct OAuth URL with Instagram scopes", () => {
            const state = "random-state-token";
            const url = getInstagramOAuthUrl(mockConfig, state);

            expect(url).toContain("https://www.facebook.com/v18.0/dialog/oauth");
            expect(url).toContain(`client_id=${mockConfig.appId}`);
            expect(url).toContain(
                `redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`
            );
            expect(url).toContain(`state=${state}`);
            expect(url).toContain("response_type=code");
        });

        it("includes Instagram-specific scopes", () => {
            const url = getInstagramOAuthUrl(mockConfig, "state");

            expect(url).toContain("instagram_basic");
            expect(url).toContain("instagram_content_publish");
            expect(url).toContain("pages_read_engagement");
        });
    });

    describe("exchangeInstagramCode", () => {
        it("exchanges code for access token successfully", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: "test-access-token",
                    expires_in: 3600,
                }),
            });

            const result = await exchangeInstagramCode("test-code", mockConfig);

            expect(result.accessToken).toBe("test-access-token");
            expect(result.expiresIn).toBe(3600);
        });

        it("handles default expiry when not provided", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: "test-token",
                }),
            });

            const result = await exchangeInstagramCode("test-code", mockConfig);

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
                exchangeInstagramCode("invalid-code", mockConfig)
            ).rejects.toThrow("Invalid code");
        });

        it("throws error on network failure", async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

            await expect(
                exchangeInstagramCode("test-code", mockConfig)
            ).rejects.toThrow("Network error");
        });
    });

    describe("getLongLivedToken", () => {
        it("exchanges short-lived token for long-lived token", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: "long-lived-token",
                    expires_in: 5184000,
                }),
            });

            const result = await getLongLivedToken("short-token", mockConfig);

            expect(result.accessToken).toBe("long-lived-token");
            expect(result.expiresIn).toBe(5184000);
        });

        it("uses default 60-day expiry when not provided", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: "long-lived-token",
                }),
            });

            const result = await getLongLivedToken("short-token", mockConfig);

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
                getLongLivedToken("invalid-token", mockConfig)
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

    describe("fetchInstagramPosts", () => {
        it("fetches posts with engagement metrics", async () => {
            const mockPosts = [
                {
                    id: "post1",
                    caption: "Test post",
                    media_type: "IMAGE",
                    media_url: "https://example.com/image.jpg",
                    permalink: "https://instagram.com/p/123",
                    timestamp: "2024-01-01T00:00:00+0000",
                    like_count: 100,
                    comments_count: 10,
                },
            ];

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockPosts }),
            });

            const result = await fetchInstagramPosts("account-id", "token");

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("post1");
            expect(result[0].caption).toBe("Test post");
            expect(result[0].engagement).toBe(110); // likes + comments
        });

        it("calculates engagement from likes and comments", async () => {
            const mockPosts = [
                {
                    id: "post1",
                    caption: "Test",
                    media_type: "IMAGE",
                    permalink: "https://instagram.com/p/123",
                    timestamp: "2024-01-01T00:00:00+0000",
                    like_count: 50,
                    comments_count: 25,
                },
            ];

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockPosts }),
            });

            const result = await fetchInstagramPosts("account-id", "token");

            expect(result[0].engagement).toBe(75);
        });

        it("respects limit parameter", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [] }),
            });

            await fetchInstagramPosts("account-id", "token", 10);

            const callUrl = (global.fetch as any).mock.calls[0][0];
            expect(callUrl).toContain("limit=10");
        });

        it("handles posts without optional fields", async () => {
            const mockPosts = [
                {
                    id: "post1",
                    media_type: "IMAGE",
                    permalink: "https://instagram.com/p/123",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
            ];

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockPosts }),
            });

            const result = await fetchInstagramPosts("account-id", "token");

            expect(result[0].caption).toBeUndefined();
            expect(result[0].like_count).toBeUndefined();
            expect(result[0].engagement).toBeUndefined();
        });

        it("throws error on API failure", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid account" },
                }),
            });

            await expect(
                fetchInstagramPosts("invalid-account", "token")
            ).rejects.toThrow("Invalid account");
        });

        it("supports different media types", async () => {
            const mockPosts = [
                {
                    id: "post1",
                    media_type: "IMAGE",
                    permalink: "https://instagram.com/p/1",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
                {
                    id: "post2",
                    media_type: "VIDEO",
                    permalink: "https://instagram.com/p/2",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
                {
                    id: "post3",
                    media_type: "CAROUSEL_ALBUM",
                    permalink: "https://instagram.com/p/3",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
            ];

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockPosts }),
            });

            const result = await fetchInstagramPosts("account-id", "token");

            expect(result[0].media_type).toBe("IMAGE");
            expect(result[1].media_type).toBe("VIDEO");
            expect(result[2].media_type).toBe("CAROUSEL_ALBUM");
        });
    });

    describe("getInstagramContentFromPage", () => {
        it("fetches Instagram account and posts successfully", async () => {
            const mockPosts = [
                {
                    id: "post1",
                    caption: "Test post",
                    media_type: "IMAGE",
                    permalink: "https://instagram.com/p/123",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
            ];

            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        instagram_business_account: { id: "ig-account-123" },
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: mockPosts }),
                });

            const result = await getInstagramContentFromPage("page-id", "token");

            expect(result).not.toBeNull();
            expect(result?.accountId).toBe("ig-account-123");
            expect(result?.posts).toHaveLength(1);
        });

        it("returns null when page has no Instagram account", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            });

            const result = await getInstagramContentFromPage("page-id", "token");

            expect(result).toBeNull();
        });

        it("returns null when Instagram account request fails", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: { message: "Not found" } }),
            });

            const result = await getInstagramContentFromPage("page-id", "token");

            expect(result).toBeNull();
        });

        it("throws error when posts fetch fails", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        instagram_business_account: { id: "ig-account-123" },
                    }),
                })
                .mockResolvedValueOnce({
                    ok: false,
                    json: async () => ({
                        error: { message: "Failed to fetch posts" },
                    }),
                });

            await expect(
                getInstagramContentFromPage("page-id", "token")
            ).rejects.toThrow("Failed to fetch posts");
        });
    });

    describe("extractTextFromPosts", () => {
        it("extracts captions from posts with sufficient content", () => {
            const posts = [
                {
                    id: "1",
                    caption: "This is a substantial caption with enough content",
                    media_type: "IMAGE" as const,
                    permalink: "https://instagram.com/p/1",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
                {
                    id: "2",
                    caption: "Short",
                    media_type: "IMAGE" as const,
                    permalink: "https://instagram.com/p/2",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
                {
                    id: "3",
                    caption: "Another meaningful post with enough text content",
                    media_type: "IMAGE" as const,
                    permalink: "https://instagram.com/p/3",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
            ];

            const result = extractTextFromPosts(posts);

            expect(result).toHaveLength(2);
            expect(result).toContain(
                "This is a substantial caption with enough content"
            );
        });

        it("filters out posts without captions", () => {
            const posts = [
                {
                    id: "1",
                    media_type: "IMAGE" as const,
                    permalink: "https://instagram.com/p/1",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
                {
                    id: "2",
                    caption: "Valid caption with sufficient content length",
                    media_type: "IMAGE" as const,
                    permalink: "https://instagram.com/p/2",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
            ];

            const result = extractTextFromPosts(posts);

            expect(result).toHaveLength(1);
        });

        it("filters out posts with empty or whitespace captions", () => {
            const posts = [
                {
                    id: "1",
                    caption: "   ",
                    media_type: "IMAGE" as const,
                    permalink: "https://instagram.com/p/1",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
                {
                    id: "2",
                    caption: "Valid caption content here",
                    media_type: "IMAGE" as const,
                    permalink: "https://instagram.com/p/2",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
            ];

            const result = extractTextFromPosts(posts);

            expect(result).toHaveLength(1);
        });

        it("limits results to 20 posts", () => {
            const posts = Array.from({ length: 30 }, (_, i) => ({
                id: `${i}`,
                caption: `This is post number ${i} with substantial caption content`,
                media_type: "IMAGE" as const,
                permalink: `https://instagram.com/p/${i}`,
                timestamp: "2024-01-01T00:00:00+0000",
            }));

            const result = extractTextFromPosts(posts);

            expect(result).toHaveLength(20);
        });

        it("returns empty array for posts with no valid captions", () => {
            const posts = [
                {
                    id: "1",
                    caption: "Hi",
                    media_type: "IMAGE" as const,
                    permalink: "https://instagram.com/p/1",
                    timestamp: "2024-01-01T00:00:00+0000",
                },
            ];

            const result = extractTextFromPosts(posts);

            expect(result).toHaveLength(0);
        });
    });
});
