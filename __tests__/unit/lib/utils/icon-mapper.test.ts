import { describe, it, expect } from "vitest";
import {
    ICON_MAP,
    ICON_SVG_STRINGS,
    emojiToIconName,
    getIconSvg,
    emojiToSvg,
} from "@/lib/utils/icon-mapper";

describe("Icon Mapper Utility", () => {
    describe("ICON_MAP", () => {
        it("exports icon mapping object", () => {
            expect(ICON_MAP).toBeDefined();
            expect(typeof ICON_MAP).toBe("object");
        });

        it("maps common emojis", () => {
            expect(ICON_MAP["🎯"]).toBe("target");
            expect(ICON_MAP["⚡"]).toBe("zap");
            expect(ICON_MAP["🚀"]).toBe("rocket");
        });
    });

    describe("ICON_SVG_STRINGS", () => {
        it("exports SVG strings object", () => {
            expect(ICON_SVG_STRINGS).toBeDefined();
            expect(typeof ICON_SVG_STRINGS).toBe("object");
        });

        it("contains valid SVG strings", () => {
            expect(ICON_SVG_STRINGS["target"]).toContain("<svg");
            expect(ICON_SVG_STRINGS["target"]).toContain("</svg>");
        });
    });

    describe("emojiToIconName", () => {
        it("converts emoji to icon name", () => {
            expect(emojiToIconName("🎯")).toBe("target");
            expect(emojiToIconName("⚡")).toBe("zap");
        });

        it("returns default for unknown emoji", () => {
            expect(emojiToIconName("🦄")).toBe("circle");
        });
    });

    describe("getIconSvg", () => {
        it("returns SVG string for icon name", () => {
            const svg = getIconSvg("target");
            expect(svg).toContain("<svg");
        });

        it("returns default for unknown icon", () => {
            const svg = getIconSvg("unknown");
            expect(svg).toContain("<svg");
        });
    });

    describe("emojiToSvg", () => {
        it("converts emoji directly to SVG", () => {
            const svg = emojiToSvg("🎯");
            expect(svg).toContain("<svg");
        });
    });
});
