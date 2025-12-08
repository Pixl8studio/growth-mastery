/**
 * FAQ Template Tests
 * Verify FAQ section generation with collapsible items
 */

import { describe, it, expect, vi } from "vitest";
import { generateFAQTemplate } from "@/lib/generators/section-templates/faq-template";

// Mock the icon-mapper module
vi.mock("@/lib/utils/icon-mapper", () => ({
    getIconSvg: vi.fn((iconName: string) => `<svg data-icon="${iconName}"></svg>`),
}));

describe("FAQ Template", () => {
    describe("generateFAQTemplate", () => {
        it("should generate valid HTML with default options", () => {
            const html = generateFAQTemplate();

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include section wrapper with proper attributes", () => {
            const html = generateFAQTemplate();

            expect(html).toContain("<section");
            expect(html).toContain('class="block faq-section"');
            expect(html).toContain('data-block-type="faq"');
        });

        it("should include default section title", () => {
            const html = generateFAQTemplate();

            expect(html).toContain("Frequently Asked Questions");
            expect(html).toContain('data-editable="true"');
        });

        it("should use custom section title when provided", () => {
            const customTitle = "Common Questions";
            const html = generateFAQTemplate({ sectionTitle: customTitle });

            expect(html).toContain(customTitle);
            expect(html).not.toContain("Frequently Asked Questions");
        });

        it("should render default FAQ items", () => {
            const html = generateFAQTemplate();

            expect(html).toContain("How long does it take to see results?");
            expect(html).toContain("Is this right for my business?");
            expect(html).toContain("What kind of support do I get?");
        });

        it("should render custom FAQ items when provided", () => {
            const customItems = [
                {
                    question: "What is included?",
                    answer: "All modules and bonuses",
                },
                {
                    question: "Is there a refund policy?",
                    answer: "Yes, 30-day guarantee",
                },
            ];

            const html = generateFAQTemplate({ items: customItems });

            expect(html).toContain("What is included?");
            expect(html).toContain("All modules and bonuses");
            expect(html).toContain("Is there a refund policy?");
            expect(html).toContain("Yes, 30-day guarantee");
        });

        it("should include FAQ item wrapper for each item", () => {
            const html = generateFAQTemplate();

            expect(html).toContain('class="faq-item"');
            const faqItems = (html.match(/class="faq-item"/g) || []).length;
            expect(faqItems).toBe(3); // Default has 3 items
        });

        it("should add data-faq-index to each item", () => {
            const html = generateFAQTemplate();

            expect(html).toContain('data-faq-index="0"');
            expect(html).toContain('data-faq-index="1"');
            expect(html).toContain('data-faq-index="2"');
        });

        it("should include icons from icon-mapper", () => {
            const html = generateFAQTemplate();

            expect(html).toContain('data-icon="help-circle"');
            expect(html).toContain("svg");
        });

        it("should make questions editable", () => {
            const html = generateFAQTemplate();

            const questionElements = html.match(/<h3[^>]*data-editable="true"[^>]*>/g);
            expect(questionElements).toBeTruthy();
            expect(questionElements!.length).toBeGreaterThanOrEqual(3);
        });

        it("should make answers editable", () => {
            const html = generateFAQTemplate();

            expect(html).toContain('class="faq-answer"');
            expect(html).toContain('data-editable="true"');
        });

        it("should hide answers by default", () => {
            const html = generateFAQTemplate();

            expect(html).toContain("display: none");
        });

        it("should include proper styling for FAQ items", () => {
            const html = generateFAQTemplate();

            expect(html).toContain("background: white");
            expect(html).toContain("border-radius");
            expect(html).toContain("box-shadow");
            expect(html).toContain("cursor: pointer");
        });

        it("should have gradient background for section", () => {
            const html = generateFAQTemplate();

            expect(html).toContain("linear-gradient");
            expect(html).toContain("background:");
        });

        it("should use responsive container", () => {
            const html = generateFAQTemplate();

            expect(html).toContain("max-width:");
        });

        it("should not have HTML syntax errors", () => {
            const html = generateFAQTemplate();

            const openSections = (html.match(/<section/g) || []).length;
            const closeSections = (html.match(/<\/section>/g) || []).length;

            expect(openSections).toBe(closeSections);
        });

        it("should handle empty items array", () => {
            const html = generateFAQTemplate({ items: [] });

            expect(html).toBeTruthy();
            expect(html).toContain("faq-section");
        });

        it("should render multiple custom items correctly", () => {
            const customItems = [
                { question: "Q1", answer: "A1" },
                { question: "Q2", answer: "A2" },
                { question: "Q3", answer: "A3" },
                { question: "Q4", answer: "A4" },
            ];

            const html = generateFAQTemplate({ items: customItems });

            expect(html).toContain("Q1");
            expect(html).toContain("Q2");
            expect(html).toContain("Q3");
            expect(html).toContain("Q4");

            const faqItems = (html.match(/class="faq-item"/g) || []).length;
            expect(faqItems).toBe(4);
        });

        it("should include FAQ list wrapper", () => {
            const html = generateFAQTemplate();

            expect(html).toContain('class="faq-list"');
        });

        it("should apply proper spacing between items", () => {
            const html = generateFAQTemplate();

            expect(html).toContain("margin-bottom:");
            expect(html).toContain("padding:");
        });
    });
});
