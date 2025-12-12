/**
 * Multi-page Website Crawler API
 * Crawls up to 50 pages, max 3 levels deep from a base URL
 * Extracts text from same-domain pages only
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

interface CrawlRequest {
    projectId: string;
    url: string;
    maxPages?: number;
    maxDepth?: number;
}

interface PageContent {
    url: string;
    text: string;
    depth: number;
}

const DEFAULT_MAX_PAGES = 50;
const DEFAULT_MAX_DEPTH = 3;
const REQUEST_TIMEOUT = 10000; // 10 seconds per page
const REQUEST_DELAY = 500; // 500ms between requests (rate limiting)

/**
 * Extract links from HTML content
 */
function extractLinks(html: string, baseUrl: URL): string[] {
    const links: string[] = [];
    const linkRegex = /href=["']([^"']+)["']/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        try {
            const href = match[1];

            // Skip non-page links
            if (
                href.startsWith("#") ||
                href.startsWith("javascript:") ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:") ||
                href.match(/\.(pdf|jpg|jpeg|png|gif|svg|ico|css|js|xml|json)$/i)
            ) {
                continue;
            }

            // Resolve relative URLs
            const absoluteUrl = new URL(href, baseUrl);

            // Only include same-domain links
            if (absoluteUrl.hostname === baseUrl.hostname) {
                // Normalize URL (remove trailing slash, fragment, query params for deduplication)
                const normalizedUrl =
                    `${absoluteUrl.protocol}//${absoluteUrl.hostname}${absoluteUrl.pathname}`.replace(
                        /\/$/,
                        ""
                    );
                links.push(normalizedUrl);
            }
        } catch {
            // Invalid URL, skip
        }
    }

    return [...new Set(links)]; // Deduplicate
}

/**
 * Extract text content from HTML
 */
async function extractTextFromHtml(html: string): Promise<string> {
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $(
        "script, style, nav, header, footer, iframe, noscript, aside, .sidebar, #sidebar, .advertisement, .ad, .cookie-banner, .popup, .modal"
    ).remove();

    // Try to extract main content first (semantic HTML)
    let mainContent =
        $("main").text() ||
        $("article").text() ||
        $('[role="main"]').text() ||
        $(".content").text() ||
        $("#content").text() ||
        $(".main-content").text() ||
        $("#main-content").text();

    // Fallback to body if no semantic content found
    if (!mainContent || mainContent.trim().length < 100) {
        mainContent = $("body").text();
    }

    // Clean up whitespace
    return mainContent.replace(/\s+/g, " ").trim();
}

/**
 * Fetch a single page with timeout
 */
async function fetchPage(
    url: string,
    signal?: AbortSignal
): Promise<{ html: string; ok: boolean }> {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (compatible; GrowthMastery/1.0; +https://growthmastery.ai)",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            signal,
        });

        if (!response.ok) {
            return { html: "", ok: false };
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
            return { html: "", ok: false };
        }

        const html = await response.text();
        return { html, ok: true };
    } catch (error) {
        logger.warn({ error, url }, "Failed to fetch page");
        return { html: "", ok: false };
    }
}

/**
 * Check if URL is blocked by robots.txt
 */
