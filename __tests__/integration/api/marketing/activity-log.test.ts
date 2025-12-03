import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/marketing/activity-log/route";
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

describe("GET /api/marketing/activity-log", () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it("should return activity log for authenticated user", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/activity-log",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.activities)).toBe(true);
        expect(data.total).toBeGreaterThan(0);
    });

    it("should respect limit parameter", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/activity-log?limit=2",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.activities.length).toBeLessThanOrEqual(2);
    });

    it("should respect offset parameter", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/activity-log?offset=2&limit=2",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.activities)).toBe(true);
    });

    it("should use default limit when not specified", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/activity-log",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.activities.length).toBeLessThanOrEqual(50);
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: null,
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/activity-log",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Unauthorized");
    });

    it("should handle funnel_project_id parameter", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/activity-log?funnel_project_id=funnel-1",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should include activity metadata", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/activity-log",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.activities[0]).toHaveProperty("id");
        expect(data.activities[0]).toHaveProperty("action");
        expect(data.activities[0]).toHaveProperty("details");
        expect(data.activities[0]).toHaveProperty("created_at");
    });
});
