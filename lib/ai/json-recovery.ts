/**
 * JSON Recovery System
 *
 * Multi-strategy parser for recovering valid JSON from malformed,
 * markdown-wrapped, or truncated GPT responses.
 *
 * Fallback levels:
 * 1. Direct JSON.parse
 * 2. Markdown code block extraction
 * 3. Trailing comma removal
 * 4. Unquoted key repair
 * 5. Truncation repair (auto-close brackets)
 */

import { logger } from "@/lib/logger";

interface RecoveryResult<T> {
    success: boolean;
    data?: T;
    strategy?: string;
    error?: string;
}

/**
 * Strategy 1: Direct JSON parse
 */
function tryDirectParse<T>(content: string): RecoveryResult<T> {
    try {
        const data = JSON.parse(content) as T;
        return { success: true, data, strategy: "direct" };
    } catch {
        return { success: false };
    }
}

/**
 * Strategy 2: Extract JSON from markdown code blocks
 * Handles ```json ... ``` and ``` ... ``` wrappers
 */
function tryMarkdownExtraction<T>(content: string): RecoveryResult<T> {
    // Match ```json or ``` followed by JSON content
    const codeBlockPatterns = [/```json\s*([\s\S]*?)\s*```/i, /```\s*([\s\S]*?)\s*```/];

    for (const pattern of codeBlockPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
            try {
                const data = JSON.parse(match[1].trim()) as T;
                return { success: true, data, strategy: "markdown_extraction" };
            } catch {
                // Continue to next pattern
            }
        }
    }

    return { success: false };
}

/**
 * Strategy 3: Remove trailing commas
 * Handles trailing commas in arrays and objects
 */
function tryTrailingCommaFix<T>(content: string): RecoveryResult<T> {
    // Remove trailing commas before ] or }
    // Handle multiple commas, empty elements, and whitespace
    let fixed = content;

    // Repeatedly remove empty elements and trailing commas until stable
    let prev = "";
    while (prev !== fixed) {
        prev = fixed;
        // Remove empty array elements (consecutive commas)
        fixed = fixed.replace(/,\s*,/g, ",");
        // Remove trailing commas before closing brackets
        fixed = fixed.replace(/,\s*]/g, "]");
        fixed = fixed.replace(/,\s*}/g, "}");
    }

    if (fixed !== content) {
        try {
            const data = JSON.parse(fixed) as T;
            return { success: true, data, strategy: "trailing_comma_fix" };
        } catch {
            // Strategy failed
        }
    }

    return { success: false };
}

/**
 * Strategy 4: Fix unquoted keys
 * Converts { key: "value" } to { "key": "value" }
 */
function tryUnquotedKeyFix<T>(content: string): RecoveryResult<T> {
    // Match unquoted keys followed by colon
    // Be careful not to match URLs (http:, https:)
    const fixed = content.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    if (fixed !== content) {
        try {
            const data = JSON.parse(fixed) as T;
            return { success: true, data, strategy: "unquoted_key_fix" };
        } catch {
            // Strategy failed
        }
    }

    return { success: false };
}

/**
 * Strategy 5: Repair truncated JSON
 * Auto-closes unclosed brackets and braces
 */
