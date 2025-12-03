/**
 * Niche Model Service Tests
 * Tests for ML-based format prediction and learning
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

import {
    predictBestFormat,
    learnFromPerformance,
    getBanditAllocation,
    getNicheModel,
    getAllNicheModels,
    getNextContentRecommendation,
} from "@/lib/marketing/niche-model-service";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

describe("NicheModelService", () => {
    const mockUserId = "user-123";
    const mockNiche = "B2B marketing";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("predictBestFormat", () => {
        it("should return default format when no model exists", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: null,
                                    error: { code: "PGRST116" },
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await predictBestFormat(mockNiche, "awareness", mockUserId);

            expect(result.success).toBe(true);
            expect(result.format).toBe("post");
            expect(result.confidence).toBe(0.3);
            expect(result.reasoning).toContain("No historical data");
        });

        it("should predict format based on historical data", async () => {
            const mockModel = {
                niche: mockNiche,
                best_formats: {
                    post: { conversion_rate: 2.5, sample_size: 50 },
                    carousel: { conversion_rate: 3.8, sample_size: 30 },
                    reel: { conversion_rate: 1.2, sample_size: 15 },
                },
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockModel,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await predictBestFormat(mockNiche, "awareness", mockUserId);

            expect(result.success).toBe(true);
            expect(result.format).toBe("carousel"); // Highest conversion rate
            expect(result.confidence).toBeGreaterThan(0);
        });

        it("should require minimum sample size", async () => {
            const mockModel = {
                niche: mockNiche,
                best_formats: {
                    post: { conversion_rate: 2.5, sample_size: 5 }, // Too few samples
                    carousel: { conversion_rate: 3.8, sample_size: 15 }, // Enough samples
                },
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockModel,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await predictBestFormat(mockNiche, "awareness", mockUserId);

            expect(result.format).toBe("carousel");
        });

        it("should calculate confidence based on sample size", async () => {
            const mockModel = {
                niche: mockNiche,
                best_formats: {
                    post: { conversion_rate: 2.5, sample_size: 100 }, // Max confidence
                },
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockModel,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await predictBestFormat(mockNiche, "awareness", mockUserId);

            expect(result.confidence).toBe(1.0);
        });
    });

    describe("learnFromPerformance", () => {
        it("should create new model when none exists", async () => {
            const mockPostData = {
                format: "post" as const,
                platform: "instagram" as const,
                framework: "founder_saga" as const,
                impressions: 1000,
                opt_ins: 20,
                oi_1000: 20,
            };

            const mockNewModel = {
                id: "model-123",
                user_id: mockUserId,
                niche: mockNiche,
            };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "marketing_niche_models") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: null,
                                            error: { code: "PGRST116" },
                                        }),
                                    }),
                                }),
                            }),
                            insert: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockNewModel,
                                        error: null,
                                    }),
                                }),
                            }),
                            update: vi.fn().mockReturnValue({
                                eq: vi.fn().mockResolvedValue({ error: null }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await learnFromPerformance(
                mockUserId,
                mockNiche,
                mockPostData
            );

            expect(result.success).toBe(true);
        });

        it("should update existing model with new data", async () => {
            const mockExistingModel = {
                id: "model-123",
                niche: mockNiche,
                total_posts: 10,
                total_opt_ins: 50,
                overall_oi_1000: 5.0,
                best_formats: {
                    post: { conversion_rate: 2.0, sample_size: 10 },
                },
                conversion_rates: {
                    founder_saga: 5.0,
                },
                platform_insights: {
                    instagram: { total_posts: 5 },
                },
                bandit_allocation: {
                    top_performers: [],
                    experiments: [],
                    top_percentage: 70,
                    experiment_percentage: 30,
                },
            };

            const mockPostData = {
                format: "post" as const,
                platform: "instagram" as const,
                framework: "founder_saga" as const,
                impressions: 1000,
                opt_ins: 20,
                oi_1000: 20,
            };

            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockExistingModel,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                    update: mockUpdate,
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await learnFromPerformance(
                mockUserId,
                mockNiche,
                mockPostData
            );

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalled();
        });

        it("should update format performance correctly", async () => {
            const mockExistingModel = {
                id: "model-123",
                niche: mockNiche,
                total_posts: 5,
                total_opt_ins: 25,
                overall_oi_1000: 5.0,
                best_formats: {
                    post: { conversion_rate: 2.0, sample_size: 5 },
                },
                conversion_rates: {},
                platform_insights: {},
                bandit_allocation: { top_performers: [], experiments: [] },
            };

            const mockPostData = {
                format: "post" as const,
                platform: "instagram" as const,
                framework: "founder_saga" as const,
                impressions: 1000,
                opt_ins: 30,
                oi_1000: 30,
            };

            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockExistingModel,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                    update: mockUpdate,
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await learnFromPerformance(mockUserId, mockNiche, mockPostData);

            // Check that format performance was updated
            const updateCall = mockUpdate.mock.calls[0][0];
            expect(updateCall.best_formats.post.sample_size).toBe(6); // 5 + 1
        });
    });

    describe("getBanditAllocation", () => {
        it("should return bandit allocation for existing model", async () => {
            const mockModel = {
                bandit_allocation: {
                    top_performers: ["format:carousel", "framework:founder_saga"],
                    experiments: ["format:reel"],
                    top_percentage: 70,
                    experiment_percentage: 30,
                },
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockModel,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getBanditAllocation(mockUserId, mockNiche);

            expect(result.success).toBe(true);
            expect(result.allocation?.top_performers).toHaveLength(2);
            expect(result.allocation?.top_percentage).toBe(70);
        });

        it("should return default allocation for new niche", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: null,
                                    error: { code: "PGRST116" },
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getBanditAllocation(mockUserId, mockNiche);

            expect(result.success).toBe(true);
            expect(result.allocation?.experiments).toContain("format:post");
            expect(result.allocation?.experiments).toContain("format:carousel");
        });
    });

    describe("getNicheModel", () => {
        it("should retrieve niche model", async () => {
            const mockModel = {
                id: "model-123",
                niche: mockNiche,
                total_posts: 50,
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockModel,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getNicheModel(mockUserId, mockNiche);

            expect(result.success).toBe(true);
            expect(result.model).toEqual(mockModel);
        });

        it("should handle missing model", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: null,
                                    error: { message: "Not found" },
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getNicheModel(mockUserId, mockNiche);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Model not found");
        });
    });

    describe("getAllNicheModels", () => {
        it("should retrieve all models for user sorted by performance", async () => {
            const mockModels = [
                { id: "model-1", niche: "Niche A", overall_oi_1000: 10 },
                { id: "model-2", niche: "Niche B", overall_oi_1000: 15 },
            ];

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            order: vi.fn().mockResolvedValue({
                                data: mockModels,
                                error: null,
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getAllNicheModels(mockUserId);

            expect(result.success).toBe(true);
            expect(result.models).toHaveLength(2);
        });

        it("should handle empty results", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            order: vi.fn().mockResolvedValue({
                                data: [],
                                error: null,
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getAllNicheModels(mockUserId);

            expect(result.success).toBe(true);
            expect(result.models).toEqual([]);
        });
    });

    describe("getNextContentRecommendation", () => {
        it("should recommend content from top performers (70% chance)", async () => {
            const mockAllocation = {
                top_performers: ["format:carousel"],
                experiments: ["format:reel"],
                top_percentage: 70,
                experiment_percentage: 30,
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { bandit_allocation: mockAllocation },
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            // Mock Math.random to return value that selects top performers
            vi.spyOn(Math, "random").mockReturnValue(0.5); // < 0.7

            const result = await getNextContentRecommendation(mockUserId, mockNiche);

            expect(result.success).toBe(true);
            expect(result.recommendation?.category).toBe("top_performer");
            expect(result.recommendation?.format).toBe("carousel");

            vi.spyOn(Math, "random").mockRestore();
        });

        it("should recommend experiments (30% chance)", async () => {
            const mockAllocation = {
                top_performers: ["format:carousel"],
                experiments: ["format:reel"],
                top_percentage: 70,
                experiment_percentage: 30,
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { bandit_allocation: mockAllocation },
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            // Mock Math.random to return value that selects experiments
            vi.spyOn(Math, "random").mockReturnValue(0.8); // >= 0.7

            const result = await getNextContentRecommendation(mockUserId, mockNiche);

            expect(result.success).toBe(true);
            expect(result.recommendation?.category).toBe("experiment");
            expect(result.recommendation?.format).toBe("reel");

            vi.spyOn(Math, "random").mockRestore();
        });

        it("should return default when no historical data", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: null,
                                    error: { code: "PGRST116" },
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getNextContentRecommendation(mockUserId, mockNiche);

            expect(result.success).toBe(true);
            expect(result.recommendation?.format).toBe("post");
            expect(result.recommendation?.framework).toBe("founder_saga");
            expect(result.recommendation?.reasoning).toContain("defaults");
        });
    });
});
