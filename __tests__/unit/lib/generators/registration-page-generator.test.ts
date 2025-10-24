/**
 * Registration Page Generator Tests
 * Verify HTML generation with proper block structure
 */

import { describe, it, expect } from "vitest";
import { generateRegistrationHTML } from "@/lib/generators/registration-page-generator";

describe("generateRegistrationHTML", () => {
    const mockDeckStructure = {
        id: "deck-123",
        slides: [
            {
                slideNumber: 1,
                title: "Main Title",
                description: "Hook content",
                section: "hook" as const,
            },
            {
                slideNumber: 2,
                title: "Problem Title",
                description: "Problem description",
                section: "problem" as const,
            },
            {
                slideNumber: 10,
                title: "Solution Benefit 1",
                description: "This benefit helps you scale",
                section: "solution" as const,
            },
            {
                slideNumber: 11,
                title: "Solution Benefit 2",
                description: "This benefit saves time",
                section: "solution" as const,
            },
        ],
        metadata: {
            title: "Test Webinar Title",
        },
        total_slides: 55,
    };

    const mockTheme = {
        primary: "#2563eb",
        secondary: "#10b981",
        background: "#ffffff",
        text: "#1f2937",
    };

    it("should generate valid HTML structure", () => {
        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline: "Test Registration Page",
            theme: mockTheme,
        });

        expect(html).toBeTruthy();
        expect(typeof html).toBe("string");
    });

    it("should include page-container wrapper", () => {
        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline: "Test Registration Page",
            theme: mockTheme,
        });

        expect(html).toContain('<div class="page-container">');
    });

    it("should include hero block with proper data-attributes", () => {
        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline: "Test Registration Page",
            theme: mockTheme,
        });

        expect(html).toContain('class="block hero-block');
        expect(html).toContain('data-block-type="hero"');
    });

    it("should include provided headline in hero", () => {
        const headline = "Master AI Sales in 90 Minutes";
        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline,
            theme: mockTheme,
        });

        expect(html).toContain(headline);
        expect(html).toContain('class="hero-title"');
        expect(html).toContain('data-editable="true"');
    });

    it("should include all required block types", () => {
        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline: "Test Page",
            theme: mockTheme,
        });

        // Check for required blocks
        expect(html).toContain('data-block-type="hero"');
        expect(html).toContain('data-block-type="social-proof"');
        expect(html).toContain('data-block-type="features"');
        expect(html).toContain('data-block-type="testimonial"');
        expect(html).toContain('data-block-type="footer"');
    });

    it("should include registration form", () => {
        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline: "Test Page",
            theme: mockTheme,
        });

        expect(html).toContain('class="registration-form"');
        expect(html).toContain('type="email"');
        expect(html).toContain('type="text"');
        expect(html).toContain('type="submit"');
    });

    it("should inject theme colors into styles", () => {
        const customTheme = {
            primary: "#ff0000",
            secondary: "#00ff00",
            background: "#ffffff",
            text: "#000000",
        };

        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline: "Test Page",
            theme: customTheme,
        });

        expect(html).toContain(customTheme.primary);
        expect(html).toContain(customTheme.secondary);
    });

    it("should extract benefits from deck solution section", () => {
        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline: "Test Page",
            theme: mockTheme,
        });

        // Should include features grid
        expect(html).toContain('class="features-grid"');
        expect(html).toContain('class="feature-card"');
        expect(html).toContain('class="feature-title"');
        expect(html).toContain('class="feature-description"');
    });

    it("should include editable attributes on text elements", () => {
        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline: "Test Page",
            theme: mockTheme,
        });

        // Count editable elements (should have multiple)
        const editableCount = (html.match(/data-editable="true"/g) || []).length;
        expect(editableCount).toBeGreaterThan(10);
    });

    it("should use deck metadata title as subheadline if provided", () => {
        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline: "Test Page",
            theme: mockTheme,
        });

        expect(html).toContain("Test Webinar Title");
    });

    it("should include testimonials section", () => {
        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline: "Test Page",
            theme: mockTheme,
        });

        expect(html).toContain("testimonial-block");
        expect(html).toContain("testimonial-card");
        expect(html).toContain("testimonial-quote");
        expect(html).toContain("testimonial-author");
    });

    it("should not have syntax errors in generated HTML", () => {
        const html = generateRegistrationHTML({
            projectId: "project-123",
            deckStructure: mockDeckStructure,
            headline: "Test Page",
            theme: mockTheme,
        });

        // Basic HTML validation
        const openDivs = (html.match(/<div/g) || []).length;
        const closeDivs = (html.match(/<\/div>/g) || []).length;

        expect(openDivs).toBe(closeDivs);
    });
});
