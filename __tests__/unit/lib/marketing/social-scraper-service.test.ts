/**
 * Social Scraper Service Tests
 * Tests for social media content scraping with OAuth integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/logger");
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/crypto/token-encryption");
vi.mock("@/lib/intake/processors");
vi.mock("@/lib/scraping/instagram-api");
vi.mock("@/lib/scraping/linkedin-api");
vi.mock("@/lib/scraping/twitter-api");
vi.mock("@/lib/scraping/facebook-api");

import {
    detectPlatformType,
    scrapeAndExtractContent,
} from "@/lib/marketing/social-scraper-service";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto/token-encryption";
import { extractTextFromUrl } from "@/lib/intake/processors";

describe("SocialScraperService", () => {
    const mockUserId = "user-123";
    const mockProfileId = "profile-123";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("detectPlatformType", () => {
        it("should detect Instagram URLs", () => {
            const urls = [
                "https://instagram.com/username",
                "https://www.instagram.com/p/123456",
            ];

            urls.forEach((url) => {
                expect(detectPlatformType(url)).toBe("instagram");
            });
        });

        it("should detect LinkedIn URLs", () => {
            const urls = [
                "https://linkedin.com/in/username",
                "https://www.linkedin.com/company/name",
            ];

            urls.forEach((url) => {
                expect(detectPlatformType(url)).toBe("linkedin");
            });
        });

        it("should detect Twitter/X URLs", () => {
            const urls = [
                "https://twitter.com/username",
                "https://x.com/username",
                "https://www.twitter.com/username/status/123",
            ];

            urls.forEach((url) => {
                expect(detectPlatformType(url)).toBe("twitter");
            });
        });

        it("should detect Facebook URLs", () => {
            const urls = [
                "https://facebook.com/page",
                "https://www.facebook.com/username",
            ];

            urls.forEach((url) => {
                expect(detectPlatformType(url)).toBe("facebook");
            });
        });

        it("should return generic for other URLs", () => {
            const urls = ["https://example.com", "https://blog.company.com/article"];

            urls.forEach((url) => {
                expect(detectPlatformType(url)).toBe("generic");
            });
        });

        it("should handle invalid URLs", () => {
            expect(detectPlatformType("not-a-url")).toBe("generic");
        });
    });

    describe("scrapeAndExtractContent", () => {
        it("should reject invalid URL formats", async () => {
            const result = await scrapeAndExtractContent("not-a-valid-url");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Invalid URL format");
        });

        it("should reject non-HTTP(S) protocols", async () => {
            const result = await scrapeAndExtractContent("ftp://example.com");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Only HTTP(S) URLs are supported");
        });

        it("should prompt to connect when OAuth not available for social platforms", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    maybeSingle: vi.fn().mockResolvedValue({
                                        data: null,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await scrapeAndExtractContent(
                "https://instagram.com/user",
                mockUserId,
                mockProfileId
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Connect your instagram account");
            expect(result.data?.metadata?.connectionStatus).toBe("not_connected");
        });

        it("should handle expired OAuth tokens", async () => {
            const expiredDate = new Date();
            expiredDate.setDate(expiredDate.getDate() - 1);

            const mockConnection = {
                access_token_encrypted: "encrypted",
                token_expires_at: expiredDate.toISOString(),
                platform_user_id: "user-123",
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        maybeSingle: vi.fn().mockResolvedValue({
                                            data: mockConnection,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await scrapeAndExtractContent(
                "https://instagram.com/user",
                mockUserId,
                mockProfileId
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("connection has expired");
            expect(result.data?.metadata?.connectionStatus).toBe("expired");
        });

        it("should scrape generic websites", async () => {
            const mockContent = "This is extracted content from the website. ".repeat(
                10
            ); // Make it long enough

            vi.mocked(extractTextFromUrl).mockResolvedValue(mockContent as any);

            const result = await scrapeAndExtractContent("https://example.com/article");

            expect(result.success).toBe(true);
            expect(result.data?.platform).toBe("generic");
            expect(result.data?.source).toBe("scrape");
            expect(result.data?.content.length).toBeGreaterThan(0);
        });

        it("should handle empty content extraction", async () => {
            vi.mocked(extractTextFromUrl).mockResolvedValue("" as any);

            const result = await scrapeAndExtractContent("https://example.com");

            expect(result.success).toBe(false);
            expect(result.error).toContain("No content found on this page");
        });

        it("should validate minimum content length", async () => {
            vi.mocked(extractTextFromUrl).mockResolvedValue("Short" as any);

            const result = await scrapeAndExtractContent("https://example.com");

            expect(result.success).toBe(false);
            expect(result.error).toContain("Unable to extract meaningful content");
        });

        it("should handle 403 errors with helpful message", async () => {
            vi.mocked(extractTextFromUrl).mockRejectedValue(new Error("HTTP 403"));

            const result = await scrapeAndExtractContent("https://example.com");

            expect(result.success).toBe(false);
            expect(result.error).toContain("private or requires authentication");
        });

        it("should handle 404 errors", async () => {
            vi.mocked(extractTextFromUrl).mockRejectedValue(new Error("HTTP 404"));

            const result = await scrapeAndExtractContent("https://example.com");

            expect(result.success).toBe(false);
            expect(result.error).toContain("Page not found");
        });

        it("should handle generic extraction errors", async () => {
            vi.mocked(extractTextFromUrl).mockRejectedValue(
                new Error("Network timeout")
            );

            const result = await scrapeAndExtractContent("https://example.com");

            expect(result.success).toBe(false);
            expect(result.error).toContain("Failed to access URL");
        });

        it("should extract long content successfully", async () => {
            const longContent =
                "Paragraph 1 with substantial content. ".repeat(5) +
                "Paragraph 2 with enough content to meet the minimum requirement. ".repeat(
                    5
                ) +
                "Paragraph 3 continues the article with even more detail. ".repeat(5);

            vi.mocked(extractTextFromUrl).mockResolvedValue(longContent as any);

            const result = await scrapeAndExtractContent("https://example.com/blog");

            expect(result.success).toBe(true);
            expect(result.data?.content.length).toBeGreaterThan(0);
        });

        it("should suggest manual paste for social media without API", async () => {
            const result = await scrapeAndExtractContent("https://facebook.com/page");

            expect(result.success).toBe(false);
            expect(result.error).toContain("connect your facebook account");
            expect(result.error).toContain("paste sample posts manually");
        });
    });
});
