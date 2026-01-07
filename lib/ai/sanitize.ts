/**
 * AI Content Sanitization Utilities
 * Prevents prompt injection attacks by sanitizing user-provided content
 *
 * Design principles:
 * - Minimize false positives: Only filter content that is clearly an injection attempt
 * - Context-aware detection: Consider surrounding words to distinguish legitimate content
 * - Fail safe: When in doubt, let content through (false negatives are better than
 *   breaking legitimate user content)
 *
 * Performance considerations:
 * - Regex patterns use alternation which can cause backtracking on large inputs
 * - Current implementation is optimized for typical user message sizes (< 10KB)
 * - Input length is validated before regex operations to prevent ReDoS
 * - If processing very large inputs becomes necessary, consider:
 *   1. Adding input length validation at the caller level (already done in chat route)
 *   2. Using regex timeout libraries like safe-regex or re2
 *   3. Processing content in chunks
 * - Current risk is minimal: chat API limits HTML to 1MB and messages are typically short
 */

import * as Sentry from "@sentry/nextjs";

/** Maximum message length to process with regex (100KB) */
const MAX_SANITIZE_LENGTH = 100 * 1024;

/**
 * Sanitize user content to prevent prompt injection
 * Uses XML-style delimiters to clearly separate user content from system instructions
 *
 * Protections include:
 * - Removing [system] and [assistant] role markers (brackets are a clear signal)
 * - Filtering specific instruction override patterns
 * - Sanitizing markdown headers that appear to be directive headers
 *
 * Note: This prioritizes avoiding false positives. Legitimate content like
 * "## System Requirements" or "ignore previous instructions from the manual"
 * should pass through unchanged.
 */
export function sanitizeUserContent(content: string): string {
    // Skip regex processing for excessively long inputs to prevent ReDoS
    // Return content unchanged - the caller is responsible for size limits
    if (content.length > MAX_SANITIZE_LENGTH) {
        Sentry.addBreadcrumb({
            category: "security.sanitization",
            message: "Content exceeded max sanitize length, skipped regex",
            level: "warning",
            data: { contentLength: content.length, maxLength: MAX_SANITIZE_LENGTH },
        });
        return content;
    }

    const originalContent = content;

    // Remove any attempts to inject system-level instructions
    let sanitized = content
        // [system] and [assistant] in brackets are clear prompt injection attempts
        .replace(/\[system\]/gi, "[user_input]")
        .replace(/\[assistant\]/gi, "[user_input]");

    // Sanitize markdown headers that are ONLY "## System" or "## Instructions" alone
    // This avoids false positives like "## System Requirements" or "## Instructions for Users"
    // Only match when followed by a newline, colon, or end of string (not additional words)
    sanitized = sanitized.replace(
        /^(##\s*)(system|instructions)(\s*[:\n]|$)/gim,
        "$1user_content$3"
    );

    // Filter instruction override attempts - be specific about the pattern
    // Must be a standalone command, not part of a longer sentence like
    // "ignore previous instructions from the manual"
    // Look for patterns that are clearly directive (start of line or after punctuation)
    sanitized = sanitized.replace(
        /(?:^|[.!?]\s*)ignore\s+(previous|all|above)\s+instructions(?:\s*[.!?\n]|$)/gim,
        "[filtered]"
    );

    // Add breadcrumb when sanitization was applied (for observability)
    if (sanitized !== originalContent) {
        Sentry.addBreadcrumb({
            category: "security.sanitization",
            message: "Prompt injection patterns filtered from user content",
            level: "info",
            data: {
                originalLength: originalContent.length,
                sanitizedLength: sanitized.length,
            },
        });
    }

    return sanitized;
}

/**
 * Sanitize AI-generated content to ensure it doesn't contain injection attempts
 * Lighter sanitization since this is output, not input
 *
 * This removes bracketed role markers that could be interpreted as prompt structure
 * and standalone directive headers. Less aggressive than input sanitization.
 */
export function sanitizeAIOutput(content: string): string {
    return (
        content
            .replace(/\[system\]/gi, "")
            .replace(/\[assistant\]/gi, "")
            // Only match standalone headers, not "## System Requirements" etc.
            .replace(/^(##\s*)(system|instructions)(\s*[:\n]|$)/gim, "$1$3")
    );
}
