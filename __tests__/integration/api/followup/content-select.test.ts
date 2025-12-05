import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/followup/content/select/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/followup/content-selector-service", () => ({
    selectStoriesForProspect: vi.fn(),
    detectObjections: vi.fn(),
    getRecommendedStoryTypes: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
    selectStoriesForProspect,
    detectObjections,
    getRecommendedStoryTypes,
} from "@/lib/followup/content-selector-service";

const mockUser = { id: "user-123", email: "test@example.com" };

describe("POST /api/followup/content/select", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should select stories for prospect successfully", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_prospects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "prospect-123",
                                user_id: "user-123",
                                segment: "hot",
                            },
                            error: null,
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(selectStoriesForProspect).mockResolvedValue({
            success: true,
            stories: [
                {
                    id: "story-1",
                    user_id: "user-123",
                    agent_config_id: "config-123",
                    title: "Success Story",
                    story_type: "case_study" as const,
                    content: "Amazing results story",
                    objection_category: "price",
                    business_niche: ["tech"],
                    price_band: "mid" as const,
                    persona_match: ["ceo"],
                    times_used: 5,
                    effectiveness_score: 0.9,
                    metadata: {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            ],
        });
        vi.mocked(detectObjections).mockReturnValue(["price", "time"]);
        vi.mocked(getRecommendedStoryTypes).mockReturnValue([
            "transformation",
        ]);

        const request = createMockRequest({
            method: "POST",
            body: {
                prospect_id: "prospect-123",
                business_niche: "coaching",
                price_band: "premium",
                max_stories: 3,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.stories).toHaveLength(1);
        expect(data.detected_objections).toEqual(["price", "time"]);
    });

    it("should return 400 for missing prospect_id", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {},
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("prospect_id is required");
    });

    it("should return 401 for unauthenticated users", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "Unauthorized" },
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: { prospect_id: "prospect-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 401 for accessing other user's prospect", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_prospects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "prospect-123",
                                user_id: "other-user",
                            },
                            error: null,
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: { prospect_id: "prospect-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to prospect");
    });

    it("should return 500 when story selection fails", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "followup_prospects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "prospect-123",
                                user_id: "user-123",
                            },
                            error: null,
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(selectStoriesForProspect).mockResolvedValue({
            success: false,
            error: "Failed to select stories",
        });

        const request = createMockRequest({
            method: "POST",
            body: { prospect_id: "prospect-123" },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to select stories");
    });
});
