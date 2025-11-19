/**
 * Unified Scraper Service
 * Provides retry logic, rate limiting, caching, and robust error handling for web scraping
 */

import { logger } from "@/lib/logger";

/**
 * Configuration for fetch with retry logic
 */
interface FetchConfig {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    timeoutMs?: number;
    userAgent?: string;
}

/**
 * Result of a fetch operation
 */
interface FetchResult {
    success: boolean;
    html?: string;
    error?: string;
    statusCode?: number;
}

// Default user agent that identifies our bot properly
const DEFAULT_USER_AGENT =
    "Mozilla/5.0 (compatible; GrowthMastery/1.0; +https://growthmastery.ai)";

// User agent rotation pool for avoiding blocks
const USER_AGENTS = [
    DEFAULT_USER_AGENT,
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

/**
 * Get a random user agent from the pool
 */
function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(
    attempt: number,
    initialDelay: number,
    maxDelay: number
): number {
    const delay = Math.min(initialDelay * 2 ** attempt, maxDelay);
    // Add jitter (±25%) to avoid thundering herd
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown, statusCode?: number): boolean {
    // Network errors are retryable
    if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error.code === "ECONNRESET" || error.code === "ETIMEDOUT")
    ) {
        return true;
    }

    // HTTP status codes that are retryable
    if (statusCode) {
        // 408 Request Timeout, 429 Too Many Requests, 500-599 Server Errors
        return (
            statusCode === 408 ||
            statusCode === 429 ||
            (statusCode >= 500 && statusCode < 600)
        );
    }

    return false;
}

/**
 * Fetch HTML from a URL with retry logic, timeout, and error handling
 */
export async function fetchWithRetry(
    url: string,
    config: FetchConfig = {}
): Promise<FetchResult> {
    const {
        maxRetries = 3,
        initialDelayMs = 1000,
        maxDelayMs = 10000,
        timeoutMs = 30000,
        userAgent,
    } = config;

    let lastError: Error | undefined;
    let lastStatusCode: number | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(url, {
                headers: {
                    "User-Agent": userAgent || getRandomUserAgent(),
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            lastStatusCode = response.status;

            // Success
            if (response.ok) {
                const html = await response.text();
                logger.info(
                    {
                        url,
                        statusCode: response.status,
                        contentLength: html.length,
                        attempts: attempt + 1,
                    },
                    "Successfully fetched URL"
                );

                return {
                    success: true,
                    html,
                    statusCode: response.status,
                };
            }

            // Client errors (4xx) are generally not retryable except specific cases
            if (response.status >= 400 && response.status < 500) {
                if (response.status === 429) {
                    // Rate limited - check for Retry-After header
                    const retryAfter = response.headers.get("Retry-After");
                    if (retryAfter && attempt < maxRetries) {
                        const delayMs = parseInt(retryAfter) * 1000 || initialDelayMs;
                        logger.warn(
                            { url, statusCode: response.status, retryAfter, delayMs },
                            "Rate limited, retrying after delay"
                        );
                        await sleep(delayMs);
                        continue;
                    }
                }

                // 403 Forbidden or 401 Unauthorized - not retryable
                if (response.status === 403 || response.status === 401) {
                    logger.error(
                        { url, statusCode: response.status },
                        "Access denied (authentication/authorization required)"
                    );
                    return {
                        success: false,
                        error:
                            response.status === 403
                                ? "Access denied. This website may require authentication or blocks automated access."
                                : "Authentication required. This content is private.",
                        statusCode: response.status,
                    };
                }

                // 404 Not Found - not retryable
                if (response.status === 404) {
                    return {
                        success: false,
                        error: "Page not found. Please check the URL and try again.",
                        statusCode: response.status,
                    };
                }

                // Other 4xx errors
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                    statusCode: response.status,
                };
            }

            // Server errors (5xx) - retryable
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            lastError = error as Error;

            // Handle abort/timeout
            if (error instanceof Error && error.name === "AbortError") {
                logger.warn(
                    { url, attempt: attempt + 1, timeoutMs },
                    "Request timeout"
                );
                lastError = new Error(`Request timeout after ${timeoutMs}ms`);
            } else {
                logger.warn(
                    {
                        url,
                        attempt: attempt + 1,
                        error: error instanceof Error ? error.message : String(error),
                    },
                    "Fetch attempt failed"
                );
            }
        }

        // Don't retry if this was the last attempt
        if (attempt < maxRetries && isRetryableError(lastError, lastStatusCode)) {
            const delayMs = getBackoffDelay(attempt, initialDelayMs, maxDelayMs);
            logger.info(
                { url, attempt: attempt + 1, delayMs, maxRetries },
                "Retrying after delay"
            );
            await sleep(delayMs);
        } else if (attempt === maxRetries) {
            logger.error(
                {
                    url,
                    attempts: attempt + 1,
                    lastError: lastError?.message,
                    statusCode: lastStatusCode,
                },
                "Max retries exceeded"
            );
        }
    }

    // All retries failed
    return {
        success: false,
        error: lastError?.message || "Failed to fetch URL after multiple attempts",
        statusCode: lastStatusCode,
    };
}

