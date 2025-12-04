import { describe, it, expect } from "vitest";
import {
    DESIGN_SYSTEM_GUIDELINES,
    ICON_USAGE_GUIDELINES,
} from "@/lib/ai/design-system-guidelines";

describe("Design System Guidelines", () => {
    describe("DESIGN_SYSTEM_GUIDELINES", () => {
        it("exports guidelines string", () => {
            expect(typeof DESIGN_SYSTEM_GUIDELINES).toBe("string");
            expect(DESIGN_SYSTEM_GUIDELINES.length).toBeGreaterThan(0);
        });

        it("contains spacing guidelines", () => {
            expect(DESIGN_SYSTEM_GUIDELINES).toContain("Spacing");
            expect(DESIGN_SYSTEM_GUIDELINES).toContain("py-24");
        });

        it("contains typography guidelines", () => {
            expect(DESIGN_SYSTEM_GUIDELINES).toContain("Typography");
            expect(DESIGN_SYSTEM_GUIDELINES).toContain("H1");
        });

        it("contains color guidelines", () => {
            expect(DESIGN_SYSTEM_GUIDELINES).toContain("Colors");
            expect(DESIGN_SYSTEM_GUIDELINES).toContain("hsl");
        });

        it("contains icon guidelines", () => {
            expect(DESIGN_SYSTEM_GUIDELINES).toContain("Icons");
            expect(DESIGN_SYSTEM_GUIDELINES).toContain("Lucide");
        });
    });

    describe("ICON_USAGE_GUIDELINES", () => {
        it("exports icon usage string", () => {
            expect(typeof ICON_USAGE_GUIDELINES).toBe("string");
            expect(ICON_USAGE_GUIDELINES.length).toBeGreaterThan(0);
        });

        it("warns against emoji usage", () => {
            expect(ICON_USAGE_GUIDELINES).toContain("Never use emoji");
        });

        it("provides icon name examples", () => {
            expect(ICON_USAGE_GUIDELINES).toContain("target");
            expect(ICON_USAGE_GUIDELINES).toContain("zap");
        });
    });
});
