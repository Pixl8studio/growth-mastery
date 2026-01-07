/**
 * AI Editor Page Slug Tests
 * Tests for reserved slug validation and slug generation
 */

import { describe, it, expect } from "vitest";

// Reserved slugs that could conflict with app routes
const RESERVED_SLUGS = [
    "admin",
    "api",
    "auth",
    "app",
    "dashboard",
    "login",
    "logout",
    "signup",
    "register",
    "settings",
    "profile",
    "account",
    "billing",
    "help",
    "support",
    "docs",
    "blog",
    "about",
    "contact",
    "privacy",
    "terms",
    "ai-editor",
    "funnel",
    "funnels",
    "project",
    "projects",
    "page",
    "pages",
    "p",
    "preview",
];

function isReservedSlug(slug: string): boolean {
    return RESERVED_SLUGS.includes(slug.toLowerCase());
}

function generateSlug(title: string): string {
    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50);

    if (isReservedSlug(slug)) {
        const suffix = Math.random().toString(36).substring(2, 6);
        slug = `${slug}-${suffix}`;
    }

    return slug;
}

describe("AI Editor Page Slug Validation", () => {
    describe("isReservedSlug", () => {
        it("should identify reserved admin routes", () => {
            expect(isReservedSlug("admin")).toBe(true);
            expect(isReservedSlug("dashboard")).toBe(true);
            expect(isReservedSlug("settings")).toBe(true);
        });

        it("should identify reserved auth routes", () => {
            expect(isReservedSlug("login")).toBe(true);
            expect(isReservedSlug("logout")).toBe(true);
            expect(isReservedSlug("signup")).toBe(true);
            expect(isReservedSlug("register")).toBe(true);
        });

        it("should identify reserved API routes", () => {
            expect(isReservedSlug("api")).toBe(true);
            expect(isReservedSlug("auth")).toBe(true);
        });

        it("should identify reserved app routes", () => {
            expect(isReservedSlug("ai-editor")).toBe(true);
            expect(isReservedSlug("funnel")).toBe(true);
            expect(isReservedSlug("funnels")).toBe(true);
            expect(isReservedSlug("project")).toBe(true);
            expect(isReservedSlug("projects")).toBe(true);
        });

        it("should identify reserved preview route", () => {
            expect(isReservedSlug("preview")).toBe(true);
            expect(isReservedSlug("p")).toBe(true);
        });

        it("should be case-insensitive", () => {
            expect(isReservedSlug("ADMIN")).toBe(true);
            expect(isReservedSlug("Admin")).toBe(true);
            expect(isReservedSlug("DASHBOARD")).toBe(true);
        });

        it("should allow non-reserved slugs", () => {
            expect(isReservedSlug("my-webinar")).toBe(false);
            expect(isReservedSlug("growth-mastery-course")).toBe(false);
            expect(isReservedSlug("online-training-2025")).toBe(false);
        });
    });

    describe("generateSlug", () => {
        it("should convert title to lowercase", () => {
            expect(generateSlug("My Great Webinar")).toBe("my-great-webinar");
        });

        it("should replace spaces with hyphens", () => {
            expect(generateSlug("This Is A Test")).toBe("this-is-a-test");
        });

        it("should remove special characters", () => {
            expect(generateSlug("Hello! World?")).toBe("hello-world");
            expect(generateSlug("Test@#$%^&*()")).toBe("test");
        });

        it("should remove leading and trailing hyphens", () => {
            expect(generateSlug("---test---")).toBe("test");
            expect(generateSlug("   test   ")).toBe("test");
        });

        it("should truncate to 50 characters", () => {
            const longTitle =
                "This is a very long title that exceeds the maximum length allowed for slugs";
            const slug = generateSlug(longTitle);
            expect(slug.length).toBeLessThanOrEqual(50);
        });

        it("should add suffix to reserved slugs", () => {
            const slug = generateSlug("Admin");
            expect(slug).not.toBe("admin");
            expect(slug.startsWith("admin-")).toBe(true);
            expect(slug.length).toBeGreaterThan("admin".length);
        });

        it("should handle empty strings", () => {
            expect(generateSlug("")).toBe("");
        });

        it("should handle titles with only special characters", () => {
            expect(generateSlug("@#$%^&*()")).toBe("");
        });

        it("should handle numeric titles", () => {
            expect(generateSlug("2025 Marketing Webinar")).toBe(
                "2025-marketing-webinar"
            );
        });

        it("should collapse multiple hyphens", () => {
            expect(generateSlug("test   multiple   spaces")).toBe(
                "test-multiple-spaces"
            );
        });
    });

    describe("Slug Format Validation", () => {
        const SLUG_REGEX = /^[a-z0-9-]+$/;
        const MIN_LENGTH = 3;
        const MAX_LENGTH = 50;

        it("should only contain lowercase letters, numbers, and hyphens", () => {
            expect(SLUG_REGEX.test("my-webinar-2025")).toBe(true);
            expect(SLUG_REGEX.test("test123")).toBe(true);
            expect(SLUG_REGEX.test("My-Webinar")).toBe(false); // uppercase
            expect(SLUG_REGEX.test("my_webinar")).toBe(false); // underscore
        });

        it("should enforce minimum length of 3 characters", () => {
            expect("my".length >= MIN_LENGTH).toBe(false);
            expect("abc".length >= MIN_LENGTH).toBe(true);
        });

        it("should enforce maximum length of 50 characters", () => {
            const longSlug = "a".repeat(51);
            expect(longSlug.length <= MAX_LENGTH).toBe(false);
        });
    });
});
