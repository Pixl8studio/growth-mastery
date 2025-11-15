/**
 * Social Content Scraper Service
 * Integrates with social media APIs for Echo Mode voice analysis
 * Falls back to manual content pasting when API unavailable
 */

import { logger } from "@/lib/logger";
import { extractTextFromUrl } from "@/lib/intake/processors";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto/token-encryption";
import type { OAuthConnectionMetadata } from "@/types/oauth";
import {
    fetchInstagramPosts,
    extractTextFromPosts as extractFromInstagram,
} from "@/lib/scraping/instagram-api";
import {
    fetchLinkedInPosts,
    extractTextFromLinkedInPosts,
} from "@/lib/scraping/linkedin-api";
import { fetchTweets, extractTextFromTweets } from "@/lib/scraping/twitter-api";
import {
    fetchFacebookPosts,
    extractTextFromFacebookPosts,
} from "@/lib/scraping/facebook-api";

export type PlatformType =
    | "instagram"
    | "linkedin"
    | "twitter"
    | "facebook"
    | "generic";

export interface ScrapedContent {
    platform: PlatformType;
    content: string[];
    source: "api" | "manual" | "scrape";
    metadata?: {
        profileName?: string;
        bio?: string;
        postCount?: number;
        connectionStatus?: "connected" | "expired" | "not_connected";
    };
}

/**
 * Detect platform type from URL
 */
export function detectPlatformType(url: string): PlatformType {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        if (hostname.includes("instagram.com")) {
            return "instagram";
        }
        if (hostname.includes("linkedin.com")) {
            return "linkedin";
        }
        if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
            return "twitter";
        }
        if (hostname.includes("facebook.com")) {
            return "facebook";
        }

        return "generic";
    } catch {
        return "generic";
    }
}

/**
 * Get OAuth connection for a user and platform
 */
async function getOAuthConnection(
    userId: string,
    profileId: string,
    platform: PlatformType
): Promise<{
    connected: boolean;
    accessToken?: string;
    platformUserId?: string;
    expired?: boolean;
} | null> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("marketing_oauth_connections")
            .select("*")
            .eq("user_id", userId)
            .eq("profile_id", profileId)
            .eq("platform", platform)
            .eq("status", "active")
            .maybeSingle();

        if (error || !data) {
            return { connected: false };
        }

        // Check if token is expired
        if (data.token_expires_at) {
            const expiresAt = new Date(data.token_expires_at);
            if (expiresAt < new Date()) {
                return { connected: true, expired: true };
            }
        }

        // Decrypt the access token before returning
        const accessToken = await decryptToken(data.access_token_encrypted);

        return {
            connected: true,
            accessToken,
            platformUserId: data.platform_user_id || undefined,
            expired: false,
        };
    } catch (error) {
        logger.error({ error, userId, platform }, "Failed to get OAuth connection");
        return null;
    }
}

/**
 * Fetch content using platform API if OAuth connected
 */
async function fetchViaAPI(
    userId: string,
    profileId: string,
    platform: PlatformType
): Promise<{ success: boolean; data?: ScrapedContent; error?: string }> {
    const connection = await getOAuthConnection(userId, profileId, platform);

    if (!connection || !connection.connected) {
        return {
            success: false,
            error: "not_connected",
        };
    }

    if (connection.expired) {
        return {
            success: false,
            error: "token_expired",
        };
    }

    if (!connection.accessToken) {
        return {
            success: false,
            error: "no_access_token",
        };
    }

    try {
        let content: string[] = [];
        let postCount = 0;

        switch (platform) {
            case "instagram": {
                if (!connection.platformUserId) {
                    throw new Error("Instagram account ID not found");
                }
                const posts = await fetchInstagramPosts(
                    connection.platformUserId,
                    connection.accessToken,
                    20
                );
                content = extractFromInstagram(posts);
                postCount = posts.length;
                break;
            }

            case "linkedin": {
                if (!connection.platformUserId) {
                    throw new Error("LinkedIn user ID not found");
                }
                const posts = await fetchLinkedInPosts(
                    connection.accessToken,
                    connection.platformUserId,
                    10
                );
                content = extractTextFromLinkedInPosts(posts);
                postCount = posts.length;
                break;
            }

            case "twitter": {
                if (!connection.platformUserId) {
                    throw new Error("Twitter user ID not found");
                }
                const tweets = await fetchTweets(
                    connection.platformUserId,
                    connection.accessToken,
                    50
                );
                content = extractTextFromTweets(tweets);
                postCount = tweets.length;
                break;
            }

            case "facebook": {
                // Facebook requires page ID from metadata
                const connectionData = connection as unknown as {
                    connected: boolean;
                    accessToken?: string;
                    platformUserId?: string;
                    expired?: boolean;
                    metadata?: OAuthConnectionMetadata;
                };

                const pageId = connectionData.metadata?.page_id;
                if (!pageId) {
                    throw new Error(
                        "Facebook page ID not found in connection metadata"
                    );
                }

                if (!connection.accessToken) {
                    throw new Error("Facebook access token not available");
                }

                const posts = await fetchFacebookPosts(
                    pageId,
                    connection.accessToken,
                    20
                );
                content = extractTextFromFacebookPosts(posts);
                postCount = posts.length;
                break;
            }

            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }

        logger.info(
            { platform, postCount, contentLength: content.length },
            "Successfully fetched content via API"
        );

        return {
            success: true,
            data: {
                platform,
                content,
                source: "api",
                metadata: {
                    postCount,
                    connectionStatus: "connected",
                },
            },
        };
    } catch (error) {
        logger.error({ error, platform }, "Failed to fetch via API");
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch content from platform API",
        };
    }
}

