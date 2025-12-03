import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/import/route";
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

describe("POST /api/marketing/import", () => {
    let mockSupabase: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabaseClient();
        const { createClient } = await import("@/lib/supabase/server");
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    });

    it("should import content for authenticated user", async () => {
        const mockProject = {
            user_id: "test-user-id",
        };

        const mockProfile = {
            id: "profile-1",
        };

        const mockBrief = {
            id: "brief-1",
            name: "Imported Content",
        };

        const mockVariant = {
            id: "variant-1",
            copy_text: "Imported post",
        };

        const contentItems = [
            {
                platform: "instagram",
                copy_text: "Imported post",
                hashtags: ["imported"],
                format_type: "post",
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
            if (table === "marketing_profiles") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockProfile,
                        error: null,
                    }),
                    insert: vi.fn().mockReturnThis(),
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
            if (table === "marketing_post_variants") {
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockVariant,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_analytics") {
                return {
                    insert: vi.fn().mockResolvedValue({
                        data: null,
                        error: null,
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/import",
            body: {
                funnel_project_id: "funnel-1",
                content_items: contentItems,
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.imported).toBe(1);
        expect(data.brief_id).toBe("brief-1");
    });

    it("should return 401 for unauthenticated user", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error("Not authenticated"),
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/import",
            body: {
                funnel_project_id: "funnel-1",
                content_items: [],
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 400 when funnel_project_id is missing", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/import",
            body: {
                content_items: [],
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("funnel_project_id is required");
    });

    it("should return 400 when content_items is not an array", async () => {
        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/import",
            body: {
                funnel_project_id: "funnel-1",
                content_items: "not-an-array",
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("content_items must be an array");
    });

    it("should return 401 when user does not own the funnel", async () => {
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: {
                    user_id: "different-user-id",
                },
                error: null,
            }),
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/import",
            body: {
                funnel_project_id: "funnel-1",
                content_items: [],
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to funnel project");
    });

    it("should create profile if none exists", async () => {
        const mockProject = {
            user_id: "test-user-id",
        };

        const newProfile = {
            id: "new-profile-1",
        };

        const mockBrief = {
            id: "brief-1",
        };

        const fromSpy = vi.fn();
        let profileSelectCalled = false;

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
            if (table === "marketing_profiles") {
                if (!profileSelectCalled) {
                    profileSelectCalled = true;
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: null,
                        }),
                        insert: vi.fn().mockReturnThis(),
                    };
                }
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: newProfile,
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
            url: "http://localhost:3000/api/marketing/import",
            body: {
                funnel_project_id: "funnel-1",
                content_items: [],
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should import analytics when provided", async () => {
        const mockProject = { user_id: "test-user-id" };
        const mockProfile = { id: "profile-1" };
        const mockBrief = { id: "brief-1" };
        const mockVariant = { id: "variant-1" };

        const contentItems = [
            {
                platform: "instagram",
                copy_text: "Test post",
                analytics: {
                    impressions: 5000,
                    likes: 100,
                    opt_ins: 5,
                },
            },
        ];

        const fromSpy = vi.fn();
        let analyticsInsertCalled = false;

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
            if (table === "marketing_profiles") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockProfile,
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
            if (table === "marketing_post_variants") {
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockVariant,
                        error: null,
                    }),
                };
            }
            if (table === "marketing_analytics") {
                analyticsInsertCalled = true;
                return {
                    insert: vi.fn().mockResolvedValue({
                        data: null,
                        error: null,
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/import",
            body: {
                funnel_project_id: "funnel-1",
                content_items: contentItems,
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(analyticsInsertCalled).toBe(true);
    });

    it("should track errors for failed imports", async () => {
        const mockProject = { user_id: "test-user-id" };
        const mockProfile = { id: "profile-1" };
        const mockBrief = { id: "brief-1" };

        const contentItems = [
            {
                platform: "instagram",
                copy_text: "Valid post",
            },
            {
                platform: "invalid-platform",
                copy_text: "Invalid post",
            },
        ];

        const fromSpy = vi.fn();
        let variantInsertCount = 0;

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
            if (table === "marketing_profiles") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockProfile,
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
            if (table === "marketing_post_variants") {
                variantInsertCount++;
                if (variantInsertCount === 2) {
                    return {
                        insert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: new Error("Invalid platform"),
                        }),
                    };
                }
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: { id: "variant-1" },
                        error: null,
                    }),
                };
            }
            return mockSupabase;
        });

        const request = createMockRequest({
            method: "POST",
            url: "http://localhost:3000/api/marketing/import",
            body: {
                funnel_project_id: "funnel-1",
                content_items: contentItems,
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.imported).toBe(1);
        expect(data.errors.length).toBeGreaterThan(0);
    });
});
