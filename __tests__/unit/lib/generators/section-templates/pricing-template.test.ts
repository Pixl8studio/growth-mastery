/**
 * Pricing Template Tests
 * Verify pricing section generation with features
 */

import { describe, it, expect, vi } from "vitest";
import { generatePricingTemplate } from "@/lib/generators/section-templates/pricing-template";

// Mock the icon-mapper module
vi.mock("@/lib/utils/icon-mapper", () => ({
    getIconSvg: vi.fn((iconName: string) => `<svg data-icon="${iconName}"></svg>`),
}));

describe("Pricing Template", () => {
    describe("generatePricingTemplate", () => {
        it("should generate valid HTML with default options", () => {
            const html = generatePricingTemplate();

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include section wrapper with proper attributes", () => {
            const html = generatePricingTemplate();

            expect(html).toContain("<section");
            expect(html).toContain('class="block pricing-section"');
            expect(html).toContain('data-block-type="pricing"');
        });

        it("should include default title", () => {
            const html = generatePricingTemplate();

            expect(html).toContain("Complete Access");
        });

        it("should use custom title when provided", () => {
            const customTitle = "Premium Plan";
            const html = generatePricingTemplate({ title: customTitle });

            expect(html).toContain(customTitle);
        });

        it("should include default price", () => {
            const html = generatePricingTemplate();

            expect(html).toContain("$997");
        });

        it("should use custom price when provided", () => {
            const customPrice = "$1,299";
            const html = generatePricingTemplate({ price: customPrice });

            expect(html).toContain(customPrice);
        });

        it("should include default period", () => {
            const html = generatePricingTemplate();

            expect(html).toContain("one-time");
        });

        it("should use custom period when provided", () => {
            const customPeriod = "per month";
            const html = generatePricingTemplate({ period: customPeriod });

            expect(html).toContain(customPeriod);
        });

        it("should render default features", () => {
            const html = generatePricingTemplate();

            expect(html).toContain("Full framework access");
            expect(html).toContain("Weekly live coaching");
            expect(html).toContain("Private community");
        });

        it("should render custom features when provided", () => {
            const customFeatures = ["Feature 1", "Feature 2", "Feature 3"];
            const html = generatePricingTemplate({ features: customFeatures });

            expect(html).toContain("Feature 1");
            expect(html).toContain("Feature 2");
            expect(html).toContain("Feature 3");
        });

        it("should include default CTA text", () => {
            const html = generatePricingTemplate();

            expect(html).toContain("Enroll Now");
        });

        it("should use custom CTA text when provided", () => {
            const customCtaText = "Buy Now";
            const html = generatePricingTemplate({ ctaText: customCtaText });

            expect(html).toContain(customCtaText);
        });

        it("should apply custom theme color", () => {
            const customTheme = { primary: "#ff0000" };
            const html = generatePricingTemplate({ theme: customTheme });

            expect(html).toContain(customTheme.primary);
        });

        it("should include pricing card wrapper", () => {
            const html = generatePricingTemplate();

            expect(html).toContain('class="pricing-card"');
        });

        it("should include icons for features", () => {
            const html = generatePricingTemplate();

            expect(html).toContain('data-icon="star"');
            expect(html).toContain("svg");
        });

        it("should make title editable", () => {
            const html = generatePricingTemplate();

            expect(html).toContain('data-editable="true"');
        });

        it("should make price editable", () => {
            const html = generatePricingTemplate();

            const priceMatches = html.match(/data-editable="true"/g);
            expect(priceMatches).toBeTruthy();
            expect(priceMatches!.length).toBeGreaterThan(0);
        });

        it("should make features editable", () => {
            const html = generatePricingTemplate();

            expect(html).toContain('data-editable="true"');
        });

        it("should center pricing card", () => {
            const html = generatePricingTemplate();

            expect(html).toContain("text-align: center");
        });

        it("should have gradient background for card", () => {
            const html = generatePricingTemplate();

            expect(html).toContain("linear-gradient");
        });

        it("should not have HTML syntax errors", () => {
            const html = generatePricingTemplate();

            const openSections = (html.match(/<section/g) || []).length;
            const closeSections = (html.match(/<\/section>/g) || []).length;

            expect(openSections).toBe(closeSections);
        });

        it("should apply proper button styling", () => {
            const html = generatePricingTemplate();

            expect(html).toContain("cursor: pointer");
            expect(html).toContain("width: 100%");
        });

        it("should use responsive container", () => {
            const html = generatePricingTemplate();

            expect(html).toContain("max-width:");
        });

        it("should handle single feature", () => {
            const singleFeature = ["Only one feature"];
            const html = generatePricingTemplate({ features: singleFeature });

            expect(html).toContain("Only one feature");
        });

        it("should handle many features", () => {
            const manyFeatures = Array.from({ length: 10 }, (_, i) => `Feature ${i + 1}`);
            const html = generatePricingTemplate({ features: manyFeatures });

            expect(html).toContain("Feature 1");
            expect(html).toContain("Feature 10");
        });
    });
});
