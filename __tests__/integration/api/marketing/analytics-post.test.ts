import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/marketing/analytics/post/[postId]/route";
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

describe("GET /api/marketing/analytics/post/[postId]", () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it("should return post analytics for authenticated user", async () => {
        const mockVariant = {
            id: "post-1",
            user_id: "test-user-id",
            copy_text: "Test post",
            platform: "instagram",
        };

        const mockAnalytics = {
            id: "analytics-1",
            post_variant_id: "post-1",
            impressions: 1000,
            likes: 50,
        };

        const mockCalendarEntry = {
            id: "calendar-1",
            post_variant_id: "post-1",
            scheduled_for: new Date().toISOString(),
        };

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "marketing_post_variants") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockVariant,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_analytics") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockAnalytics,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_content_calendar") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockCalendarEntry,
                        error: null,
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/analytics/post/post-1",
        });
        const context = createMockContext({ postId: "post-1" });

        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.variant).toEqual(mockVariant);
        expect(data.analytics).toEqual(mockAnalytics);
        expect(data.calendar_entry).toEqual(mockCalendarEntry);
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error("Not authenticated"),
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/analytics/post/post-1",
        });
        const context = createMockContext({ postId: "post-1" });

        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 404 when post variant not found", async () => {
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Not found"),
            }),
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/analytics/post/nonexistent",
        });
        const context = createMockContext({ postId: "nonexistent" });

        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("Post variant not found");
    });

    it("should return 401 when user does not own the post", async () => {
        const mockVariant = {
            id: "post-1",
            user_id: "different-user-id",
            copy_text: "Test post",
        };

        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: mockVariant,
                error: null,
            }),
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/analytics/post/post-1",
        });
        const context = createMockContext({ postId: "post-1" });

        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to this post");
    });

    it("should handle missing analytics gracefully", async () => {
        const mockVariant = {
            id: "post-1",
            user_id: "test-user-id",
            copy_text: "Test post",
        };

        const fromSpy = vi.fn();
        mockSupabase.from = fromSpy;

        fromSpy.mockImplementation((table) => {
            if (table === "marketing_post_variants") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockVariant,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_analytics") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: null,
                        error: new Error("Not found"),
                    }),
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                }),
            };
        });

        const request = createMockRequest({
            url: "http://localhost:3000/api/marketing/analytics/post/post-1",
        });
        const context = createMockContext({ postId: "post-1" });

        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.analytics).toBeNull();
    });
});
