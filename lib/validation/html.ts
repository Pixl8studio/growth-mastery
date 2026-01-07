/**
 * HTML Validation Utilities
 * Shared validation functions for HTML content size and structure
 */

import { ValidationError } from "@/lib/errors";

/** Default maximum HTML content size (1MB) */
export const DEFAULT_MAX_HTML_SIZE = 1 * 1024 * 1024;

/**
 * Validate HTML content size
 * Throws ValidationError if content exceeds the maximum size
 *
 * @param html - The HTML content to validate
 * @param maxSize - Maximum allowed size in bytes (defaults to 1MB)
 * @throws ValidationError if content is too large
 */
export function validateHtmlSize(
    html: string,
    maxSize: number = DEFAULT_MAX_HTML_SIZE
): void {
    if (html.length > maxSize) {
        const maxMB = maxSize / 1024 / 1024;
        throw new ValidationError(`HTML content is too large (max: ${maxMB}MB)`);
    }
}

/**
 * Check if HTML content exceeds size limit (non-throwing version)
 * Returns validation result instead of throwing
 *
 * @param html - The HTML content to check
 * @param maxSize - Maximum allowed size in bytes (defaults to 1MB)
 * @returns Object with valid status and optional error message
 */
export function checkHtmlSize(
    html: string,
    maxSize: number = DEFAULT_MAX_HTML_SIZE
): { valid: boolean; error?: string; size: number; maxSize: number } {
    const size = html.length;
    if (size > maxSize) {
        const maxMB = maxSize / 1024 / 1024;
        return {
            valid: false,
            error: `HTML content is too large (max: ${maxMB}MB)`,
            size,
            maxSize,
        };
    }
    return { valid: true, size, maxSize };
}
