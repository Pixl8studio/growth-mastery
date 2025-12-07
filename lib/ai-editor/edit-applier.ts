/**
 * Edit Applier
 * Processes AI edit responses and applies changes to HTML
 */

import { logger } from "@/lib/logger";

export interface Edit {
    type: "text" | "style" | "structure" | "attribute";
    selector: string;
    action: "replace" | "append" | "prepend" | "remove" | "modify";
    oldValue?: string;
    newValue?: string;
    attribute?: string;
}

export interface EditResult {
    success: boolean;
    updatedHtml: string;
    appliedEdits: number;
    failedEdits: string[];
}

/**
 * Apply a list of edits to HTML content
 * Note: This is a server-side string-based approach.
 * For a production implementation, consider using JSDOM or similar.
 */
export function applyEdits(html: string | null | undefined, edits: Edit[]): EditResult {
    // Defensive check - ensure html is a valid string
    if (!html || typeof html !== "string") {
        logger.warn({ htmlType: typeof html }, "Invalid html passed to applyEdits");
        return {
            success: false,
            updatedHtml: html || "",
            appliedEdits: 0,
            failedEdits: ["Invalid HTML input"],
        };
    }

    // Defensive check - ensure edits is a valid array
    if (!Array.isArray(edits)) {
        logger.warn({ editsType: typeof edits }, "Invalid edits passed to applyEdits");
        return {
            success: false,
            updatedHtml: html,
            appliedEdits: 0,
            failedEdits: ["Invalid edits input"],
        };
    }

    let updatedHtml = html;
    let appliedEdits = 0;
    const failedEdits: string[] = [];

    for (const edit of edits) {
        try {
            const result = applySingleEdit(updatedHtml, edit);
            if (result.success) {
                updatedHtml = result.html;
                appliedEdits++;
            } else {
                failedEdits.push(`Failed to apply edit: ${edit.selector}`);
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            failedEdits.push(`Error applying edit ${edit.selector}: ${errorMessage}`);
            logger.error({ error, edit }, "Failed to apply edit");
        }
    }

    return {
        success: failedEdits.length === 0,
        updatedHtml,
        appliedEdits,
        failedEdits,
    };
}

/**
 * Apply a single edit to HTML content
 * Uses regex-based string replacement (simple but effective for most cases)
 */
function applySingleEdit(html: string, edit: Edit): { success: boolean; html: string } {
    // Defensive checks
    if (!html || typeof html !== "string") {
        return { success: false, html: html || "" };
    }

    if (!edit || typeof edit !== "object") {
        return { success: false, html };
    }

    const { type, action, oldValue, newValue } = edit;

    // For text replacements, do direct string replacement
    if (type === "text" && action === "replace" && oldValue && newValue) {
        if (html.includes(oldValue)) {
            return {
                success: true,
                html: html.replace(oldValue, newValue),
            };
        }

        // Try with HTML entities decoded
        const decodedOld = decodeHtmlEntities(oldValue);
        if (html.includes(decodedOld)) {
            return {
                success: true,
                html: html.replace(decodedOld, newValue),
            };
        }

        // Try fuzzy match (ignoring whitespace differences)
        const normalizedOld = normalizeWhitespace(oldValue);
        const normalizedHtml = normalizeWhitespace(html);
        if (normalizedHtml.includes(normalizedOld)) {
            // Find the actual text in original HTML
            const pattern = createFuzzyPattern(oldValue);
            const match = html.match(pattern);
            if (match) {
                return {
                    success: true,
                    html: html.replace(match[0], newValue),
                };
            }
        }

        return { success: false, html };
    }

    // For style changes
    if (type === "style" && action === "modify" && oldValue && newValue) {
        // Replace inline style value
        const stylePattern = new RegExp(
            `(style=["'][^"']*?)${escapeRegex(oldValue)}([^"']*?["'])`,
            "gi"
        );
        if (stylePattern.test(html)) {
            return {
                success: true,
                html: html.replace(stylePattern, `$1${newValue}$2`),
            };
        }

        // Replace CSS class
        const classPattern = new RegExp(
            `(class=["'][^"']*?)\\b${escapeRegex(oldValue)}\\b([^"']*?["'])`,
            "gi"
        );
        if (classPattern.test(html)) {
            return {
                success: true,
                html: html.replace(classPattern, `$1${newValue}$2`),
            };
        }

        // Replace in <style> block
        if (html.includes(oldValue)) {
            return {
                success: true,
                html: html.replace(new RegExp(escapeRegex(oldValue), "g"), newValue),
            };
        }

        return { success: false, html };
    }

    // For structure changes (HTML blocks)
    if (type === "structure") {
        if (action === "replace" && oldValue && newValue) {
            if (html.includes(oldValue)) {
                return {
                    success: true,
                    html: html.replace(oldValue, newValue),
                };
            }
            return { success: false, html };
        }

        if (action === "remove" && oldValue) {
            if (html.includes(oldValue)) {
                return {
                    success: true,
                    html: html.replace(oldValue, ""),
                };
            }
            return { success: false, html };
        }
    }

    // For attribute changes
    if (type === "attribute" && edit.attribute && newValue) {
        const attrPattern = new RegExp(`(${edit.attribute}=["'])([^"']*)(["'])`, "gi");
        if (action === "replace" && oldValue) {
            const specificPattern = new RegExp(
                `(${edit.attribute}=["'])${escapeRegex(oldValue)}(["'])`,
                "gi"
            );
            if (specificPattern.test(html)) {
                return {
                    success: true,
                    html: html.replace(specificPattern, `$1${newValue}$2`),
                };
            }
        }
        if (action === "modify") {
            // Replace all occurrences of this attribute value
            if (attrPattern.test(html)) {
                return {
                    success: true,
                    html: html.replace(attrPattern, `$1${newValue}$3`),
                };
            }
        }
        return { success: false, html };
    }

    return { success: false, html };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string | null | undefined): string {
    if (!str || typeof str !== "string") return "";
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(str: string | null | undefined): string {
    if (!str || typeof str !== "string") return "";
    return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
}

/**
 * Normalize whitespace for fuzzy matching
 */
function normalizeWhitespace(str: string | null | undefined): string {
    if (!str || typeof str !== "string") return "";
    return str.replace(/\s+/g, " ").trim();
}

/**
 * Create a fuzzy regex pattern that allows for whitespace variations
 */
function createFuzzyPattern(str: string | null | undefined): RegExp {
    if (!str || typeof str !== "string") return /^$/; // Match nothing if invalid input
    const escaped = escapeRegex(str);
    const fuzzy = escaped.replace(/\s+/g, "\\s+");
    return new RegExp(fuzzy, "i");
}

/**
 * Parse edit instructions from AI response
 */
export function parseEditsFromResponse(response: string | null | undefined): {
    edits: Edit[];
    explanation: string;
} {
    // Defensive check - ensure response is a valid string
    if (!response || typeof response !== "string") {
        logger.warn(
            { responseType: typeof response },
            "Invalid response type in parseEditsFromResponse"
        );
        return { edits: [], explanation: "Unable to parse response" };
    }

    // Extract explanation (text before any JSON or edit blocks)
    let explanation = "";
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const editBlockMatch = response.match(/\[EDITS\]([\s\S]*?)\[\/EDITS\]/);

    if (jsonMatch) {
        explanation = response.substring(0, jsonMatch.index).trim();
    } else if (editBlockMatch) {
        explanation = response.substring(0, editBlockMatch.index).trim();
    } else {
        // No structured edits found, explanation is the whole response
        explanation = response.trim();
    }

    // Try to parse JSON edits
    if (jsonMatch) {
        try {
            const edits = JSON.parse(jsonMatch[1]);
            if (Array.isArray(edits)) {
                return { edits, explanation };
            }
        } catch {
            logger.warn({}, "Failed to parse JSON edits from response");
        }
    }

    // Try to parse custom edit block format
    if (editBlockMatch) {
        const edits = parseCustomEditFormat(editBlockMatch[1]);
        return { edits, explanation };
    }

    // No edits found
    return { edits: [], explanation };
}

/**
 * Parse custom edit format if JSON parsing fails
 */
function parseCustomEditFormat(editBlock: string): Edit[] {
    const edits: Edit[] = [];
    const lines = editBlock.trim().split("\n");

    let currentEdit: Partial<Edit> = {};

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("type:")) {
            currentEdit.type = trimmed.substring(5).trim() as Edit["type"];
        } else if (trimmed.startsWith("selector:")) {
            currentEdit.selector = trimmed.substring(9).trim();
        } else if (trimmed.startsWith("action:")) {
            currentEdit.action = trimmed.substring(7).trim() as Edit["action"];
        } else if (trimmed.startsWith("oldValue:")) {
            currentEdit.oldValue = trimmed.substring(9).trim();
        } else if (trimmed.startsWith("newValue:")) {
            currentEdit.newValue = trimmed.substring(9).trim();
        } else if (trimmed === "---" || trimmed === "") {
            // End of edit block
            if (currentEdit.type && currentEdit.selector && currentEdit.action) {
                edits.push(currentEdit as Edit);
            }
            currentEdit = {};
        }
    }

    // Don't forget the last edit
    if (currentEdit.type && currentEdit.selector && currentEdit.action) {
        edits.push(currentEdit as Edit);
    }

    return edits;
}
