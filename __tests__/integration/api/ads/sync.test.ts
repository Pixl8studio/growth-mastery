/**
 * Integration Tests for Metrics Sync API
 * Tests GET /api/ads/sync (cron endpoint)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/ads/sync/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock("@/lib/ads/metrics-fetcher", () => ({
    syncAllAdMetrics: vi.fn(),
}));

import { syncAllAdMetrics } from "@/lib/ads/metrics-fetcher";

describe("GET /api/ads/sync", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should sync all ad metrics with valid authorization", async () => {
        process.env.CRON_SECRET = "test-secret-key";

        vi.mocked(syncAllAdMetrics).mockResolvedValue({
            success: true,
            synced: 5,
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/sync",
            headers: {
                authorization: "Bearer test-secret-key",
            },
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.synced).toBe(5);
        expect(data.timestamp).toBeDefined();
        expect(syncAllAdMetrics).toHaveBeenCalled();
    });

    it("should return 401 for missing authorization header", async () => {
        process.env.CRON_SECRET = "test-secret-key";

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/sync",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 for invalid CRON_SECRET", async () => {
        process.env.CRON_SECRET = "correct-secret";

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/sync",
            headers: {
                authorization: "Bearer wrong-secret",
            },
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 when CRON_SECRET not configured", async () => {
        delete process.env.CRON_SECRET;

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/sync",
            headers: {
                authorization: "Bearer some-secret",
            },
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Service misconfigured");
    });

    it("should return successful sync count", async () => {
        process.env.CRON_SECRET = "test-secret-key";

        vi.mocked(syncAllAdMetrics).mockResolvedValue({
            success: true,
            synced: 12,
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/sync",
            headers: {
                authorization: "Bearer test-secret-key",
            },
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.synced).toBe(12);
    });

    it("should handle sync errors gracefully", async () => {
        process.env.CRON_SECRET = "test-secret-key";

        vi.mocked(syncAllAdMetrics).mockRejectedValue(new Error("Database error"));

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/sync",
            headers: {
                authorization: "Bearer test-secret-key",
            },
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Internal server error");
    });

    it("should include timestamp in response", async () => {
        process.env.CRON_SECRET = "test-secret-key";

        vi.mocked(syncAllAdMetrics).mockResolvedValue({
            success: true,
            synced: 3,
        });

        const beforeTime = new Date().toISOString();

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/sync",
            headers: {
                authorization: "Bearer test-secret-key",
            },
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        const afterTime = new Date().toISOString();

        expect(data.timestamp).toBeDefined();
        expect(new Date(data.timestamp).getTime()).toBeGreaterThanOrEqual(
            new Date(beforeTime).getTime()
        );
        expect(new Date(data.timestamp).getTime()).toBeLessThanOrEqual(
            new Date(afterTime).getTime()
        );
    });

    it("should accept Bearer token format", async () => {
        process.env.CRON_SECRET = "my-secret-key-123";

        vi.mocked(syncAllAdMetrics).mockResolvedValue({
            success: true,
            synced: 2,
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/sync",
            headers: {
                authorization: "Bearer my-secret-key-123",
            },
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
    });

    it("should reject non-Bearer token format", async () => {
        process.env.CRON_SECRET = "test-secret-key";

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/sync",
            headers: {
                authorization: "Basic test-secret-key",
            },
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should handle zero synced campaigns", async () => {
        process.env.CRON_SECRET = "test-secret-key";

        vi.mocked(syncAllAdMetrics).mockResolvedValue({
            success: true,
            synced: 0,
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/sync",
            headers: {
                authorization: "Bearer test-secret-key",
            },
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.synced).toBe(0);
    });
});
