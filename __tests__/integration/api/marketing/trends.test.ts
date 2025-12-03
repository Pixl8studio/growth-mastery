import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, DELETE } from "@/app/api/marketing/trends/route";
import {
    createMockSupabaseClient,
    createMockRequest,
} from "@/__tests__/utils/test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock("@/lib/marketing/trend-scanner-service", () => ({
    getActiveTrends: vi.fn(),
    dismissTrend: vi.fn(),
}));

describe("GET /api/marketing/trends", () => {
    let mockSupabase: any;
    let mockGetActiveTrends: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const { getActiveTrends } = await import(
            "@/lib/marketing/trend-scanner-service"
        );
        mockGetActiveTrends = getActiveTrends;
    });

    it("should return active trends for authenticated user", async () => {
        const mockTrends = [
            {
                id: "trend-1",
                topic: "AI in Marketing",
                relevance_score: 0.9,
            },
            {
                id: "trend-2",
                topic: "Social Commerce",
                relevance_score: 0.85,
            },
        ];

        mockGetActiveTrends.mockResolvedValue({
            success: true,
            trends: mockTrends,
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/trends",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.trends).toEqual(mockTrends);
        expect(mockGetActiveTrends).toHaveBeenCalledWith("test-user-id", 10);
    });

    it("should respect limit parameter", async () => {
        mockGetActiveTrends.mockResolvedValue({
            success: true,
            trends: [],
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/trends?limit=5",
        });

        await GET(request);

        expect(mockGetActiveTrends).toHaveBeenCalledWith("test-user-id", 5);
    });

    it("should use default limit of 10", async () => {
        mockGetActiveTrends.mockResolvedValue({
            success: true,
            trends: [],
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/trends",
        });

        await GET(request);

        expect(mockGetActiveTrends).toHaveBeenCalledWith("test-user-id", 10);
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error("Not authenticated"),
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/trends",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 500 when service fails", async () => {
        mockGetActiveTrends.mockResolvedValue({
            success: false,
            error: "Service error",
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/trends",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Service error");
    });

    it("should handle empty trends list", async () => {
        mockGetActiveTrends.mockResolvedValue({
            success: true,
            trends: [],
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/trends",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.trends).toEqual([]);
    });
});

describe("DELETE /api/marketing/trends", () => {
    let mockSupabase: any;
    let mockDismissTrend: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const { dismissTrend } = await import("@/lib/marketing/trend-scanner-service");
        mockDismissTrend = dismissTrend;
    });

    it("should dismiss trend for authenticated user", async () => {
        mockDismissTrend.mockResolvedValue({
            success: true,
        });

        const request = createMockRequest({
            method: "DELETE",
            url: "http://localhost:3000/api/marketing/trends?trend_id=trend-1",
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockDismissTrend).toHaveBeenCalledWith("trend-1", "test-user-id");
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error("Not authenticated"),
        });

        const request = createMockRequest({
            method: "DELETE",
            url: "http://localhost:3000/api/marketing/trends?trend_id=trend-1",
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 400 when trend_id is missing", async () => {
        const request = createMockRequest({
            method: "DELETE",
            url: "http://localhost:3000/api/marketing/trends",
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("trend_id is required");
    });

    it("should return 500 when service fails", async () => {
        mockDismissTrend.mockResolvedValue({
            success: false,
            error: "Service error",
        });

        const request = createMockRequest({
            method: "DELETE",
            url: "http://localhost:3000/api/marketing/trends?trend_id=trend-1",
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Service error");
    });

    it("should handle service exceptions gracefully", async () => {
        mockDismissTrend.mockRejectedValue(new Error("Unexpected error"));

        const request = createMockRequest({
            method: "DELETE",
            url: "http://localhost:3000/api/marketing/trends?trend_id=trend-1",
        });

        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Internal server error");
    });
});
