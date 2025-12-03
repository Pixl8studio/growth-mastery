import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/marketing/analytics/experiments/route";
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

describe("GET /api/marketing/analytics/experiments", () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it("should return experiments for authenticated user", async () => {
        const mockExperiments = [
            {
                id: "exp-1",
                user_id: "test-user-id",
                name: "Test Experiment",
                status: "active",
                created_at: new Date().toISOString(),
            },
        ];

        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
                data: mockExperiments,
                error: null,
            }),
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/analytics/experiments",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.experiments).toEqual(mockExperiments);
    });

    it("should filter experiments by funnel_project_id", async () => {
        const mockBriefs = [{ id: "brief-1" }];
        const mockExperiments = [
            {
                id: "exp-1",
                content_brief_id: "brief-1",
                user_id: "test-user-id",
            },
        ];

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "marketing_content_briefs") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockResolvedValue({
                        data: mockBriefs,
                        error: null,
                    }),
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) =>
                    resolve({ data: mockExperiments, error: null })
                ),
            };
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/analytics/experiments?funnel_project_id=funnel-1",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(fromSpy).toHaveBeenCalledWith("marketing_content_briefs");
    });

    it("should filter experiments by status", async () => {
        const mockExperiments = [
            {
                id: "exp-1",
                status: "active",
            },
        ];

        const mockQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: mockExperiments, error: null })),
        };

        mockSupabase.from.mockReturnValue(mockQuery);

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/analytics/experiments?status=active",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.experiments).toEqual(mockExperiments);
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error("Not authenticated"),
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/analytics/experiments",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 500 on database error", async () => {
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Database error"),
            }),
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/analytics/experiments",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch experiments");
    });

    it("should return empty array when no experiments found", async () => {
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
            }),
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/analytics/experiments",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.experiments).toEqual([]);
    });
});
