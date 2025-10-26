/**
 * Tests for Scheduler Service
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

// Mock personalization service
vi.mock("@/lib/followup/personalization-service", () => ({
    personalizeMessage: vi.fn().mockReturnValue({
        subject: "Personalized Subject",
        body: "Personalized Body",
        cta: { text: "Click Here", url: "https://example.com", tracking_enabled: true },
    }),
}));

// Import after mocks are defined
const {
    triggerSequence,
    getDeliveriesReadyToSend,
    markDeliverySent,
    markDeliveryFailed,
    cancelPendingDeliveries,
    updateNextScheduledTouch,
} = await import("@/lib/followup/scheduler-service");

describe("Scheduler Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("triggerSequence", () => {
        it("creates deliveries for all messages in sequence", async () => {
            const mockProspect = {
                id: "prospect-123",
                segment: "engaged",
                consent_state: "opt_in",
                converted: false,
                intent_score: 75,
                total_touches: 0,
            };

            const mockSequence = {
                id: "sequence-123",
                target_segments: ["engaged", "hot"],
                min_intent_score: 0,
                max_intent_score: 100,
                stop_on_conversion: true,
                requires_manual_approval: false,
            };

            const mockMessages = [
                {
                    id: "msg-1",
                    message_order: 1,
                    send_delay_hours: 0,
                    channel: "email",
                },
                {
                    id: "msg-2",
                    message_order: 2,
                    send_delay_hours: 24,
                    channel: "email",
                },
                { id: "msg-3", message_order: 3, send_delay_hours: 48, channel: "sms" },
            ];

            const mockDeliveries = [
                { id: "del-1", scheduled_send_at: "2025-01-26T14:00:00Z" },
                { id: "del-2", scheduled_send_at: "2025-01-27T14:00:00Z" },
                { id: "del-3", scheduled_send_at: "2025-01-28T14:00:00Z" },
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
                if (table === "followup_sequences") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockSequence,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
                if (table === "followup_messages") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                order: vi.fn().mockResolvedValue({
                                    data: mockMessages,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
                if (table === "followup_deliveries") {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockResolvedValue({
                                data: mockDeliveries,
                                error: null,
                            }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await triggerSequence("prospect-123", "sequence-123");

            expect(result.success).toBe(true);
            expect(result.deliveries_created).toBe(3);
        });

        it("returns error when prospect not eligible", async () => {
            const mockProspect = {
                id: "prospect-123",
                segment: "no_show",
                consent_state: "opt_in",
                converted: false,
                intent_score: 10,
            };

            const mockSequence = {
                id: "sequence-123",
                target_segments: ["hot", "engaged"],
                min_intent_score: 50,
                max_intent_score: 100,
                stop_on_conversion: true,
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
                    };
                }
                if (table === "followup_sequences") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockSequence,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await triggerSequence("prospect-123", "sequence-123");

            expect(result.success).toBe(false);
            expect(result.error).toContain("not targeted");
        });
    });

    describe("getDeliveriesReadyToSend", () => {
        it("fetches pending deliveries scheduled for now or past", async () => {
            const mockDeliveries = [
                { id: "del-1", scheduled_send_at: "2025-01-26T13:00:00Z" },
                { id: "del-2", scheduled_send_at: "2025-01-26T13:30:00Z" },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockDeliveries,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await getDeliveriesReadyToSend();

            expect(result.success).toBe(true);
            expect(result.deliveries).toHaveLength(2);
        });
    });

    describe("markDeliverySent", () => {
        it("updates delivery status to sent", async () => {
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        error: null,
                    }),
                }),
            });

            const result = await markDeliverySent("delivery-123", "provider-msg-456");

            expect(result.success).toBe(true);
        });
    });

    describe("cancelPendingDeliveries", () => {
        it("cancels all pending deliveries for a prospect", async () => {
            const mockCancelled = [{ id: "del-1" }, { id: "del-2" }, { id: "del-3" }];

            const mockChain = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockResolvedValue({
                    data: mockCancelled,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await cancelPendingDeliveries(
                "prospect-123",
                "Prospect converted"
            );

            expect(result.success).toBe(true);
            expect(result.cancelled_count).toBe(3);
        });
    });

    describe("updateNextScheduledTouch", () => {
        it("finds next pending delivery and updates prospect", async () => {
            const mockDelivery = {
                scheduled_send_at: "2025-01-27T14:00:00Z",
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_deliveries") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    order: vi.fn().mockReturnValue({
                                        limit: vi.fn().mockReturnValue({
                                            single: vi.fn().mockResolvedValue({
                                                data: mockDelivery,
                                                error: null,
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                // followup_prospects
                return {
                    update: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({
                            error: null,
                        }),
                    }),
                };
            });

            const result = await updateNextScheduledTouch("prospect-123");

            expect(result.success).toBe(true);
            expect(result.next_touch).toBe("2025-01-27T14:00:00Z");
        });

        it("sets next touch to null when no pending deliveries", async () => {
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_deliveries") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    order: vi.fn().mockReturnValue({
                                        limit: vi.fn().mockReturnValue({
                                            single: vi.fn().mockResolvedValue({
                                                data: null,
                                                error: null,
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return {
                    update: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({
                            error: null,
                        }),
                    }),
                };
            });

            const result = await updateNextScheduledTouch("prospect-123");

            expect(result.success).toBe(true);
            expect(result.next_touch).toBeNull();
        });
    });
});
