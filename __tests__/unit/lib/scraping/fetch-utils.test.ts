/**
 * Unit tests for fetch-utils
 * Tests retry logic, backoff, timeout, and SSRF protection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    fetchWithRetry,
    validateUrl,
    checkUrlAccessible,
} from "@/lib/scraping/fetch-utils";

// Mock the global fetch
global.fetch = vi.fn();

describe("fetchWithRetry", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should return success on first attempt for 200 response", async () => {
        const mockResponse = {
            ok: true,
            status: 200,
            text: async () => "<html>Test content</html>",
        };
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

        const result = await fetchWithRetry("https://example.com");

        expect(result.success).toBe(true);
        expect(result.html).toBe("<html>Test content</html>");
        expect(result.statusCode).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should retry on 500 errors with exponential backoff", async () => {
        const mockError = {
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
        };
        const mockSuccess = {
            ok: true,
            status: 200,
            text: async () => "<html>Success</html>",
        };

        vi.mocked(fetch)
            .mockResolvedValueOnce(mockError as any)
            .mockResolvedValueOnce(mockError as any)
            .mockResolvedValueOnce(mockSuccess as any);

        const result = await fetchWithRetry("https://example.com", {
            maxRetries: 3,
            initialDelayMs: 100,
            maxDelayMs: 1000,
        });

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    it("should not retry on 404 errors", async () => {
        const mockResponse = {
            ok: false,
            status: 404,
            statusText: "Not Found",
        };
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

        const result = await fetchWithRetry("https://example.com");

        expect(result.success).toBe(false);
        expect(result.error).toContain("not found");
        expect(result.statusCode).toBe(404);
        expect(fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it("should respect Retry-After header on 429 rate limit", async () => {
        const mockRateLimited = {
            ok: false,
            status: 429,
            headers: {
                get: (name: string) => (name === "Retry-After" ? "2" : null),
            },
        };
        const mockSuccess = {
            ok: true,
            status: 200,
            text: async () => "<html>Success</html>",
        };

        vi.mocked(fetch)
            .mockResolvedValueOnce(mockRateLimited as any)
            .mockResolvedValueOnce(mockSuccess as any);

        const startTime = Date.now();
        const result = await fetchWithRetry("https://example.com", {
            maxRetries: 1,
        });
        const elapsed = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(elapsed).toBeGreaterThanOrEqual(1900); // Should wait ~2 seconds
    });

    it("should timeout after specified duration", async () => {
        // Mock a fetch that respects abort signal
        vi.mocked(fetch).mockImplementation(
            (_url, options: any) =>
                new Promise((resolve, reject) => {
                    const signal = options?.signal;

                    // Listen for abort signal
                    if (signal) {
                        signal.addEventListener("abort", () => {
                            const error = new Error("The operation was aborted");
                            error.name = "AbortError";
                            reject(error);
                        });
                    }

                    // Simulate slow response that would trigger timeout
                    setTimeout(
                        () =>
                            resolve({
                                ok: true,
                                status: 200,
                                text: async () => "too late",
                            } as any),
                        3000
                    );
                })
        );

        const result = await fetchWithRetry("https://example.com", {
            timeoutMs: 1000,
            maxRetries: 0,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("timeout");
    }, 6000);

    it("should not retry on 403 Forbidden", async () => {
        const mockResponse = {
            ok: false,
            status: 403,
            statusText: "Forbidden",
        };
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

        const result = await fetchWithRetry("https://example.com");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Access denied");
        expect(result.statusCode).toBe(403);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should handle network errors with retry", async () => {
        const mockNetworkError = new Error("Network error");
        (mockNetworkError as any).code = "ECONNRESET";

        const mockSuccess = {
            ok: true,
            status: 200,
            text: async () => "<html>Success</html>",
        };

        vi.mocked(fetch)
            .mockRejectedValueOnce(mockNetworkError)
            .mockResolvedValueOnce(mockSuccess as any);

        const result = await fetchWithRetry("https://example.com", {
            maxRetries: 2,
            initialDelayMs: 50,
        });

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(2);
    });
});

describe("validateUrl", () => {
    it("should accept valid HTTP URLs", () => {
        const result = validateUrl("http://example.com");
        expect(result.valid).toBe(true);
    });

    it("should accept valid HTTPS URLs", () => {
        const result = validateUrl("https://example.com");
        expect(result.valid).toBe(true);
    });

    it("should reject non-HTTP(S) protocols", () => {
        const result = validateUrl("ftp://example.com");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("HTTP and HTTPS");
    });

    it("should reject localhost", () => {
        const result = validateUrl("http://localhost:3000");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Local/internal");
    });

    it("should reject 127.0.0.1 loopback", () => {
        const result = validateUrl("http://127.0.0.1");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Local/internal");
    });

    it("should reject 10.x.x.x private network", () => {
        const result = validateUrl("http://10.0.0.1");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Local/internal");
    });

    it("should reject 192.168.x.x private network", () => {
        const result = validateUrl("http://192.168.1.1");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Local/internal");
    });

    it("should reject 172.16-31.x.x Docker network", () => {
        const result = validateUrl("http://172.16.0.1");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Local/internal");
    });

    it("should reject 169.254.x.x link-local (AWS metadata)", () => {
        const result = validateUrl("http://169.254.169.254");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Local/internal");
    });

    it("should reject IPv6 loopback ::1", () => {
        const result = validateUrl("http://[::1]");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Local/internal");
    });

    it("should reject IPv6 private fc00::", () => {
        const result = validateUrl("http://[fc00::1]");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Local/internal");
    });

    it("should reject IPv6 link-local fe80::", () => {
        const result = validateUrl("http://[fe80::1]");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Local/internal");
    });

    it("should reject 0.0.0.0 wildcard", () => {
        const result = validateUrl("http://0.0.0.0");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Local/internal");
    });

    it("should reject invalid URL format", () => {
        const result = validateUrl("not-a-url");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Invalid URL format");
    });

    it("should reject .localhost subdomain", () => {
        const result = validateUrl("http://test.localhost");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Local/internal");
    });
});

describe("checkUrlAccessible", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return true for accessible URL", async () => {
        const mockResponse = {
            ok: true,
            status: 200,
        };
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

        const result = await checkUrlAccessible("https://example.com");

        expect(result).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
            "https://example.com",
            expect.objectContaining({
                method: "HEAD",
            })
        );
    });

    it("should return false for inaccessible URL", async () => {
        const mockResponse = {
            ok: false,
            status: 404,
        };
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

        const result = await checkUrlAccessible("https://example.com");

        expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

        const result = await checkUrlAccessible("https://example.com");

        expect(result).toBe(false);
    });
});
