/**
 * Tests for Default Templates
 */

import { describe, it, expect } from "vitest";

// Import default templates
const { getDefault3DaySequence, DEFAULT_3_DAY_SEQUENCE } = await import(
    "@/lib/followup/default-templates"
);

describe("Default Templates", () => {
    describe("DEFAULT_3_DAY_SEQUENCE", () => {
        it("has correct sequence structure", () => {
            expect(DEFAULT_3_DAY_SEQUENCE.name).toBe("3-Day Webinar Follow-Up");
            expect(DEFAULT_3_DAY_SEQUENCE.sequence_type).toBe("3_day_discount");
            expect(DEFAULT_3_DAY_SEQUENCE.trigger_event).toBe("webinar_end");
            expect(DEFAULT_3_DAY_SEQUENCE.deadline_hours).toBe(72);
            expect(DEFAULT_3_DAY_SEQUENCE.total_messages).toBe(5);
        });

        it("has 5 messages", () => {
            expect(DEFAULT_3_DAY_SEQUENCE.messages).toHaveLength(5);
        });

        it("has correct message order", () => {
            DEFAULT_3_DAY_SEQUENCE.messages.forEach((msg, index) => {
                expect(msg.message_order).toBe(index + 1);
            });
        });

        it("has correct timing pattern (Day 0, Day 0, Day 1, Day 2, Day 3)", () => {
            const delays = DEFAULT_3_DAY_SEQUENCE.messages.map(
                (m) => m.send_delay_hours
            );
            expect(delays).toEqual([0, 0, 24, 48, 72]);
        });

        it("has email for first message", () => {
            const firstMessage = DEFAULT_3_DAY_SEQUENCE.messages[0];
            expect(firstMessage.channel).toBe("email");
            expect(firstMessage.subject_line).toBeDefined();
        });

        it("has SMS for second message", () => {
            const secondMessage = DEFAULT_3_DAY_SEQUENCE.messages[1];
            expect(secondMessage.channel).toBe("sms");
        });

        it("each message has required fields", () => {
            DEFAULT_3_DAY_SEQUENCE.messages.forEach((msg) => {
                expect(msg.name).toBeDefined();
                expect(msg.message_order).toBeGreaterThan(0);
                expect(msg.channel).toMatch(/^(email|sms)$/);
                expect(msg.send_delay_hours).toBeGreaterThanOrEqual(0);
                expect(msg.body_content).toBeDefined();
                expect(msg.body_content.length).toBeGreaterThan(0);
                expect(msg.personalization_rules).toBeDefined();
                expect(msg.primary_cta).toBeDefined();
            });
        });

        it("each message has personalization rules for all segments", () => {
            DEFAULT_3_DAY_SEQUENCE.messages.forEach((msg) => {
                expect(msg.personalization_rules.no_show).toBeDefined();
                expect(msg.personalization_rules.skimmer).toBeDefined();
                expect(msg.personalization_rules.sampler).toBeDefined();
                expect(msg.personalization_rules.engaged).toBeDefined();
                expect(msg.personalization_rules.hot).toBeDefined();
            });
        });

        it("includes personalization tokens", () => {
            DEFAULT_3_DAY_SEQUENCE.messages.forEach((msg) => {
                // Email messages should have some personalization
                if (msg.channel === "email") {
                    const hasTokens =
                        msg.body_content.includes("{{") ||
                        msg.subject_line?.includes("{{");
                    expect(hasTokens).toBe(true);
                }
            });
        });

        it("has CTAs for all messages", () => {
            DEFAULT_3_DAY_SEQUENCE.messages.forEach((msg) => {
                expect(msg.primary_cta.text).toBeDefined();
                expect(msg.primary_cta.url).toBeDefined();
                expect(msg.primary_cta.tracking_enabled).toBe(true);
            });
        });

        it("Day 0 email includes thank you message", () => {
            const day0Email = DEFAULT_3_DAY_SEQUENCE.messages[0];
            expect(day0Email.name).toContain("Thank You");
            expect(day0Email.body_content.toLowerCase()).toContain("thank");
        });

        it("Day 3 final call includes urgency", () => {
            const finalMessage = DEFAULT_3_DAY_SEQUENCE.messages[4];
            expect(finalMessage.name).toContain("Final Call");
            expect(
                finalMessage.body_content.toLowerCase().includes("last") ||
                    finalMessage.body_content.toLowerCase().includes("final") ||
                    finalMessage.body_content.toLowerCase().includes("closes")
            ).toBe(true);
        });
    });

    describe("getDefault3DaySequence", () => {
        it("returns the default sequence", () => {
            const sequence = getDefault3DaySequence();
            expect(sequence).toEqual(DEFAULT_3_DAY_SEQUENCE);
        });

        it("returned sequence has all required properties", () => {
            const sequence = getDefault3DaySequence();
            expect(sequence.name).toBeDefined();
            expect(sequence.description).toBeDefined();
            expect(sequence.sequence_type).toBeDefined();
            expect(sequence.trigger_event).toBeDefined();
            expect(sequence.deadline_hours).toBeDefined();
            expect(sequence.total_messages).toBeDefined();
            expect(sequence.messages).toBeDefined();
            expect(Array.isArray(sequence.messages)).toBe(true);
        });
    });
});
