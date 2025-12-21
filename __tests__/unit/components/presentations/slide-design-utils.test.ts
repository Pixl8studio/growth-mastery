/**
 * Unit tests for slide-design-utils.ts
 * Tests color manipulation, gradient generation, and accessibility utilities
 */

import { describe, it, expect } from "vitest";
import {
    hexToRgb,
    lightenColor,
    darkenColor,
    generateBrandGradient,
    getBrandTextColors,
    getContrastRatio,
    meetsWCAGContrast,
    FALLBACK_GRADIENTS,
    FALLBACK_TEXT_COLORS,
} from "@/components/presentations/slide-design-utils";
import type {
    BrandDesign,
    SlideLayoutType,
} from "@/components/presentations/slide-types";

describe("hexToRgb", () => {
    it("converts valid 6-digit hex colors with hash", () => {
        expect(hexToRgb("#ff5733")).toEqual({ r: 255, g: 87, b: 51 });
        expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
        expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
        expect(hexToRgb("#1a1a2e")).toEqual({ r: 26, g: 26, b: 46 });
    });

    it("converts valid 6-digit hex colors without hash", () => {
        expect(hexToRgb("ff5733")).toEqual({ r: 255, g: 87, b: 51 });
        expect(hexToRgb("000000")).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("handles uppercase hex values", () => {
        expect(hexToRgb("#FF5733")).toEqual({ r: 255, g: 87, b: 51 });
        expect(hexToRgb("#ABCDEF")).toEqual({ r: 171, g: 205, b: 239 });
    });

    it("returns null for invalid hex values", () => {
        expect(hexToRgb("invalid")).toBeNull();
        expect(hexToRgb("#fff")).toBeNull(); // 3-digit not supported
        expect(hexToRgb("#gggggg")).toBeNull();
        expect(hexToRgb("")).toBeNull();
        expect(hexToRgb("#12345")).toBeNull(); // 5 digits
        expect(hexToRgb("#1234567")).toBeNull(); // 7 digits
    });
});

describe("lightenColor", () => {
    it("lightens colors by specified percentage", () => {
        // Black lightened by 50% should be mid-gray
        expect(lightenColor("#000000", 50)).toBe("rgb(128, 128, 128)");

        // Black lightened by 100% should be white
        expect(lightenColor("#000000", 100)).toBe("rgb(255, 255, 255)");

        // White lightened stays white
        expect(lightenColor("#ffffff", 50)).toBe("rgb(255, 255, 255)");
    });

    it("handles 0% lightening (no change)", () => {
        expect(lightenColor("#808080", 0)).toBe("rgb(128, 128, 128)");
    });

    it("returns original hex for invalid input", () => {
        expect(lightenColor("invalid", 50)).toBe("invalid");
    });

    it("caps RGB values at 255", () => {
        // Even with very high percentages, values should not exceed 255
        const result = lightenColor("#ff0000", 200);
        expect(result).toBe("rgb(255, 255, 255)");
    });
});

describe("darkenColor", () => {
    it("darkens colors by specified percentage", () => {
        // White darkened by 50% should be mid-gray
        expect(darkenColor("#ffffff", 50)).toBe("rgb(128, 128, 128)");

        // White darkened by 100% should be black
        expect(darkenColor("#ffffff", 100)).toBe("rgb(0, 0, 0)");

        // Black darkened stays black
        expect(darkenColor("#000000", 50)).toBe("rgb(0, 0, 0)");
    });

    it("handles 0% darkening (no change)", () => {
        expect(darkenColor("#808080", 0)).toBe("rgb(128, 128, 128)");
    });

    it("returns original hex for invalid input", () => {
        expect(darkenColor("invalid", 50)).toBe("invalid");
    });
});

describe("generateBrandGradient", () => {
    const mockBrandDesign: BrandDesign = {
        primary_color: "#3B82F6",
        secondary_color: "#1E40AF",
        accent_color: "#60A5FA",
        background_color: "#FFFFFF",
        text_color: "#1F2937",
    };

    const allLayoutTypes: SlideLayoutType[] = [
        "title",
        "section",
        "content_left",
        "content_right",
        "bullets",
        "quote",
        "statistics",
        "comparison",
        "process",
        "cta",
    ];

    it("returns empty object when no brand design provided", () => {
        expect(generateBrandGradient("title", null)).toEqual({});
        expect(generateBrandGradient("title", undefined)).toEqual({});
    });

    it("returns empty object when brand design has no primary color", () => {
        expect(
            generateBrandGradient("title", { primary_color: "" } as BrandDesign)
        ).toEqual({});
    });

    it("generates gradient for all layout types", () => {
        allLayoutTypes.forEach((layoutType) => {
            const result = generateBrandGradient(layoutType, mockBrandDesign);
            expect(result).toHaveProperty("background");
            expect(result.background).toContain("linear-gradient");
        });
    });

    it("generates correct gradient direction for title slides", () => {
        const result = generateBrandGradient("title", mockBrandDesign);
        expect(result.background).toContain("135deg");
    });

    it("generates correct gradient direction for section slides", () => {
        const result = generateBrandGradient("section", mockBrandDesign);
        expect(result.background).toContain("120deg");
    });

    it("generates correct gradient direction for process slides", () => {
        const result = generateBrandGradient("process", mockBrandDesign);
        expect(result.background).toContain("90deg");
    });

    it("generates vertical gradient for quote slides", () => {
        const result = generateBrandGradient("quote", mockBrandDesign);
        expect(result.background).toContain("180deg");
    });

    it("handles brand design without optional colors", () => {
        const minimalBrand: BrandDesign = {
            primary_color: "#3B82F6",
            background_color: "#FFFFFF",
            text_color: "#1F2937",
        };

        allLayoutTypes.forEach((layoutType) => {
            const result = generateBrandGradient(layoutType, minimalBrand);
            expect(result).toHaveProperty("background");
        });
    });

    it("uses primary color derivatives when secondary/accent missing", () => {
        const minimalBrand: BrandDesign = {
            primary_color: "#3B82F6",
            background_color: "#FFFFFF",
            text_color: "#1F2937",
        };

        const result = generateBrandGradient("section", minimalBrand);
        // Should still contain valid gradient
        expect(result.background).toContain("linear-gradient");
        expect(result.background).toContain("rgb("); // darkened primary
    });
});

describe("getBrandTextColors", () => {
    const mockBrandDesign: BrandDesign = {
        primary_color: "#3B82F6",
        background_color: "#FFFFFF",
        text_color: "#1F2937",
    };

    it("returns white text for dark background layouts", () => {
        const darkLayouts: SlideLayoutType[] = ["title", "section", "cta"];

        darkLayouts.forEach((layoutType) => {
            const result = getBrandTextColors(layoutType, mockBrandDesign);
            expect(result.title).toBe("#FFFFFF");
            expect(result.body).toBe("rgba(255, 255, 255, 0.85)");
        });
    });

    it("returns brand text color for light background layouts", () => {
        const lightLayouts: SlideLayoutType[] = [
            "content_left",
            "content_right",
            "bullets",
            "quote",
            "statistics",
            "comparison",
            "process",
        ];

        lightLayouts.forEach((layoutType) => {
            const result = getBrandTextColors(layoutType, mockBrandDesign);
            expect(result.title).toBe("#1F2937"); // brand text color
        });
    });

    it("returns default dark text when no brand design", () => {
        const result = getBrandTextColors("bullets", null);
        expect(result.title).toBe("#1a1a2e");
        expect(result.body).toBe("#4a4a5e");
    });

    it("uses lightened text color for body when brand provided", () => {
        const result = getBrandTextColors("bullets", mockBrandDesign);
        expect(result.title).toBe("#1F2937");
        expect(result.body).toContain("rgb("); // lightened version
    });
});

describe("getContrastRatio", () => {
    it("returns 21 for black on white", () => {
        const ratio = getContrastRatio("#000000", "#FFFFFF");
        expect(ratio).toBeCloseTo(21, 0);
    });

    it("returns 1 for same colors", () => {
        const ratio = getContrastRatio("#808080", "#808080");
        expect(ratio).toBeCloseTo(1, 1);
    });

    it("handles colors regardless of order", () => {
        const ratio1 = getContrastRatio("#000000", "#FFFFFF");
        const ratio2 = getContrastRatio("#FFFFFF", "#000000");
        expect(ratio1).toEqual(ratio2);
    });

    it("handles invalid colors gracefully", () => {
        // Invalid foreground against white - treats invalid as black (luminance 0)
        // This gives max contrast, which is safe (won't hide text)
        const invalidForeground = getContrastRatio("invalid", "#FFFFFF");
        expect(invalidForeground).toBeGreaterThan(1);

        // Invalid background with black - both have luminance 0, ratio is 1
        const invalidBackground = getContrastRatio("#000000", "invalid");
        expect(invalidBackground).toBeGreaterThanOrEqual(1);

        // Both invalid - should return 1 (minimum ratio)
        const bothInvalid = getContrastRatio("invalid", "also-invalid");
        expect(bothInvalid).toBe(1);
    });
});

describe("meetsWCAGContrast", () => {
    it("passes AA for black on white", () => {
        expect(meetsWCAGContrast("#000000", "#FFFFFF", "AA")).toBe(true);
        expect(meetsWCAGContrast("#000000", "#FFFFFF", "AAA")).toBe(true);
    });

    it("uses correct thresholds for AA (4.5:1)", () => {
        // Gray that passes AA
        expect(meetsWCAGContrast("#595959", "#FFFFFF", "AA")).toBe(true);
        // Gray that fails AA
        expect(meetsWCAGContrast("#808080", "#FFFFFF", "AA")).toBe(false);
    });

    it("uses correct thresholds for AAA (7:1)", () => {
        // Black on white passes AAA (ratio ~21)
        expect(meetsWCAGContrast("#000000", "#FFFFFF", "AAA")).toBe(true);
        // Dark gray passes AAA (ratio ~9.7)
        expect(meetsWCAGContrast("#404040", "#FFFFFF", "AAA")).toBe(true);
        // Medium gray fails AAA (ratio ~4.5, passes AA but not AAA)
        expect(meetsWCAGContrast("#757575", "#FFFFFF", "AAA")).toBe(false);
    });

    it("uses AA-large threshold (3:1) for large text", () => {
        // Gray that passes AA-large but not AA
        expect(meetsWCAGContrast("#767676", "#FFFFFF", "AA-large")).toBe(true);
    });

    it("returns true for invalid colors (safe fallback)", () => {
        expect(meetsWCAGContrast("invalid", "#FFFFFF", "AA")).toBe(true);
    });
});

describe("FALLBACK_GRADIENTS", () => {
    const allLayoutTypes: SlideLayoutType[] = [
        "title",
        "section",
        "content_left",
        "content_right",
        "bullets",
        "quote",
        "statistics",
        "comparison",
        "process",
        "cta",
    ];

    it("has fallback gradient for all layout types", () => {
        allLayoutTypes.forEach((layoutType) => {
            expect(FALLBACK_GRADIENTS[layoutType]).toBeDefined();
            expect(typeof FALLBACK_GRADIENTS[layoutType]).toBe("string");
        });
    });

    it("uses Tailwind gradient classes", () => {
        Object.values(FALLBACK_GRADIENTS).forEach((gradient) => {
            expect(gradient).toMatch(/from-/);
        });
    });
});

describe("FALLBACK_TEXT_COLORS", () => {
    const allLayoutTypes: SlideLayoutType[] = [
        "title",
        "section",
        "content_left",
        "content_right",
        "bullets",
        "quote",
        "statistics",
        "comparison",
        "process",
        "cta",
    ];

    it("has fallback text colors for all layout types", () => {
        allLayoutTypes.forEach((layoutType) => {
            expect(FALLBACK_TEXT_COLORS[layoutType]).toBeDefined();
            expect(FALLBACK_TEXT_COLORS[layoutType]).toHaveProperty("title");
            expect(FALLBACK_TEXT_COLORS[layoutType]).toHaveProperty("body");
        });
    });

    it("uses Tailwind text classes", () => {
        Object.values(FALLBACK_TEXT_COLORS).forEach(({ title, body }) => {
            expect(title).toMatch(/text-/);
            expect(body).toMatch(/text-/);
        });
    });

    it("uses white text for dark layouts", () => {
        expect(FALLBACK_TEXT_COLORS.title.title).toBe("text-white");
        expect(FALLBACK_TEXT_COLORS.section.title).toBe("text-white");
        expect(FALLBACK_TEXT_COLORS.cta.title).toBe("text-white");
    });
});
