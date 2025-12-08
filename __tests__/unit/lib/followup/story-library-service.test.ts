/**
 * Tests for Story Library Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn(),
};

const mockCreateClient = vi.fn().mockResolvedValue(mockSupabase);

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: mockCreateClient,
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Import after mocks are defined
const {
    createStory,
    findMatchingStories,
    updateStory,
    deleteStory,
    recordStoryUsage,
    listStories,
} = await import("@/lib/followup/story-library-service");

describe("Story Library Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createStory", () => {
        it("creates story with all required fields", async () => {
            const mockStory = {
                id: "story-123",
                user_id: "user-123",
                title: "Success Story",
                story_type: "testimonial",
                content: "Amazing results!",
                objection_category: "price_concern",
                business_niche: ["coaching", "consulting"],
                price_band: "mid",
                times_used: 0,
            };

            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockStory,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await createStory("user-123", {
                title: "Success Story",
                story_type: "testimonial",
                content: "Amazing results!",
                objection_category: "price_concern",
                business_niche: ["coaching", "consulting"],
                price_band: "mid",
            });

            expect(result.success).toBe(true);
            expect(result.story?.id).toBe("story-123");
            expect(result.story?.objection_category).toBe("price_concern");
        });

        it("returns error when creation fails", async () => {
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Database error" },
                        }),
                    }),
                }),
            });

            const result = await createStory("user-123", {
                title: "Test Story",
                story_type: "micro_story",
                content: "Content",
                objection_category: "price_concern",
                business_niche: ["test"],
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("findMatchingStories", () => {
        it("finds stories by objection and niche", async () => {
            const mockStories = [
                {
                    id: "story-1",
                    objection_category: "price_concern",
                    business_niche: ["coaching"],
                    effectiveness_score: 85,
                },
                {
                    id: "story-2",
                    objection_category: "price_concern",
                    business_niche: ["coaching"],
                    effectiveness_score: 90,
                },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                contains: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: mockStories,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await findMatchingStories({
                user_id: "user-123",
                objection_category: "price_concern",
                business_niche: "coaching",
                limit: 10,
            });

            expect(result.success).toBe(true);
            expect(result.stories).toHaveLength(2);
        });

        it("filters by price band when provided", async () => {
            const mockStories = [
                {
                    id: "story-1",
                    price_band: "high",
                    effectiveness_score: 95,
                },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: mockStories,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await findMatchingStories({
                user_id: "user-123",
                objection_category: "price_concern",
                price_band: "high",
            });

            expect(result.success).toBe(true);
            expect(result.stories?.[0].price_band).toBe("high");
        });
    });

    describe("recordStoryUsage", () => {
        it("increments times_used counter", async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: null,
                error: null,
            });

            const result = await recordStoryUsage("story-123");

            expect(result.success).toBe(true);
            expect(mockSupabase.rpc).toHaveBeenCalledWith("increment_story_usage", {
                p_story_id: "story-123",
            });
        });

        it("falls back to manual increment when RPC fails", async () => {
            const mockStory = { times_used: 5 };

            mockSupabase.rpc.mockResolvedValue({
                data: null,
                error: { message: "RPC not found" },
            });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_story_library") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockStory,
                                    error: null,
                                }),
                            }),
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                error: null,
                            }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await recordStoryUsage("story-123");

            expect(result.success).toBe(true);
        });
    });

    describe("listStories", () => {
        it("lists all stories for a user", async () => {
            const mockStories = [
                { id: "1", title: "Story 1" },
                { id: "2", title: "Story 2" },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockStories,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await listStories("user-123");

            expect(result.success).toBe(true);
            expect(result.stories).toHaveLength(2);
        });

        it("filters by story type", async () => {
            const mockStories = [{ id: "1", story_type: "testimonial" }];

            const mockOrderChain = {
                eq: vi.fn().mockResolvedValue({
                    data: mockStories,
                    error: null,
                }),
                contains: vi.fn().mockResolvedValue({
                    data: mockStories,
                    error: null,
                }),
            };

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnValue(mockOrderChain),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await listStories("user-123", { story_type: "testimonial" });

            expect(result.success).toBe(true);
            expect(result.stories?.[0].story_type).toBe("testimonial");
        });
    });

    describe("updateStory", () => {
        it("updates story fields", async () => {
            const mockStory = {
                id: "story-123",
                content: "Updated content",
                effectiveness_score: 92.5,
            };

            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockStory,
                                error: null,
                            }),
                        }),
                    }),
                }),
            });

            const result = await updateStory("story-123", {
                content: "Updated content",
                effectiveness_score: 92.5,
            });

            expect(result.success).toBe(true);
            expect(result.story?.effectiveness_score).toBe(92.5);
        });
    });

    describe("deleteStory", () => {
        it("deletes story successfully", async () => {
            mockSupabase.from.mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        error: null,
                    }),
                }),
            });

            const result = await deleteStory("story-123");

            expect(result.success).toBe(true);
        });
    });
});
