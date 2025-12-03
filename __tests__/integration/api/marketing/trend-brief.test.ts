import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/trends/[trendId]/brief/route";
import {
    createMockSupabaseClient,
    createMockRequest,
    createMockContext,
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
    markTrendUsed: vi.fn(),
}));

describe("POST /api/marketing/trends/[trendId]/brief", () => {
    let mockSupabase: any;
    let mockMarkTrendUsed: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const { markTrendUsed } = await import("@/lib/marketing/trend-scanner-service");
        mockMarkTrendUsed = markTrendUsed;
        mockMarkTrendUsed.mockResolvedValue({ success: true });
    });

    it("should create brief from trend for authenticated user", async () => {
        const mockTrend = {
            id: "trend-1",
            topic: "AI in Marketing",
            suggested_angles: {
                founder_perspective: "How I used AI to scale my marketing",
                industry_impact: "AI is transforming marketing",
            },
        };

        const mockBrief = {
            id: "brief-1",
            name: "Trend: AI in Marketing",
            topic: "AI in Marketing",
            user_id: "test-user-id",
        };

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "marketing_trend_signals") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockTrend,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_content_briefs") {
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockBrief,
                        error: null,
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/trends/trend-1/brief",
            body: {
                goal: "drive_registrations",
                funnel_project_id: "funnel-1",
            },
        });
        const context = createMockContext({ trendId: "trend-1" });

        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.brief).toEqual(mockBrief);
        expect(mockMarkTrendUsed).toHaveBeenCalledWith("trend-1");
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error("Not authenticated"),
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/trends/trend-1/brief",
            body: {},
        });
        const context = createMockContext({ trendId: "trend-1" });

        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 404 when trend not found", async () => {
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Not found"),
            }),
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/trends/nonexistent/brief",
            body: {},
        });
        const context = createMockContext({ trendId: "nonexistent" });

        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("Trend not found");
    });

    it("should use selected angle from request body", async () => {
        const mockTrend = {
            id: "trend-1",
            topic: "AI in Marketing",
            suggested_angles: {
                founder_perspective: "Founder perspective content",
                industry_impact: "Industry impact content",
            },
        };

        const mockBrief = {
            id: "brief-1",
            transformation_focus: "Industry impact content",
        };

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "marketing_trend_signals") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockTrend,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_content_briefs") {
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockBrief,
                        error: null,
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/trends/trend-1/brief",
            body: {
                selected_angle: "industry_impact",
            },
        });
        const context = createMockContext({ trendId: "trend-1" });

        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should use default angle when not specified", async () => {
        const mockTrend = {
            id: "trend-1",
            topic: "AI in Marketing",
            suggested_angles: {
                founder_perspective: "Founder perspective content",
            },
        };

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "marketing_trend_signals") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockTrend,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_content_briefs") {
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: { id: "brief-1" },
                        error: null,
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/trends/trend-1/brief",
            body: {},
        });
        const context = createMockContext({ trendId: "trend-1" });

        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should include trend metadata in brief", async () => {
        const mockTrend = {
            id: "trend-1",
            topic: "AI in Marketing",
            suggested_angles: {},
        };

        let insertedBrief: any = null;

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "marketing_trend_signals") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockTrend,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_content_briefs") {
                return {
                    insert: vi.fn((data) => {
                        insertedBrief = data;
                        return {
                            select: vi.fn().mockReturnThis(),
                            single: vi.fn().mockResolvedValue({
                                data: { id: "brief-1", ...data },
                                error: null,
                            }),
                        };
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/trends/trend-1/brief",
            body: {},
        });
        const context = createMockContext({ trendId: "trend-1" });

        await POST(request, context);

        expect(insertedBrief.metadata.from_trend_id).toBe("trend-1");
        expect(insertedBrief.metadata.trend_topic).toBe("AI in Marketing");
    });

    it("should set default target platforms", async () => {
        const mockTrend = {
            id: "trend-1",
            topic: "AI in Marketing",
            suggested_angles: {},
        };

        let insertedBrief: any = null;

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "marketing_trend_signals") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockTrend,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_content_briefs") {
                return {
                    insert: vi.fn((data) => {
                        insertedBrief = data;
                        return {
                            select: vi.fn().mockReturnThis(),
                            single: vi.fn().mockResolvedValue({
                                data: { id: "brief-1" },
                                error: null,
                            }),
                        };
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/trends/trend-1/brief",
            body: {},
        });
        const context = createMockContext({ trendId: "trend-1" });

        await POST(request, context);

        expect(insertedBrief.target_platforms).toEqual([
            "instagram",
            "facebook",
            "linkedin",
            "twitter",
        ]);
    });

    it("should return 500 when brief creation fails", async () => {
        const mockTrend = {
            id: "trend-1",
            topic: "AI in Marketing",
            suggested_angles: {},
        };

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "marketing_trend_signals") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockTrend,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_content_briefs") {
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: null,
                        error: new Error("Insert failed"),
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/trends/trend-1/brief",
            body: {},
        });
        const context = createMockContext({ trendId: "trend-1" });

        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to create brief");
    });
});
