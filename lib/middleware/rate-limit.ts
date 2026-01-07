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
 * Limits: 10 requests per minute per user (expensive AI operation)
 * Note: Resume requests bypass this limit entirely - see stream route
 */
const presentationGenerationRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
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

/**
 * Rate limiter for slide editing
 * Limits: 30 requests per minute per user (AI-powered quick actions)
 */
const slideEditRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "ratelimit:slide-edit",
});

/**
 * Rate limiter for AI image generation
 * Limits: 10 requests per minute per user (expensive image generation)
 */
const imageGenerationRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "ratelimit:image-generation",
});

/**
 * Rate limiter for funnel map chat
 * Limits: 150 requests per hour per user (AI conversations)
 * Rationale: Users refining 7-9 nodes need ~16-21 messages per node
 */
const funnelChatRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(150, "1 h"),
    analytics: true,
    prefix: "ratelimit:funnel-chat",
});

/**
 * Rate limiter for funnel draft generation
 * Limits: 10 requests per hour per user (expensive: 7-9 parallel AI calls)
 */
const funnelDraftsRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "ratelimit:funnel-drafts",
});

/**
 * Rate limiter for image uploads
 * Limits: 30 requests per minute per user (storage operations)
 */
const imageUploadRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "ratelimit:image-upload",
});

/**
 * Rate limiter for AI editor chat
 * Limits: 150 requests per hour per user (AI conversations)
 * Rationale: Consistent with funnel-chat, allows sustained editing sessions
 */
const aiEditorChatRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(150, "1 h"),
    analytics: true,
    prefix: "ratelimit:ai-editor-chat",
});

export type RateLimitEndpoint =
    | "scraping"
    | "brand-colors"
    | "presentation-generation"
    | "presentation-export"
    | "slide-edit"
    | "image-generation"
    | "funnel-chat"
    | "funnel-drafts"
    | "image-upload"
    | "ai-editor-chat";

/**
 * Rate limit check result with metadata for headers
 */
export interface RateLimitResult {
    /** Whether the request was blocked (true = blocked, false = allowed) */
    blocked: boolean;
    /** 429 response if blocked, null if allowed */
    response: NextResponse | null;
    /** Rate limit info for adding headers to successful responses */
    info: {
        limit: number;
        remaining: number;
        reset: string;
    } | null;
}

/**
 * Check rate limit for a user
 * Returns result object with blocking status and rate limit info for headers
 */
export async function checkRateLimitWithInfo(
    identifier: string,
    endpoint: RateLimitEndpoint
): Promise<RateLimitResult> {
    try {
        const limiterMap: Record<RateLimitEndpoint, Ratelimit> = {
            scraping: scrapingRatelimit,
            "brand-colors": brandColorsRatelimit,
            "presentation-generation": presentationGenerationRatelimit,
            "presentation-export": presentationExportRatelimit,
            "slide-edit": slideEditRatelimit,
            "image-generation": imageGenerationRatelimit,
            "funnel-chat": funnelChatRatelimit,
            "funnel-drafts": funnelDraftsRatelimit,
            "image-upload": imageUploadRatelimit,
            "ai-editor-chat": aiEditorChatRatelimit,
        };

        const limiter = limiterMap[endpoint];

        const { success, limit, remaining, reset } = await limiter.limit(identifier);
        const resetDate = new Date(reset);
        const resetIso = resetDate.toISOString();

        if (!success) {
            logger.warn(
                {
                    identifier,
                    endpoint,
                    limit,
                    remaining,
                    reset: resetIso,
                },
                "Rate limit exceeded"
            );

            return {
                blocked: true,
                response: NextResponse.json(
                    {
                        error: "Rate limit exceeded. Please try again later.",
                        limit,
                        remaining: 0,
                        resetAt: resetIso,
                    },
                    {
                        status: 429,
                        headers: {
                            "X-RateLimit-Limit": limit.toString(),
                            "X-RateLimit-Remaining": "0",
                            "X-RateLimit-Reset": resetIso,
                            "Retry-After": Math.ceil(
                                (reset - Date.now()) / 1000
                            ).toString(),
                        },
                    }
                ),
                info: { limit, remaining: 0, reset: resetIso },
            };
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

        return {
            blocked: false,
            response: null,
            info: { limit, remaining, reset: resetIso },
        };
    } catch (error) {
        // If rate limiting fails, allow the request (graceful degradation)
        logger.error({ error, identifier, endpoint }, "Rate limit check failed");
        return { blocked: false, response: null, info: null };
    }
}

/**
 * Check rate limit for a user (legacy function for backwards compatibility)
 * Returns null if allowed, or NextResponse with 429 if rate limited
 */
export async function checkRateLimit(
    identifier: string,
    endpoint: RateLimitEndpoint
): Promise<NextResponse | null> {
    const result = await checkRateLimitWithInfo(identifier, endpoint);
    return result.response;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
    response: NextResponse,
    info: RateLimitResult["info"]
): NextResponse {
    if (!info) return response;

    response.headers.set("X-RateLimit-Limit", info.limit.toString());
    response.headers.set("X-RateLimit-Remaining", info.remaining.toString());
    response.headers.set("X-RateLimit-Reset", info.reset);

    return response;
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
