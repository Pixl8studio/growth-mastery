/**
 * Tests for Message Generation Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock message templates
vi.mock("@/lib/followup/message-templates", () => ({
    getOpeningTemplate: vi.fn().mockReturnValue({
        bodyTemplate: "Opening message body",
        subjectLineTemplate: "Opening subject",
        ctaText: "Get Started",
        ctaUrl: "{checkout_url}",
    }),
    getValueStoryTemplate: vi.fn().mockReturnValue({
        bodyTemplate: "Value story body",
        subjectLineTemplate: "Value subject",
        ctaText: "Learn More",
        ctaUrl: "{replay_link}",
    }),
    getSocialProofTemplate: vi.fn().mockReturnValue({
        bodyTemplate: "Social proof body",
        subjectLineTemplate: "Social proof subject",
        ctaText: "See Results",
        ctaUrl: "{checkout_url}",
    }),
    getObjectionTemplate: vi.fn().mockReturnValue({
        bodyTemplate: "Objection handling body",
        subjectLineTemplate: "Objection subject",
        ctaText: "Learn How",
        ctaUrl: "{book_call_url}",
    }),
    getOfferRecapTemplate: vi.fn().mockReturnValue({
        bodyTemplate: "Offer recap body",
        subjectLineTemplate: "Offer subject",
        ctaText: "Claim Offer",
        ctaUrl: "{checkout_url}",
    }),
    getUrgencyTemplate: vi.fn().mockReturnValue({
        bodyTemplate: "Urgency body",
        subjectLineTemplate: "Urgency subject",
        ctaText: "Act Now",
        ctaUrl: "{checkout_url}",
    }),
    getClosingTemplate: vi.fn().mockReturnValue({
        bodyTemplate: "Closing body",
        subjectLineTemplate: "Closing subject",
        ctaText: "Last Chance",
        ctaUrl: "{checkout_url}",
    }),
    getSMSCheckinTemplate: vi.fn().mockReturnValue({
        bodyTemplate: "SMS checkin",
        ctaText: "Reply",
        ctaUrl: "{replay_link}",
    }),
}));

// Import after mocks are defined
const { generateDynamicSequence, regenerateSingleMessage } = await import(
    "@/lib/followup/message-generation-service"
);

describe("Message Generation Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateDynamicSequence", () => {
        it("generates 3-message sequence correctly", async () => {
            const context = {
                count: 3,
                deadline_hours: 72,
                segments: ["sampler", "engaged", "hot"],
                offer: {
                    name: "Premium Course",
                    price: "997",
                    bonuses: "Bonus 1, Bonus 2",
                },
            };

            const result = await generateDynamicSequence("sequence-123", context);

            expect(result.success).toBe(true);
            expect(result.messages).toHaveLength(3);
            expect(result.messages?.[0].message_order).toBe(1);
            expect(result.messages?.[2].message_order).toBe(3);
        });

        it("generates 5-message sequence with correct timing", async () => {
            const context = {
                count: 5,
                deadline_hours: 72,
                segments: ["sampler"],
            };

            const result = await generateDynamicSequence("sequence-123", context);

            expect(result.success).toBe(true);
            expect(result.messages).toHaveLength(5);

            const delays = result.messages?.map((m) => m.send_delay_hours);
            expect(delays?.[0]).toBe(0); // First message immediate
            expect(delays?.[4]).toBe(72); // Last message at deadline
        });

        it("includes both email and SMS channels in 5-message sequence", async () => {
            const context = {
                count: 5,
                deadline_hours: 72,
                segments: ["sampler"],
            };

            const result = await generateDynamicSequence("sequence-123", context);

            const emailCount = result.messages?.filter(
                (m) => m.channel === "email"
            ).length;
            const smsCount = result.messages?.filter((m) => m.channel === "sms").length;

            expect(emailCount).toBe(4);
            expect(smsCount).toBe(1);
        });

        it("generates large sequence (12+ messages)", async () => {
            const context = {
                count: 12,
                deadline_hours: 168, // 7 days
                segments: ["sampler", "engaged"],
            };

            const result = await generateDynamicSequence("sequence-123", context);

            expect(result.success).toBe(true);
            expect(result.messages).toHaveLength(12);
            expect(result.messages?.[0].send_delay_hours).toBe(0);
            expect(result.messages?.[11].send_delay_hours).toBe(168);
        });

        it("includes personalization rules for all segments", async () => {
            const context = {
                count: 3,
                deadline_hours: 72,
                segments: ["no_show", "sampler", "hot"],
            };

            const result = await generateDynamicSequence("sequence-123", context);

            const message = result.messages?.[0];
            expect(message?.personalization_rules).toBeDefined();
            expect(message?.personalization_rules?.no_show).toBeDefined();
            expect(message?.personalization_rules?.sampler).toBeDefined();
            expect(message?.personalization_rules?.hot).toBeDefined();
        });

        it("includes metadata with generation context", async () => {
            const context = {
                count: 5,
                deadline_hours: 72,
                segments: ["sampler"],
            };

            const result = await generateDynamicSequence("sequence-123", context);

            const message = result.messages?.[0];
            expect(message?.metadata?.generated_at).toBeDefined();
            expect(message?.metadata?.template_type).toBeDefined();
            expect(message?.metadata?.generation_context).toEqual({
                total_count: 5,
                deadline_hours: 72,
            });
        });

        it("handles single message sequence", async () => {
            const context = {
                count: 1,
                deadline_hours: 24,
                segments: ["sampler"],
            };

            const result = await generateDynamicSequence("sequence-123", context);

            expect(result.success).toBe(true);
            expect(result.messages).toHaveLength(1);
            expect(result.messages?.[0].channel).toBe("email");
        });

        it("returns error when generation fails", async () => {
            const context = {
                count: -1, // Invalid count
                deadline_hours: 72,
                segments: ["sampler"],
            };

            const result = await generateDynamicSequence("sequence-123", context);

            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });
    });

    describe("regenerateSingleMessage", () => {
        it("regenerates opening message", async () => {
            const result = await regenerateSingleMessage(
                "msg-123",
                "opening",
                "sampler"
            );

            expect(result.success).toBe(true);
            expect(result.template?.subject_line).toBe("Opening subject");
            expect(result.template?.body_content).toBe("Opening message body");
        });

        it("regenerates SMS message", async () => {
            const result = await regenerateSingleMessage(
                "msg-123",
                "sms_checkin",
                "engaged"
            );

            expect(result.success).toBe(true);
            expect(result.template?.body_content).toBe("SMS checkin");
        });

        it("regenerates value story message", async () => {
            const result = await regenerateSingleMessage(
                "msg-123",
                "value_story",
                "hot"
            );

            expect(result.success).toBe(true);
            expect(result.template?.subject_line).toBe("Value subject");
        });

        it("returns error for unknown message type", async () => {
            const result = await regenerateSingleMessage(
                "msg-123",
                "invalid_type",
                "sampler"
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Unknown message type");
        });

        it("uses default segment when not provided", async () => {
            const result = await regenerateSingleMessage("msg-123", "opening");

            expect(result.success).toBe(true);
        });
    });
});