async function isBlockedByRobots(baseUrl: URL): Promise<boolean> {
    try {
        const robotsUrl = `${baseUrl.protocol}//${baseUrl.hostname}/robots.txt`;
        const response = await fetch(robotsUrl, {
            headers: {
                "User-Agent": "GrowthMastery/1.0",
            },
        });

        if (!response.ok) {
            return false; // No robots.txt, assume allowed
        }

        const robotsText = await response.text();
        const lines = robotsText.toLowerCase().split("\n");

        let isRelevantUserAgent = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("user-agent:")) {
                const agent = trimmed.split(":")[1]?.trim();
                isRelevantUserAgent = agent === "*" || agent?.includes("growthmastery");
            } else if (isRelevantUserAgent && trimmed.startsWith("disallow:")) {
                const path = trimmed.split(":")[1]?.trim();
                if (path === "/" || path === "/*") {
                    return true; // All paths blocked
                }
            }
        }

        return false;
    } catch {
        return false; // Error fetching robots.txt, assume allowed
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as CrawlRequest;
        const {
            projectId,
            url,
            maxPages = DEFAULT_MAX_PAGES,
            maxDepth = DEFAULT_MAX_DEPTH,
        } = body;

        if (!projectId || !url) {
            return NextResponse.json(
                { error: "Missing required fields: projectId and url" },
                { status: 400 }
            );
        }

        // Validate URL
        let baseUrl: URL;
        try {
            baseUrl = new URL(url);
            if (!["http:", "https:"].includes(baseUrl.protocol)) {
                throw new Error("Invalid protocol");
            }
        } catch {
            return NextResponse.json(
                { error: "Invalid URL. Please enter a valid HTTP or HTTPS URL." },
                { status: 400 }
            );
        }

        // Check robots.txt
        const isBlocked = await isBlockedByRobots(baseUrl);
        if (isBlocked) {
            return NextResponse.json(
                { error: "Website blocks automated crawling via robots.txt" },
                { status: 403 }
            );
        }

        // Prevent crawling internal networks
        const hostname = baseUrl.hostname.toLowerCase();
        if (
            hostname === "localhost" ||
            hostname.startsWith("127.") ||
            hostname.startsWith("192.168.") ||
            hostname.startsWith("10.") ||
            hostname.endsWith(".local")
        ) {
            return NextResponse.json(
                { error: "Cannot crawl internal network addresses" },
                { status: 400 }
            );
        }

        logger.info(
            { url, maxPages, maxDepth, projectId },
            "Starting multi-page crawl"
        );

        // BFS crawl
        const visitedUrls = new Set<string>();
        const pageContents: PageContent[] = [];
        const queue: Array<{ url: string; depth: number }> = [{ url, depth: 0 }];

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60 second total timeout

        try {
            while (queue.length > 0 && pageContents.length < maxPages) {
                const current = queue.shift();
                if (!current) break;

                const { url: currentUrl, depth } = current;

                // Skip if already visited or exceeds depth
                const normalizedUrl = currentUrl.replace(/\/$/, "");
                if (visitedUrls.has(normalizedUrl) || depth > maxDepth) {
                    continue;
                }

                visitedUrls.add(normalizedUrl);

                // Fetch page
                const { html, ok } = await fetchPage(currentUrl, controller.signal);
                if (!ok || !html) {
                    continue;
                }

                // Extract text
                const text = await extractTextFromHtml(html);
                if (text && text.length >= 50) {
                    // Minimum 50 chars
                    pageContents.push({
                        url: currentUrl,
                        text,
                        depth,
                    });
                }

                // Extract and queue new links if we haven't reached max pages
                if (pageContents.length < maxPages && depth < maxDepth) {
                    const links = extractLinks(html, new URL(currentUrl));
                    for (const link of links) {
                        const normalizedLink = link.replace(/\/$/, "");
                        if (!visitedUrls.has(normalizedLink)) {
                            queue.push({ url: link, depth: depth + 1 });
                        }
                    }
                }

                // Rate limiting
                if (queue.length > 0) {
                    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
                }
            }
        } finally {
            clearTimeout(timeout);
        }

        if (pageContents.length === 0) {
            return NextResponse.json(
                { error: "No content could be extracted from the website" },
                { status: 400 }
            );
        }

        // Combine all page contents with source URLs
        const combinedContent = pageContents
            .map((page) => {
                const cleanText = page.text.trim();
                if (cleanText.length < 50) return null;
                return `--- From: ${page.url} ---\n${cleanText}`;
            })
            .filter(Boolean)
            .join("\n\n");

        // Deduplicate content (remove exact duplicates across pages)
        const uniqueContent = deduplicateContent(combinedContent);

        logger.info(
            {
                projectId,
                baseUrl: url,
                pagesScraped: pageContents.length,
                contentLength: uniqueContent.length,
                visitedCount: visitedUrls.size,
            },
            "Multi-page crawl completed"
        );

        return NextResponse.json({
            success: true,
            content: uniqueContent,
            pagesScraped: pageContents.length,
            urls: pageContents.map((p) => p.url),
        });
    } catch (error) {
        logger.error({ error }, "Error in crawl endpoint");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/intake/crawl",
            },
        });

        if (error instanceof Error && error.name === "AbortError") {
            return NextResponse.json(
                { error: "Request timed out. The website may be too slow to respond." },
                { status: 408 }
            );
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Remove duplicate paragraphs that appear across multiple pages
 * (common for headers, footers, navigation text)
 */
function deduplicateContent(content: string): string {
    const sections = content.split(/---\s*From:/);
    const paragraphCounts = new Map<string, number>();

    // Count occurrences of each paragraph
    for (const section of sections) {
        const paragraphs = section
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter((p) => p.length > 20);

        const seenInSection = new Set<string>();
        for (const paragraph of paragraphs) {
            // Normalize paragraph for comparison
            const normalized = paragraph.toLowerCase().replace(/\s+/g, " ");
            if (!seenInSection.has(normalized)) {
                seenInSection.add(normalized);
                paragraphCounts.set(
                    normalized,
                    (paragraphCounts.get(normalized) || 0) + 1
                );
            }
        }
    }

    // Filter out paragraphs that appear in more than 50% of sections
    const threshold = Math.max(2, Math.ceil(sections.length * 0.5));
    const duplicateParagraphs = new Set(
        [...paragraphCounts.entries()]
            .filter(([_, count]) => count >= threshold)
            .map(([para]) => para)
    );

    // Rebuild content without duplicates
    const result: string[] = [];
    for (const section of sections) {
        if (!section.trim()) continue;

        const paragraphs = section.split(/\n\n+/).map((p) => p.trim());
        const filteredParagraphs = paragraphs.filter((p) => {
            if (p.startsWith("http") || p.length <= 20) return true; // Keep URLs and short text
            const normalized = p.toLowerCase().replace(/\s+/g, " ");
            return !duplicateParagraphs.has(normalized);
        });

        if (filteredParagraphs.length > 0) {
            const sectionText = filteredParagraphs.join("\n\n");
            if (sectionText.length > 50) {
                result.push(`--- From:${sectionText}`);
            }
        }
    }

    return result.join("\n\n");
}
