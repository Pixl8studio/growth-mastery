/**
 * Tests for Analytics Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSupabase = {
    from: vi.fn(),
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

/**
 * Creates a chainable and thenable mock for Supabase queries
 */
function createChainableMock(result: { data: unknown; error: unknown }) {
    const chain: Record<string, unknown> = {};
    const methods = [
        "select",
        "eq",
        "gte",
        "lte",
        "in",
        "or",
        "not",
        "order",
        "limit",
        "single",
    ];
    methods.forEach((method) => {
        chain[method] = vi.fn(() => chain);
    });
    // Make it thenable for await
    chain.then = (resolve: (value: unknown) => void) =>
        Promise.resolve(result).then(resolve);
    return chain;
}

// Import after mocks are defined
const {
    getDeliverabilityMetrics,
    getEngagementMetrics,
    getConversionMetrics,
    getSegmentMetrics,
    getDashboardAnalytics,
} = await import("@/lib/followup/analytics-service");

describe("Analytics Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getDeliverabilityMetrics", () => {
        it("calculates deliverability metrics correctly", async () => {
            const mockData = [
                { delivery_status: "delivered" },
                { delivery_status: "delivered" },
                { delivery_status: "bounced" },
                { delivery_status: "failed" },
                { delivery_status: "pending" },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({
                    data: mockData,
                    error: null,
                }),
            });

            const result = await getDeliverabilityMetrics("funnel-123");

            expect(result.success).toBe(true);
            expect(result.metrics?.total_scheduled).toBe(5);
            expect(result.metrics?.total_sent).toBe(4);
            expect(result.metrics?.total_delivered).toBe(2);
            expect(result.metrics?.total_bounced).toBe(1);
            expect(result.metrics?.total_failed).toBe(1);
            expect(result.metrics?.delivery_rate).toBe(50);
            expect(result.metrics?.bounce_rate).toBe(25);
        });

        it("handles date range filtering", async () => {
            const mockData = [{ delivery_status: "delivered" }];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockResolvedValue({
                    data: mockData,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await getDeliverabilityMetrics("funnel-123", {
                start: "2024-01-01",
                end: "2024-12-31",
            });

            expect(result.success).toBe(true);
            expect(mockChain.gte).toHaveBeenCalledWith("created_at", "2024-01-01");
            expect(mockChain.lte).toHaveBeenCalledWith("created_at", "2024-12-31");
        });

        it("returns error when database query fails", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            });

            const result = await getDeliverabilityMetrics("funnel-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("getEngagementMetrics", () => {
        it("calculates engagement metrics correctly", async () => {
            const mockData = [
                {
                    opened_at: "2024-01-01",
                    first_click_at: "2024-01-01",
                    replied_at: null,
                },
                { opened_at: "2024-01-02", first_click_at: null, replied_at: null },
                { opened_at: null, first_click_at: null, replied_at: null },
                {
                    opened_at: "2024-01-03",
                    first_click_at: "2024-01-03",
                    replied_at: "2024-01-03",
                },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({
                    data: mockData,
                    error: null,
                }),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockResolvedValue({
                    data: mockData,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await getEngagementMetrics("funnel-123");

            expect(result.success).toBe(true);
            expect(result.metrics?.total_opens).toBe(3);
            expect(result.metrics?.total_clicks).toBe(2);
            expect(result.metrics?.total_replies).toBe(1);
            expect(result.metrics?.open_rate).toBe(75);
            expect(result.metrics?.click_rate).toBe(50);
        });

        it("returns error when database query fails", async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await getEngagementMetrics("funnel-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("getConversionMetrics", () => {
        it("calculates conversion metrics correctly", async () => {
            const mockData = [
                { converted: true, conversion_value: "100" },
                { converted: true, conversion_value: "200" },
                { converted: false, conversion_value: null },
                { converted: false, conversion_value: null },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({
                    data: mockData,
                    error: null,
                }),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockResolvedValue({
                    data: mockData,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await getConversionMetrics("funnel-123");

            expect(result.success).toBe(true);
            expect(result.metrics?.total_prospects).toBe(4);
            expect(result.metrics?.total_converted).toBe(2);
            expect(result.metrics?.conversion_rate).toBe(50);
            expect(result.metrics?.total_revenue).toBe(300);
            expect(result.metrics?.average_order_value).toBe(150);
        });

        it("returns error when database query fails", async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await getConversionMetrics("funnel-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("getSegmentMetrics", () => {
        it("calculates segment metrics correctly", async () => {
            const mockData = [
                {
                    segment: "hot",
                    converted: true,
                    intent_score: 90,
                    watch_percentage: 95,
                },
                {
                    segment: "hot",
                    converted: false,
                    intent_score: 85,
                    watch_percentage: 90,
                },
                {
                    segment: "engaged",
                    converted: true,
                    intent_score: 70,
                    watch_percentage: 75,
                },
                {
                    segment: "sampler",
                    converted: false,
                    intent_score: 50,
                    watch_percentage: 40,
                },
                {
                    segment: "no_show",
                    converted: false,
                    intent_score: 0,
                    watch_percentage: 0,
                },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        data: mockData,
                        error: null,
                    }),
                }),
            });

            const result = await getSegmentMetrics("funnel-123");

            expect(result.success).toBe(true);
            expect(result.metrics).toHaveLength(5);

            const hotSegment = result.metrics?.find((m) => m.segment === "hot");
            expect(hotSegment?.prospect_count).toBe(2);
            expect(hotSegment?.conversion_rate).toBe(50);
        });

        it("returns error when database query fails", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: "Database error" },
                    }),
                }),
            });

            const result = await getSegmentMetrics("funnel-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("getDashboardAnalytics", () => {
        it("fetches all analytics successfully", async () => {
            const mockChain = createChainableMock({ data: [], error: null });

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await getDashboardAnalytics("funnel-123");

            expect(result.success).toBe(true);
            expect(result.analytics).toBeDefined();
            expect(result.analytics?.deliverability).toBeDefined();
            expect(result.analytics?.engagement).toBeDefined();
            expect(result.analytics?.conversion).toBeDefined();
            expect(result.analytics?.segments).toBeDefined();
        });
    });
});
