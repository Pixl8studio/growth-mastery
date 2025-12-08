/**
 * Proof Template Tests
 * Verify social proof section generation with stats
 */

import { describe, it, expect, vi } from "vitest";
import { generateProofTemplate } from "@/lib/generators/section-templates/proof-template";

// Mock the icon-mapper module
vi.mock("@/lib/utils/icon-mapper", () => ({
    getIconSvg: vi.fn((iconName: string) => `<svg data-icon="${iconName}"></svg>`),
}));

describe("Proof Template", () => {
    describe("generateProofTemplate", () => {
        it("should generate valid HTML with default options", () => {
            const html = generateProofTemplate();

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include section wrapper with proper attributes", () => {
            const html = generateProofTemplate();

            expect(html).toContain("<section");
            expect(html).toContain('class="block proof-section"');
            expect(html).toContain('data-block-type="social-proof"');
        });

        it("should include default section title", () => {
            const html = generateProofTemplate();

            expect(html).toContain("Trusted by Thousands");
        });

        it("should use custom section title when provided", () => {
            const customTitle = "Our Impact";
            const html = generateProofTemplate({ sectionTitle: customTitle });

            expect(html).toContain(customTitle);
        });

        it("should render default stats", () => {
            const html = generateProofTemplate();

            expect(html).toContain("10,000+");
            expect(html).toContain("Happy Clients");
            expect(html).toContain("$50M+");
            expect(html).toContain("Revenue Generated");
            expect(html).toContain("98%");
            expect(html).toContain("Success Rate");
        });

        it("should render custom stats when provided", () => {
            const customStats = [
                { number: "5,000+", label: "Students", icon: "user" },
                { number: "100%", label: "Satisfaction", icon: "star" },
            ];

            const html = generateProofTemplate({ stats: customStats });

            expect(html).toContain("5,000+");
            expect(html).toContain("Students");
            expect(html).toContain("100%");
            expect(html).toContain("Satisfaction");
        });

        it("should include stat cards", () => {
            const html = generateProofTemplate();

            expect(html).toContain('class="stat-card"');
            const statCards = (html.match(/class="stat-card"/g) || []).length;
            expect(statCards).toBe(3); // Default has 3 stats
        });

        it("should include icons from icon-mapper", () => {
            const html = generateProofTemplate();

            expect(html).toContain('data-icon="user"');
            expect(html).toContain('data-icon="dollar-sign"');
            expect(html).toContain('data-icon="bar-chart-3"');
        });

        it("should make stat numbers editable", () => {
            const html = generateProofTemplate();

            expect(html).toContain('data-editable="true"');
        });

        it("should make stat labels editable", () => {
            const html = generateProofTemplate();

            const editableCount = (html.match(/data-editable="true"/g) || []).length;
            expect(editableCount).toBeGreaterThan(3);
        });

        it("should center stat content", () => {
            const html = generateProofTemplate();

            expect(html).toContain("text-align: center");
        });

        it("should have gradient background", () => {
            const html = generateProofTemplate();

            expect(html).toContain("linear-gradient");
            expect(html).toContain("background:");
        });

        it("should use grid layout for stats", () => {
            const html = generateProofTemplate();

            expect(html).toContain("display: grid");
            expect(html).toContain("grid-template-columns");
        });

        it("should not have HTML syntax errors", () => {
            const html = generateProofTemplate();

            const openSections = (html.match(/<section/g) || []).length;
            const closeSections = (html.match(/<\/section>/g) || []).length;

            expect(openSections).toBe(closeSections);
        });

        it("should use responsive container", () => {
            const html = generateProofTemplate();

            expect(html).toContain("max-width:");
        });

        it("should handle custom icons", () => {
            const customStats = [{ number: "999", label: "Test", icon: "heart" }];

            const html = generateProofTemplate({ stats: customStats });

            expect(html).toContain('data-icon="heart"');
        });

        it("should handle single stat", () => {
            const singleStat = [{ number: "100", label: "Perfect", icon: "star" }];

            const html = generateProofTemplate({ stats: singleStat });

            expect(html).toContain("100");
            expect(html).toContain("Perfect");
        });

        it("should handle many stats", () => {
            const manyStats = Array.from({ length: 6 }, (_, i) => ({
                number: `${i + 1}K`,
                label: `Metric ${i + 1}`,
                icon: "star",
            }));

            const html = generateProofTemplate({ stats: manyStats });

            const statCards = (html.match(/class="stat-card"/g) || []).length;
            expect(statCards).toBe(6);
        });

        it("should use responsive grid", () => {
            const html = generateProofTemplate();

            expect(html).toContain("repeat(auto-fit");
        });
    });
});
