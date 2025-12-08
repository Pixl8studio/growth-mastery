/**
 * Tests for Iterative Message Generator
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

// Mock AI client
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: vi.fn(),
}));

// Mock sequence service
vi.mock("@/lib/followup/sequence-service", () => ({
    createMessage: vi.fn(),
}));

// Import after mocks are defined
const { generateWithAI } = await import("@/lib/ai/client");
const { createMessage } = await import("@/lib/followup/sequence-service");
const { generateSingleMessage, generateAllMessages } = await import(
    "@/lib/followup/iterative-message-generator"
);

describe("Iterative Message Generator", () => {
    const mockDeckContext = {
        title: "Test Webinar",
        mainPromise: "Learn to scale",
        keyPoints: ["Point 1", "Point 2", "Point 3"],
        painPoints: ["Pain 1", "Pain 2"],
        solutions: ["Solution 1", "Solution 2"],
    };

    const mockOfferContext = {
        name: "Premium Course",
        price: 997,
        features: ["Feature 1", "Feature 2", "Feature 3"],
        bonuses: ["Bonus 1", "Bonus 2"],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateSingleMessage", () => {
        it("generates message successfully", async () => {
            const mockAIResponse = {
                subject_line: "Test Subject {{first_name}}",
                body_content: "Test body with {{first_name}}",
            };

            (generateWithAI as any).mockResolvedValue(mockAIResponse);
            (createMessage as any).mockResolvedValue({
                success: true,
                message: { id: "msg-123" },
            });

            const result = await generateSingleMessage(
                "sequence-123",
                1,
                mockDeckContext,
                mockOfferContext,
                []
            );

            expect(result.success).toBe(true);
            expect(result.message_id).toBe("msg-123");
            expect(generateWithAI).toHaveBeenCalled();
            expect(createMessage).toHaveBeenCalled();
        });

        it("includes previous messages in context", async () => {
            const previousMessages = [
                {
                    name: "Day 0 - Thank You",
                    message_order: 1,
                    channel: "email" as const,
                    send_delay_hours: 0,
                    subject_line: "Thanks for attending",
                    body_content: "Previous message content",
                },
            ];

            const mockAIResponse = {
                subject_line: "Follow up",
                body_content: "Building on previous message",
            };

            (generateWithAI as any).mockResolvedValue(mockAIResponse);
            (createMessage as any).mockResolvedValue({
                success: true,
                message: { id: "msg-124" },
            });

            const result = await generateSingleMessage(
                "sequence-123",
                2,
                mockDeckContext,
                mockOfferContext,
                previousMessages
            );

            expect(result.success).toBe(true);
            const aiCall = (generateWithAI as any).mock.calls[0];
            expect(aiCall[0][1].content).toContain("PREVIOUS MESSAGES");
        });

        it("returns error when AI generation fails", async () => {
            (generateWithAI as any).mockRejectedValue(new Error("AI error"));

            const result = await generateSingleMessage(
                "sequence-123",
                1,
                mockDeckContext,
                mockOfferContext,
                []
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("AI error");
        });

        it("returns error when message creation fails", async () => {
            const mockAIResponse = {
                subject_line: "Test",
                body_content: "Test body",
            };

            (generateWithAI as any).mockResolvedValue(mockAIResponse);
            (createMessage as any).mockResolvedValue({
                success: false,
                error: "Database error",
            });

            const result = await generateSingleMessage(
                "sequence-123",
                1,
                mockDeckContext,
                mockOfferContext,
                []
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Database error");
        });

        it("generates SMS message without subject line", async () => {
            const mockAIResponse = {
                body_content: "Short SMS content",
            };

            (generateWithAI as any).mockResolvedValue(mockAIResponse);
            (createMessage as any).mockResolvedValue({
                success: true,
                message: { id: "msg-125" },
            });

            const result = await generateSingleMessage(
                "sequence-123",
                2, // Message 2 is SMS
                mockDeckContext,
                mockOfferContext,
                []
            );

            expect(result.success).toBe(true);
            const createCall = (createMessage as any).mock.calls[0][1];
            expect(createCall.channel).toBe("sms");
        });
    });

    describe("generateAllMessages", () => {
        it("generates all 5 messages successfully", async () => {
            const mockAIResponse = {
                subject_line: "Test Subject",
                body_content: "Test body",
            };

            (generateWithAI as any).mockResolvedValue(mockAIResponse);
            (createMessage as any).mockResolvedValue({
                success: true,
                message: { id: "msg-123" },
            });

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "msg-123",
                                name: "Test Message",
                                message_order: 1,
                                channel: "email",
                                send_delay_hours: 0,
                                subject_line: "Test",
                                body_content: "Body",
                            },
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await generateAllMessages(
                "sequence-123",
                mockDeckContext,
                mockOfferContext
            );

            expect(result.success).toBe(true);
            expect(result.messages_generated).toBe(5);
            expect(result.message_ids).toHaveLength(5);
            expect(result.errors).toHaveLength(0);
        });

        it("continues generation even if some messages fail", async () => {
            let callCount = 0;
            (generateWithAI as any).mockImplementation(() => {
                callCount++;
                if (callCount === 2) {
                    throw new Error("AI error on message 2");
                }
                return {
                    subject_line: "Test",
                    body_content: "Test body",
                };
            });

            (createMessage as any).mockResolvedValue({
                success: true,
                message: { id: `msg-${callCount}` },
            });

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "msg-123",
                                name: "Test",
                                message_order: 1,
                                channel: "email",
                                send_delay_hours: 0,
                                body_content: "Body",
                            },
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await generateAllMessages(
                "sequence-123",
                mockDeckContext,
                mockOfferContext
            );

            expect(result.success).toBe(true); // Success if at least 1 generated
            expect(result.messages_generated).toBe(4);
            expect(result.errors).toHaveLength(1);
        });

        it("calls progress callback with updates", async () => {
            const progressCallback = vi.fn();
            const mockAIResponse = {
                subject_line: "Test",
                body_content: "Test body",
            };

            (generateWithAI as any).mockResolvedValue(mockAIResponse);
            (createMessage as any).mockResolvedValue({
                success: true,
                message: { id: "msg-123" },
            });

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "msg-123",
                                name: "Test",
                                message_order: 1,
                                channel: "email",
                                send_delay_hours: 0,
                                body_content: "Body",
                            },
                            error: null,
                        }),
                    }),
                }),
            });

            await generateAllMessages(
                "sequence-123",
                mockDeckContext,
                mockOfferContext,
                progressCallback
            );

            expect(progressCallback).toHaveBeenCalled();
            expect(progressCallback).toHaveBeenCalledWith(100, "Complete!");
        });

        it("returns failure when no messages generated", async () => {
            (generateWithAI as any).mockRejectedValue(new Error("All failed"));

            const result = await generateAllMessages(
                "sequence-123",
                mockDeckContext,
                mockOfferContext
            );

            expect(result.success).toBe(false);
            expect(result.messages_generated).toBe(0);
            expect(result.errors).toHaveLength(5);
        });
    });
});
