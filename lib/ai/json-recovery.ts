/**
 * JSON Recovery & Type Coercion Utilities
 *
 * Provides robust parsing and type coercion for AI-generated JSON responses.
 * Handles common malformation patterns from LLM outputs.
 */

import { logger } from "@/lib/logger";

/**
 * Attempts to parse JSON with multiple recovery strategies.
 * Falls back through progressively more aggressive cleanup.
 */
export function parseJSONWithRecovery<T>(text: string): T {
    // Strategy 1: Direct parse (most common case)
    try {
        return JSON.parse(text) as T;
    } catch {
        // Continue to recovery strategies
    }

    // Strategy 2: Remove markdown code block wrapping
    const unwrapped = text
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?\s*```$/i, "")
        .trim();

    try {
        return JSON.parse(unwrapped) as T;
    } catch {
        // Continue to more aggressive recovery
    }

    // Strategy 3: Fix common JSON malformations
    const fixed = fixCommonJSONIssues(unwrapped);

    try {
        return JSON.parse(fixed) as T;
    } catch {
        // Continue to extraction strategy
    }

    // Strategy 4: Extract JSON from text (LLM sometimes adds explanatory text)
    const extracted = extractJSONFromText(unwrapped);
    if (extracted) {
        try {
            return JSON.parse(extracted) as T;
        } catch {
            // Final fallback
        }
    }

    // Strategy 5: Attempt to fix truncated JSON
    const repaired = repairTruncatedJSON(fixed);
    try {
        return JSON.parse(repaired) as T;
    } catch (error) {
        logger.error(
            {
                originalLength: text.length,
                preview: text.substring(0, 200),
                error: error instanceof Error ? error.message : "Unknown",
            },
            "All JSON recovery strategies failed"
        );
        throw new Error(
            "Unable to parse response. The AI returned invalid data format."
        );
    }
}

/**
 * Fix common JSON issues from LLM outputs
 */
function fixCommonJSONIssues(text: string): string {
    return (
        text
            // Replace [Object] artifacts with null
            .replace(/:\s*\[Object\]/gi, ": null")
            .replace(/:\s*\[object Object\]/gi, ": null")
            // Remove trailing commas before closing brackets
            .replace(/,(\s*[}\]])/g, "$1")
            // Fix unquoted keys (common in LLM output)
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3')
            // Fix single quotes to double quotes (but not in string content)
            .replace(
                /:\s*'([^'\\]*(\\.[^'\\]*)*)'/g,
                (_, content) => `: "${content.replace(/"/g, '\\"')}"`
            )
            // Fix unescaped newlines in strings
            .replace(
                /"([^"]*(?:\\.[^"]*)*)"/g,
                (match) =>
                    match
                        .replace(/\n/g, "\\n")
                        .replace(/\r/g, "\\r")
                        .replace(/\t/g, "\\t")
            )
            // Remove control characters
            // eslint-disable-next-line no-control-regex
            .replace(/[\x00-\x1F\x7F]/g, (char) =>
                char === "\n" || char === "\r" || char === "\t" ? char : ""
            )
    );
}

/**
 * Extract JSON object or array from text that may contain other content
 */
function extractJSONFromText(text: string): string | null {
    // Find JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        return objectMatch[0];
    }

    // Find JSON array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
        return arrayMatch[0];
    }

    return null;
}

/**
 * Attempt to repair truncated JSON by closing open brackets
 */
function repairTruncatedJSON(text: string): string {
    let result = text.trim();

    // Remove trailing incomplete string
    if (result.match(/:\s*"[^"]*$/)) {
        result = result.replace(/:\s*"[^"]*$/, ': null');
    }

    // Count and balance brackets
    const openBraces = (result.match(/{/g) || []).length;
    const closeBraces = (result.match(/}/g) || []).length;
    const openBrackets = (result.match(/\[/g) || []).length;
    const closeBrackets = (result.match(/\]/g) || []).length;

    // Add missing closing brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
        result += "]";
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
        result += "}";
    }

    // Remove trailing comma before added brackets
    result = result.replace(/,(\s*[}\]])/g, "$1");

    return result;
}

/**
 * Convert any value to a string, handling objects and arrays gracefully
 */
export function coerceToString(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        // Check for "[Object]" artifacts
        if (
            trimmed === "[Object]" ||
            trimmed === "[object Object]" ||
            trimmed === "null" ||
            trimmed === "undefined"
        ) {
            return null;
        }
        return trimmed || null;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (Array.isArray(value)) {
        // Join array elements into a string
        return value
            .map((item) => coerceToString(item))
            .filter(Boolean)
            .join("\n\n");
    }

    if (typeof value === "object") {
        // Try to extract text content from object
        const obj = value as Record<string, unknown>;
        if (obj.content) return coerceToString(obj.content);
        if (obj.text) return coerceToString(obj.text);
        if (obj.value) return coerceToString(obj.value);
        if (obj.description) return coerceToString(obj.description);

        // Last resort: stringify
        try {
            const str = JSON.stringify(value);
            return str !== "{}" ? str : null;
        } catch {
            return null;
        }
    }

    return null;
}

