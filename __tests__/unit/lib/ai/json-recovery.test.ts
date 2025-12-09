/**
 * JSON Recovery System Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    recoverJSON,
    extractPricing,
    coerceToStringArray,
    normalizeObjections,
    normalizePricing,
} from "@/lib/ai/json-recovery";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe("JSON Recovery System", () => {
    describe("recoverJSON", () => {
        describe("Direct Parse (Strategy 1)", () => {
            it("should parse valid JSON directly", () => {
                const result = recoverJSON('{"name": "test", "value": 123}');
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ name: "test", value: 123 });
                expect(result.strategy).toBe("direct");
            });

            it("should parse valid JSON array", () => {
                const result = recoverJSON("[1, 2, 3]");
                expect(result.success).toBe(true);
                expect(result.data).toEqual([1, 2, 3]);
            });

            it("should handle nested objects", () => {
                const json = '{"outer": {"inner": {"deep": "value"}}}';
                const result = recoverJSON(json);
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ outer: { inner: { deep: "value" } } });
            });
        });

        describe("Markdown Extraction (Strategy 2)", () => {
            it("should extract JSON from ```json code block", () => {
                const content =
                    'Here is the response:\n```json\n{"key": "value"}\n```\nDone.';
                const result = recoverJSON(content);
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ key: "value" });
                expect(result.strategy).toBe("markdown_extraction");
            });

            it("should extract JSON from plain ``` code block", () => {
                const content = '```\n{"data": [1, 2, 3]}\n```';
                const result = recoverJSON(content);
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ data: [1, 2, 3] });
            });

            it("should handle code block with extra whitespace", () => {
                const content = '```json\n  \n{"spaced": true}\n  \n```';
                const result = recoverJSON(content);
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ spaced: true });
            });
        });

        describe("Trailing Comma Fix (Strategy 3)", () => {
            it("should fix trailing comma in object", () => {
                const result = recoverJSON('{"a": 1, "b": 2,}');
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ a: 1, b: 2 });
                expect(result.strategy).toBe("trailing_comma_fix");
            });

            it("should fix trailing comma in array", () => {
                const result = recoverJSON("[1, 2, 3,]");
                expect(result.success).toBe(true);
                expect(result.data).toEqual([1, 2, 3]);
            });

            it("should fix multiple trailing commas", () => {
                const result = recoverJSON('{"items": [1, 2, 3,,],}');
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ items: [1, 2, 3] });
            });
        });

        describe("Unquoted Key Fix (Strategy 4)", () => {
            it("should fix unquoted keys", () => {
                const result = recoverJSON('{name: "test", value: 123}');
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ name: "test", value: 123 });
                expect(result.strategy).toBe("unquoted_key_fix");
            });

            it("should handle nested unquoted keys", () => {
                const result = recoverJSON('{outer: {inner: "value"}}');
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ outer: { inner: "value" } });
            });

            it("should not break URLs with colons", () => {
                const result = recoverJSON('{"url": "https://example.com"}');
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ url: "https://example.com" });
            });
        });

        describe("Truncation Repair (Strategy 5)", () => {
            it("should close unclosed object", () => {
                const result = recoverJSON('{"name": "test"');
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ name: "test" });
                expect(result.strategy).toBe("truncation_repair");
            });

            it("should close unclosed array", () => {
                const result = recoverJSON("[1, 2, 3");
                expect(result.success).toBe(true);
                expect(result.data).toEqual([1, 2, 3]);
            });

            it("should close multiple unclosed brackets", () => {
                const result = recoverJSON('{"items": [1, 2, {"nested": "value"');
                expect(result.success).toBe(true);
                expect((result.data as { items: unknown[] }).items.length).toBe(3);
            });

            it("should handle truncated string", () => {
                const result = recoverJSON('{"text": "incomplete');
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ text: "incomplete" });
            });

            it("should remove trailing comma before closing", () => {
                const result = recoverJSON('{"a": 1, "b": 2,');
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ a: 1, b: 2 });
            });
        });

        describe("Combined Fixes (Strategy 6)", () => {
            it("should apply multiple fixes together", () => {
                const content = '```json\n{name: "test", items: [1, 2,],}\n```';
                const result = recoverJSON(content);
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ name: "test", items: [1, 2] });
            });
        });

        describe("[Object] Placeholder Cleaning", () => {
            it("should replace [Object] with null", () => {
                const result = recoverJSON('{"value": "[Object]"}');
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ value: null });
            });

            it("should replace [object Object] with null", () => {
                const result = recoverJSON('{"value": "[object Object]"}');
                expect(result.success).toBe(true);
                expect(result.data).toEqual({ value: null });
            });

            it("should clean nested [Object] placeholders", () => {
                const result = recoverJSON(
                    '{"outer": {"inner": "[Object]"}, "array": ["[object Object]", "valid"]}'
                );
                expect(result.success).toBe(true);
                expect(result.data).toEqual({
                    outer: { inner: null },
                    array: [null, "valid"],
                });
            });
        });

        describe("Error Handling", () => {
            it("should return error for empty string", () => {
                const result = recoverJSON("");
                expect(result.success).toBe(false);
                expect(result.error).toContain("Invalid input");
            });

            it("should return error for null input", () => {
                const result = recoverJSON(null as unknown as string);
                expect(result.success).toBe(false);
            });

            it("should return error for completely invalid content", () => {
                const result = recoverJSON("This is not JSON at all");
                expect(result.success).toBe(false);
                expect(result.error).toContain("Unable to recover");
            });
        });
    });

    describe("extractPricing", () => {
        it("should extract single price", () => {
            const result = extractPricing("The price is $5000");
            expect(result.regular).toBe(5000);
        });

        it("should extract multiple prices", () => {
            const result = extractPricing("Regular price: $5000, Special offer: $3000");
            expect(result.regular).toBe(5000);
            expect(result.webinar).toBe(3000);
        });

        it("should handle comma-separated numbers", () => {
            const result = extractPricing("$5,000 or $3,500");
            expect(result.regular).toBe(5000);
            expect(result.webinar).toBe(3500);
        });

        it("should handle prices without dollar sign", () => {
            const result = extractPricing("2997 dollars");
            expect(result.regular).toBe(2997);
        });

        it("should return null for no prices", () => {
            const result = extractPricing("No price mentioned");
            expect(result.regular).toBeNull();
            expect(result.webinar).toBeNull();
        });

        it("should handle decimal prices", () => {
            const result = extractPricing("$99.99");
            expect(result.regular).toBe(99.99);
        });

        it("should return null for invalid input", () => {
            const result = extractPricing(null as unknown as string);
            expect(result.regular).toBeNull();
            expect(result.webinar).toBeNull();
        });
    });

    describe("coerceToStringArray", () => {
        it("should return empty array for null", () => {
            expect(coerceToStringArray(null)).toEqual([]);
        });

        it("should return empty array for undefined", () => {
            expect(coerceToStringArray(undefined)).toEqual([]);
        });

        it("should wrap string in array", () => {
            expect(coerceToStringArray("single item")).toEqual(["single item"]);
        });

        it("should split string by newlines", () => {
            expect(coerceToStringArray("item 1\nitem 2\nitem 3")).toEqual([
                "item 1",
                "item 2",
                "item 3",
            ]);
        });

        it("should split string by semicolons", () => {
            expect(coerceToStringArray("a; b; c")).toEqual(["a", "b", "c"]);
        });

        it("should split numbered lists", () => {
            expect(coerceToStringArray("1. First 2. Second 3. Third")).toEqual([
                "First",
                "Second",
                "Third",
            ]);
        });

        it("should pass through array of strings", () => {
            expect(coerceToStringArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
        });

        it("should filter out [Object] placeholders", () => {
            expect(
                coerceToStringArray(["valid", "[Object]", "[object Object]"])
            ).toEqual(["valid"]);
        });

        it("should convert objects to JSON strings", () => {
            const result = coerceToStringArray([{ key: "value" }]);
            expect(result[0]).toBe('{"key":"value"}');
        });

        it("should return empty array for [Object] string", () => {
            expect(coerceToStringArray("[Object]")).toEqual([]);
        });
    });

    describe("normalizeObjections", () => {
        it("should return empty array for null", () => {
            expect(normalizeObjections(null)).toEqual([]);
        });

        it("should handle array of objects with objection/response", () => {
            const input = [
                { objection: "Too expensive", response: "Consider the value" },
                { objection: "No time", response: "Flexible schedule" },
            ];
            expect(normalizeObjections(input)).toEqual(input);
        });

        it("should handle array of strings", () => {
            const result = normalizeObjections(["objection 1", "objection 2"]);
            expect(result).toEqual([
                { objection: "objection 1", response: "" },
                { objection: "objection 2", response: "" },
            ]);
        });

        it("should clean [Object] placeholders in objections", () => {
            const input = [
                { objection: "[Object]", response: "valid response" },
                { objection: "valid", response: "[object Object]" },
            ];
            const result = normalizeObjections(input);
            expect(result).toEqual([
                { objection: "", response: "valid response" },
                { objection: "valid", response: "" },
            ]);
        });

        it("should parse JSON string", () => {
            const input = '[{"objection": "test", "response": "answer"}]';
            const result = normalizeObjections(input);
            expect(result).toEqual([{ objection: "test", response: "answer" }]);
        });

        it("should handle single string", () => {
            const result = normalizeObjections("Single objection");
            expect(result).toEqual([{ objection: "Single objection", response: "" }]);
        });

        it("should handle single object", () => {
            const result = normalizeObjections({
                objection: "test",
                response: "answer",
            });
            expect(result).toEqual([{ objection: "test", response: "answer" }]);
        });

        it("should filter out empty objections", () => {
            const input = [
                { objection: "", response: "" },
                { objection: "valid", response: "response" },
            ];
            const result = normalizeObjections(input);
            expect(result).toEqual([{ objection: "valid", response: "response" }]);
        });
    });

    describe("normalizePricing", () => {
        it("should return null values for null input", () => {
            expect(normalizePricing(null)).toEqual({ regular: null, webinar: null });
        });

        it("should return null values for undefined input", () => {
            expect(normalizePricing(undefined)).toEqual({
                regular: null,
                webinar: null,
            });
        });

        it("should extract from string", () => {
            const result = normalizePricing("$5,000 regular, $3,000 webinar");
            expect(result.regular).toBe(5000);
            expect(result.webinar).toBe(3000);
        });

        it("should handle single number", () => {
            expect(normalizePricing(2997)).toEqual({ regular: 2997, webinar: null });
        });

        it("should handle object with numeric values", () => {
            expect(normalizePricing({ regular: 5000, webinar: 3000 })).toEqual({
                regular: 5000,
                webinar: 3000,
            });
        });

        it("should handle object with string values", () => {
            expect(normalizePricing({ regular: "$5,000", webinar: "3000" })).toEqual({
                regular: 5000,
                webinar: 3000,
            });
        });

        it("should handle partial object", () => {
            expect(normalizePricing({ regular: 5000 })).toEqual({
                regular: 5000,
                webinar: null,
            });
        });

        it("should handle invalid string values", () => {
            expect(
                normalizePricing({ regular: "not a number", webinar: null })
            ).toEqual({
                regular: null,
                webinar: null,
            });
        });
    });
});
