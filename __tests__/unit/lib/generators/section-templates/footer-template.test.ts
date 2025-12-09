/**
 * Footer Template Tests
 * Verify footer section generation with copyright and links
 */

import { describe, it, expect } from "vitest";
import { generateFooterTemplate } from "@/lib/generators/section-templates/footer-template";

describe("Footer Template", () => {
    describe("generateFooterTemplate", () => {
        it("should generate valid HTML with default options", () => {
            const html = generateFooterTemplate();

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include footer wrapper with proper attributes", () => {
            const html = generateFooterTemplate();

            expect(html).toContain("<footer");
            expect(html).toContain('class="block footer-section"');
            expect(html).toContain('data-block-type="foot"');
        });

        it("should include default company name", () => {
            const html = generateFooterTemplate();

            expect(html).toContain("Your Company");
        });

        it("should use custom company name when provided", () => {
            const customCompanyName = "Acme Corporation";
            const html = generateFooterTemplate({ companyName: customCompanyName });

            expect(html).toContain(customCompanyName);
            expect(html).not.toContain("Your Company");
        });

        it("should include current year by default", () => {
            const currentYear = new Date().getFullYear();
            const html = generateFooterTemplate();

            expect(html).toContain(currentYear.toString());
        });

        it("should use custom year when provided", () => {
            const customYear = 2025;
            const html = generateFooterTemplate({ year: customYear });

            expect(html).toContain("2025");
        });

        it("should include default footer links", () => {
            const html = generateFooterTemplate();

            expect(html).toContain("Privacy Policy");
            expect(html).toContain("Terms of Service");
            expect(html).toContain("Contact Us");
        });

        it("should render custom links when provided", () => {
            const customLinks = [
                { text: "About", url: "/about" },
                { text: "Blog", url: "/blog" },
            ];

            const html = generateFooterTemplate({ links: customLinks });

            expect(html).toContain("About");
            expect(html).toContain("/about");
            expect(html).toContain("Blog");
            expect(html).toContain("/blog");
        });

        it("should make links editable", () => {
            const html = generateFooterTemplate();

            expect(html).toContain('data-editable="true"');
        });

        it("should separate links with bullets", () => {
            const html = generateFooterTemplate();

            expect(html).toContain("•");
        });

        it("should make copyright text editable", () => {
            const html = generateFooterTemplate();

            // Regex with [\s\S] to match across newlines
            const copyrightMatch = html.match(/<p[^>]*>[\s\S]*?©[\s\S]*?<\/p>/);
            expect(copyrightMatch).toBeTruthy();
            expect(html).toContain('data-editable="true"');
        });

        it("should have gradient background", () => {
            const html = generateFooterTemplate();

            expect(html).toContain("linear-gradient");
            expect(html).toContain("background:");
        });

        it("should center text content", () => {
            const html = generateFooterTemplate();

            expect(html).toContain("text-align: center");
        });

        it("should not have HTML syntax errors", () => {
            const html = generateFooterTemplate();

            const openFooters = (html.match(/<footer/g) || []).length;
            const closeFooters = (html.match(/<\/footer>/g) || []).length;

            expect(openFooters).toBe(closeFooters);
        });

        it("should use responsive container", () => {
            const html = generateFooterTemplate();

            expect(html).toContain("max-width:");
        });

        it("should handle empty links array", () => {
            const html = generateFooterTemplate({ links: [] });

            expect(html).toBeTruthy();
            expect(html).toContain("footer-section");
        });

        it("should handle single link", () => {
            const singleLink = [{ text: "Privacy", url: "/privacy" }];
            const html = generateFooterTemplate({ links: singleLink });

            expect(html).toContain("Privacy");
            expect(html).toContain("/privacy");
        });

        it("should include all rights reserved text", () => {
            const html = generateFooterTemplate();

            expect(html).toContain("All rights reserved");
        });

        it("should apply proper link styling", () => {
            const html = generateFooterTemplate();

            expect(html).toContain("text-decoration: none");
            expect(html).toContain("transition:");
        });
    });
});