/**
 * Convert any value to a string array, handling various input formats
 */
export function coerceToStringArray(
    value: unknown,
    options: {
        minItems?: number;
        maxItems?: number;
        splitDelimiters?: RegExp;
    } = {}
): string[] {
    const {
        minItems = 0,
        maxItems = 20,
        splitDelimiters = /[\n\r]+|(?:\d+[.)]\s+)|(?:[•\-*]\s+)/,
    } = options;

    let items: string[] = [];

    if (Array.isArray(value)) {
        items = value
            .map((item) => coerceToString(item))
            .filter((s): s is string => s !== null && s.length > 0);
    } else if (typeof value === "string") {
        // Check for "[Object]" artifacts
        if (
            value.trim() === "[Object]" ||
            value.trim() === "[object Object]"
        ) {
            return [];
        }

        // Try to parse as JSON array first
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return coerceToStringArray(parsed, options);
            }
        } catch {
            // Not JSON, split by delimiters
        }

        // Split by common delimiters
        items = value
            .split(splitDelimiters)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && s.length < 1000); // Filter out garbage
    } else if (typeof value === "object" && value !== null) {
        // Convert object values to array
        const obj = value as Record<string, unknown>;
        items = Object.values(obj)
            .map((v) => coerceToString(v))
            .filter((s): s is string => s !== null && s.length > 0);
    }

    // Apply limits
    if (items.length < minItems) {
        // If we don't have enough items, try harder to split
        const combined = items.join(" ");
        const sentences = combined
            .split(/[.!?]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 10);
        if (sentences.length >= minItems) {
            items = sentences;
        }
    }

    return items.slice(0, maxItems);
}

/**
 * Convert any value to a number, with robust parsing
 */
export function coerceToNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "number") {
        return isNaN(value) ? null : value;
    }

    if (typeof value === "string") {
        // Remove currency symbols and formatting
        const cleaned = value
            .replace(/[\$€£¥₹,\s]/g, "")
            .replace(/k$/i, "000")
            .replace(/m$/i, "000000");

        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }

    return null;
}

/**
 * Extract pricing from various formats
 */
export function extractPricing(
    value: unknown
): { regular: number | null; webinar: number | null } {
    const defaultPricing = { regular: null, webinar: null };

    if (value === null || value === undefined) {
        return defaultPricing;
    }

    // Already correct structure
    if (typeof value === "object" && value !== null) {
        const obj = value as Record<string, unknown>;
        if ("regular" in obj || "webinar" in obj) {
            return {
                regular: coerceToNumber(obj.regular),
                webinar: coerceToNumber(obj.webinar),
            };
        }
    }

    // Extract from string
    if (typeof value === "string") {
        const prices = extractAllPrices(value);
        return {
            regular: prices[0] ?? null,
            webinar: prices[1] ?? null,
        };
    }

    return defaultPricing;
}

/**
 * Extract all price values from text
 */
function extractAllPrices(text: string): number[] {
    const prices: number[] = [];

    // Match various price formats: $5000, $5,000, $5.99, €5000, 5k, etc.
    const regex =
        /[\$€£¥₹]?\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)\s*([kKmM])?/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        let priceStr = match[1].replace(/[,\s]/g, "");
        const suffix = match[2]?.toLowerCase();

        if (suffix === "k") {
            priceStr += "000";
        } else if (suffix === "m") {
            priceStr += "000000";
        }

        const price = parseInt(priceStr, 10);
        // Sanity check: reasonable price range
        if (!isNaN(price) && price > 0 && price < 10000000) {
            prices.push(price);
        }
    }

    // Remove duplicates and sort
    return [...new Set(prices)].sort((a, b) => b - a); // Descending (regular usually higher)
}

/**
 * Normalize objections array from various formats
 */
export function normalizeObjections(
    value: unknown
): Array<{ objection: string; response: string }> {
    if (!value) return [];

    // Already correct array structure
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === "string") {
                    return { objection: item, response: "" };
                }
                if (typeof item === "object" && item !== null) {
                    const obj = item as Record<string, unknown>;
                    return {
                        objection: coerceToString(
                            obj.objection || obj.text || obj.question || ""
                        ) || "",
                        response: coerceToString(
                            obj.response || obj.answer || obj.reply || ""
                        ) || "",
                    };
                }
                return null;
            })
            .filter(
                (item): item is { objection: string; response: string } =>
                    item !== null && item.objection.length > 0
            );
    }

    // Object with numbered keys or named keys
    if (typeof value === "object" && value !== null) {
        const obj = value as Record<string, unknown>;
        return Object.entries(obj)
            .filter(([key]) => !key.startsWith("_"))
            .map(([, val]) => {
                const str = coerceToString(val);
                return str ? { objection: str, response: "" } : null;
            })
            .filter(
                (item): item is { objection: string; response: string } =>
                    item !== null
            );
    }

    // String - try to split
    if (typeof value === "string") {
        return value
            .split(/[\n\r]+/)
            .map((line) => line.trim())
            .filter((line) => line.length > 10)
            .map((line) => ({ objection: line, response: "" }));
    }

    return [];
}
