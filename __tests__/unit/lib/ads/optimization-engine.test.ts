/**
 * Unit Tests for Optimization Engine
 * Tests ad campaign optimization logic and autopilot execution
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Create mocks
const mockSupabase = {
    from: vi.fn(),
};

const mockCreateClient = vi.fn().mockResolvedValue(mockSupabase);

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: mockCreateClient,
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock("@/lib/integrations/meta-ads", () => ({
    updateAdStatus: vi.fn(),
    updateCampaignStatus: vi.fn(),
}));

vi.mock("@/lib/crypto/token-encryption", () => ({
    decryptToken: vi.fn(),
}));

vi.mock("@/lib/ads/ad-generator", () => ({
    generateAdVariations: vi.fn(),
}));

// Import after mocks
const { optimizeAllCampaigns, optimizeCampaign, analyzePatterns } = await import(
    "@/lib/ads/optimization-engine"
);
const { updateAdStatus } = await import("@/lib/integrations/meta-ads");
const { decryptToken } = await import("@/lib/crypto/token-encryption");

describe("Optimization Engine", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("optimizeAllCampaigns", () => {
        it("should analyze all active campaigns", async () => {
            const mockBriefs = [
                { id: "brief-1", user_id: "user-123", meta_campaign_id: "campaign-1" },
                { id: "brief-2", user_id: "user-123", meta_campaign_id: "campaign-2" },
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        not: vi.fn().mockResolvedValue({ data: mockBriefs }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [{ id: "variant-1", meta_ad_id: "ad-1" }],
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    post_variant_id: "variant-1",
                                    cost_per_lead_cents: 1000,
                                    leads_count: 5,
                                    ctr_percent: 1.5,
                                    impressions: 10000,
                                },
                            ],
                        }),
                    };
                }
                if (table === "marketing_ad_optimizations") {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const results = await optimizeAllCampaigns(false);

            expect(results).toBeInstanceOf(Array);
        });

        it("should return empty array when no active campaigns", async () => {
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        not: vi.fn().mockResolvedValue({ data: [] }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const results = await optimizeAllCampaigns(false);

            expect(results).toEqual([]);
        });
    });

    describe("optimizeCampaign", () => {
        it("should recommend pausing underperformer when CPL > 2x benchmark", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { id: briefId, user_id: userId },
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [{ id: "variant-1", meta_ad_id: "ad-1" }],
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    post_variant_id: "variant-1",
                                    cost_per_lead_cents: 1100, // $11.00 (>2x benchmark of $5.00)
                                    leads_count: 5,
                                    ctr_percent: 1.5,
                                    impressions: 10000,
                                },
                            ],
                        }),
                    };
                }
                if (table === "marketing_ad_optimizations") {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const results = await optimizeCampaign(briefId, userId, false);

            expect(results).toHaveLength(1);
            expect(results[0].action).toBe("pause_underperformer");
            expect(results[0].reason).toContain("$11.00");
            expect(results[0].reason).toContain(">2x industry average");
        });

        it("should execute pause when autopilot enabled", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { id: briefId, user_id: userId },
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [{ id: "variant-1", meta_ad_id: "ad-123" }],
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    post_variant_id: "variant-1",
                                    cost_per_lead_cents: 1100,
                                    leads_count: 5,
                                    ctr_percent: 1.5,
                                    impressions: 10000,
                                },
                            ],
                        }),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                post_variant_id: "variant-1",
                                cost_per_lead_cents: 1100,
                            },
                        }),
                    };
                }
                if (table === "marketing_oauth_connections") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { access_token_encrypted: "encrypted-token" },
                        }),
                    };
                }
                if (table === "marketing_ad_optimizations") {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            vi.mocked(decryptToken).mockResolvedValue("decrypted-token");

            await optimizeCampaign(briefId, userId, true);

            expect(updateAdStatus).toHaveBeenCalledWith(
                "ad-123",
                "PAUSED",
                "decrypted-token"
            );
        });

        it("should recommend scaling winner when CPL < 0.5x benchmark", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { id: briefId, user_id: userId },
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [{ id: "variant-1", meta_ad_id: "ad-1" }],
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    post_variant_id: "variant-1",
                                    cost_per_lead_cents: 200, // $2.00 (<0.5x benchmark of $5.00)
                                    leads_count: 10,
                                    ctr_percent: 2.5,
                                    impressions: 10000,
                                },
                            ],
                        }),
                    };
                }
                if (table === "marketing_ad_optimizations") {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const results = await optimizeCampaign(briefId, userId, false);

            expect(results).toHaveLength(1);
            expect(results[0].action).toBe("scale_winner");
            expect(results[0].reason).toContain("$2.00");
            expect(results[0].reason).toContain("<0.5x industry average");
            expect(results[0].reason).toContain("Increase budget by 20%");
        });

        it("should recommend creative refresh when CTR is low", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { id: briefId, user_id: userId },
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [{ id: "variant-1", meta_ad_id: "ad-1" }],
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    post_variant_id: "variant-1",
                                    cost_per_lead_cents: 500,
                                    leads_count: 5,
                                    ctr_percent: 0.5, // Below 1% threshold
                                    impressions: 15000, // Over 10,000 impressions
                                },
                            ],
                        }),
                    };
                }
                if (table === "marketing_ad_optimizations") {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const results = await optimizeCampaign(briefId, userId, false);

            expect(results).toHaveLength(1);
            expect(results[0].action).toBe("creative_refresh");
            expect(results[0].reason).toContain("CTR 0.50%");
            expect(results[0].reason).toContain("below 1%");
        });

        it("should not recommend pausing underperformer with insufficient leads", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { id: briefId, user_id: userId },
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [{ id: "variant-1", meta_ad_id: "ad-1" }],
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    post_variant_id: "variant-1",
                                    cost_per_lead_cents: 1100, // High CPL
                                    leads_count: 3, // But only 3 leads (< 5 minimum)
                                    ctr_percent: 1.5,
                                    impressions: 10000,
                                },
                            ],
                        }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const results = await optimizeCampaign(briefId, userId, false);

            // Should not recommend pausing with insufficient data
            const pauseRecommendation = results.find(
                (r) => r.action === "pause_underperformer"
            );
            expect(pauseRecommendation).toBeUndefined();
        });

        it("should not recommend scaling winner with insufficient leads", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { id: briefId, user_id: userId },
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [{ id: "variant-1", meta_ad_id: "ad-1" }],
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    post_variant_id: "variant-1",
                                    cost_per_lead_cents: 200, // Low CPL
                                    leads_count: 8, // But only 8 leads (< 10 minimum)
                                    ctr_percent: 2.5,
                                    impressions: 10000,
                                },
                            ],
                        }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const results = await optimizeCampaign(briefId, userId, false);

            // Should not recommend scaling with insufficient data
            const scaleRecommendation = results.find(
                (r) => r.action === "scale_winner"
            );
            expect(scaleRecommendation).toBeUndefined();
        });

        it("should return empty array for campaign without analytics", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { id: briefId, user_id: userId },
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [{ id: "variant-1", meta_ad_id: "ad-1" }],
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({ data: [] }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const results = await optimizeCampaign(briefId, userId, false);

            expect(results).toEqual([]);
        });

        it("should handle multiple optimization recommendations", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { id: briefId, user_id: userId },
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [
                                { id: "variant-1", meta_ad_id: "ad-1" },
                                { id: "variant-2", meta_ad_id: "ad-2" },
                            ],
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    post_variant_id: "variant-1",
                                    cost_per_lead_cents: 1100, // Underperformer
                                    leads_count: 5,
                                    ctr_percent: 1.5,
                                    impressions: 10000,
                                },
                                {
                                    post_variant_id: "variant-2",
                                    cost_per_lead_cents: 200, // Winner
                                    leads_count: 10,
                                    ctr_percent: 2.5,
                                    impressions: 10000,
                                },
                            ],
                        }),
                    };
                }
                if (table === "marketing_ad_optimizations") {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const results = await optimizeCampaign(briefId, userId, false);

            expect(results.length).toBeGreaterThanOrEqual(2);
            expect(results.some((r) => r.action === "pause_underperformer")).toBe(true);
            expect(results.some((r) => r.action === "scale_winner")).toBe(true);
        });
    });

    describe("analyzePatterns", () => {
        it("should analyze framework performance", async () => {
            const userId = "user-123";
            const niche = "business_coaching";

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [{ id: "brief-1" }, { id: "brief-2" }],
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [
                                { id: "variant-1", story_framework: "plus_minus" },
                                { id: "variant-2", story_framework: "hormozi" },
                                { id: "variant-3", story_framework: "plus_minus" },
                            ],
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    post_variant_id: "variant-1",
                                    leads_count: 10,
                                    spend_cents: 5000,
                                },
                                {
                                    post_variant_id: "variant-2",
                                    leads_count: 5,
                                    spend_cents: 3000,
                                },
                                {
                                    post_variant_id: "variant-3",
                                    leads_count: 8,
                                    spend_cents: 4000,
                                },
                            ],
                        }),
                    };
                }
                if (table === "marketing_niche_models") {
                    return {
                        upsert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const result = await analyzePatterns(userId, niche);

            expect(result).toBeDefined();
            expect(result).toHaveProperty("plus_minus");
            expect(result).toHaveProperty("hormozi");

            // plus_minus: 18 leads, 9000 cents spent = 500 cents CPL
            expect(result?.plus_minus.totalLeads).toBe(18);
            expect(result?.plus_minus.totalSpend).toBe(9000);
            expect(result?.plus_minus.avgCPL).toBe(500);

            // hormozi: 5 leads, 3000 cents spent = 600 cents CPL
            expect(result?.hormozi.totalLeads).toBe(5);
            expect(result?.hormozi.totalSpend).toBe(3000);
            expect(result?.hormozi.avgCPL).toBe(600);
        });

        it("should handle no campaigns", async () => {
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({ data: [] }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const result = await analyzePatterns("user-123", "niche");

            expect(result).toBeNull();
        });

        it("should handle no analytics data", async () => {
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [{ id: "brief-1" }],
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [{ id: "variant-1", story_framework: "plus_minus" }],
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({ data: [] }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const result = await analyzePatterns("user-123", "niche");

            expect(result).toBeNull();
        });
    });
});
