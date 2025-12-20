/**
 * Unit tests for slide-constants.ts
 * Tests content limits, text scaling configuration, and utility functions
 */

import { describe, it, expect } from "vitest";
import {
    SLIDE_CONTENT_LIMITS,
    TEXT_SCALE_CONFIG,
    getContentLimits,
    countWords,
    getScaledTextSize,
    getScaledBulletSize,
    isAtMinimumSize,
    hasMinimumSizeBullets,
} from "@/lib/presentations/slide-constants";
import type { SlideLayoutType } from "@/lib/presentations/schemas";

describe("SLIDE_CONTENT_LIMITS", () => {
    const allLayoutTypes: SlideLayoutType[] = [
        "title",
        "section",
        "bullets",
        "content_left",
        "content_right",
        "quote",
        "statistics",
        "comparison",
        "process",
        "cta",
    ];

    it("has limits defined for all layout types", () => {
        allLayoutTypes.forEach((layoutType) => {
            expect(SLIDE_CONTENT_LIMITS[layoutType]).toBeDefined();
            expect(SLIDE_CONTENT_LIMITS[layoutType]).toHaveProperty("titleMax");
            expect(SLIDE_CONTENT_LIMITS[layoutType]).toHaveProperty("bulletMax");
            expect(SLIDE_CONTENT_LIMITS[layoutType]).toHaveProperty("maxBullets");
        });
    });

    it("has positive values for all limits", () => {
        allLayoutTypes.forEach((layoutType) => {
            const limits = SLIDE_CONTENT_LIMITS[layoutType];
            expect(limits.titleMax).toBeGreaterThan(0);
            expect(limits.bulletMax).toBeGreaterThan(0);
            expect(limits.maxBullets).toBeGreaterThan(0);
        });
    });

    it("title layout has strictest title limit", () => {
        // Title slides have large display text, so fewer words fit
        expect(SLIDE_CONTENT_LIMITS.title.titleMax).toBeLessThanOrEqual(10);
    });

    it("quote layout allows longest bullet content", () => {
        // Quotes can be longer since there's typically just one
        const quoteBulletMax = SLIDE_CONTENT_LIMITS.quote.bulletMax;
        expect(quoteBulletMax).toBeGreaterThanOrEqual(25);
    });

    it("compact layouts have stricter bullet limits", () => {
        // content_left/right have images taking space
        expect(SLIDE_CONTENT_LIMITS.content_left.bulletMax).toBeLessThanOrEqual(16);
        expect(SLIDE_CONTENT_LIMITS.content_right.bulletMax).toBeLessThanOrEqual(16);
    });
});

describe("TEXT_SCALE_CONFIG", () => {
    it("has configuration for title, bullet, and compactBullet", () => {
        expect(TEXT_SCALE_CONFIG).toHaveProperty("title");
        expect(TEXT_SCALE_CONFIG).toHaveProperty("bullet");
        expect(TEXT_SCALE_CONFIG).toHaveProperty("compactBullet");
    });

    it("has all required properties for each config", () => {
        const configs = ["title", "bullet", "compactBullet"] as const;
        configs.forEach((key) => {
            const config = TEXT_SCALE_CONFIG[key];
            expect(config).toHaveProperty("baseSize");
            expect(config).toHaveProperty("mediumSize");
            expect(config).toHaveProperty("smallSize");
            expect(config).toHaveProperty("mediumThreshold");
            expect(config).toHaveProperty("smallThreshold");
        });
    });

    it("has progressively smaller sizes", () => {
        // Sizes should go from large to small: text-3xl > text-2xl > text-xl
        expect(TEXT_SCALE_CONFIG.title.baseSize).toBe("text-3xl");
        expect(TEXT_SCALE_CONFIG.title.mediumSize).toBe("text-2xl");
        expect(TEXT_SCALE_CONFIG.title.smallSize).toBe("text-xl");
    });

    it("has increasing thresholds", () => {
        const configs = ["title", "bullet", "compactBullet"] as const;
        configs.forEach((key) => {
            const config = TEXT_SCALE_CONFIG[key];
            expect(config.smallThreshold).toBeGreaterThan(config.mediumThreshold);
        });
    });

    it("compact bullet has smaller base size than regular bullet", () => {
        expect(TEXT_SCALE_CONFIG.compactBullet.baseSize).toBe("text-base");
        expect(TEXT_SCALE_CONFIG.bullet.baseSize).toBe("text-lg");
    });
});

describe("getContentLimits", () => {
    it("returns correct limits for known layout types", () => {
        expect(getContentLimits("title")).toEqual(SLIDE_CONTENT_LIMITS.title);
        expect(getContentLimits("bullets")).toEqual(SLIDE_CONTENT_LIMITS.bullets);
        expect(getContentLimits("quote")).toEqual(SLIDE_CONTENT_LIMITS.quote);
    });

    it("returns bullets limits as fallback for unknown types", () => {
        // TypeScript would normally prevent this, but testing runtime behavior
        const result = getContentLimits("unknown" as SlideLayoutType);
        expect(result).toEqual(SLIDE_CONTENT_LIMITS.bullets);
    });
});

