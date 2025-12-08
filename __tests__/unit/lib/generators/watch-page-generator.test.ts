/**
 * Watch Page Generator Tests
 * Verify HTML generation with video player and engagement blocks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateWatchPageHTML } from "@/lib/generators/watch-page-generator";

// Mock the icon-mapper module
vi.mock("@/lib/utils/icon-mapper", () => ({
    getIconSvg: vi.fn((iconName: string) => `<svg data-icon="${iconName}"></svg>`),
}));

describe("Watch Page Generator", () => {
    const mockDeckStructure = {
        id: "deck-123",
        slides: [
            {
                slideNumber: 1,
                title: "Strategy #1",
                description: "How to scale your business using automation",
                section: "solution" as const,
            },
            {
                slideNumber: 2,
                title: "Strategy #2",
                description: "The framework for consistent growth",
                section: "solution" as const,
            },
            {
                slideNumber: 3,
                title: "Offer Details",
                description: "Get access to the complete system",
                section: "offer" as const,
            },
        ],
        metadata: {
            title: "Business Growth Masterclass",
        },
        total_slides: 25,
    };

    const mockTheme = {
        primary: "#2563eb",
        secondary: "#10b981",
        background: "#ffffff",
        text: "#1f2937",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateWatchPageHTML", () => {
        it("should generate valid HTML structure", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                theme: mockTheme,
            });

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include page-container wrapper", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain('<div class="page-container">');
        });

        it("should include protected video hero block", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain('data-block-type="video-hero"');
            expect(html).toContain('data-protected="true"');
            // Class name includes "hero-block" among other classes
            expect(html).toContain("hero-block");
        });

        it("should convert YouTube watch URLs to embed format with autoplay", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                theme: mockTheme,
            });

            expect(html).toContain("youtube.com/embed/dQw4w9WgXcQ");
            expect(html).toContain("autoplay=1");
            expect(html).toContain("mute=1");
            expect(html).toContain("rel=0");
            expect(html).toContain("modestbranding=1");
        });

        it("should convert short YouTube URLs to embed format", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://youtu.be/dQw4w9WgXcQ",
                theme: mockTheme,
            });

            expect(html).toContain("youtube.com/embed/dQw4w9WgXcQ");
            expect(html).toContain("autoplay=1");
        });

        it("should handle existing embed URLs", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?start=10",
                theme: mockTheme,
            });

            expect(html).toContain("youtube.com/embed/dQw4w9WgXcQ");
            expect(html).toContain("autoplay=1");
            expect(html).toContain("start=10");
        });

        it("should use custom headline if provided", () => {
            const customHeadline = "Watch This Exclusive Training Now";
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                headline: customHeadline,
                theme: mockTheme,
            });

            expect(html).toContain(customHeadline);
            expect(html).toContain('class="hero-title"');
        });

        it("should fallback to deck metadata title if no headline", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain(mockDeckStructure.metadata!.title!);
        });

        it("should include all required watch page blocks", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain('data-block-type="video-hero"');
            expect(html).toContain('data-block-type="progress"');
            expect(html).toContain('data-block-type="takeaways"');
            expect(html).toContain('data-block-type="cta"');
            expect(html).toContain('data-block-type="chat"');
        });

        it("should include video player with iframe", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain('class="video-container"');
            expect(html).toContain('data-element-type="video-player"');
            expect(html).toContain("<iframe");
            expect(html).toContain("allowfullscreen");
        });

        it("should include video progress bar", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain('class="video-progress"');
            expect(html).toContain('class="progress-bar"');
        });

        it("should extract takeaways from solution and offer sections", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain("Key Takeaways");
            expect(html).toContain(mockDeckStructure.slides[0].title);
            expect(html).toContain(mockDeckStructure.slides[0].description);
            expect(html).toContain('class="features-grid"');
        });

        it("should use default takeaways if no solution slides", () => {
            const emptyDeck = {
                ...mockDeckStructure,
                slides: [],
            };

            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: emptyDeck,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain("Strategy #1");
            expect(html).toContain("Strategy #2");
            expect(html).toContain("Strategy #3");
            expect(html).toContain("exact framework to identify");
        });

        it("should include progress stats section", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain('class="progress-stats"');
            expect(html).toContain("Training Complete");
            expect(html).toContain("Time Remaining");
            expect(html).toContain("Watching Live");
        });

        it("should include call to action section", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            // CTA headline may have <strong> tags around part of the text
            expect(html).toContain("Ready to");
            expect(html).toContain("Transform Your Business?");
            expect(html).toContain("GET INSTANT ACCESS NOW");
            expect(html).toContain('class="btn');
        });

        it("should include live chat placeholder", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain("Join the Live Discussion");
            expect(html).toContain('class="chat-placeholder"');
            expect(html).toContain('placeholder="Type your message..."');
        });

        it("should apply theme colors correctly", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain(mockTheme.primary);
            expect(html).toContain(mockTheme.secondary);
        });

        it("should include editable attributes on text elements", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            const editableCount = (html.match(/data-editable="true"/g) || []).length;
            expect(editableCount).toBeGreaterThan(15);
        });

        it("should include urgency messaging", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain("Limited time offer");
            expect(html).toContain("24 hours");
        });

        it("should use icons from icon-mapper", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            expect(html).toContain('data-icon="');
            expect(html).toContain("svg");
        });

        it("should not have HTML syntax errors", () => {
            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: mockDeckStructure,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            const openDivs = (html.match(/<div/g) || []).length;
            const closeDivs = (html.match(/<\/div>/g) || []).length;

            expect(openDivs).toBe(closeDivs);
        });

        it("should limit takeaways to 6 items", () => {
            const manySlidesDeck = {
                ...mockDeckStructure,
                slides: Array.from({ length: 15 }, (_, i) => ({
                    slideNumber: i + 1,
                    title: `Strategy #${i + 1}`,
                    description: `Description ${i + 1}`,
                    section: "solution" as const,
                })),
            };

            const html = generateWatchPageHTML({
                projectId: "project-123",
                deckStructure: manySlidesDeck,
                videoUrl: "https://www.youtube.com/watch?v=test123",
                theme: mockTheme,
            });

            const featureCards = (html.match(/class="feature-card"/g) || []).length;
            expect(featureCards).toBeLessThanOrEqual(6);
        });
    });
});
