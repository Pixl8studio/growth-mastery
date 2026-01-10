/**
 * Framework Loader Unit Tests
 * Tests page framework generation for all page types
 */

import { describe, it, expect } from "vitest";
import {
    getPageFramework,
    formatFrameworkForPrompt,
    loadPageFramework,
    PageFramework,
} from "@/lib/ai-editor/framework-loader";
import { PAGE_TYPES } from "@/types/pages";

describe("lib/ai-editor/framework-loader", () => {
    describe("getPageFramework", () => {
        it.each(PAGE_TYPES)(
            "should return valid framework for %s page type",
            (pageType) => {
                const framework = getPageFramework(pageType);

                expect(framework).toBeDefined();
                expect(framework.pageType).toBe(pageType);
                expect(Array.isArray(framework.sections)).toBe(true);
                expect(framework.sections.length).toBeGreaterThan(0);
                expect(framework.designSystem).toBeDefined();
                expect(framework.copyPrinciples).toBeDefined();
                expect(Array.isArray(framework.conversionPatterns)).toBe(true);
            }
        );

        it("should throw error for unknown page type", () => {
            // @ts-expect-error Testing invalid input
            expect(() => getPageFramework("invalid_type")).toThrow("Unknown page type");
        });

        it("should return sections with required properties", () => {
            PAGE_TYPES.forEach((pageType) => {
                const framework = getPageFramework(pageType);

                framework.sections.forEach((section) => {
                    expect(section).toHaveProperty("order");
                    expect(section).toHaveProperty("name");
                    expect(section).toHaveProperty("purpose");
                    expect(section).toHaveProperty("structure");
                    expect(typeof section.order).toBe("number");
                    expect(typeof section.name).toBe("string");
                });
            });
        });

        it("should return design system with required properties", () => {
            PAGE_TYPES.forEach((pageType) => {
                const framework = getPageFramework(pageType);

                expect(framework.designSystem).toHaveProperty("colorArchitecture");
                expect(framework.designSystem).toHaveProperty("typography");
                expect(framework.designSystem).toHaveProperty("spacing");
                expect(framework.designSystem).toHaveProperty("visualEffects");
                expect(framework.designSystem).toHaveProperty("componentPatterns");
            });
        });

        it("should return copy principles with required properties", () => {
            PAGE_TYPES.forEach((pageType) => {
                const framework = getPageFramework(pageType);

                expect(framework.copyPrinciples).toHaveProperty("headlines");
                expect(framework.copyPrinciples).toHaveProperty("bodyVoice");
                expect(framework.copyPrinciples).toHaveProperty("ctaOptimization");
            });
        });
    });

    describe("formatFrameworkForPrompt", () => {
        it("should format framework into a string prompt", () => {
            const framework = getPageFramework("registration");
            const formatted = formatFrameworkForPrompt(framework);

            expect(typeof formatted).toBe("string");
            expect(formatted).toContain("REGISTRATION PAGE FRAMEWORK");
            expect(formatted).toContain("Page Architecture");
            expect(formatted).toContain("Design System");
            expect(formatted).toContain("Copy Principles");
        });

        it("should include all sections in formatted output", () => {
            const framework = getPageFramework("checkout");
            const formatted = formatFrameworkForPrompt(framework);

            framework.sections.forEach((section) => {
                expect(formatted).toContain(section.name);
            });
        });
    });

    describe("loadPageFramework", () => {
        it("should return formatted framework string for valid page type", async () => {
            const result = await loadPageFramework("confirmation");

            expect(typeof result).toBe("string");
            expect(result).toContain("CONFIRMATION PAGE FRAMEWORK");
        });

        it.each(PAGE_TYPES)("should load framework for %s", async (pageType) => {
            const result = await loadPageFramework(pageType);

            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(100);
        });
    });

    describe("new page types", () => {
        it("should have confirmation framework with calendar-related section", () => {
            const framework = getPageFramework("confirmation");

            const hasCalendarSection = framework.sections.some(
                (s) =>
                    s.name.toLowerCase().includes("calendar") ||
                    s.structure.toLowerCase().includes("calendar")
            );
            expect(hasCalendarSection).toBe(true);
        });

        it("should have call_booking framework with form section", () => {
            const framework = getPageFramework("call_booking");

            const hasFormSection = framework.sections.some(
                (s) =>
                    s.name.toLowerCase().includes("form") ||
                    s.name.toLowerCase().includes("booking") ||
                    s.structure.toLowerCase().includes("form")
            );
            expect(hasFormSection).toBe(true);
        });

        it("should have checkout framework with payment section", () => {
            const framework = getPageFramework("checkout");

            const hasPaymentSection = framework.sections.some(
                (s) =>
                    s.name.toLowerCase().includes("payment") ||
                    s.name.toLowerCase().includes("checkout") ||
                    s.structure.toLowerCase().includes("payment")
            );
            expect(hasPaymentSection).toBe(true);
        });

        it("should have upsell framework with urgency elements", () => {
            const framework = getPageFramework("upsell");

            const hasUrgencyPattern = framework.conversionPatterns.some(
                (p) =>
                    p.toLowerCase().includes("urgency") ||
                    p.toLowerCase().includes("limited") ||
                    p.toLowerCase().includes("countdown")
            );
            expect(hasUrgencyPattern).toBe(true);
        });

        it("should have thank_you framework with next steps section", () => {
            const framework = getPageFramework("thank_you");

            const hasNextStepsSection = framework.sections.some(
                (s) =>
                    s.name.toLowerCase().includes("next") ||
                    s.name.toLowerCase().includes("access") ||
                    s.structure.toLowerCase().includes("next step")
            );
            expect(hasNextStepsSection).toBe(true);
        });
    });
});
