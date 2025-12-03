/**
 * Tests for Queue Processor
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

// Mock delivery service
const mockSendDelivery = vi.fn();
vi.mock("@/lib/followup/delivery-service", () => ({
    sendDelivery: mockSendDelivery,
}));

// Import after mocks are defined
const { processPendingDeliveries, rescheduleQuietHourDeliveries } = await import(
    "@/lib/followup/queue-processor"
);

describe("Queue Processor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("processPendingDeliveries", () => {
        it("processes pending deliveries successfully", async () => {
            const mockDeliveries = [
                {
                    id: "delivery-1",
                    channel: "email",
                    scheduled_send_at: new Date().toISOString(),
                    followup_prospects: {
                        id: "prospect-1",
                        email: "test@example.com",
                        consent_state: "opted_in",
                        timezone: "America/New_York",
                        total_touches: 0,
                    },
                },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: mockDeliveries,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);
            mockSendDelivery.mockResolvedValue({ success: true });

            const result = await processPendingDeliveries();

            expect(result.success).toBe(true);
            expect(result.processed).toBe(1);
            expect(result.sent).toBe(1);
            expect(mockSendDelivery).toHaveBeenCalledWith("delivery-1");
        });

        it("returns zero counts when no deliveries to process", async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await processPendingDeliveries();

            expect(result.success).toBe(true);
            expect(result.processed).toBe(0);
            expect(result.sent).toBe(0);
        });

        it("skips deliveries that fail compliance checks", async () => {
            const mockDeliveries = [
                {
                    id: "delivery-1",
                    channel: "email",
                    scheduled_send_at: new Date().toISOString(),
                    followup_prospects: {
                        id: "prospect-1",
                        email: "test@example.com",
                        consent_state: "opted_out",
                    },
                },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: mockDeliveries,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue({
                ...mockChain,
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            });

            const result = await processPendingDeliveries();

            expect(result.success).toBe(true);
            expect(result.skipped).toBe(1);
            expect(mockSendDelivery).not.toHaveBeenCalled();
        });

        it("tracks failed deliveries", async () => {
            const mockDeliveries = [
                {
                    id: "delivery-1",
                    channel: "email",
                    scheduled_send_at: new Date().toISOString(),
                    followup_prospects: {
                        id: "prospect-1",
                        email: "test@example.com",
                        consent_state: "opted_in",
                        timezone: "America/New_York",
                    },
                },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: mockDeliveries,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);
            mockSendDelivery.mockResolvedValue({
                success: false,
                error: "Send failed",
            });

            const result = await processPendingDeliveries();

            expect(result.success).toBe(true);
            expect(result.failed).toBe(1);
        });

        it("respects batch size option", async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            await processPendingDeliveries({ batchSize: 50 });

            expect(mockChain.limit).toHaveBeenCalledWith(50);
        });

        it("stops processing when max time reached", async () => {
            const mockDeliveries = Array.from({ length: 100 }, (_, i) => ({
                id: `delivery-${i}`,
                channel: "email",
                scheduled_send_at: new Date().toISOString(),
                followup_prospects: {
                    id: `prospect-${i}`,
                    email: `test${i}@example.com`,
                    consent_state: "opted_in",
                },
            }));

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: mockDeliveries,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);
            mockSendDelivery.mockResolvedValue({ success: true });

            const result = await processPendingDeliveries({
                maxProcessTime: 10,
            });

            expect(result.processed).toBeLessThan(100);
        });

        it("returns error when database fetch fails", async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await processPendingDeliveries();

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("rescheduleQuietHourDeliveries", () => {
        it("reschedules deliveries in quiet hours", async () => {
            const quietTime = new Date();
            quietTime.setHours(23, 0, 0, 0); // 11 PM

            const mockDeliveries = [
                {
                    id: "delivery-1",
                    scheduled_send_at: quietTime.toISOString(),
                    followup_prospects: {
                        timezone: "America/New_York",
                    },
                },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: mockDeliveries,
                    error: null,
                }),
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            });

            const result = await rescheduleQuietHourDeliveries();

            expect(result.success).toBe(true);
            expect(result.rescheduled).toBeGreaterThan(0);
        });

        it("skips deliveries without timezone", async () => {
            const mockDeliveries = [
                {
                    id: "delivery-1",
                    scheduled_send_at: new Date().toISOString(),
                    followup_prospects: {
                        timezone: null,
                    },
                },
            ];

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: mockDeliveries,
                    error: null,
                }),
            });

            const result = await rescheduleQuietHourDeliveries();

            expect(result.success).toBe(true);
            expect(result.rescheduled).toBe(0);
        });

        it("returns error when database fetch fails", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            });

            const result = await rescheduleQuietHourDeliveries();

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });
});
