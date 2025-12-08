/**
 * Trend Scanner Service Tests
 * Tests for trend identification and content opportunity suggestions
 */

// Mock AI client BEFORE any imports
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: vi.fn(),
    generateTextWithAI: vi.fn(),
    openai: {},
}));

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

import {
    scanTrends,
    suggestTopicsFromTrend,
    rankTrendRelevance,
    storeTrendSignal,
    getActiveTrends,
    markTrendUsed,
    dismissTrend,
    cleanupExpiredTrends,
} from "@/lib/marketing/trend-scanner-service";
import { createClient } from "@/lib/supabase/server";
import { generateWithAI } from "@/lib/ai/client";

describe("TrendScannerService", () => {
    const mockUserId = "user-123";
    const mockTrendId = "trend-123";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("scanTrends", () => {
        it("should scan trends for a user", async () => {
            const mockProfile = {
                business_context: {
                    industry: "SaaS",
                },
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockProfile,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await scanTrends(mockUserId);

            expect(result.success).toBe(true);
            expect(result.trends).toBeDefined();
        });

        it("should use default niche when profile not found", async () => {
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

            const result = await scanTrends(mockUserId);

            expect(result.success).toBe(true);
        });

        it("should work without userId", async () => {
            const mockSupabase = {
                from: vi.fn(),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await scanTrends();

            expect(result.success).toBe(true);
            expect(result.trends).toEqual([]);
        });

        it("should handle errors gracefully", async () => {
            vi.mocked(createClient).mockRejectedValue(new Error("Database error"));

            const result = await scanTrends(mockUserId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("suggestTopicsFromTrend", () => {
        it("should generate topic suggestions from trend", async () => {
            const mockSuggestions = {
                founder_perspective:
                    "Share how this trend impacted my business journey",
                myth_buster: "Challenge the common misconception about this trend",
                industry_pov: "Expert analysis of what this means for the industry",
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockSuggestions);

            const result = await suggestTopicsFromTrend(
                "AI automation trends",
                "B2B SaaS",
                "Focus on enterprise clients"
            );

            expect(result.success).toBe(true);
            expect(result.angles).toBeDefined();
            expect(result.angles!.founder_perspective).toBeDefined();
            expect(result.angles!.myth_buster).toBeDefined();
            expect(result.angles!.industry_pov).toBeDefined();
        });

        it("should work without user context", async () => {
            const mockSuggestions = {
                founder_perspective: "Personal take",
                myth_buster: "Challenge belief",
                industry_pov: "Expert view",
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockSuggestions);

            const result = await suggestTopicsFromTrend(
                "Remote work trends",
                "HR Tech"
            );

            expect(result.success).toBe(true);
            expect(result.angles).toBeDefined();
        });

        it("should handle AI generation errors", async () => {
            vi.mocked(generateWithAI).mockRejectedValue(new Error("AI error"));

            const result = await suggestTopicsFromTrend("Trend", "Niche");

            expect(result.success).toBe(false);
            expect(result.error).toBe("AI error");
        });
    });

    describe("rankTrendRelevance", () => {
        it("should rank trend relevance with business context", async () => {
            const mockRanking = {
                score: 85,
                reasoning:
                    "Highly relevant to B2B SaaS companies focusing on automation",
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockRanking);

            const businessContext = {
                business_name: "Acme Corp",
                target_audience: "Enterprise customers",
                main_challenge: "Lead generation",
            };

            const result = await rankTrendRelevance(
                "Marketing automation AI",
                "B2B SaaS",
                businessContext
            );

            expect(result.success).toBe(true);
            expect(result.score).toBe(85);
            expect(result.reasoning).toBeDefined();
        });

        it("should work without business context", async () => {
            const mockRanking = {
                score: 60,
                reasoning: "Somewhat relevant",
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockRanking);

            const result = await rankTrendRelevance("Trend", "Niche");

            expect(result.success).toBe(true);
            expect(result.score).toBe(60);
        });

        it("should handle low relevance scores", async () => {
            const mockRanking = {
                score: 15,
                reasoning: "Not relevant to this niche",
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockRanking);

            const result = await rankTrendRelevance("Fashion trends", "B2B Tech");

            expect(result.success).toBe(true);
            expect(result.score).toBeLessThan(30);
        });

        it("should handle errors", async () => {
            vi.mocked(generateWithAI).mockRejectedValue(new Error("Ranking failed"));

            const result = await rankTrendRelevance("Trend", "Niche");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Ranking failed");
        });
    });

    describe("storeTrendSignal", () => {
        it("should store trend signal successfully", async () => {
            const mockTrend = {
                topic: "AI automation",
                source: "twitter",
                relevance_score: 85,
                matched_niches: ["B2B SaaS", "Marketing Tech"],
                suggested_angles: {
                    founder_perspective: "My experience",
                    myth_buster: "Common myth",
                    industry_pov: "Expert view",
                },
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: { id: mockTrendId },
                                error: null,
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await storeTrendSignal(mockTrend as any, mockUserId);

            expect(result.success).toBe(true);
            expect(result.trendId).toBe(mockTrendId);
        });

        it("should set expiration date", async () => {
            const mockInsert = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: { id: mockTrendId },
                        error: null,
                    }),
                }),
            });

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    insert: mockInsert,
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const mockTrend = {
                topic: "Trend",
                source: "source",
                relevance_score: 80,
                matched_niches: ["niche"],
                suggested_angles: {} as any,
            };

            await storeTrendSignal(mockTrend, mockUserId);

            const insertCall = mockInsert.mock.calls[0][0];
            expect(insertCall.expires_at).toBeDefined();
            expect(insertCall.status).toBe("active");
        });

        it("should handle storage errors", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: null,
                                error: { message: "Insert failed" },
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await storeTrendSignal({
                topic: "Trend",
                source: "source",
                relevance_score: 80,
                matched_niches: [],
                suggested_angles: {} as any,
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe("Insert failed");
        });
    });

    describe("getActiveTrends", () => {
        it("should fetch active trends for user", async () => {
            const mockTrends = [
                { id: "trend-1", topic: "AI", relevance_score: 90 },
                { id: "trend-2", topic: "Automation", relevance_score: 85 },
            ];

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        or: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                gte: vi.fn().mockReturnValue({
                                    order: vi.fn().mockReturnValue({
                                        limit: vi.fn().mockResolvedValue({
                                            data: mockTrends,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getActiveTrends(mockUserId, 10);

            expect(result.success).toBe(true);
            expect(result.trends).toHaveLength(2);
        });

        it("should handle empty results", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        or: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                gte: vi.fn().mockReturnValue({
                                    order: vi.fn().mockReturnValue({
                                        limit: vi.fn().mockResolvedValue({
                                            data: [],
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getActiveTrends(mockUserId);

            expect(result.success).toBe(true);
            expect(result.trends).toEqual([]);
        });

        it("should handle database errors", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        or: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                gte: vi.fn().mockReturnValue({
                                    order: vi.fn().mockReturnValue({
                                        limit: vi.fn().mockResolvedValue({
                                            data: null,
                                            error: { message: "Query failed" },
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getActiveTrends(mockUserId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Query failed");
        });
    });

    describe("markTrendUsed", () => {
        it("should increment times_used counter", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: { times_used: 5 },
                                error: null,
                            }),
                        }),
                    }),
                    update: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ error: null }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await markTrendUsed(mockTrendId);

            expect(result.success).toBe(true);
        });

        it("should handle update errors", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: { times_used: 0 },
                                error: null,
                            }),
                        }),
                    }),
                    update: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({
                            error: { message: "Update failed" },
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await markTrendUsed(mockTrendId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Update failed");
        });
    });

    describe("dismissTrend", () => {
        it("should dismiss trend for user", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    update: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ error: null }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await dismissTrend(mockTrendId, mockUserId);

            expect(result.success).toBe(true);
        });

        it("should handle dismiss errors", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    update: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({
                            error: { message: "Dismiss failed" },
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await dismissTrend(mockTrendId, mockUserId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Dismiss failed");
        });
    });

    describe("cleanupExpiredTrends", () => {
        it("should delete expired trends", async () => {
            const mockDeletedTrends = [
                { id: "trend-1" },
                { id: "trend-2" },
                { id: "trend-3" },
            ];

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    delete: vi.fn().mockReturnValue({
                        lt: vi.fn().mockReturnValue({
                            select: vi.fn().mockResolvedValue({
                                data: mockDeletedTrends,
                                error: null,
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await cleanupExpiredTrends();

            expect(result.success).toBe(true);
            expect(result.deleted).toBe(3);
        });

        it("should handle no expired trends", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    delete: vi.fn().mockReturnValue({
                        lt: vi.fn().mockReturnValue({
                            select: vi.fn().mockResolvedValue({
                                data: [],
                                error: null,
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await cleanupExpiredTrends();

            expect(result.success).toBe(true);
            expect(result.deleted).toBe(0);
        });

        it("should handle cleanup errors", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    delete: vi.fn().mockReturnValue({
                        lt: vi.fn().mockReturnValue({
                            select: vi.fn().mockResolvedValue({
                                data: null,
                                error: { message: "Delete failed" },
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await cleanupExpiredTrends();

            expect(result.success).toBe(false);
            expect(result.error).toBe("Delete failed");
        });
    });
});
