/**
 * Unit Tests for PPTX Generator
 * Tests XML structure validation, color conversion, and PPTX generation
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import { describe, it, expect, vi } from "vitest";

import {
    generatePptx,
    SlideDataSchema,
    type SlideData,
    type BrandColors,
    type PresentationOptions,
} from "@/lib/presentations/pptx-generator";

// Mock logger to avoid console output in tests
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe("PPTX Generator", () => {
    // Valid slide data for testing
    const createValidSlide = (overrides: Partial<SlideData> = {}): SlideData => ({
        slideNumber: 1,
        title: "Test Slide",
        content: ["Bullet point 1", "Bullet point 2"],
        speakerNotes: "Speaker notes for this slide",
        layoutType: "bullets",
        section: "Introduction",
        ...overrides,
    });

    const defaultBrandColors: BrandColors = {
        primary: "#1a73e8",
        secondary: "#4285f4",
        accent: "#ea4335",
        background: "#ffffff",
        text: "#202124",
    };

    describe("SlideDataSchema validation", () => {
        it("should validate valid slide data", () => {
            const validSlide = createValidSlide();
            const result = SlideDataSchema.safeParse(validSlide);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(validSlide);
            }
        });

        it("should validate all layout types", () => {
            const layoutTypes = [
                "title",
                "section",
                "content_left",
                "content_right",
                "bullets",
                "quote",
                "statistics",
                "comparison",
                "process",
                "cta",
            ] as const;

            for (const layoutType of layoutTypes) {
                const slide = createValidSlide({ layoutType });
                const result = SlideDataSchema.safeParse(slide);

                expect(result.success).toBe(true);
            }
        });

        it("should reject invalid layout type", () => {
            const invalidSlide = {
                ...createValidSlide(),
                layoutType: "invalid_layout",
            };
            const result = SlideDataSchema.safeParse(invalidSlide);

            expect(result.success).toBe(false);
        });

        it("should reject negative slide number", () => {
            const invalidSlide = {
                ...createValidSlide(),
                slideNumber: -1,
            };
            const result = SlideDataSchema.safeParse(invalidSlide);

            expect(result.success).toBe(false);
        });

        it("should reject non-integer slide number", () => {
            const invalidSlide = {
                ...createValidSlide(),
                slideNumber: 1.5,
            };
            const result = SlideDataSchema.safeParse(invalidSlide);

            expect(result.success).toBe(false);
        });

        it("should accept optional imagePrompt", () => {
            const slideWithImage = createValidSlide({
                imagePrompt: "A professional business meeting",
            });
            const result = SlideDataSchema.safeParse(slideWithImage);

            expect(result.success).toBe(true);
        });

        it("should validate imageUrl as URL", () => {
            const slideWithUrl = createValidSlide({
                imageUrl: "https://example.com/image.png",
            });
            const result = SlideDataSchema.safeParse(slideWithUrl);

            expect(result.success).toBe(true);
        });

        it("should reject invalid imageUrl", () => {
            const slideWithInvalidUrl = {
                ...createValidSlide(),
                imageUrl: "not-a-url",
            };
            const result = SlideDataSchema.safeParse(slideWithInvalidUrl);

            expect(result.success).toBe(false);
        });

        it("should require content to be an array of strings", () => {
            const invalidSlide = {
                ...createValidSlide(),
                content: "not an array",
            };
            const result = SlideDataSchema.safeParse(invalidSlide);

            expect(result.success).toBe(false);
        });
    });

    describe("generatePptx", () => {
        it("should generate a valid PPTX blob", async () => {
            const options: PresentationOptions = {
                title: "Test Presentation",
                slides: [createValidSlide()],
                brandName: "Test Brand",
                brandColors: defaultBrandColors,
            };

            const blob = await generatePptx(options);

            expect(blob).toBeInstanceOf(Blob);
            // PPTX MIME type or generic application/zip are both valid
            expect([
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "application/zip",
            ]).toContain(blob.type);
        });

        it("should create PPTX with multiple slides", async () => {
            const options: PresentationOptions = {
                title: "Test Presentation",
                slides: [
                    createValidSlide({ slideNumber: 1 }),
                    createValidSlide({ slideNumber: 2 }),
                    createValidSlide({ slideNumber: 3 }),
                ],
            };

            const blob = await generatePptx(options);
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.size).toBeGreaterThan(0);
        });

        it("should create PPTX with speaker notes", async () => {
            const options: PresentationOptions = {
                title: "Test Presentation",
                slides: [
                    createValidSlide({
                        speakerNotes: "Important speaker note",
                    }),
                ],
            };

            const blob = await generatePptx(options);
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.size).toBeGreaterThan(0);
        });

        it("should use default brand colors when not provided", async () => {
            const options: PresentationOptions = {
                title: "Test Presentation",
                slides: [createValidSlide()],
            };

            const blob = await generatePptx(options);
            expect(blob).toBeInstanceOf(Blob);
        });

        it("should apply custom brand colors", async () => {
            const customColors: BrandColors = {
                primary: "#ff0000",
                secondary: "#00ff00",
                accent: "#0000ff",
                background: "#ffffff",
                text: "#000000",
            };

            const options: PresentationOptions = {
                title: "Test Presentation",
                slides: [createValidSlide()],
                brandColors: customColors,
            };

            const blob = await generatePptx(options);
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.size).toBeGreaterThan(0);
        });

        it("should handle special characters in content", async () => {
            const options: PresentationOptions = {
                title: "Test & Demo <Presentation>",
                slides: [
                    createValidSlide({
                        title: "Test & Title <with> 'special' \"chars\"",
                        content: [
                            "Bullet with & ampersand",
                            "Bullet with <angle brackets>",
                        ],
                    }),
                ],
            };

            // Should not throw - XML escaping should handle special chars
            const blob = await generatePptx(options);
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.size).toBeGreaterThan(0);
        });

        it("should handle different layout types correctly", async () => {
            const layoutTypes = [
                "title",
                "section",
                "bullets",
                "quote",
                "cta",
            ] as const;

            for (const layoutType of layoutTypes) {
                const options: PresentationOptions = {
                    title: "Test Presentation",
                    slides: [createValidSlide({ layoutType })],
                };

                const blob = await generatePptx(options);
                expect(blob).toBeInstanceOf(Blob);
            }
        });

        it("should handle empty content array", async () => {
            const options: PresentationOptions = {
                title: "Test Presentation",
                slides: [createValidSlide({ content: [] })],
            };

            const blob = await generatePptx(options);
            expect(blob).toBeInstanceOf(Blob);
        });

        it("should handle many slides efficiently", async () => {
            const slides = Array.from({ length: 20 }, (_, i) =>
                createValidSlide({ slideNumber: i + 1, title: `Slide ${i + 1}` })
            );

            const options: PresentationOptions = {
                title: "Large Presentation",
                slides,
            };

            const startTime = Date.now();
            const blob = await generatePptx(options);
            const endTime = Date.now();

            expect(blob).toBeInstanceOf(Blob);
            // Should complete in reasonable time (less than 5 seconds)
            expect(endTime - startTime).toBeLessThan(5000);
        });

        it("should generate valid PPTX blob with complete structure", async () => {
            const options: PresentationOptions = {
                title: "Complete Presentation",
                slides: [
                    createValidSlide({ slideNumber: 1, layoutType: "title" }),
                    createValidSlide({ slideNumber: 2, layoutType: "bullets" }),
                ],
                brandName: "Test Brand",
                brandColors: defaultBrandColors,
            };

            const blob = await generatePptx(options);

            // Verify it's a valid blob with content
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.size).toBeGreaterThan(1000); // Should have substantial content
            // PPTX MIME type or generic application/zip are both valid (depends on environment)
            expect([
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "application/zip",
            ]).toContain(blob.type);
        });

        it("should include all bullet points in generated XML for bullets layout", async () => {
            const JSZip = await import("jszip");

            const bulletContent = [
                "Crystal clarity on what investors actually fund in regenerative projects",
                "Unshakeable confidence to pitch without second-guessing your financial projections",
                "15-minute system for professional pitch decks and bulletproof business plans",
                "Direct pathway to aligned capital that shares your regenerative mission",
            ];

            const options: PresentationOptions = {
                title: "Test Presentation",
                slides: [
                    createValidSlide({
                        slideNumber: 1,
                        layoutType: "bullets",
                        title: "By Training's End, You'll Have These 4 Game-Changers",
                        content: bulletContent,
                    }),
                ],
                brandName: "Test Brand",
                brandColors: defaultBrandColors,
            };

            const blob = await generatePptx(options);

            // JSZip can load from Blob or Buffer directly
            const zip = await JSZip.default.loadAsync(blob);

            // Get the first slide XML
            const slideXml = await zip.file("ppt/slides/slide1.xml")?.async("string");
            expect(slideXml).toBeDefined();

            // Verify all bullet points are present in the XML
            for (const bullet of bulletContent) {
                expect(slideXml).toContain(bullet.replace(/&/g, "&amp;"));
            }

            // Count the number of bullet characters (&#8226;) - should match number of bullets
            const bulletCharMatches = slideXml?.match(/&#8226;/g);
            expect(bulletCharMatches?.length).toBe(bulletContent.length);
        });

        it("should include all bullet points in content_left layout", async () => {
            const JSZip = await import("jszip");

            const bulletContent = [
                "First important bullet point",
                "Second important bullet point",
                "Third important bullet point",
            ];

            const options: PresentationOptions = {
                title: "Test Presentation",
                slides: [
                    createValidSlide({
                        slideNumber: 1,
                        layoutType: "content_left",
                        title: "Content Left Layout",
                        content: bulletContent,
                    }),
                ],
            };

            const blob = await generatePptx(options);
            const zip = await JSZip.default.loadAsync(blob);
            const slideXml = await zip.file("ppt/slides/slide1.xml")?.async("string");

            expect(slideXml).toBeDefined();

            // Verify all bullet points are present
            for (const bullet of bulletContent) {
                expect(slideXml).toContain(bullet);
            }
        });
    });
});
