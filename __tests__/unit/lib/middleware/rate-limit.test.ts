/**
 * Unit tests for lib/middleware/rate-limit.ts
 * Tests rate limiting middleware for API endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock Upstash Ratelimit
const mockLimit = vi.fn();

vi.mock("@upstash/ratelimit", () => {
    const RatelimitMock = vi.fn().mockImplementation(() => ({
        limit: mockLimit,
    })) as any;

    // Add static slidingWindow method
    RatelimitMock.slidingWindow = vi.fn(() => ({}));

    return {
        Ratelimit: RatelimitMock,
    };
});

// Mock Vercel KV
vi.mock("@vercel/kv", () => ({
    kv: {},
}));

// Import after mocks are set up
const { checkRateLimit, getRateLimitIdentifier } = await import(
    "@/lib/middleware/rate-limit"
);

describe("lib/middleware/rate-limit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("checkRateLimit", () => {
        it("should allow request when rate limit is not exceeded", async () => {
            mockLimit.mockResolvedValue({
                success: true,
                limit: 10,
                remaining: 5,
                reset: Date.now() + 60000,
            });

            const result = await checkRateLimit("user:123", "scraping");

            expect(result).toBeNull();
            expect(mockLimit).toHaveBeenCalledWith("user:123");
            expect(logger.debug).toHaveBeenCalled();
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it("should return 429 response when rate limit is exceeded", async () => {
            const resetTime = Date.now() + 60000;
            mockLimit.mockResolvedValue({
                success: false,
                limit: 10,
                remaining: 0,
                reset: resetTime,
            });

            const result = await checkRateLimit("user:123", "scraping");

            expect(result).not.toBeNull();
            expect(result?.status).toBe(429);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.objectContaining({
                    identifier: "user:123",
                    endpoint: "scraping",
                    limit: 10,
                    remaining: 0,
                }),
                "Rate limit exceeded"
            );

            const body = await result?.json();
            expect(body).toMatchObject({
                error: "Rate limit exceeded. Please try again later.",
                limit: 10,
                remaining: 0,
            });
        });

        it("should include rate limit headers in 429 response", async () => {
            const resetTime = Date.now() + 60000;
            mockLimit.mockResolvedValue({
                success: false,
                limit: 10,
                remaining: 0,
                reset: resetTime,
            });

            const result = await checkRateLimit("user:123", "scraping");

            expect(result?.headers.get("X-RateLimit-Limit")).toBe("10");
            expect(result?.headers.get("X-RateLimit-Remaining")).toBe("0");
            expect(result?.headers.get("X-RateLimit-Reset")).toBeDefined();
            expect(result?.headers.get("Retry-After")).toBeDefined();
        });

        it("should use scraping rate limiter for scraping endpoint", async () => {
            mockLimit.mockResolvedValue({
                success: true,
                limit: 10,
                remaining: 5,
                reset: Date.now() + 60000,
            });

            await checkRateLimit("user:123", "scraping");

            expect(mockLimit).toHaveBeenCalledWith("user:123");
        });

        it("should use brand-colors rate limiter for brand-colors endpoint", async () => {
            mockLimit.mockResolvedValue({
                success: true,
                limit: 20,
                remaining: 10,
                reset: Date.now() + 60000,
            });

            await checkRateLimit("user:123", "brand-colors");

            expect(mockLimit).toHaveBeenCalledWith("user:123");
        });

        it("should allow request gracefully when rate limiting fails", async () => {
            mockLimit.mockRejectedValue(new Error("Redis connection failed"));

            const result = await checkRateLimit("user:123", "scraping");

            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    identifier: "user:123",
                    endpoint: "scraping",
                }),
                "Rate limit check failed"
            );
        });

        it("should handle network errors gracefully", async () => {
            mockLimit.mockRejectedValue(new Error("Network timeout"));

            const result = await checkRateLimit("user:123", "brand-colors");

            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalled();
        });

        it("should include resetAt in ISO format in response body", async () => {
            const resetTime = Date.now() + 60000;
            mockLimit.mockResolvedValue({
                success: false,
                limit: 10,
                remaining: 0,
                reset: resetTime,
            });

            const result = await checkRateLimit("user:123", "scraping");
            const body = await result?.json();

            expect(body.resetAt).toBeDefined();
            expect(new Date(body.resetAt).getTime()).toBeCloseTo(resetTime, -2);
        });

        it("should calculate Retry-After header in seconds", async () => {
            const resetTime = Date.now() + 120000; // 2 minutes from now
            mockLimit.mockResolvedValue({
                success: false,
                limit: 10,
                remaining: 0,
                reset: resetTime,
            });

            const result = await checkRateLimit("user:123", "scraping");
            const retryAfter = parseInt(result?.headers.get("Retry-After") || "0", 10);

            // Should be approximately 120 seconds (allow 1 second tolerance)
            expect(retryAfter).toBeGreaterThan(118);
            expect(retryAfter).toBeLessThan(122);
        });
    });

    describe("getRateLimitIdentifier", () => {
        it("should use user ID when provided", () => {
            const request = new NextRequest("http://localhost:3000/api/scrape");
            const identifier = getRateLimitIdentifier(request, "user-123");

            expect(identifier).toBe("user:user-123");
        });

        it("should use x-forwarded-for IP when user ID not provided", () => {
            const request = new NextRequest("http://localhost:3000/api/scrape", {
                headers: {
                    "x-forwarded-for": "192.168.1.100, 10.0.0.1",
                },
            });

            const identifier = getRateLimitIdentifier(request);

            expect(identifier).toBe("ip:192.168.1.100");
        });

        it("should use x-real-ip when x-forwarded-for is not present", () => {
            const request = new NextRequest("http://localhost:3000/api/scrape", {
                headers: {
                    "x-real-ip": "192.168.1.200",
                },
            });

            const identifier = getRateLimitIdentifier(request);

            expect(identifier).toBe("ip:192.168.1.200");
        });

        it("should use 'anonymous' when no IP headers present", () => {
            const request = new NextRequest("http://localhost:3000/api/scrape");

            const identifier = getRateLimitIdentifier(request);

            expect(identifier).toBe("ip:anonymous");
        });

        it("should extract first IP from x-forwarded-for list", () => {
            const request = new NextRequest("http://localhost:3000/api/scrape", {
                headers: {
                    "x-forwarded-for": "203.0.113.1, 192.168.1.1, 10.0.0.1",
                },
            });

            const identifier = getRateLimitIdentifier(request);

            expect(identifier).toBe("ip:203.0.113.1");
        });

        it("should prioritize user ID over IP address", () => {
            const request = new NextRequest("http://localhost:3000/api/scrape", {
                headers: {
                    "x-forwarded-for": "192.168.1.100",
                },
            });

            const identifier = getRateLimitIdentifier(request, "user-456");

            expect(identifier).toBe("user:user-456");
        });

        it("should handle empty x-forwarded-for header", () => {
            const request = new NextRequest("http://localhost:3000/api/scrape", {
                headers: {
                    "x-forwarded-for": "",
                },
            });

            const identifier = getRateLimitIdentifier(request);

            expect(identifier).toBe("ip:anonymous");
        });

        it("should handle whitespace in x-forwarded-for", () => {
            const request = new NextRequest("http://localhost:3000/api/scrape", {
                headers: {
                    "x-forwarded-for": "  192.168.1.100  , 10.0.0.1",
                },
            });

            const identifier = getRateLimitIdentifier(request);

            expect(identifier).toBe("ip:192.168.1.100");
        });
    });
});
