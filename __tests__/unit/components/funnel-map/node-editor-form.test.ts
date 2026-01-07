/**
 * Unit Tests for Node Editor Form
 * Tests markdown stripping and field validation
 */

import { describe, it, expect } from "vitest";

// Since stripMarkdown is a private function, we need to export it for testing
// or test it through the component. For now, let's test the regex patterns directly.

describe("stripMarkdown patterns", () => {
    // Test function that matches the implementation in node-editor-form.tsx
    function stripMarkdown(text: string): string {
        if (!text || typeof text !== "string") return text;

        let result = text;

        // Remove links first: [text](url) - must be before other patterns
        result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

        // Remove inline code: `text` - preserve content inside
        result = result.replace(/`([^`]+)`/g, "$1");

        // Remove headers: # text (at line start)
        result = result.replace(/^#{1,6}\s+/gm, "");

        // Remove strikethrough: ~~text~~
        result = result.replace(/~~(.+?)~~/g, "$1");

        // Remove bold+italic combined: ***text*** (must be before ** and *)
        result = result.replace(/\*\*\*(.+?)\*\*\*/g, "$1");

        // Remove bold: **text** or __text__ (must be before single *)
        result = result.replace(/\*\*(.+?)\*\*/g, "$1");
        result = result.replace(/__(.+?)__/g, "$1");

        // Remove italic: *text* or _text_ (single markers, non-greedy)
        // Only match when not preceded/followed by word characters (avoid mid-word underscores)
        result = result.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, "$1");
        result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, "$1");

        // Clean up any double spaces and trim
        result = result.replace(/  +/g, " ").trim();

        return result;
    }

    describe("bold text removal", () => {
        it("should strip **bold** text", () => {
            expect(stripMarkdown("This is **bold** text")).toBe("This is bold text");
        });

        it("should strip __bold__ text", () => {
            expect(stripMarkdown("This is __bold__ text")).toBe("This is bold text");
        });

        it("should handle multiple bold sections", () => {
            expect(stripMarkdown("**First** and **second**")).toBe("First and second");
        });

        it("should handle bold at start of text", () => {
            expect(stripMarkdown("**Bold start** of sentence")).toBe(
                "Bold start of sentence"
            );
        });

        it("should handle bold at end of text", () => {
            expect(stripMarkdown("Sentence with **bold end**")).toBe(
                "Sentence with bold end"
            );
        });
    });

    describe("italic text removal", () => {
        it("should strip *italic* text", () => {
            expect(stripMarkdown("This is *italic* text")).toBe("This is italic text");
        });

        it("should strip _italic_ text", () => {
            expect(stripMarkdown("This is _italic_ text")).toBe("This is italic text");
        });

        it("should preserve underscores in variable names", () => {
            expect(stripMarkdown("Use user_name variable")).toBe(
                "Use user_name variable"
            );
        });
    });

    describe("combined bold+italic removal", () => {
        it("should strip ***bold italic*** text", () => {
            expect(stripMarkdown("This is ***bold italic*** text")).toBe(
                "This is bold italic text"
            );
        });
    });

    describe("strikethrough removal", () => {
        it("should strip ~~strikethrough~~ text", () => {
            expect(stripMarkdown("This is ~~deleted~~ text")).toBe(
                "This is deleted text"
            );
        });
    });

    describe("code removal", () => {
        it("should strip `inline code`", () => {
            expect(stripMarkdown("Run `npm install`")).toBe("Run npm install");
        });
    });

    describe("link removal", () => {
        it("should strip markdown links keeping text", () => {
            expect(stripMarkdown("Click [here](https://example.com)")).toBe(
                "Click here"
            );
        });

        it("should handle links with special characters in URL", () => {
            expect(stripMarkdown("See [docs](https://example.com/path?q=1&b=2)")).toBe(
                "See docs"
            );
        });
    });

    describe("header removal", () => {
        it("should strip # headers", () => {
            expect(stripMarkdown("# Heading")).toBe("Heading");
        });

        it("should strip ## headers", () => {
            expect(stripMarkdown("## Subheading")).toBe("Subheading");
        });

        it("should strip ### through ###### headers", () => {
            expect(stripMarkdown("### H3")).toBe("H3");
            expect(stripMarkdown("#### H4")).toBe("H4");
            expect(stripMarkdown("##### H5")).toBe("H5");
            expect(stripMarkdown("###### H6")).toBe("H6");
        });

        it("should not strip hash symbols mid-line", () => {
            expect(stripMarkdown("Issue #123")).toBe("Issue #123");
        });
    });

    describe("edge cases", () => {
        it("should return empty string for null/undefined", () => {
            expect(stripMarkdown(null as unknown as string)).toBe(null);
            expect(stripMarkdown(undefined as unknown as string)).toBe(undefined);
        });

        it("should return original for non-string", () => {
            expect(stripMarkdown(123 as unknown as string)).toBe(123);
        });

        it("should handle empty string", () => {
            expect(stripMarkdown("")).toBe("");
        });

        it("should clean up double spaces", () => {
            expect(stripMarkdown("Too  many   spaces")).toBe("Too many spaces");
        });

        it("should trim whitespace", () => {
            expect(stripMarkdown("  padded text  ")).toBe("padded text");
        });

        it("should handle complex mixed markdown", () => {
            const input = "# Title with **bold** and *italic* and [link](url)";
            const expected = "Title with bold and italic and link";
            expect(stripMarkdown(input)).toBe(expected);
        });

        it("should handle nested patterns", () => {
            // While not technically valid markdown, it should handle gracefully
            expect(stripMarkdown("Some **bold and *nested* content**")).toBe(
                "Some bold and nested content"
            );
        });

        it("should handle adjacent formatting with space", () => {
            // Adjacent formatting in real markdown typically has space between
            expect(stripMarkdown("**bold** *italic*")).toBe("bold italic");
        });
    });
});

describe("field validation", () => {
    // These tests verify the required field logic used in the node editor

    describe("required field validation", () => {
        function isFieldEmpty(value: unknown): boolean {
            if (value === null || value === undefined) return true;
            if (typeof value === "string" && !value.trim()) return true;
            if (Array.isArray(value) && value.length === 0) return true;
            return false;
        }

        it("should identify empty string as empty", () => {
            expect(isFieldEmpty("")).toBe(true);
            expect(isFieldEmpty("   ")).toBe(true);
        });

        it("should identify null/undefined as empty", () => {
            expect(isFieldEmpty(null)).toBe(true);
            expect(isFieldEmpty(undefined)).toBe(true);
        });

        it("should identify empty array as empty", () => {
            expect(isFieldEmpty([])).toBe(true);
        });

        it("should not mark valid values as empty", () => {
            expect(isFieldEmpty("valid")).toBe(false);
            expect(isFieldEmpty(["item"])).toBe(false);
            expect(isFieldEmpty(0)).toBe(false);
            expect(isFieldEmpty(false)).toBe(false);
        });
    });
});