/**
 * Check if a URL is accessible by making a HEAD request
 */
export async function checkUrlAccessible(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            method: "HEAD",
            headers: {
                "User-Agent": DEFAULT_USER_AGENT,
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        logger.debug({ error, url }, "URL accessibility check failed");
        return false;
    }
}

/**
 * Blocked IP patterns for SSRF protection
 * Prevents access to internal networks, cloud metadata endpoints, and localhost
 */
const BLOCKED_IP_PATTERNS = [
    /^127\./, // Loopback (127.0.0.0/8)
    /^10\./, // Private Class A (10.0.0.0/8)
    /^192\.168\./, // Private Class C (192.168.0.0/16)
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B (172.16.0.0/12) - Docker networks
    /^169\.254\./, // Link-local (169.254.0.0/16) + AWS metadata endpoint
    /^0\.0\.0\.0$/, // Wildcard
    /^::1$/, // IPv6 loopback
    /^::$/, // IPv6 unspecified
    /^fc00:/i, // IPv6 private (fc00::/7)
    /^fd00:/i, // IPv6 private (fd00::/8)
    /^fe80:/i, // IPv6 link-local (fe80::/10)
    /^ff00:/i, // IPv6 multicast
];

/**
 * Check if hostname matches blocked IP patterns
 */
function isBlockedHostname(hostname: string): boolean {
    const lowerHostname = hostname.toLowerCase();

    // Check against blocked patterns
    for (const pattern of BLOCKED_IP_PATTERNS) {
        if (pattern.test(lowerHostname)) {
            return true;
        }
    }

    // Check for localhost variants
    if (
        lowerHostname === "localhost" ||
        lowerHostname === "0.0.0.0" ||
        lowerHostname === "[::]" ||
        lowerHostname.endsWith(".localhost")
    ) {
        return true;
    }

    return false;
}

/**
 * Validate URL format and check for SSRF vulnerabilities
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
    try {
        const urlObj = new URL(url);

        // Only allow http/https
        if (!["http:", "https:"].includes(urlObj.protocol)) {
            return {
                valid: false,
                error: "Only HTTP and HTTPS URLs are supported",
            };
        }

        // Check for blocked hostnames/IPs (SSRF protection)
        const hostname = urlObj.hostname;
        if (isBlockedHostname(hostname)) {
            return {
                valid: false,
                error: "Local/internal URLs are not allowed for security reasons",
            };
        }

        return { valid: true };
    } catch {
        return {
            valid: false,
            error: "Invalid URL format. Please enter a valid HTTP or HTTPS URL.",
        };
    }
}

// Cache functions are now provided by lib/scraping/cache.ts
// This uses Vercel KV for distributed caching across serverless functions
export { getCached, setCache, clearCache } from "./cache";