function tryTruncationRepair<T>(content: string): RecoveryResult<T> {
    let repaired = content.trim();

    // If it doesn't start with { or [, try to find where JSON begins
    if (!repaired.startsWith("{") && !repaired.startsWith("[")) {
        const jsonStart = repaired.search(/[{[]/);
        if (jsonStart === -1) {
            return { success: false };
        }
        repaired = repaired.slice(jsonStart);
    }

    // Track structure for proper closing
    const stack: string[] = [];
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === "\\") {
            escapeNext = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (char === "{") stack.push("}");
        if (char === "[") stack.push("]");
        if (char === "}" || char === "]") stack.pop();
    }

    // Close unclosed strings
    if (inString) {
        repaired += '"';
    }

    // Remove trailing comma, colon, or incomplete key-value pair
    repaired = repaired.replace(/,\s*$/, "");
    repaired = repaired.replace(/:\s*$/, ": null");
    repaired = repaired.replace(/,\s*"[^"]*"\s*$/, ""); // Remove incomplete key at end

    // Close all unclosed brackets/braces in reverse order
    while (stack.length > 0) {
        const closer = stack.pop();
        repaired += closer;
    }

    if (repaired !== content.trim()) {
        try {
            const data = JSON.parse(repaired) as T;
            return { success: true, data, strategy: "truncation_repair" };
        } catch {
            // Strategy failed
        }
    }

    return { success: false };
}

/**
 * Strategy 6: Combined fixes
 * Apply multiple strategies together
 */
function tryCombinedFixes<T>(content: string): RecoveryResult<T> {
    let working = content;

    // First, try to extract from markdown
    const codeBlockPatterns = [/```json\s*([\s\S]*?)\s*```/i, /```\s*([\s\S]*?)\s*```/];

    for (const pattern of codeBlockPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
            working = match[1].trim();
            break;
        }
    }

    // Apply all fixes in sequence
    // 1. Fix unquoted keys
    working = working.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    // 2. Remove trailing commas and empty elements (repeatedly until stable)
    let prev = "";
    while (prev !== working) {
        prev = working;
        working = working.replace(/,\s*,/g, ",");
        working = working.replace(/,\s*]/g, "]");
        working = working.replace(/,\s*}/g, "}");
    }

    // 3. Try direct parse first
    try {
        const data = JSON.parse(working) as T;
        return { success: true, data, strategy: "combined_fixes" };
    } catch {
        // Continue to truncation repair
    }

    // 4. Try truncation repair
    const truncationResult = tryTruncationRepair<T>(working);
    if (truncationResult.success) {
        return { ...truncationResult, strategy: "combined_fixes" };
    }

    return { success: false };
}

/**
 * Clean [Object] placeholders from parsed data
 * Recursively replaces [Object] or [object Object] with null
 */
function cleanObjectPlaceholders(data: unknown): unknown {
    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data === "string") {
        // Check for [Object] or [object Object] placeholders
        if (data === "[Object]" || data === "[object Object]") {
            return null;
        }
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(cleanObjectPlaceholders);
    }

    if (typeof data === "object") {
        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            cleaned[key] = cleanObjectPlaceholders(value);
        }
        return cleaned;
    }

    return data;
}

/**
 * Main JSON recovery function
 * Attempts multiple strategies to recover valid JSON from malformed content
 */
export function recoverJSON<T = unknown>(content: string): RecoveryResult<T> {
    if (!content || typeof content !== "string") {
        return {
            success: false,
            error: "Invalid input: content must be a non-empty string",
        };
    }

    const trimmed = content.trim();

    // Define recovery strategies in order of preference
    const strategies = [
        { name: "direct", fn: () => tryDirectParse<T>(trimmed) },
        { name: "markdown", fn: () => tryMarkdownExtraction<T>(trimmed) },
        { name: "trailing_comma", fn: () => tryTrailingCommaFix<T>(trimmed) },
        { name: "unquoted_key", fn: () => tryUnquotedKeyFix<T>(trimmed) },
        { name: "truncation", fn: () => tryTruncationRepair<T>(trimmed) },
        { name: "combined", fn: () => tryCombinedFixes<T>(trimmed) },
    ];

    for (const strategy of strategies) {
        const result = strategy.fn();
        if (result.success && result.data !== undefined) {
            // Clean any [Object] placeholders
            const cleanedData = cleanObjectPlaceholders(result.data) as T;

            logger.info(
                { strategy: result.strategy, contentLength: content.length },
                "JSON recovered successfully"
            );

            return {
                success: true,
                data: cleanedData,
                strategy: result.strategy,
            };
        }
    }

    logger.warn(
        { contentLength: content.length, preview: trimmed.slice(0, 100) },
        "All JSON recovery strategies failed"
    );

    return {
        success: false,
        error: "Unable to recover valid JSON from content",
    };
}

/**
 * Extract pricing from free-form text
 * Handles various formats: $5000, $5,000, 5000, "five thousand", etc.
 */
