import { describe, it, expect } from "vitest";
import { getContrastColor, getSecondaryTextColor } from "@/lib/utils/color-contrast";

describe("Color Contrast Utility", () => {
    describe("getContrastColor", () => {
        it("returns dark text for light backgrounds", () => {
            const result = getContrastColor("#FFFFFF");
            expect(result).toContain("12%");
        });

        it("returns light text for dark backgrounds", () => {
            const result = getContrastColor("#000000");
            expect(result).toContain("100%");
        });

        it("handles hex colors", () => {
            const result = getContrastColor("#FF0000");
            expect(typeof result).toBe("string");
        });

        it("handles HSL colors", () => {
            const result = getContrastColor("hsl(0 0% 50%)");
            expect(typeof result).toBe("string");
        });

        it("handles RGB colors", () => {
            const result = getContrastColor("rgb(255, 255, 255)");
            expect(typeof result).toBe("string");
        });

        it("defaults to dark text for invalid colors", () => {
            const result = getContrastColor("invalid");
            expect(result).toContain("12%");
        });
    });

    describe("getSecondaryTextColor", () => {
        it("returns muted text for light backgrounds", () => {
            const result = getSecondaryTextColor("#FFFFFF");
            expect(result).toContain("45%");
        });

        it("returns muted light text for dark backgrounds", () => {
            const result = getSecondaryTextColor("#000000");
            expect(result).toContain("75%");
        });
    });
});
