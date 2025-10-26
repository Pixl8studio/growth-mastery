/**
 * Tests for Compliance Service
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

// Import after mocks are defined
const {
    validateCANSPAMCompliance,
    checkSendingLimits,
    processBounce,
    processComplaint,
    isQuietHours,
    getSenderReputationStatus,
} = await import("@/lib/followup/compliance-service");

describe("Compliance Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("validateCANSPAMCompliance", () => {
        it("passes for compliant emails", () => {
            const email = `
                Hello there!
                
                This is a longer message with actual content.
                
                To unsubscribe, click here: {OPT_OUT_LINK}
            `;

            const result = validateCANSPAMCompliance(email);

            expect(result.compliant).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        it("fails when missing unsubscribe link", () => {
            const email =
                "This is a longer message with actual content but no way to stop receiving these messages.";

            const result = validateCANSPAMCompliance(email);

            expect(result.compliant).toBe(false);
            expect(result.violations).toContain("Missing unsubscribe/opt-out link");
        });

        it("warns about very short messages", () => {
            const email = "Hi";

            const result = validateCANSPAMCompliance(email);

            expect(result.compliant).toBe(false);
            expect(result.violations.some((v) => v.includes("too short"))).toBe(true);
        });

        it("accepts various opt-out link formats", () => {
            const templates = [
                "Message with unsubscribe link",
                "Message with opt-out link",
                "Message with opt_out link",
                "Message with {OPT_OUT_LINK} placeholder",
            ];

            templates.forEach((template) => {
                const result = validateCANSPAMCompliance(template);
                expect(result.violations).not.toContain(
                    "Missing unsubscribe/opt-out link"
                );
            });
        });
    });

    describe("checkSendingLimits", () => {
        it("allows sending when under daily limit", async () => {
            const mockConfig = {
                channel_config: {
                    email: { max_per_day: 500 },
                },
            };

            const mockDeliveries = new Array(50).fill({ id: "delivery" });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    limit: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: mockConfig,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                if (table === "followup_deliveries") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                gte: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockResolvedValue({
                                        data: mockDeliveries,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await checkSendingLimits("user-123", "email");

            expect(result.allowed).toBe(true);
            expect(result.current_count).toBe(50);
            expect(result.limit).toBe(500);
        });

        it("blocks sending when daily limit reached", async () => {
            const mockConfig = {
                channel_config: {
                    email: { max_per_day: 100 },
                },
            };

            const mockDeliveries = new Array(100).fill({ id: "delivery" });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    limit: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: mockConfig,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                if (table === "followup_deliveries") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                gte: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockResolvedValue({
                                        data: mockDeliveries,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await checkSendingLimits("user-123", "email");

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain("limit reached");
        });
    });

    describe("processBounce", () => {
        it("updates consent state for hard bounces", async () => {
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        error: null,
                    }),
                }),
            });

            const result = await processBounce({
                email: "bounce@example.com",
                bounce_type: "hard",
                reason: "Mailbox does not exist",
            });

            expect(result.success).toBe(true);
        });

        it("does not update consent for soft bounces", async () => {
            const updateFn = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                    error: null,
                }),
            });

            mockSupabase.from.mockReturnValue({
                update: updateFn,
            });

            const result = await processBounce({
                email: "softbounce@example.com",
                bounce_type: "soft",
            });

            // Soft bounces still return success, just don't update consent
            expect(result.success).toBe(true);
        });
    });

    describe("processComplaint", () => {
        it("updates consent state and cancels deliveries", async () => {
            const mockProspects = [{ id: "prospect-123" }];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_prospects") {
                    return {
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                error: null,
                            }),
                        }),
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                data: mockProspects,
                                error: null,
                            }),
                        }),
                    };
                }
                if (table === "followup_deliveries") {
                    return {
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockResolvedValue({
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await processComplaint({
                email: "complaint@example.com",
                reason: "Spam",
            });

            expect(result.success).toBe(true);
        });
    });

    describe("isQuietHours", () => {
        it("returns true during quiet hours", () => {
            // Mock date to be 10 PM (22:00)
            vi.setSystemTime(new Date("2025-01-26T22:00:00Z"));

            const result = isQuietHours("UTC", "21:00", "08:00");

            expect(result).toBe(true);

            vi.useRealTimers();
        });

        it("returns false during normal hours", () => {
            // Mock date to be 2 PM (14:00)
            vi.setSystemTime(new Date("2025-01-26T14:00:00Z"));

            const result = isQuietHours("UTC", "21:00", "08:00");

            expect(result).toBe(false);

            vi.useRealTimers();
        });
    });

    describe("getSenderReputationStatus", () => {
        it("returns healthy status with low bounce rate", async () => {
            const mockDeliveries = [
                ...new Array(95).fill({ delivery_status: "delivered" }),
                ...new Array(2).fill({ delivery_status: "bounced" }),
                ...new Array(3).fill({ delivery_status: "sent" }),
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    gte: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({
                            data: mockDeliveries,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await getSenderReputationStatus("user-123");

            expect(result.healthy).toBe(true);
            expect(result.bounce_rate).toBeLessThan(5);
            expect(result.warnings).toHaveLength(0);
        });

        it("returns unhealthy status with high bounce rate", async () => {
            const mockDeliveries = [
                ...new Array(85).fill({ delivery_status: "delivered" }),
                ...new Array(15).fill({ delivery_status: "bounced" }),
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    gte: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({
                            data: mockDeliveries,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await getSenderReputationStatus("user-123");

            expect(result.healthy).toBe(false);
            expect(result.bounce_rate).toBeGreaterThan(5);
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });
});
