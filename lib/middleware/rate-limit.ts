/**
 * Rate Limiting Middleware
 * Prevents abuse of expensive scraping operations
 */

import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * Rate limiter for scraping endpoints
 * Limits: 10 requests per minute per user
 */
const scrapingRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "ratelimit:scraping",
});

/**
 * Rate limiter for brand color extraction
 * Limits: 20 requests per minute per user (less expensive)
 */
const brandColorsRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "ratelimit:brand-colors",
});

/**
 * Rate limiter for presentation generation
 * Limits: 5 requests per minute per user (expensive AI operation)
 */
const presentationGenerationRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "ratelimit:presentation-generation",
});

/**
 * Rate limiter for presentation export
 * Limits: 20 requests per minute per user (CPU intensive but not AI)
 */
const presentationExportRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "ratelimit:presentation-export",
});

export type RateLimitEndpoint =
    | "scraping"
    | "brand-colors"
    | "presentation-generation"
    | "presentation-export";

/**
 * Check rate limit for a user
 * Returns null if allowed, or NextResponse with 429 if rate limited
 */
export async function checkRateLimit(
    identifier: string,
    endpoint: RateLimitEndpoint
): Promise<NextResponse | null> {
    try {
        const limiterMap: Record<RateLimitEndpoint, Ratelimit> = {
            scraping: scrapingRatelimit,
            "brand-colors": brandColorsRatelimit,
            "presentation-generation": presentationGenerationRatelimit,
            "presentation-export": presentationExportRatelimit,
        };

        const limiter = limiterMap[endpoint];

        const { success, limit, remaining, reset } = await limiter.limit(identifier);

        if (!success) {
            const resetDate = new Date(reset);
            logger.warn(
                {
                    identifier,
                    endpoint,
                    limit,
                    remaining,
                    reset: resetDate.toISOString(),
                },
                "Rate limit exceeded"
            );

            return NextResponse.json(
                {
                    error: "Rate limit exceeded. Please try again later.",
                    limit,
                    remaining: 0,
                    resetAt: resetDate.toISOString(),
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": limit.toString(),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": resetDate.toISOString(),
                        "Retry-After": Math.ceil(
                            (reset - Date.now()) / 1000
                        ).toString(),
                    },
                }
            );
        }

        // Log rate limit status for monitoring
        logger.debug(
            {
                identifier,
                endpoint,
                limit,
                remaining,
            },
            "Rate limit check passed"
        );

        return null; // Allow request
    } catch (error) {
        // If rate limiting fails, allow the request (graceful degradation)
        logger.error({ error, identifier, endpoint }, "Rate limit check failed");
        return null;
    }
}

/**
 * Get identifier from request (user ID or IP address)
 */
export function getRateLimitIdentifier(request: NextRequest, userId?: string): string {
    // Use user ID if authenticated
    if (userId) {
        return `user:${userId}`;
    }

    // Fall back to IP address
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip")?.trim() ||
        "anonymous";

    return `ip:${ip}`;
}
