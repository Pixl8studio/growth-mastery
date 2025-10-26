/**
 * Tests for Engagement Service
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

// Mock scoring service
vi.mock("@/lib/followup/scoring-service", () => ({
    recalculateIntentScore: vi.fn().mockResolvedValue({
        success: true,
        intent_score: 75,
        combined_score: 70,
    }),
}));

// Import after mocks are defined
const { trackEngagement, trackVideoWatch, trackOfferClick, getEngagementSummary } =
    await import("@/lib/followup/engagement-service");

describe("Engagement Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("trackEngagement", () => {
        it("creates engagement event successfully", async () => {
            const mockEvent = {
                id: "event-123",
                prospect_id: "prospect-123",
                event_type: "link_click",
                created_at: new Date().toISOString(),
            };

            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockEvent,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await trackEngagement({
                prospect_id: "prospect-123",
                event_type: "link_click",
                event_data: { url: "https://example.com" },
            });

            expect(result.success).toBe(true);
            expect(result.event?.id).toBe("event-123");
        });

        it("triggers score recalculation for scoring events", async () => {
            const mockEvent = {
                id: "event-123",
                prospect_id: "prospect-123",
                event_type: "email_open",
            };

            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockEvent,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await trackEngagement({
                prospect_id: "prospect-123",
                event_type: "email_open",
            });

            expect(result.success).toBe(true);
            expect(result.score_updated).toBe(true);
            expect(result.new_score).toBe(70);
        });

        it("returns error when event insertion fails", async () => {
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Insert failed" },
                        }),
                    }),
                }),
            });

            const result = await trackEngagement({
                prospect_id: "prospect-123",
                event_type: "link_click",
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe("Insert failed");
        });
    });

    describe("trackVideoWatch", () => {
        it("updates watch data and creates event", async () => {
            const mockProspect = {
                watch_percentage: 50,
                watch_duration_seconds: 1200,
                replay_count: 0,
            };

            const mockEvent = {
                id: "event-123",
                event_type: "video_watch",
            };

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
                // followup_events
                return {
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockEvent,
                                error: null,
                            }),
                        }),
                    }),
                };
            });

            const result = await trackVideoWatch("prospect-123", 75, 1800);

            expect(result.success).toBe(true);
            expect(result.score_updated).toBe(true);
        });

        it("detects replay when watch percentage decreases", async () => {
            const mockProspect = {
                watch_percentage: 75,
                watch_duration_seconds: 1800,
                replay_count: 1,
            };

            const mockEvent = {
                id: "event-123",
                event_type: "video_replay",
            };

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
                return {
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockEvent,
                                error: null,
                            }),
                        }),
                    }),
                };
            });

            const result = await trackVideoWatch("prospect-123", 25, 600);

            expect(result.success).toBe(true);
        });
    });

    describe("trackOfferClick", () => {
        it("increments offer clicks and creates event", async () => {
            const mockProspect = {
                offer_clicks: 2,
            };

            const mockEvent = {
                id: "event-123",
                event_type: "offer_click",
            };

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
                return {
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockEvent,
                                error: null,
                            }),
                        }),
                    }),
                };
            });

            const result = await trackOfferClick(
                "prospect-123",
                "offer-123",
                "Buy Now"
            );

            expect(result.success).toBe(true);
            expect(result.score_updated).toBe(true);
        });
    });

    describe("getEngagementSummary", () => {
        it("retrieves aggregated engagement metrics", async () => {
            const mockSummary = {
                total_deliveries: 5,
                total_opens: 4,
                total_clicks: 3,
                open_rate: 80,
                click_rate: 60,
            };

            mockSupabase.rpc.mockResolvedValue({
                data: mockSummary,
                error: null,
            });

            const result = await getEngagementSummary("prospect-123");

            expect(result.success).toBe(true);
            expect(result.summary).toMatchObject({
                total_deliveries: 5,
                open_rate: 80,
            });
        });

        it("returns error when summary fetch fails", async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: null,
                error: { message: "RPC failed" },
            });

            const result = await getEngagementSummary("prospect-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("RPC failed");
        });
    });
});
