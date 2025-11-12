/**
 * Social Content Scraper Service
 * Scrapes and extracts content from social media profiles and websites
 * for voice analysis and Echo Mode calibration
 */

import { logger } from "@/lib/logger";
import { extractTextFromUrl } from "@/lib/intake/processors";

export type PlatformType =
    | "instagram"
    | "linkedin"
    | "twitter"
    | "facebook"
    | "generic";

export interface ScrapedContent {
    platform: PlatformType;
    content: string[];
    metadata?: {
        profileName?: string;
        bio?: string;
        postCount?: number;
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
 * Scrape and extract content from a URL
 * Returns structured content array suitable for voice analysis
 */
export async function scrapeAndExtractContent(
    url: string
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

        // For social media platforms, we'll attempt to scrape
        // Note: Most platforms require authentication/APIs, so we'll use basic scraping
        // and provide helpful error messages if it fails
        const rawText = await extractTextFromUrl(url);

        if (!rawText || rawText.trim().length === 0) {
            return {
                success: false,
                error: "No content found on this page. The profile may be private or require authentication.",
            };
        }

        // Parse content based on platform type
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
                error: "Insufficient content found. Please ensure the page has enough text content for analysis.",
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
                    error: "This profile appears to be private or requires authentication. Please paste content manually.",
                };
            }
            if (error.message.includes("HTTP 404")) {
                return {
                    success: false,
                    error: "Page not found. Please check the URL and try again.",
                };
            }
            if (error.message.includes("Failed to scrape")) {
                return {
                    success: false,
                    error: "Unable to access this URL. Please try pasting content manually or check if the URL is accessible.",
                };
            }
        }

        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to scrape URL. Please try pasting content manually.",
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
