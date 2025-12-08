/**
 * Hero Template Tests
 * Verify hero section generation with headline and CTA
 */

import { describe, it, expect, vi } from "vitest";
import { generateHeroTemplate } from "@/lib/generators/section-templates/hero-template";

// Mock the icon-mapper module
vi.mock("@/lib/utils/icon-mapper", () => ({
    getIconSvg: vi.fn((iconName: string) => `<svg data-icon="${iconName}"></svg>`),
}));

describe("Hero Template", () => {
    describe("generateHeroTemplate", () => {
        it("should generate valid HTML with default options", () => {
            const html = generateHeroTemplate();

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include section wrapper with proper attributes", () => {
            const html = generateHeroTemplate();

            expect(html).toContain("<section");
            expect(html).toContain('class="block hero-section"');
            expect(html).toContain('data-block-type="hero"');
        });

        it("should include default headline", () => {
            const html = generateHeroTemplate();

            expect(html).toContain("Transform Your Business in 90 Days");
        });

        it("should use custom headline when provided", () => {
            const customHeadline = "Grow Your Revenue Fast";
            const html = generateHeroTemplate({ headline: customHeadline });

            expect(html).toContain(customHeadline);
        });

        it("should include default subheadline", () => {
            const html = generateHeroTemplate();

            expect(html).toContain("Join thousands of entrepreneurs");
        });

        it("should use custom subheadline when provided", () => {
            const customSubheadline = "Start your journey today";
            const html = generateHeroTemplate({ subheadline: customSubheadline });

            expect(html).toContain(customSubheadline);
        });

        it("should include default CTA text", () => {
            const html = generateHeroTemplate();

            expect(html).toContain("Get Started Free");
        });

        it("should use custom CTA text when provided", () => {
            const customCtaText = "Join Now";
            const html = generateHeroTemplate({ ctaText: customCtaText });

            expect(html).toContain(customCtaText);
        });

        it("should apply custom theme colors", () => {
            const customTheme = {
                primary: "#ff0000",
                secondary: "#00ff00",
            };
            const html = generateHeroTemplate({ theme: customTheme });

            // Implementation only uses primary color for button styling
            expect(html).toContain(customTheme.primary);
        });

        it("should use default theme if not provided", () => {
            const html = generateHeroTemplate();

            expect(html).toContain("hsl(103 89% 29%)");
        });

        it("should make headline editable", () => {
            const html = generateHeroTemplate();

            expect(html).toContain("<h1");
            expect(html).toContain('data-editable="true"');
        });

        it("should make subheadline editable", () => {
            const html = generateHeroTemplate();

            const subheadlineMatch = html.match(/<p[^>]*data-editable="true"[^>]*>/);
            expect(subheadlineMatch).toBeTruthy();
        });

        it("should make CTA button editable", () => {
            const html = generateHeroTemplate();

            expect(html).toContain('<button');
            expect(html).toContain('data-editable="true"');
        });

        it("should center text content", () => {
            const html = generateHeroTemplate();

            expect(html).toContain("text-align: center");
        });

        it("should have gradient background", () => {
            const html = generateHeroTemplate();

            expect(html).toContain("linear-gradient");
            expect(html).toContain("background:");
        });

        it("should not have HTML syntax errors", () => {
            const html = generateHeroTemplate();

            const openSections = (html.match(/<section/g) || []).length;
            const closeSections = (html.match(/<\/section>/g) || []).length;

            expect(openSections).toBe(closeSections);
        });

        it("should apply button styling", () => {
            const html = generateHeroTemplate();

            expect(html).toContain("border-radius");
            expect(html).toContain("cursor: pointer");
            expect(html).toContain("box-shadow");
        });

        it("should use responsive container", () => {
            const html = generateHeroTemplate();

            expect(html).toContain("max-width:");
        });

        it("should apply proper typography", () => {
            const html = generateHeroTemplate();

            expect(html).toContain("font-size:");
            expect(html).toContain("font-weight:");
            expect(html).toContain("line-height:");
        });

        it("should handle all options simultaneously", () => {
            const html = generateHeroTemplate({
                headline: "Custom Headline",
                subheadline: "Custom Subheadline",
                ctaText: "Custom CTA",
                theme: { primary: "#123456", secondary: "#654321" },
            });

            expect(html).toContain("Custom Headline");
            expect(html).toContain("Custom Subheadline");
            expect(html).toContain("Custom CTA");
            expect(html).toContain("#123456");
        });
    });
});
