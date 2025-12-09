/**
 * Tests for Delivery Service
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

// Mock email provider
const mockEmailProvider = {
    name: "MockEmailProvider",
    sendEmail: vi.fn(),
};

vi.mock("@/lib/followup/providers/email-provider", () => ({
    getEmailProvider: vi.fn().mockResolvedValue(mockEmailProvider),
}));

// Mock SMS provider
const mockSMSProvider = {
    name: "MockSMSProvider",
    sendSMS: vi.fn(),
};

vi.mock("@/lib/followup/providers/sms-provider", () => ({
    getSMSProvider: vi.fn().mockReturnValue(mockSMSProvider),
}));

// Import after mocks are defined
const {
    processPendingDeliveries,
    sendDelivery,
    isWithinQuietHours,
    createParallelDeliveries,
} = await import("@/lib/followup/delivery-service");

describe("Delivery Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("processPendingDeliveries", () => {
        it("processes pending deliveries successfully", async () => {
            const mockDeliveries = [
                { id: "delivery-1", channel: "email" },
                { id: "delivery-2", channel: "email" },
            ];

            // Mock different behaviors for different tables
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_deliveries") {
                    // First call: fetch pending deliveries
                    const selectMock = vi.fn();
                    let _callCount = 0;

                    selectMock.mockImplementation((cols: string) => {
                        _callCount++;
                        if (cols === "*") {
                            // Initial query to fetch pending deliveries
                            return {
                                eq: vi.fn().mockReturnThis(),
                                lte: vi.fn().mockReturnThis(),
                                order: vi.fn().mockReturnThis(),
                                limit: vi.fn().mockResolvedValue({
                                    data: mockDeliveries,
                                    error: null,
                                }),
                            };
                        } else {
                            // sendDelivery queries with specific columns
                            return {
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: {
                                            id: "delivery-1",
                                            channel: "email",
                                            personalized_body: "Test body",
                                            personalized_subject: "Test subject",
                                            followup_prospects: {
                                                id: "prospect-1",
                                                email: "test@example.com",
                                                consent_state: "opted_in",
                                            },
                                            followup_queues: {
                                                agent_config_id: "agent-1",
                                            },
                                        },
                                        error: null,
                                    }),
                                }),
                            };
                        }
                    });

                    return {
                        select: selectMock,
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({ error: null }),
                        }),
                    };
                }
                return {};
            });

            mockEmailProvider.sendEmail.mockResolvedValue({
                success: true,
                provider_message_id: "msg-123",
            });

            const result = await processPendingDeliveries();

            expect(result.success).toBe(true);
            expect(result.sent_count).toBe(2);
        });

        it("returns zero when no deliveries to process", async () => {
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
            expect(result.sent_count).toBe(0);
        });

        it("returns error when database query fails", async () => {
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

    describe("sendDelivery", () => {
        it("sends email delivery successfully", async () => {
            const mockDelivery = {
                id: "delivery-1",
                channel: "email",
                personalized_subject: "Test Subject",
                personalized_body: "Test body",
                scheduled_send_at: new Date().toISOString(),
                followup_prospects: {
                    id: "prospect-1",
                    email: "test@example.com",
                    consent_state: "opted_in",
                    converted: false,
                },
                followup_queues: { agent_config_id: "agent-1" },
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockDelivery,
                            error: null,
                        }),
                    }),
                }),
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            });

            mockEmailProvider.sendEmail.mockResolvedValue({
                success: true,
                provider_message_id: "msg-123",
            });

            const result = await sendDelivery("delivery-1");

            expect(result.success).toBe(true);
            expect(mockEmailProvider.sendEmail).toHaveBeenCalled();
        });

        it("blocks delivery when prospect has opted out", async () => {
            const mockDelivery = {
                id: "delivery-1",
                channel: "email",
                personalized_body: "Test body",
                scheduled_send_at: new Date().toISOString(),
                followup_prospects: {
                    id: "prospect-1",
                    email: "test@example.com",
                    consent_state: "opted_out",
                    converted: false,
                },
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockDelivery,
                            error: null,
                        }),
                    }),
                }),
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            });

            const result = await sendDelivery("delivery-1");

            expect(result.success).toBe(false);
            expect(result.error).toContain("opted out");
        });

        it("sends SMS delivery successfully", async () => {
            const mockDelivery = {
                id: "delivery-1",
                channel: "sms",
                personalized_body: "Test SMS",
                scheduled_send_at: new Date().toISOString(),
                followup_prospects: {
                    id: "prospect-1",
                    phone: "+15555551234",
                    consent_state: "opted_in",
                    converted: false,
                },
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockDelivery,
                            error: null,
                        }),
                    }),
                }),
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            });

            mockSMSProvider.sendSMS.mockResolvedValue({
                success: true,
                provider_message_id: "sms-123",
            });

            const result = await sendDelivery("delivery-1");

            expect(result.success).toBe(true);
            expect(mockSMSProvider.sendSMS).toHaveBeenCalled();
        });

        it("fails when delivery not found", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Not found" },
                        }),
                    }),
                }),
            });

            const result = await sendDelivery("invalid-id");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Delivery not found");
        });
    });

    describe("isWithinQuietHours", () => {
        it("returns true for time within quiet hours", () => {
            // 23:00 EST = 04:00 UTC (next day) - quiet hours in America/New_York
            const scheduledTime = new Date("2024-01-02T04:00:00Z");
            const result = isWithinQuietHours(scheduledTime, "America/New_York");

            expect(result).toBe(true);
        });

        it("returns false for time outside quiet hours", () => {
            // 10:00 EST = 15:00 UTC - outside quiet hours in America/New_York
            const scheduledTime = new Date("2024-01-01T15:00:00Z");
            const result = isWithinQuietHours(scheduledTime, "America/New_York");

            expect(result).toBe(false);
        });

        it("handles invalid timezone gracefully", () => {
            const scheduledTime = new Date("2024-01-01T15:00:00Z");
            const result = isWithinQuietHours(scheduledTime, "Invalid/Timezone");

            // Should default to safe (quiet hours) on error
            expect(result).toBe(true);
        });
    });

    describe("createParallelDeliveries", () => {
        it("creates both email and SMS deliveries", async () => {
            const mockEmailDelivery = { id: "email-123" };
            const mockSMSDelivery = { id: "sms-123" };

            let callCount = 0;
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockImplementation(() => {
                            callCount++;
                            if (callCount === 1) {
                                return Promise.resolve({
                                    data: mockEmailDelivery,
                                    error: null,
                                });
                            } else {
                                return Promise.resolve({
                                    data: mockSMSDelivery,
                                    error: null,
                                });
                            }
                        }),
                    }),
                }),
            });

            const result = await createParallelDeliveries({
                prospectId: "prospect-1",
                messageId: "message-1",
                scheduledSendAt: new Date(),
                personalizedSubject: "Test Subject",
                personalizedBody: "<p>Test body</p>",
                personalizedCTA: null,
            });

            expect(result.success).toBe(true);
            expect(result.emailDeliveryId).toBe("email-123");
            expect(result.smsDeliveryId).toBe("sms-123");
        });

        it("succeeds with email only if SMS creation fails", async () => {
            const mockEmailDelivery = { id: "email-123" };

            let callCount = 0;
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockImplementation(() => {
                            callCount++;
                            if (callCount === 1) {
                                return Promise.resolve({
                                    data: mockEmailDelivery,
                                    error: null,
                                });
                            } else {
                                return Promise.resolve({
                                    data: null,
                                    error: { message: "SMS creation failed" },
                                });
                            }
                        }),
                    }),
                }),
            });

            const result = await createParallelDeliveries({
                prospectId: "prospect-1",
                messageId: "message-1",
                scheduledSendAt: new Date(),
                personalizedSubject: "Test Subject",
                personalizedBody: "Test body",
                personalizedCTA: null,
            });

            expect(result.success).toBe(true);
            expect(result.emailDeliveryId).toBe("email-123");
            expect(result.smsDeliveryId).toBeUndefined();
        });

        it("returns error when email creation fails", async () => {
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Email creation failed" },
                        }),
                    }),
                }),
            });

            const result = await createParallelDeliveries({
                prospectId: "prospect-1",
                messageId: "message-1",
                scheduledSendAt: new Date(),
                personalizedSubject: "Test Subject",
                personalizedBody: "Test body",
                personalizedCTA: null,
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe("Email creation failed");
        });
    });
});
