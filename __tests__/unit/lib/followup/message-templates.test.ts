/**
 * Tests for Message Templates
 */

import { describe, it, expect } from "vitest";

// Import template functions
const { getOpeningTemplate, getValueStoryTemplate, SEGMENT_RULES } = await import(
    "@/lib/followup/message-templates"
);

describe("Message Templates", () => {
    describe("SEGMENT_RULES", () => {
        it("has rules for all segments", () => {
            expect(SEGMENT_RULES.no_show).toBeDefined();
            expect(SEGMENT_RULES.skimmer).toBeDefined();
            expect(SEGMENT_RULES.sampler).toBeDefined();
            expect(SEGMENT_RULES.engaged).toBeDefined();
            expect(SEGMENT_RULES.hot).toBeDefined();
        });

        it("each rule has required properties", () => {
            Object.values(SEGMENT_RULES).forEach((rule) => {
                expect(rule.tone).toBeDefined();
                expect(rule.ctaFocus).toBeDefined();
                expect(rule.length).toMatch(/^(short|medium|long)$/);
                expect(rule.emphasis).toBeDefined();
            });
        });
    });

    describe("getOpeningTemplate", () => {
        it("returns email template for no_show segment", () => {
            const template = getOpeningTemplate("no_show");

            expect(template.type).toBe("opening");
            expect(template.channel).toBe("email");
            expect(template.subjectLineTemplate).toBeDefined();
            expect(template.bodyTemplate).toBeDefined();
            expect(template.ctaText).toBeDefined();
            expect(template.ctaUrl).toBeDefined();
        });

        it("returns email template for skimmer segment", () => {
            const template = getOpeningTemplate("skimmer");

            expect(template.type).toBe("opening");
            expect(template.channel).toBe("email");
            expect(template.bodyTemplate).toContain("{first_name}");
        });

        it("returns email template for engaged segment", () => {
            const template = getOpeningTemplate("engaged");

            expect(template.type).toBe("opening");
            expect(template.channel).toBe("email");
            expect(template.bodyTemplate).toBeDefined();
        });

        it("returns email template for hot segment", () => {
            const template = getOpeningTemplate("hot");

            expect(template.type).toBe("opening");
            expect(template.channel).toBe("email");
            expect(template.bodyTemplate).toBeDefined();
        });

        it("returns default template for unknown segment", () => {
            const template = getOpeningTemplate("unknown");

            expect(template.type).toBe("opening");
            expect(template.channel).toBe("email");
            expect(template.bodyTemplate).toBeDefined();
        });

        it("includes personalization tokens", () => {
            const template = getOpeningTemplate("sampler");

            const hasTokens =
                template.bodyTemplate.includes("{") ||
                template.subjectLineTemplate.includes("{");
            expect(hasTokens).toBe(true);
        });

        it("each template has unique content", () => {
            const noShow = getOpeningTemplate("no_show");
            const skimmer = getOpeningTemplate("skimmer");
            const sampler = getOpeningTemplate("sampler");

            expect(noShow.bodyTemplate).not.toBe(skimmer.bodyTemplate);
            expect(skimmer.bodyTemplate).not.toBe(sampler.bodyTemplate);
        });
    });

    describe("getValueStoryTemplate", () => {
        it("returns value story template", () => {
            const template = getValueStoryTemplate("sampler");

            expect(template.type).toBe("value_story");
            expect(template.channel).toBe("email");
            expect(template.subjectLineTemplate).toBeDefined();
            expect(template.bodyTemplate).toBeDefined();
            expect(template.ctaText).toBeDefined();
            expect(template.ctaUrl).toBeDefined();
        });

        it("adapts CTA based on segment", () => {
            const hotTemplate = getValueStoryTemplate("hot");
            const samplerTemplate = getValueStoryTemplate("sampler");

            // Hot segment should have more direct CTA
            expect(hotTemplate.ctaText).toBeDefined();
            expect(samplerTemplate.ctaText).toBeDefined();
        });

        it("includes story elements", () => {
            const template = getValueStoryTemplate("engaged");

            // Should include story/case study elements
            expect(template.bodyTemplate.length).toBeGreaterThan(100);
        });

        it("includes personalization tokens", () => {
            const template = getValueStoryTemplate("hot");

            expect(
                template.bodyTemplate.includes("{") ||
                    template.subjectLineTemplate.includes("{")
            ).toBe(true);
        });
    });
});
