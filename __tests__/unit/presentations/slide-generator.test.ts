/**
 * Tests for Slide Generator
 * Related: GitHub Issue #327 - Enhanced Presentation Generator
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock OpenAI
vi.mock("openai", () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: vi.fn().mockResolvedValue({
                        choices: [
                            {
                                message: {
                                    content: JSON.stringify({
                                        title: "Test Slide Title",
                                        content: ["Point 1", "Point 2", "Point 3"],
                                        speakerNotes: "Test speaker notes",
                                        imagePrompt: "A professional business image",
                                    }),
                                },
                            },
                        ],
                    }),
                },
            },
        })),
    };
});

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
    startSpan: vi.fn(async (_: object, callback: () => Promise<unknown>) => callback()),
    captureException: vi.fn(),
    setMeasurement: vi.fn(),
    addBreadcrumb: vi.fn(),
}));

// Mock environment
vi.stubEnv("OPENAI_API_KEY", "test-api-key");

describe("Slide Generator", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateSlideContent", () => {
        it("should generate slide content with correct structure", async () => {
            const { generateSlideContent } = await import(
                "@/lib/presentations/slide-generator"
            );

            const result = await generateSlideContent({
                deckSlide: {
                    slideNumber: 1,
                    title: "Introduction",
                    description: "Welcome slide",
                    section: "connect",
                },
                customization: {
                    textDensity: "balanced",
                    visualStyle: "professional",
                    emphasisPreference: "balanced",
                    animationLevel: "subtle",
                    imageStyle: "photography",
                },
            });

            expect(result).toHaveProperty("slideNumber", 1);
            expect(result).toHaveProperty("title");
            expect(result).toHaveProperty("content");
            expect(Array.isArray(result.content)).toBe(true);
            expect(result).toHaveProperty("speakerNotes");
            expect(result).toHaveProperty("layoutType");
        });

        it("should determine layout type based on slide position", async () => {
            const { generateSlideContent } = await import(
                "@/lib/presentations/slide-generator"
            );

            // First slide should be title layout
            const firstSlide = await generateSlideContent({
                deckSlide: {
                    slideNumber: 1,
                    title: "Welcome",
                    description: "Introduction",
                    section: "connect",
                },
                customization: {
                    textDensity: "balanced",
                    visualStyle: "professional",
                    emphasisPreference: "balanced",
                    animationLevel: "subtle",
                    imageStyle: "photography",
                },
                previousSlides: [],
            });

            expect(firstSlide.layoutType).toBe("title");
        });
    });

    describe("generatePresentation", () => {
        it("should generate all slides with progress callbacks", async () => {
            const { generatePresentation } = await import(
                "@/lib/presentations/slide-generator"
            );

            const progressUpdates: { slideNumber: number; progress: number }[] = [];

            const slides = await generatePresentation({
                deckStructure: {
                    id: "test-deck-1",
                    title: "Test Presentation",
                    slideCount: 3,
                    slides: [
                        { slideNumber: 1, title: "Intro", description: "Welcome", section: "connect" },
                        { slideNumber: 2, title: "Main", description: "Content", section: "teach" },
                        { slideNumber: 3, title: "End", description: "Call to action", section: "invite" },
                    ],
                },
                customization: {
                    textDensity: "balanced",
                    visualStyle: "professional",
                    emphasisPreference: "balanced",
                    animationLevel: "subtle",
                    imageStyle: "photography",
                },
                onSlideGenerated: (slide, progress) => {
                    progressUpdates.push({ slideNumber: slide.slideNumber, progress });
                },
            });

            expect(slides).toHaveLength(3);
            expect(progressUpdates).toHaveLength(3);
            expect(progressUpdates[progressUpdates.length - 1]?.progress).toBe(100);
        });
    });

    describe("regenerateSlide", () => {
        it("should regenerate slide with custom instruction", async () => {
            const { regenerateSlide } = await import(
                "@/lib/presentations/slide-generator"
            );

            const originalSlide = {
                slideNumber: 1,
                title: "Original Title",
                content: ["Original point"],
                speakerNotes: "Original notes",
                layoutType: "bullets" as const,
                section: "connect",
            };

            const result = await regenerateSlide(
                originalSlide,
                "Make this more concise"
            );

            expect(result).toHaveProperty("slideNumber", 1);
            expect(result).toHaveProperty("title");
            expect(result).toHaveProperty("content");
        });
    });
});

describe("Presentation Customization", () => {
    it("should apply text density settings correctly", async () => {
        const { generateSlideContent } = await import(
            "@/lib/presentations/slide-generator"
        );

        const minimalSlide = await generateSlideContent({
            deckSlide: {
                slideNumber: 2,
                title: "Test",
                description: "Test description",
                section: "teach",
            },
            customization: {
                textDensity: "minimal",
                visualStyle: "professional",
                emphasisPreference: "balanced",
                animationLevel: "subtle",
                imageStyle: "photography",
            },
        });

        // Minimal should have fewer content points
        expect(minimalSlide.content.length).toBeLessThanOrEqual(5);
    });
});
