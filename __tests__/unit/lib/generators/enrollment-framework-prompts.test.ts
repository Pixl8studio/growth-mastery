/**
 * Enrollment Framework Prompts Tests
 * Verify AI prompt generation for enrollment pages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createFullPageEnrollmentPrompt,
    createEnrollmentFieldPrompt,
    createEnrollmentSectionPrompt,
} from "@/lib/generators/enrollment-framework-prompts";

// Mock design system guidelines
vi.mock("@/lib/ai/design-system-guidelines", () => ({
    DESIGN_SYSTEM_GUIDELINES: "Design system guidelines content",
    ICON_USAGE_GUIDELINES: "Icon usage guidelines content",
}));

describe("Enrollment Framework Prompts", () => {
    const mockOfferData = {
        id: "offer-123",
        name: "Business Accelerator Program",
        tagline: "Scale your business to 7 figures",
        description: "Complete system for rapid business growth",
        price: 2997,
        currency: "USD",
        promise: "Help entrepreneurs build million-dollar businesses",
        person: "business owners",
        process: "proven 90-day system",
        features: [
            {
                title: "Video Training",
                description: "50+ hours of content",
                value: "$5,000",
            },
            {
                title: "Templates",
                description: "Ready-to-use tools",
                value: "$2,000",
            },
        ],
        bonuses: ["Bonus 1: Extra training", "Bonus 2: Private community"],
        guarantee: "60-day money-back guarantee",
    };

    const mockIntakeData = {
        targetAudience: "entrepreneurs and business owners",
        businessNiche: "online business coaching",
        desiredOutcome: "scale to 7 figures",
    };

    const mockDeckSlides = [
        {
            slideNumber: 1,
            title: "Problem Statement",
            description: "Most businesses struggle with scaling",
            section: "problem" as const,
        },
        {
            slideNumber: 2,
            title: "Solution Overview",
            description: "Our proven framework solves this",
            section: "solution" as const,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createFullPageEnrollmentPrompt", () => {
        it("should generate a complete prompt string", () => {
            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toBeTruthy();
            expect(typeof prompt).toBe("string");
            expect(prompt.length).toBeGreaterThan(100);
        });

        it("should include enrollment framework guidelines", () => {
            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain("Enrollment Page Universal Framework");
            expect(prompt).toContain("BOTTOM-OF-FUNNEL");
            expect(prompt).toContain("Hero Section");
            expect(prompt).toContain("Video Intro Section");
            expect(prompt).toContain("Core Features Section");
        });

        it("should include design system guidelines", () => {
            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain("Design system guidelines content");
            expect(prompt).toContain("Icon usage guidelines content");
        });

        it("should include offer details", () => {
            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain(mockOfferData.name);
            expect(prompt).toContain(mockOfferData.price.toString());
            expect(prompt).toContain(mockOfferData.currency);
            expect(prompt).toContain(mockOfferData.tagline!);
            expect(prompt).toContain(mockOfferData.promise!);
        });

        it("should include features with values", () => {
            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain(mockOfferData.features![0].title);
            expect(prompt).toContain(mockOfferData.features![0].description);
            expect(prompt).toContain(mockOfferData.features![0].value!);
        });

        it("should include bonuses", () => {
            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain(mockOfferData.bonuses![0]);
            expect(prompt).toContain(mockOfferData.bonuses![1]);
        });

        it("should include guarantee information", () => {
            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain(mockOfferData.guarantee!);
        });

        it("should include deck content for proof points", () => {
            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain(mockDeckSlides[0].title);
            expect(prompt).toContain(mockDeckSlides[0].description);
        });

        it("should include target audience from intake", () => {
            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain(mockIntakeData.targetAudience);
            expect(prompt).toContain(mockIntakeData.businessNiche);
        });

        it("should specify JSON response format", () => {
            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain("Return your response as a JSON object");
            expect(prompt).toContain("heroAudienceLine");
            expect(prompt).toContain("heroHeadline");
            expect(prompt).toContain("features");
            expect(prompt).toContain("testimonials");
            expect(prompt).toContain("valueStackItems");
        });

        it("should include critical requirements for bottom-of-funnel", () => {
            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain("URGENCY");
            expect(prompt).toContain("PROOF");
            expect(prompt).toContain("PURCHASE CLARITY");
            expect(prompt).toContain("FOMO");
        });

        it("should use defaults for missing intake data", () => {
            const minimalIntake = {};

            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                minimalIntake,
                mockDeckSlides
            );

            expect(prompt).toContain("entrepreneurs");
            expect(prompt).toContain("transform their business");
        });

        it("should handle offers without features", () => {
            const offerNoFeatures = { ...mockOfferData, features: undefined };

            const prompt = createFullPageEnrollmentPrompt(
                offerNoFeatures,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain("Core training program");
        });

        it("should handle offers without bonuses", () => {
            const offerNoBonuses = { ...mockOfferData, bonuses: undefined };

            const prompt = createFullPageEnrollmentPrompt(
                offerNoBonuses,
                mockIntakeData,
                mockDeckSlides
            );

            expect(prompt).toContain("Exclusive bonus materials");
        });

        it("should limit deck slides to first 8", () => {
            const manySlides = Array.from({ length: 20 }, (_, i) => ({
                slideNumber: i + 1,
                title: `Slide ${i + 1}`,
                description: `Description ${i + 1}`,
                section: "solution" as const,
            }));

            const prompt = createFullPageEnrollmentPrompt(
                mockOfferData,
                mockIntakeData,
                manySlides
            );

            expect(prompt).toContain("Slide 1");
            expect(prompt).toContain("Slide 8");
            expect(prompt).not.toContain("Slide 9");
        });
    });

    describe("createEnrollmentFieldPrompt", () => {
        it("should generate a field-specific prompt", () => {
            const prompt = createEnrollmentFieldPrompt(
                "hero-headline",
                "Current headline text",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toBeTruthy();
            expect(typeof prompt).toBe("string");
        });

        it("should include enrollment framework", () => {
            const prompt = createEnrollmentFieldPrompt(
                "hero-headline",
                "Current headline",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain("Enrollment Page Universal Framework");
        });

        it("should include offer context", () => {
            const prompt = createEnrollmentFieldPrompt(
                "hero-headline",
                "Current headline",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain(mockOfferData.name);
            expect(prompt).toContain(mockOfferData.price.toString());
            expect(prompt).toContain(mockOfferData.currency);
        });

        it("should include field ID and current content", () => {
            const fieldId = "hero-tagline";
            const currentContent = "Current tagline text";

            const prompt = createEnrollmentFieldPrompt(
                fieldId,
                currentContent,
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain(fieldId);
            expect(prompt).toContain(currentContent);
        });

        it("should provide specific guidance for hero-headline", () => {
            const prompt = createEnrollmentFieldPrompt(
                "hero-headline",
                "Current headline",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain("Bold transformation headline");
            expect(prompt).toContain("Transform outcome");
        });

        it("should provide specific guidance for features", () => {
            const prompt = createEnrollmentFieldPrompt(
                "features-title",
                "Current feature",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain("Memorable feature title");
            expect(prompt).toContain("transformation");
        });

        it("should provide specific guidance for urgency", () => {
            const prompt = createEnrollmentFieldPrompt(
                "urgency-text",
                "Current urgency",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain("FOMO");
            expect(prompt).toContain("deadline");
        });

        it("should provide generic guidance for unknown fields", () => {
            const prompt = createEnrollmentFieldPrompt(
                "unknown-field-id",
                "Current content",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain("sales-focused");
            expect(prompt).toContain("bottom-of-funnel");
        });

        it("should request raw text output", () => {
            const prompt = createEnrollmentFieldPrompt(
                "hero-headline",
                "Current headline",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain("Return just the new text content");
            expect(prompt).toContain("no JSON");
        });

        it("should emphasize PURCHASING over learning", () => {
            const prompt = createEnrollmentFieldPrompt(
                "cta-button",
                "Current CTA",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain("PURCHASING");
            expect(prompt).toContain("direct");
            expect(prompt).toContain("urgent");
        });
    });

    describe("createEnrollmentSectionPrompt", () => {
        it("should generate a section-specific prompt", () => {
            const prompt = createEnrollmentSectionPrompt(
                "testimonials",
                "Current testimonial content",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toBeTruthy();
            expect(typeof prompt).toBe("string");
        });

        it("should include enrollment framework", () => {
            const prompt = createEnrollmentSectionPrompt(
                "features",
                "Current features",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain("Enrollment Page Universal Framework");
        });

        it("should include offer context", () => {
            const prompt = createEnrollmentSectionPrompt(
                "features",
                "Current features",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain(mockOfferData.name);
            expect(prompt).toContain(mockOfferData.price.toString());
        });

        it("should include section type and current content", () => {
            const sectionType = "value-stack";
            const currentContent = "Current value stack content";

            const prompt = createEnrollmentSectionPrompt(
                sectionType,
                currentContent,
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain(sectionType);
            expect(prompt).toContain(currentContent);
        });

        it("should request JSON response", () => {
            const prompt = createEnrollmentSectionPrompt(
                "features",
                "Current features",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain("Return a JSON object");
            expect(prompt).toContain("JSON only");
        });

        it("should emphasize bottom-of-funnel principles", () => {
            const prompt = createEnrollmentSectionPrompt(
                "urgency",
                "Current urgency",
                mockOfferData,
                mockIntakeData
            );

            expect(prompt).toContain("BOTTOM-OF-FUNNEL");
            expect(prompt).toContain("Urgency and scarcity");
            expect(prompt).toContain("Proof and credibility");
            expect(prompt).toContain("FOMO");
        });

        it("should use default audience if not provided", () => {
            const minimalIntake = {};

            const prompt = createEnrollmentSectionPrompt(
                "features",
                "Current features",
                mockOfferData,
                minimalIntake
            );

            expect(prompt).toContain("entrepreneurs");
        });
    });
});
