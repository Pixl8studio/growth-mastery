import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/marketing/export/route";
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

describe("GET /api/marketing/export", () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it("should export content as JSON for authenticated user", async () => {
        const mockProject = {
            user_id: "test-user-id",
            name: "Test Funnel",
        };

        const mockBriefs = [
            {
                id: "brief-1",
                name: "Test Brief",
                funnel_project_id: "funnel-1",
            },
        ];

        const mockVariants = [
            {
                id: "variant-1",
                content_brief_id: "brief-1",
                platform: "instagram",
                copy_text: "Test post",
                hashtags: ["test"],
            },
        ];

        const mockAnalytics = [
            {
                post_variant_id: "variant-1",
                impressions: 1000,
                opt_ins: 10,
            },
        ];

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "funnel_projects") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockProject,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_content_briefs") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({
                        data: mockBriefs,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_post_variants") {
                return {
                    select: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({
                        data: mockVariants,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_analytics") {
                return {
                    select: vi.fn().mockReturnThis(),
                    in: vi.fn().mockResolvedValue({
                        data: mockAnalytics,
                        error: null,
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/export?funnel_project_id=funnel-1",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.export_data).toBeDefined();
        expect(data.export_data.funnel_name).toBe("Test Funnel");
        expect(data.export_data.briefs).toEqual(mockBriefs);
        expect(data.export_data.variants).toEqual(mockVariants);
        expect(data.export_data.analytics).toEqual(mockAnalytics);
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error("Not authenticated"),
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/export?funnel_project_id=funnel-1",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 400 when funnel_project_id is missing", async () => {
        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/export",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("funnel_project_id is required");
    });

    it("should return 401 when user does not own the funnel", async () => {
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: {
                    user_id: "different-user-id",
                    name: "Test Funnel",
                },
                error: null,
            }),
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/export?funnel_project_id=funnel-1",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to funnel project");
    });

    it("should handle empty briefs gracefully", async () => {
        const mockProject = {
            user_id: "test-user-id",
            name: "Test Funnel",
        };

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "funnel_projects") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockProject,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_content_briefs") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/export?funnel_project_id=funnel-1",
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.export_data.briefs).toEqual([]);
        expect(data.export_data.variants).toEqual([]);
        expect(data.export_data.analytics).toEqual([]);
    });

    it("should export as CSV when format=csv", async () => {
        const mockProject = {
            user_id: "test-user-id",
            name: "Test Funnel",
        };

        const mockBriefs = [{ id: "brief-1", name: "Test Brief" }];

        const mockVariants = [
            {
                id: "variant-1",
                content_brief_id: "brief-1",
                platform: "instagram",
                copy_text: "Test post",
                hashtags: ["test"],
                created_at: new Date().toISOString(),
            },
        ];

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "funnel_projects") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockProject,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_content_briefs") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({
                        data: mockBriefs,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_post_variants") {
                return {
                    select: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({
                        data: mockVariants,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_analytics") {
                return {
                    select: vi.fn().mockReturnThis(),
                    in: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/export?funnel_project_id=funnel-1&format=csv",
        });

        const response = await GET(request);
        const text = await response.text();

        expect(response.headers.get("Content-Type")).toBe("text/csv");
        expect(response.headers.get("Content-Disposition")).toContain("attachment");
        expect(text).toContain("Brief Name");
        expect(text).toContain("Platform");
    });
});
