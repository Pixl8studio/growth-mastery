/**
 * CTA Template Tests
 * Verify call-to-action section generation
 */

import { describe, it, expect } from "vitest";
import { generateCTATemplate } from "@/lib/generators/section-templates/cta-template";

describe("CTA Template", () => {
    describe("generateCTATemplate", () => {
        it("should generate valid HTML with default options", () => {
            const html = generateCTATemplate();

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include section wrapper with proper attributes", () => {
            const html = generateCTATemplate();

            expect(html).toContain('<section');
            expect(html).toContain('class="block cta-section"');
            expect(html).toContain('data-block-type="cta"');
        });

        it("should include default headline", () => {
            const html = generateCTATemplate();

            expect(html).toContain("Ready to Get Started?");
            expect(html).toContain('data-editable="true"');
        });

        it("should include default description", () => {
            const html = generateCTATemplate();

            expect(html).toContain("Join thousands of successful entrepreneurs");
            expect(html).toContain('data-editable="true"');
        });

        it("should include default button text", () => {
            const html = generateCTATemplate();

            expect(html).toContain("Start Your Journey Today");
            expect(html).toContain('class="btn"');
        });

        it("should use custom headline when provided", () => {
            const customHeadline = "Transform Your Business Today";
            const html = generateCTATemplate({ headline: customHeadline });

            expect(html).toContain(customHeadline);
            expect(html).not.toContain("Ready to Get Started?");
        });

        it("should use custom description when provided", () => {
            const customDescription = "Join our exclusive program now";
            const html = generateCTATemplate({ description: customDescription });

            expect(html).toContain(customDescription);
        });

        it("should use custom button text when provided", () => {
            const customButtonText = "Join Now";
            const html = generateCTATemplate({ buttonText: customButtonText });

            expect(html).toContain(customButtonText);
        });

        it("should apply custom theme color", () => {
            const customTheme = { primary: "#ff0000" };
            const html = generateCTATemplate({ theme: customTheme });

            expect(html).toContain(customTheme.primary);
        });

        it("should use default theme if not provided", () => {
            const html = generateCTATemplate();

            expect(html).toContain("hsl(103 89% 29%)");
        });

        it("should have gradient background", () => {
            const html = generateCTATemplate();

            expect(html).toContain("linear-gradient");
            expect(html).toContain("background:");
        });

        it("should center text content", () => {
            const html = generateCTATemplate();

            expect(html).toContain("text-align: center");
        });

        it("should include proper spacing", () => {
            const html = generateCTATemplate();

            expect(html).toContain("padding:");
            expect(html).toContain("margin:");
        });

        it("should make all text elements editable", () => {
            const html = generateCTATemplate();

            const editableCount = (html.match(/data-editable="true"/g) || []).length;
            expect(editableCount).toBeGreaterThanOrEqual(3);
        });

        it("should apply button styling", () => {
            const html = generateCTATemplate();

            expect(html).toContain("border-radius");
            expect(html).toContain("font-weight");
            expect(html).toContain("cursor: pointer");
        });

        it("should not have HTML syntax errors", () => {
            const html = generateCTATemplate();

            const openTags = (html.match(/<section/g) || []).length;
            const closeTags = (html.match(/<\/section>/g) || []).length;

            expect(openTags).toBe(closeTags);
        });

        it("should handle all options simultaneously", () => {
            const html = generateCTATemplate({
                headline: "Custom Headline",
                description: "Custom Description",
                buttonText: "Custom Button",
                theme: { primary: "#123456" },
            });

            expect(html).toContain("Custom Headline");
            expect(html).toContain("Custom Description");
            expect(html).toContain("Custom Button");
            expect(html).toContain("#123456");
        });

        it("should use responsive container", () => {
            const html = generateCTATemplate();

            expect(html).toContain("max-width:");
        });
    });
});
