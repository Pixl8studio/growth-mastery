/**
 * Unit Tests for Slide Generator
 * Tests OpenAI response parsing, retry logic, timeout handling, and error handling
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
    generateSlideContent,
    generatePresentation,
    regenerateSlide,
    DeckStructureSlideSchema,
    DeckStructureSchema,
    BusinessProfileSchema,
    BrandDesignSchema,
    PresentationCustomizationSchema,
    type DeckStructureSlide,
    type DeckStructure,
    type PresentationCustomization,
} from "@/lib/presentations/slide-generator";

// Mock OpenAI
const mockOpenAICreate = vi.fn();
vi.mock("openai", () => ({
    default: class MockOpenAI {
        chat = {
            completions: {
                create: mockOpenAICreate,
            },
        };
    },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
    captureException: vi.fn(),
    addBreadcrumb: vi.fn(),
    startSpan: vi.fn((config, callback) =>
        callback({ setAttribute: vi.fn(), setStatus: vi.fn() })
    ),
    setMeasurement: vi.fn(),
}));

describe("Slide Generator", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Set up environment variable
        process.env.OPENAI_API_KEY = "test-api-key";
    });

    afterEach(() => {
        delete process.env.OPENAI_API_KEY;
    });

    describe("Zod Schema Validation", () => {
        describe("DeckStructureSlideSchema", () => {
            it("should validate valid slide structure", () => {
                const validSlide = {
                    slideNumber: 1,
                    title: "Introduction",
                    description: "Overview of the topic",
                    section: "Opening",
                };

                const result = DeckStructureSlideSchema.safeParse(validSlide);
                expect(result.success).toBe(true);
            });

            it("should reject invalid slide number", () => {
                const invalidSlide = {
                    slideNumber: 0, // Must be positive
                    title: "Test",
                    description: "Test",
                    section: "Test",
                };

                const result = DeckStructureSlideSchema.safeParse(invalidSlide);
                expect(result.success).toBe(false);
            });
        });

        describe("DeckStructureSchema", () => {
            it("should validate valid deck structure", () => {
                const validDeck = {
                    id: "deck-123",
                    title: "Test Presentation",
                    slideCount: 2,
                    slides: [
                        {
                            slideNumber: 1,
                            title: "Slide 1",
                            description: "Desc 1",
                            section: "Intro",
                        },
                        {
                            slideNumber: 2,
                            title: "Slide 2",
                            description: "Desc 2",
                            section: "Body",
                        },
                    ],
                };

                const result = DeckStructureSchema.safeParse(validDeck);
                expect(result.success).toBe(true);
            });
        });

        describe("BusinessProfileSchema", () => {
            it("should validate business profile with all fields", () => {
                const profile = {
                    business_name: "Test Corp",
                    target_audience: "Small businesses",
                    main_offer: "Marketing services",
                    unique_mechanism: "AI-powered",
                    brand_voice: "Professional",
                };

                const result = BusinessProfileSchema.safeParse(profile);
                expect(result.success).toBe(true);
            });

            it("should validate empty business profile", () => {
                const result = BusinessProfileSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("BrandDesignSchema", () => {
            it("should validate brand design", () => {
                const design = {
                    brand_name: "Test Brand",
                    primary_color: "#1a73e8",
                    secondary_color: "#4285f4",
                };

                const result = BrandDesignSchema.safeParse(design);
                expect(result.success).toBe(true);
            });
        });

        describe("PresentationCustomizationSchema", () => {
            it("should validate all customization options", () => {
                const customization = {
                    textDensity: "balanced",
                    visualStyle: "professional",
                    emphasisPreference: "balanced",
                    animationLevel: "subtle",
                    imageStyle: "photography",
                };

                const result = PresentationCustomizationSchema.safeParse(customization);
                expect(result.success).toBe(true);
            });

            it("should reject invalid text density", () => {
                const customization = {
                    textDensity: "invalid",
                    visualStyle: "professional",
                    emphasisPreference: "balanced",
                    animationLevel: "subtle",
                    imageStyle: "photography",
                };

                const result = PresentationCustomizationSchema.safeParse(customization);
                expect(result.success).toBe(false);
            });

            it("should validate all enum values", () => {
                const textDensities = ["minimal", "balanced", "detailed"] as const;
                const visualStyles = [
                    "professional",
                    "creative",
                    "minimal",
                    "bold",
                ] as const;
                const emphasisPreferences = ["text", "visuals", "balanced"] as const;
                const animationLevels = [
                    "none",
                    "subtle",
                    "moderate",
                    "dynamic",
                ] as const;
                const imageStyles = [
                    "photography",
                    "illustration",
                    "abstract",
                    "icons",
                ] as const;

                for (const textDensity of textDensities) {
                    for (const visualStyle of visualStyles) {
                        for (const emphasisPreference of emphasisPreferences) {
                            for (const animationLevel of animationLevels) {
                                for (const imageStyle of imageStyles) {
                                    const result =
                                        PresentationCustomizationSchema.safeParse({
                                            textDensity,
                                            visualStyle,
                                            emphasisPreference,
                                            animationLevel,
                                            imageStyle,
                                        });
                                    expect(result.success).toBe(true);
                                }
                            }
                        }
                    }
                }
            });
        });
    });

    describe("generateSlideContent", () => {
        const defaultDeckSlide: DeckStructureSlide = {
            slideNumber: 1,
            title: "Introduction",
            description: "Overview of the presentation",
            section: "Opening",
        };

        const defaultCustomization: PresentationCustomization = {
            textDensity: "balanced",
            visualStyle: "professional",
            emphasisPreference: "balanced",
            animationLevel: "subtle",
            imageStyle: "photography",
        };

        it("should generate slide content successfully", async () => {
            mockOpenAICreate.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                title: "Welcome & Introduction",
                                content: ["Key point 1", "Key point 2", "Key point 3"],
                                speakerNotes: "Start with a warm welcome",
                                imagePrompt: "Professional business meeting scene",
                            }),
                        },
                    },
                ],
            });

            const result = await generateSlideContent({
                deckSlide: defaultDeckSlide,
                customization: defaultCustomization,
            });

            expect(result.title).toBe("Welcome & Introduction");
            expect(result.content).toHaveLength(3);
            expect(result.speakerNotes).toBe("Start with a warm welcome");
            expect(result.slideNumber).toBe(1);
        });

        it("should use fallback content when OpenAI fails", async () => {
            mockOpenAICreate.mockRejectedValueOnce(new Error("API Error"));
            mockOpenAICreate.mockRejectedValueOnce(new Error("API Error"));
            mockOpenAICreate.mockRejectedValueOnce(new Error("API Error"));
            mockOpenAICreate.mockRejectedValueOnce(new Error("API Error"));

            const result = await generateSlideContent({
                deckSlide: defaultDeckSlide,
                customization: defaultCustomization,
            });

            // Should return fallback content
            expect(result.title).toBe(defaultDeckSlide.title);
            expect(result.content).toContain(defaultDeckSlide.description);
        });

        it("should determine correct layout type for title slide", async () => {
            mockOpenAICreate.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                title: "Title",
                                content: [],
                                speakerNotes: "",
                                imagePrompt: "",
                            }),
                        },
                    },
                ],
            });

            const result = await generateSlideContent({
                deckSlide: { ...defaultDeckSlide, slideNumber: 1 },
                customization: defaultCustomization,
                previousSlides: Array(10).fill({}),
            });

            expect(result.layoutType).toBe("title");
        });

        it("should determine CTA layout for last slide", async () => {
            mockOpenAICreate.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                title: "Call to Action",
                                content: [],
                                speakerNotes: "",
                                imagePrompt: "",
                            }),
                        },
                    },
                ],
            });

            const result = await generateSlideContent({
                deckSlide: { ...defaultDeckSlide, slideNumber: 10 },
                customization: defaultCustomization,
                previousSlides: Array(10).fill({}),
            });

            expect(result.layoutType).toBe("cta");
        });

        it("should handle invalid JSON from OpenAI", async () => {
            mockOpenAICreate.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: "not valid json",
                        },
                    },
                ],
            });

            // Should throw AIGenerationError for invalid JSON
            await expect(
                generateSlideContent({
                    deckSlide: defaultDeckSlide,
                    customization: defaultCustomization,
                })
            ).rejects.toThrow();
        });

        it("should handle empty response from OpenAI with fallback", async () => {
            // For empty content, after exhausting retries, the code provides fallback content
            // This is intentional graceful degradation
            mockOpenAICreate.mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: null,
                        },
                    },
                ],
            });

            // After retries fail, should return fallback content instead of throwing
            // This tests the graceful degradation behavior
            const result = await generateSlideContent({
                deckSlide: defaultDeckSlide,
                customization: defaultCustomization,
            });

            // Fallback should have original title and description
            expect(result.title).toBe(defaultDeckSlide.title);
            expect(result.content).toContain(defaultDeckSlide.description);
        });
    });

    describe("generatePresentation", () => {
        const createDeckStructure = (slideCount: number): DeckStructure => ({
            id: "deck-123",
            title: "Test Presentation",
            slideCount,
            slides: Array.from({ length: slideCount }, (_, i) => ({
                slideNumber: i + 1,
                title: `Slide ${i + 1}`,
                description: `Description for slide ${i + 1}`,
                section: i < slideCount / 2 ? "First Half" : "Second Half",
            })),
        });

        const defaultCustomization: PresentationCustomization = {
            textDensity: "balanced",
            visualStyle: "professional",
            emphasisPreference: "balanced",
            animationLevel: "subtle",
            imageStyle: "photography",
        };

        it("should generate all slides in order", async () => {
            const deckStructure = createDeckStructure(3);

            mockOpenAICreate.mockImplementation(async () => ({
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                title: "Generated Title",
                                content: ["Point 1", "Point 2"],
                                speakerNotes: "Notes",
                                imagePrompt: "Image description",
                            }),
                        },
                    },
                ],
            }));

            const progressCallback = vi.fn();

            const slides = await generatePresentation({
                deckStructure,
                customization: defaultCustomization,
                onSlideGenerated: progressCallback,
            });

            expect(slides).toHaveLength(3);
            expect(progressCallback).toHaveBeenCalledTimes(3);
            expect(slides[0].slideNumber).toBe(1);
            expect(slides[1].slideNumber).toBe(2);
            expect(slides[2].slideNumber).toBe(3);
        });

        it("should report progress correctly", async () => {
            const deckStructure = createDeckStructure(4);

            mockOpenAICreate.mockImplementation(async () => ({
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                title: "Title",
                                content: ["Content"],
                                speakerNotes: "",
                                imagePrompt: "",
                            }),
                        },
                    },
                ],
            }));

            const progressValues: number[] = [];

            await generatePresentation({
                deckStructure,
                customization: defaultCustomization,
                onSlideGenerated: (_, progress) => {
                    progressValues.push(progress);
                },
            });

            expect(progressValues).toEqual([25, 50, 75, 100]);
        });

        it("should timeout after specified duration", async () => {
            const deckStructure = createDeckStructure(10);

            // Mock slow API response
            mockOpenAICreate.mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(
                            () =>
                                resolve({
                                    choices: [
                                        {
                                            message: {
                                                content: JSON.stringify({
                                                    title: "Title",
                                                    content: [],
                                                    speakerNotes: "",
                                                    imagePrompt: "",
                                                }),
                                            },
                                        },
                                    ],
                                }),
                            100
                        )
                    )
            );

            // Set very short timeout
            await expect(
                generatePresentation({
                    deckStructure,
                    customization: defaultCustomization,
                    timeoutMs: 50, // 50ms timeout - will fail quickly
                })
            ).rejects.toThrow(/timed out/i);
        }, 10000);
    });

    describe("regenerateSlide", () => {
        const existingSlide = {
            slideNumber: 5,
            title: "Original Title",
            content: ["Original point 1", "Original point 2"],
            speakerNotes: "Original notes",
            layoutType: "bullets" as const,
            section: "Middle",
        };

        it("should regenerate slide with new content", async () => {
            mockOpenAICreate.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                title: "Updated Title",
                                content: ["New point 1", "New point 2", "New point 3"],
                                speakerNotes: "Updated notes",
                                imagePrompt: "New image prompt",
                            }),
                        },
                    },
                ],
            });

            const result = await regenerateSlide(
                existingSlide,
                "Make it more engaging"
            );

            expect(result.title).toBe("Updated Title");
            expect(result.content).toHaveLength(3);
            expect(result.speakerNotes).toBe("Updated notes");
            // Should preserve slideNumber and other properties
            expect(result.slideNumber).toBe(5);
            expect(result.layoutType).toBe("bullets");
            expect(result.section).toBe("Middle");
        });

        it("should throw error on API failure", async () => {
            mockOpenAICreate.mockRejectedValue(new Error("API Error"));

            await expect(
                regenerateSlide(existingSlide, "Make it better")
            ).rejects.toThrow();
        });
    });

    describe("API Key Validation", () => {
        it("should throw error when OPENAI_API_KEY is not set", async () => {
            delete process.env.OPENAI_API_KEY;

            // Reset the module to clear cached client
            vi.resetModules();

            // Re-import after resetting
            const { generateSlideContent: freshGenerate } = await import(
                "@/lib/presentations/slide-generator"
            );

            await expect(
                freshGenerate({
                    deckSlide: {
                        slideNumber: 1,
                        title: "Test",
                        description: "Test",
                        section: "Test",
                    },
                    customization: {
                        textDensity: "balanced",
                        visualStyle: "professional",
                        emphasisPreference: "balanced",
                        animationLevel: "subtle",
                        imageStyle: "photography",
                    },
                })
            ).rejects.toThrow(/OPENAI_API_KEY/i);
        });
    });
});
