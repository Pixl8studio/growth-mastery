/**
 * Unit Tests for Metrics Fetcher
 * Tests ad metrics syncing and calculation logic
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    createTestContentBrief,
    createTestPostVariant,
} from "@/__tests__/fixtures/db-fixtures";

// Create chainable query builder that supports .eq().eq().single() patterns
function createChainableBuilder(response: { data: unknown; error: unknown }) {
    const builder: Record<string, ReturnType<typeof vi.fn>> = {};

    // Terminal methods
    builder.single = vi.fn().mockResolvedValue(response);
    builder.maybeSingle = vi.fn().mockResolvedValue(response);

    // Chainable methods that return the builder
    const chainableMethods = [
        "select",
        "insert",
        "update",
        "delete",
        "upsert",
        "eq",
        "neq",
        "not",
        "in",
        "order",
        "limit",
    ];

    chainableMethods.forEach((method) => {
        builder[method] = vi.fn().mockImplementation(() => {
            // Return an object that can be awaited (for .then()) or chained
            return {
                ...builder,
                then: (resolve: (val: unknown) => void) => resolve(response),
            };
        });
    });

    return builder;
}

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
    getCampaignInsights: vi.fn(),
}));

vi.mock("@/lib/crypto/token-encryption", () => ({
    decryptToken: vi.fn().mockResolvedValue("decrypted-token"),
}));

// Import after mocks
const { syncAllAdMetrics, syncCampaignMetrics, syncUserAdMetrics } = await import(
    "@/lib/ads/metrics-fetcher"
);
const { getCampaignInsights } = await import("@/lib/integrations/meta-ads");
const { decryptToken } = await import("@/lib/crypto/token-encryption");

describe("Metrics Fetcher", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("syncAllAdMetrics", () => {
        it("should sync metrics for all active campaigns", async () => {
            const mockBriefs = [
                createTestContentBrief({
                    id: "brief-1",
                    user_id: "user-123",
                    meta_campaign_id: "campaign-1",
                }),
                createTestContentBrief({
                    id: "brief-2",
                    user_id: "user-123",
                    meta_campaign_id: "campaign-2",
                }),
            ];

            const mockVariants = [
                createTestPostVariant({ id: "variant-1", brief_id: "brief-1" }),
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: mockBriefs, error: null });
                }
                if (table === "marketing_oauth_connections") {
                    return createChainableBuilder({
                        data: { access_token_encrypted: "encrypted-token" },
                        error: null,
                    });
                }
                if (table === "marketing_post_variants") {
                    return createChainableBuilder({ data: mockVariants, error: null });
                }
                if (table === "marketing_analytics") {
                    return createChainableBuilder({ data: null, error: null });
                }
                if (table === "marketing_ad_snapshots") {
                    return createChainableBuilder({ data: null, error: null });
                }
                return createChainableBuilder({ data: null, error: null });
            });

            // Reset and set up fresh mock for this test
            vi.mocked(getCampaignInsights).mockReset();
            vi.mocked(getCampaignInsights).mockResolvedValue({
                data: [
                    {
                        impressions: "10000",
                        clicks: "500",
                        spend: "100.50",
                        actions: [
                            { action_type: "lead", value: "25" },
                            {
                                action_type: "onsite_conversion.lead_grouped",
                                value: "5",
                            },
                        ],
                    },
                ],
            } as unknown);

            const result = await syncAllAdMetrics();

            expect(result.success).toBe(true);
            expect(result.synced).toBe(2);
        });

        it("should handle no active campaigns", async () => {
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: [], error: null });
                }
                return createChainableBuilder({ data: null, error: null });
            });

            const result = await syncAllAdMetrics();

            expect(result.success).toBe(true);
            expect(result.synced).toBe(0);
        });

        it("should continue syncing after individual campaign errors", async () => {
            const mockBriefs = [
                createTestContentBrief({
                    id: "brief-1",
                    user_id: "user-123",
                    meta_campaign_id: "campaign-1",
                }),
                createTestContentBrief({
                    id: "brief-2",
                    user_id: "user-123",
                    meta_campaign_id: "campaign-2",
                }),
            ];

            const mockVariants = [
                createTestPostVariant({ id: "variant-1", brief_id: "brief-1" }),
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: mockBriefs, error: null });
                }
                if (table === "marketing_oauth_connections") {
                    return createChainableBuilder({
                        data: { access_token_encrypted: "encrypted-token" },
                        error: null,
                    });
                }
                if (table === "marketing_post_variants") {
                    return createChainableBuilder({ data: mockVariants, error: null });
                }
                if (table === "marketing_analytics") {
                    return createChainableBuilder({ data: null, error: null });
                }
                if (table === "marketing_ad_snapshots") {
                    return createChainableBuilder({ data: null, error: null });
                }
                return createChainableBuilder({ data: null, error: null });
            });

            vi.mocked(decryptToken).mockResolvedValue("decrypted-token");

            // First call fails, second succeeds
            vi.mocked(getCampaignInsights)
                .mockRejectedValueOnce(new Error("API error"))
                .mockResolvedValueOnce({
                    data: [
                        {
                            impressions: "10000",
                            clicks: "500",
                            spend: "100.50",
                            actions: [],
                        },
                    ],
                } as unknown);

            const result = await syncAllAdMetrics();

            expect(result.success).toBe(true);
            expect(result.synced).toBe(1); // Only second campaign synced
        });
    });

    describe("syncCampaignMetrics", () => {
        it("should sync metrics for a single campaign", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            const mockBrief = createTestContentBrief({
                id: briefId,
                user_id: userId,
                meta_campaign_id: "campaign-123",
            });
            const mockVariants = [
                createTestPostVariant({ id: "variant-1", brief_id: briefId }),
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: mockBrief, error: null });
                }
                if (table === "marketing_oauth_connections") {
                    return createChainableBuilder({
                        data: { access_token_encrypted: "encrypted-token" },
                        error: null,
                    });
                }
                if (table === "marketing_post_variants") {
                    return createChainableBuilder({ data: mockVariants, error: null });
                }
                if (table === "marketing_analytics") {
                    return createChainableBuilder({ data: null, error: null });
                }
                if (table === "marketing_ad_snapshots") {
                    return createChainableBuilder({ data: null, error: null });
                }
                return createChainableBuilder({ data: null, error: null });
            });

            // Reset and set up fresh mock for this test
            vi.mocked(getCampaignInsights).mockReset();
            vi.mocked(getCampaignInsights).mockResolvedValue({
                data: [
                    {
                        impressions: "10000",
                        clicks: "500",
                        spend: "100.50",
                        actions: [{ action_type: "lead", value: "25" }],
                    },
                ],
            } as unknown);

            await syncCampaignMetrics(briefId, userId);

            expect(getCampaignInsights).toHaveBeenCalledWith(
                "campaign-123",
                "lifetime",
                "decrypted-token"
            );
        });

        it("should calculate CPC correctly", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            let savedAnalytics: Record<string, unknown> | null = null;

            const mockBrief = createTestContentBrief({
                id: briefId,
                user_id: userId,
                meta_campaign_id: "campaign-123",
            });
            const mockVariants = [
                createTestPostVariant({ id: "variant-1", brief_id: briefId }),
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: mockBrief, error: null });
                }
                if (table === "marketing_oauth_connections") {
                    return createChainableBuilder({
                        data: { access_token_encrypted: "encrypted-token" },
                        error: null,
                    });
                }
                if (table === "marketing_post_variants") {
                    return createChainableBuilder({ data: mockVariants, error: null });
                }
                if (table === "marketing_analytics") {
                    return {
                        upsert: vi.fn().mockImplementation((data) => {
                            savedAnalytics = data;
                            return Promise.resolve({ error: null });
                        }),
                    };
                }
                if (table === "marketing_ad_snapshots") {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return createChainableBuilder({ data: null, error: null });
            });

            // Reset and set up fresh mock for this test
            vi.mocked(getCampaignInsights).mockReset();
            vi.mocked(getCampaignInsights).mockResolvedValue({
                data: [
                    {
                        impressions: "10000",
                        clicks: "200", // 200 clicks
                        spend: "100.00", // $100.00 = 10000 cents
                        actions: [],
                    },
                ],
            } as unknown);

            await syncCampaignMetrics(briefId, userId);

            // CPC = 10000 cents / 200 clicks = 50 cents
            expect(savedAnalytics?.cpc_cents).toBe(50);
        });

        it("should calculate CPM correctly", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            let savedAnalytics: Record<string, unknown> | null = null;

            const mockBrief = createTestContentBrief({
                id: briefId,
                user_id: userId,
                meta_campaign_id: "campaign-123",
            });
            const mockVariants = [
                createTestPostVariant({ id: "variant-1", brief_id: briefId }),
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: mockBrief, error: null });
                }
                if (table === "marketing_oauth_connections") {
                    return createChainableBuilder({
                        data: { access_token_encrypted: "encrypted-token" },
                        error: null,
                    });
                }
                if (table === "marketing_post_variants") {
                    return createChainableBuilder({ data: mockVariants, error: null });
                }
                if (table === "marketing_analytics") {
                    return {
                        upsert: vi.fn().mockImplementation((data) => {
                            savedAnalytics = data;
                            return Promise.resolve({ error: null });
                        }),
                    };
                }
                if (table === "marketing_ad_snapshots") {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return createChainableBuilder({ data: null, error: null });
            });

            // Reset and set up fresh mock for this test
            vi.mocked(getCampaignInsights).mockReset();
            vi.mocked(getCampaignInsights).mockResolvedValue({
                data: [
                    {
                        impressions: "10000", // 10,000 impressions
                        clicks: "200",
                        spend: "50.00", // $50.00 = 5000 cents
                        actions: [],
                    },
                ],
            } as unknown);

            await syncCampaignMetrics(briefId, userId);

            // CPM = (5000 cents / 10000 impressions) * 1000 = 500 cents ($5.00 per 1000 impressions)
            expect(savedAnalytics?.cpm_cents).toBe(500);
        });

        it("should calculate CTR correctly", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            let savedAnalytics: Record<string, unknown> | null = null;

            const mockBrief = createTestContentBrief({
                id: briefId,
                user_id: userId,
                meta_campaign_id: "campaign-123",
            });
            const mockVariants = [
                createTestPostVariant({ id: "variant-1", brief_id: briefId }),
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: mockBrief, error: null });
                }
                if (table === "marketing_oauth_connections") {
                    return createChainableBuilder({
                        data: { access_token_encrypted: "encrypted-token" },
                        error: null,
                    });
                }
                if (table === "marketing_post_variants") {
                    return createChainableBuilder({ data: mockVariants, error: null });
                }
                if (table === "marketing_analytics") {
                    return {
                        upsert: vi.fn().mockImplementation((data) => {
                            savedAnalytics = data;
                            return Promise.resolve({ error: null });
                        }),
                    };
                }
                if (table === "marketing_ad_snapshots") {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return createChainableBuilder({ data: null, error: null });
            });

            // Reset and set up fresh mock for this test
            vi.mocked(getCampaignInsights).mockReset();
            vi.mocked(getCampaignInsights).mockResolvedValue({
                data: [
                    {
                        impressions: "10000", // 10,000 impressions
                        clicks: "250", // 250 clicks
                        spend: "50.00",
                        actions: [],
                    },
                ],
            } as unknown);

            await syncCampaignMetrics(briefId, userId);

            // CTR = (250 / 10000) * 100 = 2.5%
            expect(savedAnalytics?.ctr_percent).toBe(2.5);
        });

        it("should calculate cost per lead correctly", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            let savedAnalytics: Record<string, unknown> | null = null;

            const mockBrief = createTestContentBrief({
                id: briefId,
                user_id: userId,
                meta_campaign_id: "campaign-123",
            });
            const mockVariants = [
                createTestPostVariant({ id: "variant-1", brief_id: briefId }),
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: mockBrief, error: null });
                }
                if (table === "marketing_oauth_connections") {
                    return createChainableBuilder({
                        data: { access_token_encrypted: "encrypted-token" },
                        error: null,
                    });
                }
                if (table === "marketing_post_variants") {
                    return createChainableBuilder({ data: mockVariants, error: null });
                }
                if (table === "marketing_analytics") {
                    return {
                        upsert: vi.fn().mockImplementation((data) => {
                            savedAnalytics = data;
                            return Promise.resolve({ error: null });
                        }),
                    };
                }
                if (table === "marketing_ad_snapshots") {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                return createChainableBuilder({ data: null, error: null });
            });

            // Reset and set up fresh mock for this test
            vi.mocked(getCampaignInsights).mockReset();
            vi.mocked(getCampaignInsights).mockResolvedValue({
                data: [
                    {
                        impressions: "10000",
                        clicks: "250",
                        spend: "100.00", // $100.00 = 10000 cents
                        actions: [
                            { action_type: "lead", value: "20" },
                            {
                                action_type: "onsite_conversion.lead_grouped",
                                value: "5",
                            },
                        ],
                    },
                ],
            } as unknown);

            await syncCampaignMetrics(briefId, userId);

            // Total leads = 20 + 5 = 25
            // CPL = 10000 cents / 25 leads = 400 cents ($4.00 per lead)
            expect(savedAnalytics?.cost_per_lead_cents).toBe(400);
            expect(savedAnalytics?.leads_count).toBe(25);
        });

        it("should create snapshot after syncing metrics", async () => {
            const briefId = "brief-123";
            const userId = "user-123";

            let snapshotData: Record<string, unknown> | null = null;

            const mockBrief = createTestContentBrief({
                id: briefId,
                user_id: userId,
                meta_campaign_id: "campaign-123",
            });
            const mockVariants = [
                createTestPostVariant({ id: "variant-1", brief_id: briefId }),
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: mockBrief, error: null });
                }
                if (table === "marketing_oauth_connections") {
                    return createChainableBuilder({
                        data: { access_token_encrypted: "encrypted-token" },
                        error: null,
                    });
                }
                if (table === "marketing_post_variants") {
                    return createChainableBuilder({ data: mockVariants, error: null });
                }
                if (table === "marketing_analytics") {
                    return {
                        upsert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                if (table === "marketing_ad_snapshots") {
                    return {
                        insert: vi.fn().mockImplementation((data) => {
                            snapshotData = data;
                            return Promise.resolve({ error: null });
                        }),
                    };
                }
                return createChainableBuilder({ data: null, error: null });
            });

            // Reset and set up fresh mock for this test
            vi.mocked(getCampaignInsights).mockReset();
            const mockInsightData = {
                impressions: "10000",
                clicks: "250",
                spend: "100.00",
                actions: [{ action_type: "lead", value: "20" }],
            };
            vi.mocked(getCampaignInsights).mockResolvedValue({
                data: [mockInsightData],
            } as unknown);

            await syncCampaignMetrics(briefId, userId);

            expect(snapshotData).toBeTruthy();
            expect(snapshotData?.post_variant_id).toBe("variant-1");
            expect(snapshotData?.user_id).toBe(userId);
            expect(snapshotData?.impressions).toBe(10000);
            expect(snapshotData?.clicks).toBe(250);
            expect(snapshotData?.leads).toBe(20);
            expect(snapshotData?.raw_metrics).toEqual(mockInsightData);
        });

        it("should handle missing Facebook connection", async () => {
            const mockBrief = createTestContentBrief({
                id: "brief-123",
                user_id: "user-123",
                meta_campaign_id: "campaign-123",
            });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: mockBrief, error: null });
                }
                if (table === "marketing_oauth_connections") {
                    return createChainableBuilder({ data: null, error: null });
                }
                return createChainableBuilder({ data: null, error: null });
            });

            await expect(syncCampaignMetrics("brief-123", "user-123")).rejects.toThrow(
                "Facebook not connected"
            );
        });

        it("should handle campaign without Meta ID", async () => {
            const mockBrief = createTestContentBrief({
                id: "brief-123",
                user_id: "user-123",
                meta_campaign_id: null,
            });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: mockBrief, error: null });
                }
                return createChainableBuilder({ data: null, error: null });
            });

            await expect(syncCampaignMetrics("brief-123", "user-123")).rejects.toThrow(
                "Campaign not found or not deployed"
            );
        });
    });

    describe("syncUserAdMetrics", () => {
        it("should sync all campaigns for a user", async () => {
            const userId = "user-123";

            const mockBriefs = [
                createTestContentBrief({
                    id: "brief-1",
                    user_id: userId,
                    meta_campaign_id: "campaign-1",
                }),
                createTestContentBrief({
                    id: "brief-2",
                    user_id: userId,
                    meta_campaign_id: "campaign-2",
                }),
            ];

            const mockVariants = [
                createTestPostVariant({ id: "variant-1", brief_id: "brief-1" }),
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: mockBriefs, error: null });
                }
                if (table === "marketing_oauth_connections") {
                    return createChainableBuilder({
                        data: { access_token_encrypted: "encrypted-token" },
                        error: null,
                    });
                }
                if (table === "marketing_post_variants") {
                    return createChainableBuilder({ data: mockVariants, error: null });
                }
                if (table === "marketing_analytics") {
                    return createChainableBuilder({ data: null, error: null });
                }
                if (table === "marketing_ad_snapshots") {
                    return createChainableBuilder({ data: null, error: null });
                }
                return createChainableBuilder({ data: null, error: null });
            });

            // Reset and set up fresh mock for this test
            vi.mocked(getCampaignInsights).mockReset();
            vi.mocked(getCampaignInsights).mockResolvedValue({
                data: [
                    {
                        impressions: "10000",
                        clicks: "500",
                        spend: "100.50",
                        actions: [],
                    },
                ],
            } as unknown);

            const result = await syncUserAdMetrics(userId);

            expect(result.success).toBe(true);
            expect(result.synced).toBe(2);
        });

        it("should handle user with no campaigns", async () => {
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "marketing_content_briefs") {
                    return createChainableBuilder({ data: [], error: null });
                }
                return createChainableBuilder({ data: null, error: null });
            });

            const result = await syncUserAdMetrics("user-123");

            expect(result.success).toBe(true);
            expect(result.synced).toBe(0);
        });
    });
});
