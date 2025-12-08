/**
 * Enrollment Page Generator Tests
 * Verify HTML generation for sales/enrollment pages with offer integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateEnrollmentHTML } from "@/lib/generators/enrollment-page-generator";

// Mock the icon-mapper module
vi.mock("@/lib/utils/icon-mapper", () => ({
    getIconSvg: vi.fn((iconName: string) => `<svg data-icon="${iconName}"></svg>`),
}));

describe("Enrollment Page Generator", () => {
    const mockDeckStructure = {
        id: "deck-123",
        slides: [
            {
                slideNumber: 1,
                title: "Amazing transformation",
                description: "This program changed my life and business completely",
                section: "solution" as const,
            },
            {
                slideNumber: 2,
                title: "Best decision ever",
                description: "I saw results within the first week",
                section: "offer" as const,
            },
        ],
        metadata: {
            title: "Test Enrollment Webinar",
        },
        total_slides: 20,
    };

    const mockOffer = {
        id: "offer-123",
        name: "Business Growth Accelerator",
        tagline: "Transform your business in 90 days",
        description: "Complete system for scaling your business",
        price: 997,
        currency: "USD",
        features: [
            {
                title: "Video Training",
                description: "Step-by-step video modules",
                value: "$2,997",
            },
            {
                title: "Templates & Tools",
                description: "Ready-to-use business templates",
                value: "$1,497",
            },
        ],
    };

    const mockTheme = {
        primary: "#2563eb",
        secondary: "#10b981",
        background: "#ffffff",
        text: "#1f2937",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateEnrollmentHTML", () => {
        it("should generate valid HTML structure", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toBeTruthy();
            expect(typeof html).toBe("string");
        });

        it("should include page-container wrapper", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain('<div class="page-container">');
        });

        it("should include hero block with offer name", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain('data-block-type="hero"');
            expect(html).toContain(mockOffer.name);
            expect(html).toContain('class="hero-title"');
        });

        it("should display offer price prominently", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain(mockOffer.currency);
            expect(html).toContain(mockOffer.price.toLocaleString());
            expect(html).toContain('class="current-price"');
        });

        it("should include all required enrollment page blocks", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain('data-block-type="hero"');
            expect(html).toContain('data-block-type="value-prop"');
            expect(html).toContain('data-block-type="testimonial"');
            expect(html).toContain('data-block-type="urgency"');
            expect(html).toContain('data-block-type="final-cta"');
        });

        it("should render offer features", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain('class="features-grid"');
            expect(html).toContain(mockOffer.features![0].title);
            expect(html).toContain(mockOffer.features![0].description);
            expect(html).toContain(mockOffer.features![0].value);
        });

        it("should use default features if none provided", () => {
            const offerWithoutFeatures = { ...mockOffer, features: undefined };

            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: offerWithoutFeatures,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain("Complete Training Modules");
            expect(html).toContain("Done-for-You Templates");
            expect(html).toContain("Private Community Access");
        });

        it("should calculate and display total value", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain("Total Value");
            expect(html).toContain('class="total-value"');
            // Should show total of $2,997 + $1,497 = $4,494
            expect(html).toContain("4,494");
        });

        it("should extract testimonials from deck slides", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain("testimonial-block");
            expect(html).toContain("testimonial-card");
            expect(html).toContain("testimonial-quote");
            expect(html).toContain(mockDeckStructure.slides[0].title);
        });

        it("should use default testimonials if none in deck", () => {
            const emptyDeck = {
                ...mockDeckStructure,
                slides: [],
            };

            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: emptyDeck,
                theme: mockTheme,
            });

            expect(html).toContain("This program paid for itself");
            expect(html).toContain("Sarah Johnson");
            expect(html).toContain("Michael Chen");
        });

        it("should include urgency section with countdown", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain('data-block-type="urgency"');
            expect(html).toContain("Limited Time Offer");
            expect(html).toContain('class="countdown-timer"');
            expect(html).toContain("HOURS");
            expect(html).toContain("MINUTES");
            expect(html).toContain("SECONDS");
        });

        it("should include payment form in final CTA", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain('class="payment-form"');
            expect(html).toContain('type="text"');
            expect(html).toContain('type="email"');
            expect(html).toContain("Full Name");
            expect(html).toContain("Email Address");
            expect(html).toContain("Card Information");
        });

        it("should apply theme colors correctly", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain(mockTheme.primary);
            expect(html).toContain(mockTheme.secondary);
        });

        it("should support different template types", () => {
            const urgencyHtml = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
                templateType: "urgency-convert",
            });

            const premiumHtml = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
                templateType: "premium-elegant",
            });

            expect(urgencyHtml).toBeTruthy();
            expect(premiumHtml).toBeTruthy();
            expect(urgencyHtml).not.toBe(premiumHtml);
        });

        it("should include editable attributes on text elements", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            const editableCount = (html.match(/data-editable="true"/g) || []).length;
            expect(editableCount).toBeGreaterThan(20);
        });

        it("should show discounted price vs original", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            const originalPrice = mockOffer.price * 1.5;
            expect(html).toContain(originalPrice.toLocaleString());
            expect(html).toContain("text-decoration: line-through");
        });

        it("should include trust and security elements", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain("money-back guarantee");
            expect(html).toContain("Secure checkout");
            expect(html).toContain("SSL secured");
        });

        it("should not have HTML syntax errors", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            const openDivs = (html.match(/<div/g) || []).length;
            const closeDivs = (html.match(/<\/div>/g) || []).length;

            expect(openDivs).toBe(closeDivs);
        });

        it("should use offer tagline if provided", () => {
            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: mockOffer,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain(mockOffer.tagline!);
        });

        it("should fallback to description if no tagline", () => {
            const offerNoTagline = { ...mockOffer, tagline: null };

            const html = generateEnrollmentHTML({
                projectId: "project-123",
                offer: offerNoTagline,
                deckStructure: mockDeckStructure,
                theme: mockTheme,
            });

            expect(html).toContain(mockOffer.description!);
        });
    });
});
