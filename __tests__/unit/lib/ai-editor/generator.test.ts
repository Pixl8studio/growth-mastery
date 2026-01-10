/**
 * AI Page Generator Unit Tests
 * Tests HTML validation and sanitization
 */

import { describe, it, expect, vi } from "vitest";
import { validateGeneratedHtml } from "@/lib/ai-editor/generator";
import { PAGE_TYPES } from "@/types/pages";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
    addBreadcrumb: vi.fn(),
    captureException: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        })),
    },
}));

describe("lib/ai-editor/generator", () => {
    describe("validateGeneratedHtml", () => {
        const validHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page</title>
    <style>body { color: black; }</style>
</head>
<body>
    <form>
        <input type="email" placeholder="Enter email">
        <button type="submit">Submit</button>
    </form>
</body>
</html>`;

        it("should validate complete HTML structure", () => {
            const result = validateGeneratedHtml(validHtml, "registration");
            expect(result.isValid).toBe(true);
            expect(result.warnings).toHaveLength(0);
        });

        it("should warn about missing DOCTYPE", () => {
            const html = "<html><body>content</body></html>";
            const result = validateGeneratedHtml(html, "registration");
            expect(result.warnings).toContain("Missing DOCTYPE declaration");
        });

        it("should warn about missing html tag", () => {
            const html = "<!DOCTYPE html><body>content</body>";
            const result = validateGeneratedHtml(html, "registration");
            expect(result.warnings).toContain("Missing html tag");
        });

        it("should warn about missing head section", () => {
            const html = "<!DOCTYPE html><html><body>content</body></html>";
            const result = validateGeneratedHtml(html, "registration");
            expect(result.warnings).toContain("Missing or incomplete head section");
        });

        it("should warn about missing body section", () => {
            const html = "<!DOCTYPE html><html><head></head></html>";
            const result = validateGeneratedHtml(html, "registration");
            expect(result.warnings).toContain("Missing or incomplete body section");
        });

        it("should warn about missing viewport meta tag", () => {
            const html = `<!DOCTYPE html><html><head><title>Test</title></head><body>content</body></html>`;
            const result = validateGeneratedHtml(html, "registration");
            expect(result.warnings).toContain(
                "Missing viewport meta tag for responsive design"
            );
        });

        it("should warn about missing embedded styles", () => {
            const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"></head><body>content</body></html>`;
            const result = validateGeneratedHtml(html, "registration");
            expect(result.warnings).toContain("Missing embedded styles");
        });

        // Page-type specific validations
        it("should validate registration page has form", () => {
            const htmlWithoutForm = validHtml.replace(/<form>.*<\/form>/s, "");
            const result = validateGeneratedHtml(htmlWithoutForm, "registration");
            expect(result.warnings).toContain("Registration page missing form element");
        });

        it("should validate watch page has video placeholder", () => {
            const result = validateGeneratedHtml(validHtml, "watch");
            expect(result.warnings).toContain(
                "Watch page may be missing video placeholder"
            );
        });

        it("should validate enrollment page has pricing info", () => {
            const result = validateGeneratedHtml(validHtml, "enrollment");
            expect(result.warnings).toContain(
                "Enrollment page may be missing pricing information"
            );
        });

        it("should validate confirmation page has calendar", () => {
            const result = validateGeneratedHtml(validHtml, "confirmation");
            expect(result.warnings).toContain(
                "Confirmation page may be missing calendar integration"
            );
        });

        it("should validate call_booking page has form", () => {
            const htmlWithoutForm = validHtml.replace(/<form>.*<\/form>/s, "");
            const result = validateGeneratedHtml(htmlWithoutForm, "call_booking");
            expect(result.warnings).toContain(
                "Call booking page missing qualification form"
            );
        });

        it("should validate checkout page has payment info", () => {
            const result = validateGeneratedHtml(validHtml, "checkout");
            expect(result.warnings).toContain(
                "Checkout page may be missing payment information"
            );
        });

        it("should validate upsell page has countdown timer", () => {
            const result = validateGeneratedHtml(validHtml, "upsell");
            expect(result.warnings).toContain(
                "Upsell page may be missing urgency countdown timer"
            );
        });

        it("should validate thank_you page has confirmation messaging", () => {
            const htmlWithThankYou = validHtml.replace(
                "<body>",
                "<body><h1>Thank You!</h1>"
            );
            const result = validateGeneratedHtml(htmlWithThankYou, "thank_you");
            expect(result.warnings).not.toContain(
                "Thank you page may be missing confirmation messaging"
            );
        });

        it.each(PAGE_TYPES)(
            "should return valid result structure for %s",
            (pageType) => {
                const result = validateGeneratedHtml(validHtml, pageType);
                expect(result).toHaveProperty("isValid");
                expect(result).toHaveProperty("warnings");
                expect(typeof result.isValid).toBe("boolean");
                expect(Array.isArray(result.warnings)).toBe(true);
            }
        );
    });
});