describe("countWords", () => {
    it("counts words in simple sentences", () => {
        expect(countWords("Hello world")).toBe(2);
        expect(countWords("One two three four")).toBe(4);
    });

    it("returns 0 for empty string", () => {
        expect(countWords("")).toBe(0);
    });

    it("handles multiple spaces between words", () => {
        expect(countWords("Hello    world")).toBe(2);
        expect(countWords("One   two   three")).toBe(3);
    });

    it("handles leading and trailing whitespace", () => {
        expect(countWords("  Hello world  ")).toBe(2);
        expect(countWords("\n\tHello world\n\t")).toBe(2);
    });

    it("handles various whitespace characters", () => {
        expect(countWords("Hello\nworld")).toBe(2);
        expect(countWords("Hello\tworld")).toBe(2);
        expect(countWords("Hello\n\t world")).toBe(2);
    });

    it("counts hyphenated words as single words", () => {
        expect(countWords("well-known fact")).toBe(2);
    });
});

describe("getScaledTextSize", () => {
    it("returns base size for short text", () => {
        const shortTitle = "Short title";
        const result = getScaledTextSize(shortTitle, TEXT_SCALE_CONFIG.title);
        expect(result).toBe("text-3xl");
    });

    it("returns medium size for medium-length text", () => {
        // 11 words - just above mediumThreshold of 10
        const mediumTitle =
            "This is a somewhat longer title that has more than ten words";
        expect(countWords(mediumTitle)).toBe(12);
        const result = getScaledTextSize(mediumTitle, TEXT_SCALE_CONFIG.title);
        expect(result).toBe("text-2xl");
    });

    it("returns small size for long text", () => {
        // 15 words - above smallThreshold of 14
        const longTitle =
            "This is a very long title that definitely exceeds the small threshold for title text rendering";
        expect(countWords(longTitle)).toBe(16);
        const result = getScaledTextSize(longTitle, TEXT_SCALE_CONFIG.title);
        expect(result).toBe("text-xl");
    });

    it("returns base size at exactly mediumThreshold", () => {
        // Exactly 10 words
        const exactThreshold = "One two three four five six seven eight nine ten";
        expect(countWords(exactThreshold)).toBe(10);
        const result = getScaledTextSize(exactThreshold, TEXT_SCALE_CONFIG.title);
        expect(result).toBe("text-3xl");
    });

    it("returns medium size at exactly smallThreshold", () => {
        // Exactly 14 words
        const exactSmall =
            "One two three four five six seven eight nine ten eleven twelve thirteen fourteen";
        expect(countWords(exactSmall)).toBe(14);
        const result = getScaledTextSize(exactSmall, TEXT_SCALE_CONFIG.title);
        expect(result).toBe("text-2xl");
    });

    it("works with bullet config", () => {
        const shortBullet = "Simple bullet point";
        expect(getScaledBulletSize([shortBullet], TEXT_SCALE_CONFIG.bullet)).toBe(
            "text-lg"
        );
    });

    it("works with compact bullet config", () => {
        const shortBullet = "Simple bullet";
        expect(
            getScaledBulletSize([shortBullet], TEXT_SCALE_CONFIG.compactBullet)
        ).toBe("text-base");
    });
});

describe("getScaledBulletSize", () => {
    it("returns base size for empty array", () => {
        const result = getScaledBulletSize([], TEXT_SCALE_CONFIG.bullet);
        expect(result).toBe("text-lg");
    });

    it("returns base size when all bullets are short", () => {
        const bullets = ["Short one", "Short two", "Short three"];
        const result = getScaledBulletSize(bullets, TEXT_SCALE_CONFIG.bullet);
        expect(result).toBe("text-lg");
    });

    it("scales based on longest bullet", () => {
        const bullets = [
            "Short",
            "This is a much longer bullet point that will determine the overall text size here",
        ];
        // Longest bullet has 15 words, between medium (12) and small (18) threshold
        expect(countWords(bullets[1])).toBe(15);
        const result = getScaledBulletSize(bullets, TEXT_SCALE_CONFIG.bullet);
        expect(result).toBe("text-base");
    });

    it("returns smallest size when any bullet is very long", () => {
        const bullets = [
            "Short",
            "This is an extremely long bullet point that has way too many words and will definitely exceed the small threshold limit",
        ];
        expect(countWords(bullets[1])).toBeGreaterThan(18);
        const result = getScaledBulletSize(bullets, TEXT_SCALE_CONFIG.bullet);
        expect(result).toBe("text-sm");
    });
});

describe("isAtMinimumSize", () => {
    it("returns false for short text", () => {
        expect(isAtMinimumSize("Short title", TEXT_SCALE_CONFIG.title)).toBe(false);
    });

    it("returns false for medium text", () => {
        const mediumText =
            "One two three four five six seven eight nine ten eleven twelve";
        expect(countWords(mediumText)).toBe(12);
        expect(isAtMinimumSize(mediumText, TEXT_SCALE_CONFIG.title)).toBe(false);
    });

    it("returns true for text exceeding small threshold", () => {
        const longText =
            "One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen";
        expect(countWords(longText)).toBe(15);
        expect(isAtMinimumSize(longText, TEXT_SCALE_CONFIG.title)).toBe(true);
    });
});

describe("hasMinimumSizeBullets", () => {
    it("returns false for empty array", () => {
        expect(hasMinimumSizeBullets([], TEXT_SCALE_CONFIG.bullet)).toBe(false);
    });

    it("returns false when all bullets are short", () => {
        const bullets = ["Short one", "Short two"];
        expect(hasMinimumSizeBullets(bullets, TEXT_SCALE_CONFIG.bullet)).toBe(false);
    });

    it("returns true when any bullet exceeds threshold", () => {
        const bullets = [
            "Short",
            "This is an extremely long bullet point with way too many words in it that definitely exceeds the small threshold limit",
        ];
        expect(countWords(bullets[1])).toBeGreaterThan(18);
        expect(hasMinimumSizeBullets(bullets, TEXT_SCALE_CONFIG.bullet)).toBe(true);
    });
});
