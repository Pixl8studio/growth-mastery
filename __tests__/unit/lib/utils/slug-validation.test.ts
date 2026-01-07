/**
 * Slug Validation Tests
 * Tests for slug normalization, validation, and reserved slug checking
 */

import { describe, it, expect } from "vitest";
import {
    normalizeSlug,
    isReservedSlug,
    validateSlugFormat,
    generateUniqueSlug,
    sanitizeToSlug,
} from "@/lib/utils/slug-validation";

describe("slug-validation", () => {
    describe("normalizeSlug", () => {
        it("should convert to lowercase", () => {
            expect(normalizeSlug("MyPage")).toBe("mypage");
        });

        it("should replace spaces with hyphens", () => {
            expect(normalizeSlug("my page")).toBe("my-page");
        });

        it("should remove leading and trailing hyphens", () => {
            expect(normalizeSlug("-mypage-")).toBe("mypage");
        });

        it("should collapse multiple hyphens", () => {
            expect(normalizeSlug("my--page")).toBe("my-page");
        });

        it("should handle Cyrillic homograph attacks", () => {
            // Cyrillic 'а' (U+0430) looks like Latin 'a'
            expect(normalizeSlug("pаypal")).toBe("paypal");
        });

        it("should handle Greek homograph attacks", () => {
            // Greek 'ο' (U+03BF) looks like Latin 'o'
            expect(normalizeSlug("gοοgle")).toBe("google");
        });

        it("should handle fullwidth characters", () => {
            // Fullwidth 'ａ' (U+FF41) looks like Latin 'a'
            expect(normalizeSlug("ａｂｃ")).toBe("abc");
        });

        it("should remove non-ASCII characters after normalization", () => {
            expect(normalizeSlug("café")).toBe("caf");
        });

        it("should handle empty string", () => {
            expect(normalizeSlug("")).toBe("");
        });
    });

    describe("isReservedSlug", () => {
        it("should detect reserved system slugs", () => {
            expect(isReservedSlug("api")).toBe(true);
            expect(isReservedSlug("admin")).toBe(true);
            expect(isReservedSlug("login")).toBe(true);
        });

        it("should detect reserved slugs case-insensitively", () => {
            expect(isReservedSlug("API")).toBe(true);
            expect(isReservedSlug("Admin")).toBe(true);
        });

        it("should allow non-reserved slugs", () => {
            expect(isReservedSlug("my-landing-page")).toBe(false);
            expect(isReservedSlug("awesome-webinar")).toBe(false);
        });

        it("should detect reserved slugs with homograph characters", () => {
            // Cyrillic 'а' in 'аpi' should still be detected as 'api'
            expect(isReservedSlug("аpi")).toBe(true);
        });
    });

    describe("validateSlugFormat", () => {
        it("should accept valid slugs", () => {
            expect(validateSlugFormat("my-page")).toBeNull();
            expect(validateSlugFormat("page123")).toBeNull();
            expect(validateSlugFormat("abc")).toBeNull();
        });

        it("should reject empty slugs", () => {
            expect(validateSlugFormat("")).toBe("Slug is required");
        });

        it("should reject slugs shorter than 3 characters", () => {
            expect(validateSlugFormat("ab")).toBe("Slug must be at least 3 characters");
        });

        it("should reject slugs longer than 100 characters", () => {
            const longSlug = "a".repeat(101);
            expect(validateSlugFormat(longSlug)).toBe(
                "Slug must be less than 100 characters"
            );
        });

        it("should reject slugs starting with hyphen", () => {
            expect(validateSlugFormat("-mypage")).toBe(
                "Slug must start with a letter or number"
            );
        });

        it("should reject slugs ending with hyphen", () => {
            expect(validateSlugFormat("mypage-")).toBe(
                "Slug must end with a letter or number"
            );
        });

        it("should reject slugs with consecutive hyphens", () => {
            expect(validateSlugFormat("my--page")).toBe(
                "Slug cannot contain consecutive hyphens"
            );
        });
    });

    describe("generateUniqueSlug", () => {
        it("should append a random suffix", () => {
            const slug1 = generateUniqueSlug("my-page");
            const slug2 = generateUniqueSlug("my-page");

            expect(slug1).toMatch(/^my-page-[a-z0-9]+$/);
            expect(slug2).toMatch(/^my-page-[a-z0-9]+$/);
            expect(slug1).not.toBe(slug2);
        });

        it("should normalize the base slug", () => {
            const slug = generateUniqueSlug("My Page");
            expect(slug).toMatch(/^my-page-[a-z0-9]+$/);
        });
    });

    describe("sanitizeToSlug", () => {
        it("should convert spaces to hyphens", () => {
            expect(sanitizeToSlug("My Awesome Page")).toBe("my-awesome-page");
        });

        it("should remove special characters", () => {
            expect(sanitizeToSlug("Hello! World?")).toBe("hello-world");
        });

        it("should handle mixed case", () => {
            expect(sanitizeToSlug("CamelCase")).toBe("camelcase");
        });
    });
});
