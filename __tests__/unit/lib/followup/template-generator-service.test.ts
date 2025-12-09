/**
 * Tests for Template Generator Service
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
const mockGenerateWithAI = vi.fn();
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: mockGenerateWithAI,
}));

// Mock prompts
vi.mock("@/lib/ai/prompts", () => ({
    createFollowupSequencePrompt: vi.fn().mockReturnValue([
        { role: "system", content: "Generate follow-up messages" },
        { role: "user", content: "Based on this context..." },
    ]),
}));

// Mock default templates
vi.mock("@/lib/followup/default-templates", () => ({
    getDefault3DaySequence: vi.fn().mockReturnValue({
        name: "Default Sequence",
        description: "Default description",
        sequence_type: "3_day_discount",
        trigger_event: "webinar_end",
        deadline_hours: 72,
        total_messages: 5,
        messages: [
            {
                name: "Message 1",
                message_order: 1,
                channel: "email",
                send_delay_hours: 0,
                subject_line: "Subject",
                body_content: "Body",
                personalization_rules: {},
                primary_cta: {},
            },
        ],
    }),
}));

// Import after mocks are defined
const { generateFollowupTemplates } = await import(
    "@/lib/followup/template-generator-service"
);

describe("Template Generator Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateFollowupTemplates", () => {
        it("uses AI generation when deck and offer exist", async () => {
            const mockDeck = {
                slides: [
                    {
                        title: "Slide 1",
                        section: "hook",
                        description: "Description",
                    },
                ],
                metadata: { title: "Test Webinar" },
            };

            const mockOffer = {
                name: "Premium Course",
                price: 997,
                features: ["Feature 1", "Feature 2"],
            };

            const mockAIResponse = {
                sequence_name: "AI Generated Sequence",
                sequence_description: "AI description",
                messages: [
                    {
                        name: "AI Message 1",
                        message_order: 1,
                        channel: "email",
                        send_delay_hours: 0,
                        subject_line: "AI Subject",
                        body_content: "AI Body",
                    },
                ],
            };

            let _callCount = 0;
            mockSupabase.from.mockImplementation((table) => {
                _callCount++;

                if (table === "deck_structures") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockDeck,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === "offers") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockOffer,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === "followup_sequences") {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: "seq-123" },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === "followup_messages") {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockResolvedValue({
                                data: [{ id: "msg-123" }],
                                error: null,
                            }),
                        }),
                    };
                }

                return { select: vi.fn().mockReturnThis() };
            });

            mockGenerateWithAI.mockResolvedValue(mockAIResponse);

            const result = await generateFollowupTemplates("user-123", {
                funnel_project_id: "funnel-123",
                offer_id: "offer-123",
            });

            expect(result.success).toBe(true);
            expect(result.generation_method).toBe("ai");
            expect(mockGenerateWithAI).toHaveBeenCalled();
        });

        it("falls back to defaults when deck not found", async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === "deck_structures") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: null,
                                    error: { message: "Not found" },
                                }),
                            }),
                        }),
                    };
                }

                if (table === "followup_sequences") {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: "seq-123" },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === "followup_messages") {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockResolvedValue({
                                data: [{ id: "msg-123" }],
                                error: null,
                            }),
                        }),
                    };
                }

                return { select: vi.fn().mockReturnThis() };
            });

            const result = await generateFollowupTemplates("user-123", {
                funnel_project_id: "funnel-123",
                offer_id: "offer-123",
            });

            expect(result.success).toBe(true);
            expect(result.generation_method).toBe("default");
        });

        it("uses defaults when use_defaults is true", async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === "followup_sequences") {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: "seq-123" },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === "followup_messages") {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockResolvedValue({
                                data: [{ id: "msg-123" }],
                                error: null,
                            }),
                        }),
                    };
                }

                return { select: vi.fn().mockReturnThis() };
            });

            const result = await generateFollowupTemplates("user-123", {
                funnel_project_id: "funnel-123",
                offer_id: "offer-123",
                use_defaults: true,
            });

            expect(result.success).toBe(true);
            expect(result.generation_method).toBe("default");
            expect(mockGenerateWithAI).not.toHaveBeenCalled();
        });

        it("falls back to defaults when AI generation fails", async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === "deck_structures") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { slides: [] },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === "offers") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { name: "Test", price: 997 },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === "followup_sequences") {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: "seq-123" },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === "followup_messages") {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockResolvedValue({
                                data: [{ id: "msg-123" }],
                                error: null,
                            }),
                        }),
                    };
                }

                return { select: vi.fn().mockReturnThis() };
            });

            mockGenerateWithAI.mockRejectedValue(new Error("AI error"));

            const result = await generateFollowupTemplates("user-123", {
                funnel_project_id: "funnel-123",
                offer_id: "offer-123",
            });

            expect(result.success).toBe(true);
            expect(result.generation_method).toBe("default");
        });

        it("returns error when sequence creation fails", async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === "followup_sequences") {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: null,
                                    error: { message: "Creation failed" },
                                }),
                            }),
                        }),
                    };
                }

                return { select: vi.fn().mockReturnThis() };
            });

            const result = await generateFollowupTemplates("user-123", {
                funnel_project_id: "funnel-123",
                offer_id: "offer-123",
                use_defaults: true,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain("sequence");
        });
    });
});
