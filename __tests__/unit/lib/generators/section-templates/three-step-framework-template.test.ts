/**
 * Three-Step Framework Template Tests
 * Verify 3-step process section generation
 */

import { describe, it, expect, vi } from "vitest";
import { generateThreeStepTemplate } from "@/lib/generators/section-templates/three-step-framework-template";

// Mock the icon-mapper module
vi.mock("@/lib/utils/icon-mapper", () => ({
    getIconSvg: vi.fn((iconName: string) => `<svg data-icon="${iconName}"></svg>`),
}));

describe("Three-Step Framework Template", () => {
    describe("generateThreeStepTemplate", () => {
        it("should generate valid HTML with default options", () => {
            const html = generateThreeStepTemplate();

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include section wrapper with proper attributes", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain("<section");
            expect(html).toContain('class="block steps-section"');
            expect(html).toContain('data-block-type="process"');
        });

        it("should include default section title", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain("How It Works");
        });

        it("should use custom section title when provided", () => {
            const customTitle = "Our Simple Process";
            const html = generateThreeStepTemplate({ sectionTitle: customTitle });

            expect(html).toContain(customTitle);
        });

        it("should render default steps", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain("Define Your Goals");
            expect(html).toContain("Take Action");
            expect(html).toContain("Get Results");
        });

        it("should render custom steps when provided", () => {
            const customSteps = [
                {
                    number: 1,
                    icon: "star",
                    title: "Step One",
                    description: "First step description",
                },
                {
                    number: 2,
                    icon: "heart",
                    title: "Step Two",
                    description: "Second step description",
                },
                {
                    number: 3,
                    icon: "check",
                    title: "Step Three",
                    description: "Third step description",
                },
            ];

            const html = generateThreeStepTemplate({ steps: customSteps });

            expect(html).toContain("Step One");
            expect(html).toContain("First step description");
            expect(html).toContain("Step Two");
            expect(html).toContain("Step Three");
        });

        it("should include step cards", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain('class="step-card"');
            const stepCards = (html.match(/class="step-card"/g) || []).length;
            expect(stepCards).toBe(3); // Default has 3 steps
        });

        it("should include step numbers in badges", () => {
            const html = generateThreeStepTemplate();

            // Step numbers are in badges with whitespace around them
            expect(html).toMatch(/>\s*1\s*</);
            expect(html).toMatch(/>\s*2\s*</);
            expect(html).toMatch(/>\s*3\s*</);
        });

        it("should include icons from icon-mapper", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain('data-icon="target"');
            expect(html).toContain('data-icon="zap"');
            expect(html).toContain('data-icon="rocket"');
        });

        it("should make step titles editable", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain('data-editable="true"');
        });

        it("should make step descriptions editable", () => {
            const html = generateThreeStepTemplate();

            const editableCount = (html.match(/data-editable="true"/g) || []).length;
            expect(editableCount).toBeGreaterThanOrEqual(3);
        });

        it("should center step content", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain("text-align: center");
        });

        it("should use grid layout", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain("display: grid");
            expect(html).toContain("grid-template-columns");
        });

        it("should position step numbers absolutely", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain("position: absolute");
            expect(html).toContain("top: -20px");
        });

        it("should style step number badges", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain("border-radius: 50%");
            expect(html).toContain("background: hsl(103 89% 29%)");
        });

        it("should not have HTML syntax errors", () => {
            const html = generateThreeStepTemplate();

            const openSections = (html.match(/<section/g) || []).length;
            const closeSections = (html.match(/<\/section>/g) || []).length;

            expect(openSections).toBe(closeSections);
        });

        it("should use responsive container", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain("max-width:");
        });

        it("should use responsive grid", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain("repeat(auto-fit");
        });

        it("should apply proper card styling", () => {
            const html = generateThreeStepTemplate();

            expect(html).toContain("background: white");
            expect(html).toContain("border-radius");
        });

        it("should handle custom icons", () => {
            const customSteps = [
                {
                    number: 1,
                    icon: "bell",
                    title: "Custom Step",
                    description: "Custom description",
                },
            ];

            const html = generateThreeStepTemplate({ steps: customSteps });

            expect(html).toContain('data-icon="bell"');
        });

        it("should handle different step counts", () => {
            const twoSteps = [
                {
                    number: 1,
                    icon: "star",
                    title: "Step 1",
                    description: "Desc 1",
                },
                {
                    number: 2,
                    icon: "star",
                    title: "Step 2",
                    description: "Desc 2",
                },
            ];

            const html = generateThreeStepTemplate({ steps: twoSteps });

            const stepCards = (html.match(/class="step-card"/g) || []).length;
            expect(stepCards).toBe(2);
        });
    });
});