/**
 * Scrape and extract content from a URL (with API integration)
 * Tries API first if OAuth connected, falls back to manual paste instructions
 */
export async function scrapeAndExtractContent(
    url: string,
    userId?: string,
    profileId?: string
): Promise<{ success: boolean; data?: ScrapedContent; error?: string }> {
    try {
        // Validate URL format
        let validUrl: URL;
        try {
            validUrl = new URL(url);
        } catch {
            return {
                success: false,
                error: "Invalid URL format",
            };
        }

        // Only allow http/https
        if (!["http:", "https:"].includes(validUrl.protocol)) {
            return {
                success: false,
                error: "Only HTTP(S) URLs are supported",
            };
        }

        const platform = detectPlatformType(url);
        logger.info({ url, platform }, "Detected platform type");

        // Try API if OAuth available for social platforms
        if (platform !== "generic" && userId && profileId) {
            const apiResult = await fetchViaAPI(userId, profileId, platform);

            if (apiResult.success) {
                return apiResult;
            }

            // If API failed due to connection issues, provide OAuth prompt
            if (
                apiResult.error === "not_connected" ||
                apiResult.error === "token_expired"
            ) {
                return {
                    success: false,
                    error:
                        apiResult.error === "token_expired"
                            ? `Your ${platform} connection has expired. Please reconnect to import posts automatically.`
                            : `Connect your ${platform} account to automatically import your posts for voice analysis. Alternatively, you can paste content manually below.`,
                    data: {
                        platform,
                        content: [],
                        source: "manual",
                        metadata: {
                            connectionStatus:
                                apiResult.error === "token_expired"
                                    ? "expired"
                                    : "not_connected",
                        },
                    },
                };
            }
        }

        // For social media without API, guide to manual paste
        if (platform !== "generic") {
            return {
                success: false,
                error: `To analyze your ${platform} content, please connect your ${platform} account or paste sample posts manually. Social media profiles cannot be scraped directly due to privacy protections.`,
                data: {
                    platform,
                    content: [],
                    source: "manual",
                    metadata: {
                        connectionStatus: "not_connected",
                    },
                },
            };
        }

        // For generic websites, try basic scraping
        const rawText = await extractTextFromUrl(url);

        if (!rawText || rawText.trim().length === 0) {
            return {
                success: false,
                error: "No content found on this page. Please try a different URL or paste content manually.",
            };
        }

        // Parse content
        const content = await parseContentForPlatform(platform, rawText, url);

        if (content.length === 0) {
            return {
                success: false,
                error: "Unable to extract meaningful content from this URL. Please try pasting content manually.",
            };
        }

        // Validate we have enough content for analysis
        const totalLength = content.reduce((sum, post) => sum + post.length, 0);
        if (totalLength < 100) {
            return {
                success: false,
                error: "Insufficient content found. Please paste content manually for better analysis.",
            };
        }

        logger.info(
            { url, platform, contentCount: content.length, totalLength },
            "Successfully scraped content"
        );

        return {
            success: true,
            data: {
                platform,
                content,
                source: "scrape",
            },
        };
    } catch (error) {
        logger.error({ error, url }, "Failed to scrape URL");

        // Provide helpful error messages
        if (error instanceof Error) {
            if (
                error.message.includes("HTTP 403") ||
                error.message.includes("HTTP 401")
            ) {
                return {
                    success: false,
                    error: "This content is private or requires authentication. Please paste content manually.",
                };
            }
            if (error.message.includes("HTTP 404")) {
                return {
                    success: false,
                    error: "Page not found. Please check the URL and try again.",
                };
            }
        }

        return {
            success: false,
            error: "Failed to access URL. Please try pasting content manually for voice analysis.",
        };
    }
}

/**
 * Parse content based on platform type
 * Uses cheerio for better HTML parsing when available
 */
async function parseContentForPlatform(
    platform: PlatformType,
    rawText: string,
    _url: string
): Promise<string[]> {
    try {
        // For now, use basic text parsing
        // With cheerio, we could do more sophisticated parsing
        // but many social platforms serve content via JS, so basic scraping has limitations

        // Split into paragraphs/sections
        const paragraphs = rawText
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 20); // Filter out very short fragments

        // For social platforms, try to identify post-like content
        if (platform !== "generic") {
            // Look for patterns that might indicate posts
            // This is a heuristic approach since full scraping requires APIs
            const postLikeSections = paragraphs.filter((p) => {
                // Posts are typically between 50-5000 characters
                const length = p.length;
                // Check for common social media patterns
                const hasHashtags = /#\w+/.test(p);
                const hasMentions = /@\w+/.test(p);
                const hasLinks = /https?:\/\//.test(p);
                const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(p);

                return (
                    length >= 50 &&
                    length <= 5000 &&
                    (hasHashtags ||
                        hasMentions ||
                        hasLinks ||
                        hasEmojis ||
                        length > 100)
                );
            });

            if (postLikeSections.length > 0) {
                // Return up to 10 most relevant sections
                return postLikeSections.slice(0, 10);
            }
        }

        // For generic websites or fallback, extract meaningful paragraphs
        const meaningfulParagraphs = paragraphs.filter((p) => {
            // Skip very short or very long paragraphs
            const length = p.length;
            return length >= 50 && length <= 2000;
        });

        // Return up to 10 paragraphs, prioritizing longer ones
        return meaningfulParagraphs.sort((a, b) => b.length - a.length).slice(0, 10);
    } catch (error) {
        logger.error({ error, platform }, "Error parsing content for platform");
        // Fallback: return raw text as single content item
        return [rawText.substring(0, 5000)];
    }
}
