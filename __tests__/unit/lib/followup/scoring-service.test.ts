/**
 * Tests for Scoring Service
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
const { calculateIntentScore, recalculateIntentScore } =
    await import("@/lib/followup/scoring-service");

describe("Scoring Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("calculateIntentScore", () => {
        it("calculates high score for engaged prospects", async () => {
            // Mock database function returning high score
            mockSupabase.rpc.mockResolvedValue({
                data: 85,
                error: null,
            });

            const result = await calculateIntentScore({
                watch_percentage: 95,
                replay_count: 2,
                offer_clicks: 3,
                email_opens: 4,
                email_clicks: 2,
                response_speed_hours: 2,
            });

            expect(result.success).toBe(true);
            expect(result.intent_score).toBe(85);
            expect(result.segment).toBe("hot");
            expect(result.engagement_level).toBe("hot");
        });

        it("calculates low score for minimal engagement", async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: 10,
                error: null,
            });

            const result = await calculateIntentScore({
                watch_percentage: 10,
                replay_count: 0,
                offer_clicks: 0,
                email_opens: 0,
                email_clicks: 0,
                response_speed_hours: 999,
            });

            expect(result.success).toBe(true);
            expect(result.intent_score).toBe(10);
            expect(result.segment).toBe("skimmer");
            expect(result.engagement_level).toBe("cold");
        });

        it("falls back to manual calculation when database function fails", async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: null,
                error: { message: "Function not found" },
            });

            const result = await calculateIntentScore({
                watch_percentage: 35,
                replay_count: 1,
                offer_clicks: 1,
                email_opens: 2,
                email_clicks: 1,
                response_speed_hours: 12,
            });

            expect(result.success).toBe(true);
            expect(result.intent_score).toBeGreaterThan(0);
            expect(result.segment).toBe("sampler");
        });

        it("determines correct segment based on watch percentage", async () => {
            mockSupabase.rpc.mockResolvedValue({ data: 50, error: null });

            const testCases = [
                { watchPct: 0, expectedSegment: "no_show" },
                { watchPct: 15, expectedSegment: "skimmer" },
                { watchPct: 35, expectedSegment: "sampler" },
                { watchPct: 70, expectedSegment: "engaged" },
                { watchPct: 95, expectedSegment: "hot" },
            ];

            for (const testCase of testCases) {
                const result = await calculateIntentScore({
                    watch_percentage: testCase.watchPct,
                    replay_count: 0,
                    offer_clicks: 0,
                    email_opens: 0,
                    email_clicks: 0,
                    response_speed_hours: 999,
                });

                expect(result.segment).toBe(testCase.expectedSegment);
            }
        });

        it("determines correct engagement level based on score", async () => {
            const testCases = [
                { score: 90, expectedLevel: "hot" },
                { score: 55, expectedLevel: "warm" },
                { score: 25, expectedLevel: "cold" },
            ];

            for (const testCase of testCases) {
                mockSupabase.rpc.mockResolvedValue({
                    data: testCase.score,
                    error: null,
                });

                const result = await calculateIntentScore({
                    watch_percentage: 50,
                    replay_count: 0,
                    offer_clicks: 0,
                    email_opens: 0,
                    email_clicks: 0,
                    response_speed_hours: 999,
                });

                expect(result.engagement_level).toBe(testCase.expectedLevel);
            }
        });
    });

    describe("recalculateIntentScore", () => {
        it("fetches prospect data and recalculates score", async () => {
            const mockProspect = {
                id: "prospect-123",
                watch_percentage: 80,
                replay_count: 1,
                offer_clicks: 2,
                combined_score: 50,
            };

            const mockDeliveries = [
                {
                    opened_at: "2025-01-26T10:00:00Z",
                    total_clicks: 2,
                    replied_at: null,
                },
                {
                    opened_at: "2025-01-26T11:00:00Z",
                    total_clicks: 1,
                    replied_at: null,
                },
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_prospects") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockProspect,
                                    error: null,
                                }),
                            }),
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                data: null,
                                error: null,
                            }),
                        }),
                    };
                }
                if (table === "followup_deliveries") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                data: mockDeliveries,
                                error: null,
                            }),
                        }),
                    };
                }
                if (table === "followup_intent_scores") {
                    return {
                        insert: vi.fn().mockResolvedValue({
                            data: null,
                            error: null,
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            mockSupabase.rpc.mockResolvedValue({ data: 75, error: null });

            const result = await recalculateIntentScore("prospect-123", "email_open");

            expect(result.success).toBe(true);
            expect(result.intent_score).toBeGreaterThan(0);
        });
    });
});
