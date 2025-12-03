/**
 * Analytics Collector Service Tests
 * Tests for marketing analytics collection and O/I-1000 calculation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");
vi.mock("@/lib/marketing/niche-model-service", () => ({
    learnFromPerformance: vi.fn(),
}));

import {
    recordOptIn,
    calculateOI1000,
    fetchPlatformAnalytics,
    updateNicheModelFromAnalytics,
    getDashboardAnalytics,
    collectDailyAnalytics,
} from "@/lib/marketing/analytics-collector-service";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { learnFromPerformance } from "@/lib/marketing/niche-model-service";

describe("AnalyticsCollectorService", () => {
    const mockPostVariantId = "variant-123";
    const mockContactId = "contact-123";
    const mockUserId = "user-123";
    const mockFunnelProjectId = "funnel-123";

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup logger mocks
        vi.mocked(logger.info).mockImplementation(() => {});
        vi.mocked(logger.error).mockImplementation(() => {});
        vi.mocked(logger.warn).mockImplementation(() => {});
    });

    describe("recordOptIn", () => {
        it("should create new analytics record when none exists", async () => {
            const mockNewAnalytics = {
                id: "analytics-123",
                post_variant_id: mockPostVariantId,
                opt_ins: 1,
                time_to_opt_in: [30],
            };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "marketing_analytics") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: null,
                                        error: { code: "PGRST116" },
                                    }),
                                }),
                            }),
                            insert: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockNewAnalytics,
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await recordOptIn(mockPostVariantId, mockContactId, 30);

            expect(result.success).toBe(true);
            expect(logger.info).toHaveBeenCalled();
        });

        it("should update existing analytics record", async () => {
            const mockExistingAnalytics = {
                id: "analytics-123",
                post_variant_id: mockPostVariantId,
                opt_ins: 5,
                time_to_opt_in: [20, 30, 40],
            };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "marketing_analytics") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockExistingAnalytics,
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

            const result = await recordOptIn(mockPostVariantId, mockContactId, 25);

            expect(result.success).toBe(true);
        });

        it("should handle case without time to opt-in", async () => {
            const mockExistingAnalytics = {
                id: "analytics-123",
                opt_ins: 3,
                time_to_opt_in: [],
            };

            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockExistingAnalytics,
                                error: null,
                            }),
                        }),
                    }),
                    update: mockUpdate,
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await recordOptIn(mockPostVariantId, mockContactId);

            expect(mockUpdate).toHaveBeenCalledWith({
                opt_ins: 4,
                time_to_opt_in: [],
            });
        });

        it("should handle database errors", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi
                                .fn()
                                .mockRejectedValue(new Error("Database error")),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await recordOptIn(mockPostVariantId, mockContactId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("calculateOI1000", () => {
        it("should calculate O/I-1000 correctly", async () => {
            const mockAnalytics = {
                id: "analytics-123",
                impressions: 10000,
                opt_ins: 25,
            };

            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockAnalytics,
                                error: null,
                            }),
                        }),
                    }),
                    update: mockUpdate,
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await calculateOI1000(mockPostVariantId);

            expect(result.success).toBe(true);
            expect(result.oi1000).toBe(2.5); // (25 / 10000) * 1000
            expect(mockUpdate).toHaveBeenCalledWith({ oi_1000: 2.5 });
        });

        it("should return 0 when impressions is 0", async () => {
            const mockAnalytics = {
                id: "analytics-123",
                impressions: 0,
                opt_ins: 5,
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockAnalytics,
                                error: null,
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await calculateOI1000(mockPostVariantId);

            expect(result.success).toBe(true);
            expect(result.oi1000).toBe(0);
        });

        it("should handle missing analytics", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: null,
                                error: { message: "Not found" },
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await calculateOI1000(mockPostVariantId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Analytics not found");
        });
    });

    describe("fetchPlatformAnalytics", () => {
        it("should log placeholder for platform analytics fetch", async () => {
            const result = await fetchPlatformAnalytics(mockPostVariantId, "instagram");

            expect(result.success).toBe(true);
            expect(logger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    postVariantId: mockPostVariantId,
                    platform: "instagram",
                }),
                expect.any(String)
            );
        });
    });

    describe("updateNicheModelFromAnalytics", () => {
        it("should update niche model with analytics data", async () => {
            const mockVariant = {
                id: mockPostVariantId,
                format_type: "post",
                platform: "instagram",
                story_framework: "founder_saga",
            };

            const mockAnalytics = {
                impressions: 5000,
                opt_ins: 10,
                oi_1000: 2.0,
            };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "marketing_post_variants") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockVariant,
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "marketing_analytics") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockAnalytics,
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
            vi.mocked(learnFromPerformance).mockResolvedValue({ success: true });

            const result = await updateNicheModelFromAnalytics(
                mockPostVariantId,
                mockUserId,
                "B2B marketing"
            );

            expect(result.success).toBe(true);
            expect(learnFromPerformance).toHaveBeenCalledWith(
                mockUserId,
                "B2B marketing",
                expect.objectContaining({
                    format: "post",
                    platform: "instagram",
                    framework: "founder_saga",
                    impressions: 5000,
                    opt_ins: 10,
                    oi_1000: 2.0,
                })
            );
        });

        it("should handle missing variant", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: null,
                                error: { message: "Not found" },
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await updateNicheModelFromAnalytics(
                mockPostVariantId,
                mockUserId,
                "niche"
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Variant not found");
        });
    });

    describe("getDashboardAnalytics", () => {
        it("should return empty dashboard when no briefs exist", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({
                            data: [],
                            error: null,
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getDashboardAnalytics(mockFunnelProjectId);

            expect(result.success).toBe(true);
            expect(result.dashboard?.overview.total_posts).toBe(0);
        });

        it("should aggregate analytics from multiple posts", async () => {
            const mockBriefs = [{ id: "brief-1" }, { id: "brief-2" }];
            const mockVariants = [
                {
                    id: "variant-1",
                    platform: "instagram",
                    story_framework: "founder_saga",
                    marketing_analytics: [
                        {
                            impressions: 1000,
                            opt_ins: 10,
                            oi_1000: 10,
                            likes: 50,
                            comments: 5,
                            shares: 2,
                        },
                    ],
                },
                {
                    id: "variant-2",
                    platform: "linkedin",
                    story_framework: "myth_buster",
                    marketing_analytics: [
                        {
                            impressions: 2000,
                            opt_ins: 30,
                            oi_1000: 15,
                            likes: 100,
                            comments: 10,
                            shares: 5,
                        },
                    ],
                },
            ];

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "marketing_content_briefs") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockResolvedValue({
                                    data: mockBriefs,
                                    error: null,
                                }),
                            }),
                        };
                    }
                    if (table === "marketing_post_variants") {
                        return {
                            select: vi.fn().mockReturnValue({
                                in: vi.fn().mockResolvedValue({
                                    data: mockVariants,
                                    error: null,
                                }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getDashboardAnalytics(mockFunnelProjectId);

            expect(result.success).toBe(true);
            expect(result.dashboard?.overview.total_posts).toBe(2);
            expect(result.dashboard?.overview.total_impressions).toBe(3000);
            expect(result.dashboard?.overview.total_opt_ins).toBe(40);
            expect(result.dashboard?.by_platform.instagram).toBeDefined();
            expect(result.dashboard?.by_platform.linkedin).toBeDefined();
        });
    });

    describe("collectDailyAnalytics", () => {
        it("should process published posts from last 30 days", async () => {
            const mockEntries = [
                {
                    post_variant_id: "variant-1",
                    marketing_post_variants: { platform: "instagram" },
                },
                {
                    post_variant_id: "variant-2",
                    marketing_post_variants: { platform: "facebook" },
                },
            ];

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            gte: vi.fn().mockResolvedValue({
                                data: mockEntries,
                                error: null,
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await collectDailyAnalytics();

            expect(result.success).toBe(true);
            expect(result.processed).toBe(2);
        });

        it("should handle no entries to process", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            gte: vi.fn().mockResolvedValue({
                                data: [],
                                error: null,
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await collectDailyAnalytics();

            expect(result.success).toBe(true);
            expect(result.processed).toBe(0);
        });
    });
});
