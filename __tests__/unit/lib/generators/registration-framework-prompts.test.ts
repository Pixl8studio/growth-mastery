/**
 * Registration Framework Prompts Tests
 * Verify AI prompt generation for registration pages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createFullPageRegenerationPrompt,
    createFieldRegenerationPrompt,
    createSectionRegenerationPrompt,
} from "@/lib/generators/registration-framework-prompts";

// Mock design system guidelines
vi.mock("@/lib/ai/design-system-guidelines", () => ({
    DESIGN_SYSTEM_GUIDELINES: "Design system guidelines content",
    ICON_USAGE_GUIDELINES: "Icon usage guidelines content",
}));

describe("Registration Framework Prompts", () => {
    const mockIntakeData = {
        targetAudience: "online course creators",
        businessNiche: "education and coaching",
        mainProblem: "low webinar attendance",
        desiredOutcome: "fill their webinars with qualified leads",
        industry: "online education",
        person: "course creators",
    };

    const mockOfferData = {
        name: "Webinar Mastery Workshop",
        tagline: "Fill your webinars with eager buyers",
        promise: "Help course creators run profitable webinars",
        purpose: "Transform how educators attract and convert students",
    };

    const mockDeckSlides = [
        {
            slideNumber: 1,
            title: "Hook Statement",
            description: "The secret to high-converting webinars",
            section: "hook" as const,
        },
        {
            slideNumber: 2,
            title: "Problem Overview",
            description: "Why most webinars fail to convert",
            section: "problem" as const,
        },
        {
            slideNumber: 5,
            title: "Solution Framework",
            description: "Our proven 3-step process",
            section: "solution" as const,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createFullPageRegenerationPrompt", () => {
        it("should generate a complete prompt string", () => {
            const prompt = createFullPageRegenerationPrompt(
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toBeTruthy();
            expect(typeof prompt).toBe("string");
            expect(prompt.length).toBeGreaterThan(100);
        });

        it("should include registration framework guidelines", () => {
            const prompt = createFullPageRegenerationPrompt(
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain(
                "Universal Webinar Registration Landing Page Framework"
            );
            expect(prompt).toContain("Hero Header");
            expect(prompt).toContain("Sub-Header");
            expect(prompt).toContain("Social Proof Bar");
            expect(prompt).toContain("Agenda / What You'll Learn");
            expect(prompt).toContain("3-Step Transformation");
        });

        it("should include design system guidelines", () => {
            const prompt = createFullPageRegenerationPrompt(
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("Design system guidelines content");
            expect(prompt).toContain("Icon usage guidelines content");
        });

        it("should include intake data", () => {
            const prompt = createFullPageRegenerationPrompt(
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain(mockIntakeData.targetAudience);
            expect(prompt).toContain(mockIntakeData.businessNiche);
            expect(prompt).toContain(mockIntakeData.mainProblem);
            expect(prompt).toContain(mockIntakeData.desiredOutcome);
        });

        it("should include offer data", () => {
            const prompt = createFullPageRegenerationPrompt(
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain(mockOfferData.name);
            expect(prompt).toContain(mockOfferData.promise!);
            expect(prompt).toContain(mockOfferData.purpose!);
        });

        it("should include deck content", () => {
            const prompt = createFullPageRegenerationPrompt(
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain(mockDeckSlides[0].title);
            expect(prompt).toContain(mockDeckSlides[0].description);
        });

        it("should specify JSON response format", () => {
            const prompt = createFullPageRegenerationPrompt(
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("Return your response as a JSON object");
            expect(prompt).toContain("heroHeadline");
            expect(prompt).toContain("heroSubheadline");
            expect(prompt).toContain("agendaBullets");
            expect(prompt).toContain("threeStepProcess");
            expect(prompt).toContain("testimonials");
        });

        it("should include conversion requirements", () => {
            const prompt = createFullPageRegenerationPrompt(
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("conversion-optimized");
            expect(prompt).toContain("psychological principles");
            expect(prompt).toContain("getting registrations");
        });

        it("should use defaults for missing intake data", () => {
            const minimalIntake = {};

            const prompt = createFullPageRegenerationPrompt(
                minimalIntake,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("business owners");
            expect(prompt).toContain("achieve their goals");
            expect(prompt).toContain("challenges they face");
        });

        it("should handle null offer data", () => {
            const prompt = createFullPageRegenerationPrompt(
                mockIntakeData,
                null,
                mockDeckSlides
            );

            expect(prompt).toContain("Masterclass Training");
        });

        it("should limit deck slides to first 10", () => {
            const manySlides = Array.from({ length: 20 }, (_, i) => ({
                slideNumber: i + 1,
                title: `Slide ${i + 1}`,
                description: `Description ${i + 1}`,
                section: "solution" as const,
            }));

            const prompt = createFullPageRegenerationPrompt(
                mockIntakeData,
                mockOfferData,
                manySlides
            );

            expect(prompt).toContain("Slide 1");
            expect(prompt).toContain("Slide 10");
            expect(prompt).not.toContain("Slide 11");
        });

        it("should emphasize authentic voice", () => {
            const prompt = createFullPageRegenerationPrompt(
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("authentic voice");
            expect(prompt).toContain("not generic");
            expect(prompt).toContain("specific to their business");
        });
    });

    describe("createFieldRegenerationPrompt", () => {
        it("should generate a field-specific prompt", () => {
            const prompt = createFieldRegenerationPrompt(
                "hero-headline",
                "Current headline text",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toBeTruthy();
            expect(typeof prompt).toBe("string");
        });

        it("should include registration framework", () => {
            const prompt = createFieldRegenerationPrompt(
                "hero-headline",
                "Current headline",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain(
                "Universal Webinar Registration Landing Page Framework"
            );
        });

        it("should include business context", () => {
            const prompt = createFieldRegenerationPrompt(
                "hero-headline",
                "Current headline",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain(mockIntakeData.targetAudience);
            expect(prompt).toContain(mockIntakeData.businessNiche);
            expect(prompt).toContain(mockIntakeData.desiredOutcome);
        });

        it("should include field ID and current content", () => {
            const fieldId = "hero-subheadline";
            const currentContent = "Current subheadline text";

            const prompt = createFieldRegenerationPrompt(
                fieldId,
                currentContent,
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain(fieldId);
            expect(prompt).toContain(currentContent);
        });

        it("should provide specific guidance for hero-headline", () => {
            const prompt = createFieldRegenerationPrompt(
                "hero-headline",
                "Current headline",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("[Free] [Type of Event] For [Target Audience]");
        });

        it("should provide specific guidance for hero-subheadline", () => {
            const prompt = createFieldRegenerationPrompt(
                "hero-subheadline",
                "Current subheadline",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("[#] Steps To [Specific Desired Outcome]");
        });

        it("should provide specific guidance for sub-header", () => {
            const prompt = createFieldRegenerationPrompt(
                "sub-header",
                "Current sub-header",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("Discover how to");
            expect(prompt).toContain("transformation");
        });

        it("should provide specific guidance for social proof", () => {
            const prompt = createFieldRegenerationPrompt(
                "social-proof-stat",
                "Current stat",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("Impressive Metric");
            expect(prompt).toContain("real numbers");
        });

        it("should provide specific guidance for testimonials", () => {
            const prompt = createFieldRegenerationPrompt(
                "testimonial-quote",
                "Current testimonial",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("Working with [Name]");
            expect(prompt).toContain("specific outcomes");
        });

        it("should provide generic guidance for unknown fields", () => {
            const prompt = createFieldRegenerationPrompt(
                "unknown-field-id",
                "Current content",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("conversion-focused");
        });

        it("should request raw text output", () => {
            const prompt = createFieldRegenerationPrompt(
                "hero-headline",
                "Current headline",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("Return just the new text content");
            expect(prompt).toContain("no JSON");
            expect(prompt).toContain("text only");
        });

        it("should handle null offer data", () => {
            const prompt = createFieldRegenerationPrompt(
                "hero-headline",
                "Current headline",
                mockIntakeData,
                null,
                mockDeckSlides
            );

            expect(prompt).toContain("Masterclass Training");
        });

        it("should emphasize brand voice consistency", () => {
            const prompt = createFieldRegenerationPrompt(
                "cta-headline",
                "Current CTA",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("brand voice");
        });
    });

    describe("createSectionRegenerationPrompt", () => {
        it("should generate a section-specific prompt", () => {
            const prompt = createSectionRegenerationPrompt(
                "testimonials",
                "Current testimonial content",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toBeTruthy();
            expect(typeof prompt).toBe("string");
        });

        it("should include registration framework", () => {
            const prompt = createSectionRegenerationPrompt(
                "agenda",
                "Current agenda",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain(
                "Universal Webinar Registration Landing Page Framework"
            );
        });

        it("should include business context", () => {
            const prompt = createSectionRegenerationPrompt(
                "hero",
                "Current hero",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain(mockIntakeData.targetAudience);
            expect(prompt).toContain(mockIntakeData.businessNiche);
            expect(prompt).toContain(mockIntakeData.desiredOutcome);
        });

        it("should include section type and current content", () => {
            const sectionType = "three-step";
            const currentContent = "Current three-step content";

            const prompt = createSectionRegenerationPrompt(
                sectionType,
                currentContent,
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain(sectionType);
            expect(prompt).toContain(currentContent);
        });

        it("should request JSON response", () => {
            const prompt = createSectionRegenerationPrompt(
                "testimonials",
                "Current testimonials",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("Return a JSON object");
            expect(prompt).toContain("JSON only");
        });

        it("should specify structure examples for different sections", () => {
            const prompt = createSectionRegenerationPrompt(
                "hero",
                "Current hero",
                mockIntakeData,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain('For "hero"');
            expect(prompt).toContain("headline");
            expect(prompt).toContain("subheadline");
        });

        it("should handle null offer data", () => {
            const prompt = createSectionRegenerationPrompt(
                "agenda",
                "Current agenda",
                mockIntakeData,
                null,
                mockDeckSlides
            );

            expect(prompt).toContain("Masterclass Training");
        });

        it("should use default audience if not provided", () => {
            const minimalIntake = {};

            const prompt = createSectionRegenerationPrompt(
                "testimonials",
                "Current testimonials",
                minimalIntake,
                mockOfferData,
                mockDeckSlides
            );

            expect(prompt).toContain("business owners");
        });
    });
});
