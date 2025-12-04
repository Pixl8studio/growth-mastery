/**
 * Story Template Tests
 * Verify story/about section generation
 */

import { describe, it, expect } from "vitest";
import { generateStoryTemplate } from "@/lib/generators/section-templates/story-template";

describe("Story Template", () => {
    describe("generateStoryTemplate", () => {
        it("should generate valid HTML with default options", () => {
            const html = generateStoryTemplate();

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include section wrapper with proper attributes", () => {
            const html = generateStoryTemplate();

            expect(html).toContain("<section");
            expect(html).toContain('class="block story-section"');
            expect(html).toContain('data-block-type="story"');
        });

        it("should include default headline", () => {
            const html = generateStoryTemplate();

            expect(html).toContain("Our Mission");
        });

        it("should use custom headline when provided", () => {
            const customHeadline = "Our Story";
            const html = generateStoryTemplate({ headline: customHeadline });

            expect(html).toContain(customHeadline);
        });

        it("should render default paragraphs", () => {
            const html = generateStoryTemplate();

            expect(html).toContain("We started this company");
            expect(html).toContain("After years of trial and error");
        });

        it("should render custom paragraphs when provided", () => {
            const customParagraphs = [
                "First custom paragraph",
                "Second custom paragraph",
            ];

            const html = generateStoryTemplate({ paragraphs: customParagraphs });

            expect(html).toContain("First custom paragraph");
            expect(html).toContain("Second custom paragraph");
        });

        it("should make headline editable", () => {
            const html = generateStoryTemplate();

            expect(html).toContain("<h2");
            expect(html).toContain('data-editable="true"');
        });

        it("should make paragraphs editable", () => {
            const html = generateStoryTemplate();

            const editableCount = (html.match(/data-editable="true"/g) || []).length;
            expect(editableCount).toBeGreaterThanOrEqual(2);
        });

        it("should use two-column grid layout", () => {
            const html = generateStoryTemplate();

            expect(html).toContain("display: grid");
            expect(html).toContain("grid-template-columns: 1fr 1fr");
        });

        it("should include image placeholder", () => {
            const html = generateStoryTemplate();

            expect(html).toContain("[Image Placeholder]");
        });

        it("should have white background", () => {
            const html = generateStoryTemplate();

            expect(html).toContain("background: white");
        });

        it("should not have HTML syntax errors", () => {
            const html = generateStoryTemplate();

            const openSections = (html.match(/<section/g) || []).length;
            const closeSections = (html.match(/<\/section>/g) || []).length;

            expect(openSections).toBe(closeSections);
        });

        it("should use responsive container", () => {
            const html = generateStoryTemplate();

            expect(html).toContain("max-width:");
        });

        it("should handle single paragraph", () => {
            const singleParagraph = ["Just one paragraph"];
            const html = generateStoryTemplate({ paragraphs: singleParagraph });

            expect(html).toContain("Just one paragraph");
        });

        it("should handle many paragraphs", () => {
            const manyParagraphs = Array.from(
                { length: 5 },
                (_, i) => `Paragraph ${i + 1}`
            );

            const html = generateStoryTemplate({ paragraphs: manyParagraphs });

            expect(html).toContain("Paragraph 1");
            expect(html).toContain("Paragraph 5");
        });

        it("should apply proper spacing", () => {
            const html = generateStoryTemplate();

            expect(html).toContain("margin-bottom:");
            expect(html).toContain("padding:");
        });

        it("should style image placeholder", () => {
            const html = generateStoryTemplate();

            expect(html).toContain("aspect-ratio: 4/3");
            expect(html).toContain("border-radius");
        });

        it("should align items in grid", () => {
            const html = generateStoryTemplate();

            expect(html).toContain("align-items: center");
        });
    });
});
