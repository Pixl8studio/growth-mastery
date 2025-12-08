/**
 * Integration Tests for Metrics API
 * Tests GET /api/ads/metrics/[campaignId]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/ads/metrics/[campaignId]/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

import { createClient } from "@/lib/supabase/server";

describe("GET /api/ads/metrics/[campaignId]", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const campaignId = "campaign-123";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fetch metrics for a campaign", async () => {
        const mockBrief = {
            id: campaignId,
            user_id: mockUser.id,
            name: "Test Campaign",
        };

        const mockVariants = [{ id: "variant-1" }, { id: "variant-2" }];

        const mockAnalytics = [
            {
                post_variant_id: "variant-1",
                impressions: 10000,
                clicks: 500,
                spend_cents: 5000,
                leads_count: 25,
                cpc_cents: 10,
                cpm_cents: 500,
                ctr_percent: 5.0,
                cost_per_lead_cents: 200,
            },
            {
                post_variant_id: "variant-2",
                impressions: 8000,
                clicks: 400,
                spend_cents: 4000,
                leads_count: 20,
                cpc_cents: 10,
                cpm_cents: 500,
                ctr_percent: 5.0,
                cost_per_lead_cents: 200,
            },
        ];

        const mockSnapshots = [
            {
                id: "snapshot-1",
                post_variant_id: "variant-1",
                snapshot_date: "2025-01-01",
                impressions: 5000,
                clicks: 250,
            },
            {
                id: "snapshot-2",
                post_variant_id: "variant-1",
                snapshot_date: "2025-01-02",
                impressions: 5000,
                clicks: 250,
            },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockBrief,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: mockVariants,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: mockAnalytics,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_ad_snapshots") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: mockSnapshots,
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: `http://localhost:3000/api/ads/metrics/${campaignId}`,
        });

        const context = {
            params: Promise.resolve({ campaignId }),
        };

        const response = await GET(request, context);
        const data = await parseJsonResponse<{
            success: boolean;
            campaign: unknown;
            metrics: unknown;
            variants_count: number;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.campaign).toBeDefined();
        expect(data.metrics).toBeDefined();
        expect(data.variants_count).toBe(2);
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
            url: `http://localhost:3000/api/ads/metrics/${campaignId}`,
        });

        const context = {
            params: Promise.resolve({ campaignId }),
        };

        const response = await GET(request, context);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 404 for campaign not found", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: `http://localhost:3000/api/ads/metrics/${campaignId}`,
        });

        const context = {
            params: Promise.resolve({ campaignId }),
        };

        const response = await GET(request, context);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("Campaign not found");
    });

    it("should aggregate metrics from multiple variants", async () => {
        const mockBrief = {
            id: campaignId,
            user_id: mockUser.id,
        };

        const mockVariants = [
            { id: "variant-1" },
            { id: "variant-2" },
            { id: "variant-3" },
        ];

        const mockAnalytics = [
            {
                post_variant_id: "variant-1",
                impressions: 10000,
                clicks: 500,
                spend_cents: 5000,
                leads_count: 25,
            },
            {
                post_variant_id: "variant-2",
                impressions: 8000,
                clicks: 400,
                spend_cents: 4000,
                leads_count: 20,
            },
            {
                post_variant_id: "variant-3",
                impressions: 12000,
                clicks: 600,
                spend_cents: 6000,
                leads_count: 30,
            },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockBrief,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: mockVariants,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: mockAnalytics,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_ad_snapshots") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: [],
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: `http://localhost:3000/api/ads/metrics/${campaignId}`,
        });

        const context = {
            params: Promise.resolve({ campaignId }),
        };

        const response = await GET(request, context);
        const data = await parseJsonResponse<{
            metrics: {
                impressions: number;
                clicks: number;
                spend_cents: number;
                leads: number;
            };
        }>(response);

        // Aggregated totals: impressions=30000, clicks=1500, spend=15000, leads=75
        expect(data.metrics.impressions).toBe(30000);
        expect(data.metrics.clicks).toBe(1500);
        expect(data.metrics.spend_cents).toBe(15000);
        expect(data.metrics.leads).toBe(75);
    });

    it("should include historical snapshots", async () => {
        const mockBrief = {
            id: campaignId,
            user_id: mockUser.id,
        };

        const mockVariants = [{ id: "variant-1" }];

        const mockAnalytics = [
            {
                post_variant_id: "variant-1",
                impressions: 10000,
                clicks: 500,
                spend_cents: 5000,
                leads_count: 25,
            },
        ];

        const mockSnapshots = [
            {
                id: "snapshot-1",
                post_variant_id: "variant-1",
                snapshot_date: "2025-01-01T00:00:00Z",
                impressions: 3000,
            },
            {
                id: "snapshot-2",
                post_variant_id: "variant-1",
                snapshot_date: "2025-01-02T00:00:00Z",
                impressions: 7000,
            },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockBrief,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: mockVariants,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: mockAnalytics,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_ad_snapshots") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: mockSnapshots,
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: `http://localhost:3000/api/ads/metrics/${campaignId}`,
        });

        const context = {
            params: Promise.resolve({ campaignId }),
        };

        const response = await GET(request, context);
        const data = await parseJsonResponse<{
            snapshots: Array<{ id: string }>;
        }>(response);

        expect(data.snapshots).toHaveLength(2);
        expect(data.snapshots[0].id).toBe("snapshot-1");
        expect(data.snapshots[1].id).toBe("snapshot-2");
    });

    it("should calculate derived metrics correctly", async () => {
        const mockBrief = {
            id: campaignId,
            user_id: mockUser.id,
        };

        const mockVariants = [{ id: "variant-1" }];

        const mockAnalytics = [
            {
                post_variant_id: "variant-1",
                impressions: 10000,
                clicks: 250, // CTR = 2.5%
                spend_cents: 5000, // CPC = 20 cents
                leads_count: 25, // CPL = 200 cents
            },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockBrief,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: mockVariants,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: mockAnalytics,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_ad_snapshots") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: [],
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: `http://localhost:3000/api/ads/metrics/${campaignId}`,
        });

        const context = {
            params: Promise.resolve({ campaignId }),
        };

        const response = await GET(request, context);
        const data = await parseJsonResponse<{
            metrics: {
                cpc_cents: number;
                cpm_cents: number;
                ctr_percent: number;
                cost_per_lead_cents: number;
            };
        }>(response);

        // CPC = 5000 cents / 250 clicks = 20 cents
        expect(data.metrics.cpc_cents).toBe(20);

        // CPM = (5000 cents / 10000 impressions) * 1000 = 500 cents
        expect(data.metrics.cpm_cents).toBe(500);

        // CTR = (250 clicks / 10000 impressions) * 100 = 2.5%
        expect(data.metrics.ctr_percent).toBe(2.5);

        // CPL = 5000 cents / 25 leads = 200 cents
        expect(data.metrics.cost_per_lead_cents).toBe(200);
    });

    it("should handle campaigns with no analytics data", async () => {
        const mockBrief = {
            id: campaignId,
            user_id: mockUser.id,
        };

        const mockVariants = [{ id: "variant-1" }];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockBrief,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: mockVariants,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_analytics") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            data: [],
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_ad_snapshots") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: [],
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: `http://localhost:3000/api/ads/metrics/${campaignId}`,
        });

        const context = {
            params: Promise.resolve({ campaignId }),
        };

        const response = await GET(request, context);
        const data = await parseJsonResponse<{
            metrics: {
                impressions: number;
                clicks: number;
                spend_cents: number;
                leads: number;
            };
        }>(response);

        expect(response.status).toBe(200);
        expect(data.metrics.impressions).toBe(0);
        expect(data.metrics.clicks).toBe(0);
        expect(data.metrics.spend_cents).toBe(0);
        expect(data.metrics.leads).toBe(0);
    });
});
