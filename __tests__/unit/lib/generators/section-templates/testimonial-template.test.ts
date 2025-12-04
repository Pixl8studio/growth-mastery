/**
 * Testimonial Template Tests
 * Verify testimonial/quote section generation
 */

import { describe, it, expect, vi } from "vitest";
import { generateTestimonialTemplate } from "@/lib/generators/section-templates/testimonial-template";

// Mock the icon-mapper module
vi.mock("@/lib/utils/icon-mapper", () => ({
    getIconSvg: vi.fn((iconName: string) => `<svg data-icon="${iconName}"></svg>`),
}));

describe("Testimonial Template", () => {
    describe("generateTestimonialTemplate", () => {
        it("should generate valid HTML with default options", () => {
            const html = generateTestimonialTemplate();

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include section wrapper with proper attributes", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("<section");
            expect(html).toContain('class="block testimonial-section"');
            expect(html).toContain('data-block-type="quote"');
        });

        it("should include default quote", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("This program completely transformed");
        });

        it("should use custom quote when provided", () => {
            const customQuote = "Best investment I ever made";
            const html = generateTestimonialTemplate({ quote: customQuote });

            expect(html).toContain(customQuote);
        });

        it("should include default author", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("Sarah Johnson");
        });

        it("should use custom author when provided", () => {
            const customAuthor = "John Doe";
            const html = generateTestimonialTemplate({ author: customAuthor });

            expect(html).toContain(customAuthor);
        });

        it("should include default role", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("CEO");
        });

        it("should use custom role when provided", () => {
            const customRole = "Marketing Director";
            const html = generateTestimonialTemplate({ role: customRole });

            expect(html).toContain(customRole);
        });

        it("should include default company", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("TechStart Inc.");
        });

        it("should use custom company when provided", () => {
            const customCompany = "Acme Corp";
            const html = generateTestimonialTemplate({ company: customCompany });

            expect(html).toContain(customCompany);
        });

        it("should include quote icon from icon-mapper", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain('data-icon="message-square"');
            expect(html).toContain("svg");
        });

        it("should use blockquote element for quote", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("<blockquote");
            expect(html).toContain("</blockquote>");
        });

        it("should make quote editable", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain('data-editable="true"');
        });

        it("should make author editable", () => {
            const html = generateTestimonialTemplate();

            const editableCount = (html.match(/data-editable="true"/g) || []).length;
            expect(editableCount).toBeGreaterThanOrEqual(3);
        });

        it("should center text content", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("text-align: center");
        });

        it("should have white background", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("background: white");
        });

        it("should not have HTML syntax errors", () => {
            const html = generateTestimonialTemplate();

            const openSections = (html.match(/<section/g) || []).length;
            const closeSections = (html.match(/<\/section>/g) || []).length;

            expect(openSections).toBe(closeSections);
        });

        it("should use responsive container", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("max-width:");
        });

        it("should style blockquote with italics", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("font-style: italic");
        });

        it("should include quotation marks in quote", () => {
            const html = generateTestimonialTemplate();

            const blockquoteMatch = html.match(/<blockquote[^>]*>([^<]+)</);
            expect(blockquoteMatch).toBeTruthy();
            expect(blockquoteMatch![1]).toContain('"');
        });

        it("should handle all options simultaneously", () => {
            const html = generateTestimonialTemplate({
                quote: "Amazing results!",
                author: "Jane Smith",
                role: "Founder",
                company: "StartupCo",
            });

            expect(html).toContain("Amazing results!");
            expect(html).toContain("Jane Smith");
            expect(html).toContain("Founder");
            expect(html).toContain("StartupCo");
        });

        it("should apply proper spacing", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("margin-bottom:");
            expect(html).toContain("padding:");
        });

        it("should style author info section", () => {
            const html = generateTestimonialTemplate();

            expect(html).toContain("margin-top:");
        });
    });
});