export function extractPricing(text: string): {
    regular: number | null;
    webinar: number | null;
} {
    if (!text || typeof text !== "string") {
        return { regular: null, webinar: null };
    }

    // Match dollar amounts in various formats
    const pricePattern = /\$?\s*([\d,]+(?:\.\d{2})?)\s*(?:dollars?)?/gi;
    const matches = text.match(pricePattern);

    if (!matches || matches.length === 0) {
        return { regular: null, webinar: null };
    }

    // Extract numeric values
    const prices = matches
        .map((m) => {
            const num = m.replace(/[$,\s]/g, "").replace(/dollars?/i, "");
            const parsed = parseFloat(num);
            return isNaN(parsed) ? null : parsed;
        })
        .filter((p): p is number => p !== null && p > 0);

    // Deduplicate and sort descending (assuming higher price is regular)
    const uniquePrices = [...new Set(prices)].sort((a, b) => b - a);

    return {
        regular: uniquePrices[0] || null,
        webinar: uniquePrices[1] || uniquePrices[0] || null,
    };
}

/**
 * Coerce a value into an array of strings
 * Handles strings, arrays, and objects
 */
export function coerceToStringArray(value: unknown): string[] {
    if (value === null || value === undefined) {
        return [];
    }

    if (typeof value === "string") {
        // Check if it's actually "[Object]" placeholder
        if (value === "[Object]" || value === "[object Object]") {
            return [];
        }
        // Try to split by common delimiters
        if (value.includes("\n")) {
            return value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
        }
        if (value.includes(";")) {
            return value
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean);
        }
        // Check for numbered list format (1. item, 2. item)
        const numberedPattern = /^\d+\.\s*/;
        if (numberedPattern.test(value)) {
            return value
                .split(/\d+\.\s*/)
                .map((s) => s.trim())
                .filter(Boolean);
        }
        return [value];
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === "string") {
                    if (item === "[Object]" || item === "[object Object]") {
                        return null;
                    }
                    return item;
                }
                if (typeof item === "object" && item !== null) {
                    return JSON.stringify(item);
                }
                return String(item);
            })
            .filter((item): item is string => item !== null && item !== "");
    }

    if (typeof value === "object") {
        return [JSON.stringify(value)];
    }

    return [String(value)];
}

/**
 * Normalize objections array
 * Ensures proper { objection, response } structure
 */
export function normalizeObjections(
    value: unknown
): Array<{ objection: string; response: string }> {
    if (value === null || value === undefined) {
        return [];
    }

    if (typeof value === "string") {
        // Try to parse as JSON first
        try {
            const parsed = JSON.parse(value);
            return normalizeObjections(parsed);
        } catch {
            // Single objection without response
            return [{ objection: value, response: "" }];
        }
    }

    if (!Array.isArray(value)) {
        if (typeof value === "object") {
            const obj = value as Record<string, unknown>;
            if ("objection" in obj || "response" in obj) {
                return [
                    {
                        objection: String(obj.objection || ""),
                        response: String(obj.response || ""),
                    },
                ];
            }
        }
        return [];
    }

    return value
        .map((item) => {
            if (typeof item === "string") {
                return { objection: item, response: "" };
            }
            if (typeof item === "object" && item !== null) {
                const obj = item as Record<string, unknown>;
                // Handle [Object] placeholders
                const objection =
                    obj.objection === "[Object]" || obj.objection === "[object Object]"
                        ? ""
                        : String(obj.objection || "");
                const response =
                    obj.response === "[Object]" || obj.response === "[object Object]"
                        ? ""
                        : String(obj.response || "");
                return { objection, response };
            }
            return { objection: String(item), response: "" };
        })
        .filter((item) => item.objection || item.response);
}

/**
 * Format a value as human-readable text
 * Converts objects and arrays to formatted strings, never [object Object]
 */
