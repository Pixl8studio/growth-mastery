/**
 * Features Template Tests
 * Verify features section generation with icon grid
 */

import { describe, it, expect, vi } from "vitest";
import { generateFeaturesTemplate } from "@/lib/generators/section-templates/features-template";

// Mock the icon-mapper module
vi.mock("@/lib/utils/icon-mapper", () => ({
    getIconSvg: vi.fn((iconName: string) => `<svg data-icon="${iconName}"></svg>`),
}));

describe("Features Template", () => {
    describe("generateFeaturesTemplate", () => {
        it("should generate valid HTML with default options", () => {
            const html = generateFeaturesTemplate();

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include section wrapper with proper attributes", () => {
            const html = generateFeaturesTemplate();

            expect(html).toContain('<section');
            expect(html).toContain('class="block features-section"');
            expect(html).toContain('data-block-type="features"');
        });

        it("should include default section title", () => {
            const html = generateFeaturesTemplate();

            expect(html).toContain("Everything You Need to Succeed");
        });

        it("should use custom section title when provided", () => {
            const customTitle = "Our Amazing Features";
            const html = generateFeaturesTemplate({ sectionTitle: customTitle });

            expect(html).toContain(customTitle);
        });

        it("should render default features", () => {
            const html = generateFeaturesTemplate();

            expect(html).toContain("Strategic Framework");
            expect(html).toContain("Quick Implementation");
            expect(html).toContain("Scalable Growth");
        });

        it("should render custom features when provided", () => {
            const customFeatures = [
                {
                    icon: "star",
                    title: "Premium Support",
                    description: "24/7 customer support",
                },
                {
                    icon: "rocket",
                    title: "Fast Results",
                    description: "See results in days",
                },
            ];

            const html = generateFeaturesTemplate({ features: customFeatures });

            expect(html).toContain("Premium Support");
            expect(html).toContain("24/7 customer support");
            expect(html).toContain("Fast Results");
        });

        it("should include feature grid layout", () => {
            const html = generateFeaturesTemplate();

            expect(html).toContain('class="features-grid"');
            expect(html).toContain("display: grid");
        });

        it("should include feature cards", () => {
            const html = generateFeaturesTemplate();

            expect(html).toContain('class="feature-card"');
            const featureCards = (html.match(/class="feature-card"/g) || []).length;
            expect(featureCards).toBe(3); // Default has 3 features
        });

        it("should include icons from icon-mapper", () => {
            const html = generateFeaturesTemplate();

            expect(html).toContain('data-icon="target"');
            expect(html).toContain('data-icon="zap"');
            expect(html).toContain('data-icon="rocket"');
        });

        it("should make feature titles editable", () => {
            const html = generateFeaturesTemplate();

            expect(html).toContain('class="feature-title"');
            expect(html).toContain('data-editable="true"');
        });

        it("should make feature descriptions editable", () => {
            const html = generateFeaturesTemplate();

            expect(html).toContain('class="feature-description"');
            expect(html).toContain('data-editable="true"');
        });

        it("should apply proper styling to feature cards", () => {
            const html = generateFeaturesTemplate();

            expect(html).toContain("background: white");
            expect(html).toContain("border-radius");
            expect(html).toContain("box-shadow");
        });

        it("should center feature content", () => {
            const html = generateFeaturesTemplate();

            expect(html).toContain("text-align: center");
        });

        it("should not have HTML syntax errors", () => {
            const html = generateFeaturesTemplate();

            const openSections = (html.match(/<section/g) || []).length;
            const closeSections = (html.match(/<\/section>/g) || []).length;

            expect(openSections).toBe(closeSections);
        });

        it("should handle custom icons", () => {
            const customFeatures = [
                { icon: "heart", title: "Feature 1", description: "Desc 1" },
                { icon: "shield", title: "Feature 2", description: "Desc 2" },
            ];

            const html = generateFeaturesTemplate({ features: customFeatures });

            expect(html).toContain('data-icon="heart"');
            expect(html).toContain('data-icon="shield"');
        });

        it("should use responsive grid", () => {
            const html = generateFeaturesTemplate();

            expect(html).toContain("grid-template-columns");
            expect(html).toContain("repeat(auto-fit");
        });

        it("should handle single feature", () => {
            const singleFeature = [
                { icon: "star", title: "Solo Feature", description: "Only one" },
            ];

            const html = generateFeaturesTemplate({ features: singleFeature });

            expect(html).toContain("Solo Feature");
            const featureCards = (html.match(/class="feature-card"/g) || []).length;
            expect(featureCards).toBe(1);
        });

        it("should handle many features", () => {
            const manyFeatures = Array.from({ length: 6 }, (_, i) => ({
                icon: "star",
                title: `Feature ${i + 1}`,
                description: `Description ${i + 1}`,
            }));

            const html = generateFeaturesTemplate({ features: manyFeatures });

            const featureCards = (html.match(/class="feature-card"/g) || []).length;
            expect(featureCards).toBe(6);
        });
    });
});
