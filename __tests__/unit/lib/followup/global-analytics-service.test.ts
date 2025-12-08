/**
 * Tests for Global Analytics Service
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
    getGlobalProspects,
    getGlobalAnalytics,
    getEngagementTimeline,
    getConversionFunnel,
} = await import("@/lib/followup/global-analytics-service");

describe("Global Analytics Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getGlobalProspects", () => {
        it("fetches all prospects for a user", async () => {
            const mockProspects = [
                {
                    id: "1",
                    email: "test1@example.com",
                    segment: "hot",
                    funnel_projects: { id: "f1", name: "Funnel 1" },
                },
                {
                    id: "2",
                    email: "test2@example.com",
                    segment: "engaged",
                    funnel_projects: { id: "f2", name: "Funnel 2" },
                },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockProspects,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await getGlobalProspects("user-123");

            expect(result.success).toBe(true);
            expect(result.prospects).toHaveLength(2);
        });

        it("filters prospects by segment", async () => {
            const mockChain = createChainableMock({ data: [], error: null });

            mockSupabase.from.mockReturnValue(mockChain);

            await getGlobalProspects("user-123", { segment: "hot" });

            expect(mockChain.eq).toHaveBeenCalledWith("segment", "hot");
        });

        it("filters prospects by minimum intent score", async () => {
            const mockChain = createChainableMock({ data: [], error: null });

            mockSupabase.from.mockReturnValue(mockChain);

            await getGlobalProspects("user-123", { minIntentScore: 70 });

            expect(mockChain.gte).toHaveBeenCalledWith("intent_score", 70);
        });

        it("searches prospects by email or name", async () => {
            const mockChain = createChainableMock({ data: [], error: null });

            mockSupabase.from.mockReturnValue(mockChain);

            await getGlobalProspects("user-123", { search: "john" });

            expect(mockChain.or).toHaveBeenCalled();
        });

        it("returns error when database query fails", async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await getGlobalProspects("user-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("getGlobalAnalytics", () => {
        it("calculates comprehensive analytics", async () => {
            const mockProspects = [
                {
                    id: "1",
                    converted: true,
                    intent_score: 90,
                    segment: "hot",
                    engagement_level: "high",
                    funnel_projects: { id: "f1", name: "Funnel 1" },
                },
                {
                    id: "2",
                    converted: false,
                    intent_score: 50,
                    segment: "engaged",
                    engagement_level: "medium",
                    funnel_projects: { id: "f1", name: "Funnel 1" },
                },
                {
                    id: "3",
                    converted: false,
                    intent_score: 30,
                    segment: "sampler",
                    engagement_level: "low",
                    funnel_projects: { id: "f2", name: "Funnel 2" },
                },
            ];

            let fromCallCount = 0;
            mockSupabase.from.mockImplementation((table) => {
                fromCallCount++;

                if (table === "followup_prospects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: mockProspects,
                            error: null,
                        }),
                    };
                }

                if (table === "followup_deliveries") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockReturnThis(),
                        not: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: [],
                            error: null,
                        }),
                    };
                }

                if (table === "followup_sequences") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({
                            count: 5,
                            error: null,
                        }),
                    };
                }

                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        then: vi.fn().mockResolvedValue({
                            data: [{ id: "agent-1" }],
                            error: null,
                        }),
                    };
                }

                return {
                    select: vi.fn().mockReturnThis(),
                };
            });

            const result = await getGlobalAnalytics("user-123");

            expect(result.success).toBe(true);
            expect(result.analytics?.totalProspects).toBe(3);
            expect(result.analytics?.conversionRate).toBeGreaterThan(0);
            expect(result.analytics?.bySegment).toBeDefined();
            expect(result.analytics?.byFunnel).toHaveLength(2);
        });

        it("handles date range filtering", async () => {
            const mockChain = createChainableMock({ data: [], error: null });

            mockSupabase.from.mockReturnValue(mockChain);

            await getGlobalAnalytics("user-123", {
                start: "2024-01-01",
                end: "2024-12-31",
            });

            expect(mockChain.gte).toHaveBeenCalledWith("created_at", "2024-01-01");
            expect(mockChain.lte).toHaveBeenCalledWith("created_at", "2024-12-31");
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

            const result = await getGlobalAnalytics("user-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("getEngagementTimeline", () => {
        it("aggregates engagement by date", async () => {
            const mockDeliveries = [
                {
                    actual_sent_at: "2024-01-01T10:00:00Z",
                    opened_at: "2024-01-01T11:00:00Z",
                    first_click_at: "2024-01-01T12:00:00Z",
                },
                {
                    actual_sent_at: "2024-01-01T14:00:00Z",
                    opened_at: null,
                    first_click_at: null,
                },
                {
                    actual_sent_at: "2024-01-02T10:00:00Z",
                    opened_at: "2024-01-02T11:00:00Z",
                    first_click_at: null,
                },
            ];

            // Mock for prospects query
            const prospectsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn().mockResolvedValue({
                    data: [{ id: "p1" }, { id: "p2" }],
                    error: null,
                }),
            };

            // Mock for deliveries query
            const deliveriesQuery = {
                select: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                gte: vi.fn().mockResolvedValue({
                    data: mockDeliveries,
                    error: null,
                }),
            };

            let callCount = 0;
            mockSupabase.from.mockImplementation(() => {
                callCount++;
                return callCount === 1 ? deliveriesQuery : prospectsQuery;
            });

            const result = await getEngagementTimeline("user-123", 30);

            expect(result.success).toBe(true);
            expect(result.timeline).toBeDefined();
            expect(result.timeline?.length).toBeGreaterThan(0);
        });

        it("returns error when database query fails", async () => {
            const prospectsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn().mockResolvedValue({
                    data: [{ id: "p1" }],
                    error: null,
                }),
            };

            const deliveriesQuery = {
                select: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                gte: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            };

            let callCount = 0;
            mockSupabase.from.mockImplementation(() => {
                callCount++;
                return callCount === 1 ? deliveriesQuery : prospectsQuery;
            });

            const result = await getEngagementTimeline("user-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("getConversionFunnel", () => {
        it("calculates funnel stages correctly", async () => {
            const mockProspects = [
                { segment: "hot", converted: true, total_touches: 5 },
                { segment: "engaged", converted: false, total_touches: 3 },
                { segment: "sampler", converted: false, total_touches: 1 },
                { segment: "no_show", converted: false, total_touches: 0 },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        data: mockProspects,
                        error: null,
                    }),
                }),
            });

            const result = await getConversionFunnel("user-123");

            expect(result.success).toBe(true);
            expect(result.funnel).toHaveLength(4);
            expect(result.funnel?.[0].stage).toBe("Prospects");
            expect(result.funnel?.[0].count).toBe(4);
            expect(result.funnel?.[3].stage).toBe("Converted");
            expect(result.funnel?.[3].count).toBe(1);
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

            const result = await getConversionFunnel("user-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });
});
