/**
 * Content Extractor Service
 * Intelligent content extraction using Cheerio for various content types
 */

import { logger } from "@/lib/logger";
import * as cheerio from "cheerio";
import { fetchWithRetry, validateUrl } from "./fetch-utils";

/**
 * Extracted content with metadata
 */
export interface ExtractedContent {
    title: string;
    description?: string;
    mainContent: string;
    headings: string[];
    links: string[];
    images: string[];
    metadata: {
        author?: string;
        publishDate?: string;
        keywords?: string[];
        wordCount: number;
        readingTime: number; // in minutes
    };
}

/**
 * Extract metadata from HTML
 */
function extractMetadata($: cheerio.CheerioAPI): {
    title: string;
    description?: string;
    author?: string;
    publishDate?: string;
    keywords?: string[];
} {
    // Title
    const title =
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="twitter:title"]').attr("content") ||
        $("title").text() ||
        $("h1").first().text() ||
        "";

    // Description
    const description =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="twitter:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        undefined;

    // Author
    const author =
        $('meta[name="author"]').attr("content") ||
        $('meta[property="article:author"]').attr("content") ||
        $('[rel="author"]').text() ||
        undefined;

    // Publish date
    const publishDate =
        $('meta[property="article:published_time"]').attr("content") ||
        $('meta[name="publish_date"]').attr("content") ||
        $('time[datetime]').attr("datetime") ||
        undefined;

    // Keywords
    const keywordsStr = $('meta[name="keywords"]').attr("content");
    const keywords = keywordsStr
        ? keywordsStr
              .split(",")
              .map((k) => k.trim())
              .filter((k) => k.length > 0)
        : undefined;

    return {
        title: title.trim(),
        description: description?.trim(),
        author: author?.trim(),
        publishDate,
        keywords,
    };
}

/**
 * Extract main content using various heuristics
 */
function extractMainContent($: cheerio.CheerioAPI): string {
    // Remove unwanted elements
    $(
        "script, style, nav, header, footer, aside, iframe, noscript, .sidebar, #sidebar, .navigation, .menu, .advertisement, .ad, .cookie-banner, .social-share, .comments, #comments"
    ).remove();

    // Try semantic HTML elements first
    const mainSelectors = [
        "main",
        "article",
        '[role="main"]',
        ".main-content",
        "#main-content",
        ".content",
        "#content",
        ".post-content",
        ".entry-content",
        ".article-content",
    ];

    for (const selector of mainSelectors) {
        const content = $(selector).text();
        if (content && content.trim().length > 100) {
            return content.trim();
        }
    }

    // Fallback: get all paragraphs
    const paragraphs: string[] = [];
    $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 50) {
            // Only substantial paragraphs
            paragraphs.push(text);
        }
    });

    if (paragraphs.length > 0) {
        return paragraphs.join("\n\n");
    }

    // Last resort: body text
    return $("body").text().replace(/\s+/g, " ").trim();
}

/**
 * Extract all headings
 */
function extractHeadings($: cheerio.CheerioAPI): string[] {
    const headings: string[] = [];

    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
        const text = $(el).text().trim();
        if (text) {
            headings.push(text);
        }
    });

    return headings;
}

/**
 * Extract all links
 */
function extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    const seen = new Set<string>();

    $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        // Convert relative URLs to absolute
        try {
            const url = new URL(href, baseUrl);
            const normalized = url.toString();

            if (!seen.has(normalized)) {
                seen.add(normalized);
                links.push(normalized);
            }
        } catch {
            // Invalid URL, skip
        }
    });

    return links.slice(0, 50); // Limit to 50 links
}

/**
 * Extract all images
 */
function extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = [];
    const seen = new Set<string>();

    $("img[src]").each((_, el) => {
        const src = $(el).attr("src");
        if (!src) return;

        // Convert relative URLs to absolute
        try {
            const url = new URL(src, baseUrl);
            const normalized = url.toString();

            if (!seen.has(normalized)) {
                seen.add(normalized);
                images.push(normalized);
            }
        } catch {
            // Invalid URL, skip
        }
    });

    return images.slice(0, 20); // Limit to 20 images
}

/**
 * Calculate reading time (assuming 200 words per minute)
 */
function calculateReadingTime(wordCount: number): number {
    return Math.ceil(wordCount / 200);
}

/**
 * Extract comprehensive content from HTML
 */
export async function extractContent(html: string, url: string): Promise<ExtractedContent> {
    try {
        const $ = cheerio.load(html);

        const metadata = extractMetadata($);
        const mainContent = extractMainContent($);
        const headings = extractHeadings($);
        const links = extractLinks($, url);
        const images = extractImages($, url);

        const wordCount = mainContent.split(/\s+/).length;
        const readingTime = calculateReadingTime(wordCount);

        logger.info(
            {
                url,
                title: metadata.title,
                wordCount,
                headings: headings.length,
                links: links.length,
                images: images.length,
            },
            "Content extracted successfully"
        );

        return {
            title: metadata.title,
            description: metadata.description,
            mainContent,
            headings,
            links,
            images,
            metadata: {
                author: metadata.author,
                publishDate: metadata.publishDate,
                keywords: metadata.keywords,
                wordCount,
                readingTime,
            },
        };
    } catch (error) {
        logger.error({ error, url }, "Failed to extract content");
        throw error;
    }
}

/**
 * Extract content from a URL (fetches and extracts in one go)
 */
export async function extractContentFromUrl(url: string): Promise<ExtractedContent> {
    // Validate URL
    const validation = validateUrl(url);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Fetch HTML
    const fetchResult = await fetchWithRetry(url, {
        maxRetries: 3,
        timeoutMs: 30000,
    });

    if (!fetchResult.success || !fetchResult.html) {
        throw new Error(fetchResult.error || "Failed to fetch URL");
    }

    // Extract content
    return extractContent(fetchResult.html, url);
}