export function formatValueAsText(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string") {
        // Check for [Object] placeholders
        if (value === "[Object]" || value === "[object Object]") {
            return "";
        }
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (Array.isArray(value)) {
        // Format array items as a readable list
        const formattedItems = value
            .map((item, index) => {
                if (typeof item === "string") {
                    if (item === "[Object]" || item === "[object Object]") {
                        return null;
                    }
                    return item;
                }
                if (typeof item === "object" && item !== null) {
                    return formatObjectToText(
                        item as Record<string, unknown>,
                        index + 1
                    );
                }
                return String(item);
            })
            .filter((item): item is string => item !== null && item !== "");

        return formattedItems.join("\n\n");
    }

    if (typeof value === "object") {
        return formatObjectToText(value as Record<string, unknown>);
    }

    return String(value);
}

/**
 * Format an object as human-readable text
 * Intelligently extracts meaningful content from structured objects
 */
function formatObjectToText(obj: Record<string, unknown>, itemNumber?: number): string {
    // Common field names for different object types
    const titleFields = ["title", "name", "heading", "label"];
    const contentFields = [
        "description",
        "content",
        "text",
        "quote",
        "response",
        "value",
        "details",
        "body",
    ];
    const valueFields = ["value", "price", "amount", "cost"];

    const parts: string[] = [];

    // Try to find a title/name field
    let title = "";
    for (const field of titleFields) {
        if (obj[field] && typeof obj[field] === "string") {
            title = obj[field] as string;
            break;
        }
    }

    // Try to find a content/description field
    let content = "";
    for (const field of contentFields) {
        if (obj[field] && typeof obj[field] === "string") {
            content = obj[field] as string;
            break;
        }
    }

    // Try to find a value field
    let valueStr = "";
    for (const field of valueFields) {
        if (obj[field] !== undefined && obj[field] !== null) {
            const val = obj[field];
            if (typeof val === "number") {
                valueStr = `$${val.toLocaleString()}`;
            } else if (typeof val === "string" && val !== content) {
                valueStr = val;
            }
            break;
        }
    }

    // Build the formatted string
    if (title) {
        if (itemNumber) {
            parts.push(`${itemNumber}. ${title}`);
        } else {
            parts.push(title);
        }
    } else if (itemNumber) {
        parts.push(`${itemNumber}.`);
    }

    if (valueStr && valueStr !== title) {
        parts.push(`(${valueStr})`);
    }

    if (content) {
        if (parts.length > 0) {
            parts.push(`- ${content}`);
        } else {
            parts.push(content);
        }
    }

    // If we couldn't extract structured content, fall back to key-value pairs
    if (parts.length === 0 || (parts.length === 1 && parts[0] === `${itemNumber}.`)) {
        const fallbackParts: string[] = [];
        for (const [key, val] of Object.entries(obj)) {
            if (val !== null && val !== undefined && val !== "" && val !== "[Object]") {
                if (typeof val === "string" || typeof val === "number") {
                    fallbackParts.push(`${key}: ${val}`);
                } else if (Array.isArray(val)) {
                    const items = val.filter((v) => v !== null && v !== "[Object]");
                    if (items.length > 0) {
                        fallbackParts.push(`${key}: ${items.join(", ")}`);
                    }
                }
            }
        }
        if (itemNumber && fallbackParts.length > 0) {
            return `${itemNumber}. ${fallbackParts.join(" | ")}`;
        }
        return fallbackParts.join(" | ");
    }

    return parts.join(" ");
}

/**
 * Normalize pricing object
 * Extracts numeric values from various formats
 */
export function normalizePricing(value: unknown): {
    regular: number | null;
    webinar: number | null;
} {
    if (value === null || value === undefined) {
        return { regular: null, webinar: null };
    }

    if (typeof value === "string") {
        return extractPricing(value);
    }

    if (typeof value === "number") {
        return { regular: value, webinar: null };
    }

    if (typeof value === "object") {
        const obj = value as Record<string, unknown>;

        const parsePrice = (v: unknown): number | null => {
            if (v === null || v === undefined) return null;
            if (typeof v === "number") return v;
            if (typeof v === "string") {
                const num = parseFloat(v.replace(/[$,]/g, ""));
                return isNaN(num) ? null : num;
            }
            return null;
        };

        return {
            regular: parsePrice(obj.regular),
            webinar: parsePrice(obj.webinar),
        };
    }

    return { regular: null, webinar: null };
}
