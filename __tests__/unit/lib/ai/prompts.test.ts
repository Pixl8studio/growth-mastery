/**
 * AI Prompts Unit Tests
 * Test AI prompt generation
 */

import { describe, it, expect } from "vitest";
import {
    createDeckStructurePrompt,
    createOfferGenerationPrompt,
    createEnrollmentCopyPrompt,
    createTalkTrackPrompt,
    createRegistrationCopyPrompt,
    createWatchPageCopyPrompt,
} from "@/lib/ai/prompts";

describe("AI Prompts", () => {
    const mockTranscript = {
        transcript_text: "This is a test transcript about a business coaching program.",
        extracted_data: { businessName: "Test Business" },
    };

    describe("createDeckStructurePrompt", () => {
        it("should create valid prompt messages", () => {
            const messages = createDeckStructurePrompt(mockTranscript);

            expect(messages).toHaveLength(2);
            expect(messages[0].role).toBe("system");
            expect(messages[1].role).toBe("user");
            expect(messages[1].content).toContain(mockTranscript.transcript_text);
        });
    });

    describe("createOfferGenerationPrompt", () => {
        it("should create valid prompt messages", () => {
            const messages = createOfferGenerationPrompt(mockTranscript);

            expect(messages).toHaveLength(2);
            expect(messages[0].role).toBe("system");
            expect(messages[1].role).toBe("user");
            expect(messages[1].content).toContain("TRANSCRIPT");
        });
    });

    describe("createEnrollmentCopyPrompt", () => {
        it("should create prompt for direct purchase", () => {
            const offer = {
                name: "Test Program",
                tagline: "Transform your business",
                features: ["Feature 1", "Feature 2"],
                bonuses: ["Bonus 1"],
                guarantee: "30-day guarantee",
            };

            const messages = createEnrollmentCopyPrompt(
                offer,
                mockTranscript,
                "direct_purchase"
            );

            expect(messages).toHaveLength(2);
            expect(messages[1].content).toContain("direct purchase");
        });

        it("should create prompt for book call", () => {
            const offer = {
                name: "Test Program",
                features: ["Feature 1"],
            };

            const messages = createEnrollmentCopyPrompt(
                offer,
                mockTranscript,
                "book_call"
            );

            expect(messages).toHaveLength(2);
            expect(messages[1].content).toContain("book call");
        });
    });

    describe("createTalkTrackPrompt", () => {
        it("should create valid prompt with slides", () => {
            const slides = [
                {
                    slideNumber: 1,
                    title: "Hook",
                    description: "Intro",
                    section: "hook",
                },
                {
                    slideNumber: 2,
                    title: "Problem",
                    description: "Pain point",
                    section: "problem",
                },
            ];

            const messages = createTalkTrackPrompt(slides);

            expect(messages).toHaveLength(2);
            expect(messages[1].content).toContain("2-slide deck");
        });
    });

    describe("createRegistrationCopyPrompt", () => {
        it("should create prompt with project info", () => {
            const projectInfo = {
                name: "Test Funnel",
                niche: "Business Coaching",
                targetAudience: "Entrepreneurs",
            };

            const messages = createRegistrationCopyPrompt(projectInfo);

            expect(messages).toHaveLength(2);
            expect(messages[1].content).toContain(projectInfo.name);
            expect(messages[1].content).toContain(projectInfo.niche);
        });

        it("should include deck slides if provided", () => {
            const projectInfo = { name: "Test" };
            const slides = [
                { title: "Slide 1", description: "Desc 1" },
                { title: "Slide 2", description: "Desc 2" },
            ];

            const messages = createRegistrationCopyPrompt(projectInfo, slides);

            expect(messages[1].content).toContain("KEY TOPICS");
            expect(messages[1].content).toContain("Slide 1");
        });
    });

    describe("createWatchPageCopyPrompt", () => {
        it("should create prompt with project info", () => {
            const projectInfo = {
                name: "Test Funnel",
                niche: "Sales Training",
            };

            const messages = createWatchPageCopyPrompt(projectInfo, 900);

            expect(messages).toHaveLength(2);
            expect(messages[1].content).toContain("15 minutes");
        });
    });
});
