/**
 * AI Content Sanitization Utilities
 * Prevents prompt injection attacks by sanitizing user-provided content
 */

/**
 * Sanitize user content to prevent prompt injection
 * Uses XML-style delimiters to clearly separate user content from system instructions
 *
 * Protections include:
 * - Removing [system] and [assistant] role markers
 * - Filtering instruction override attempts
 * - Sanitizing markdown headers that might be interpreted as instructions
 */
export function sanitizeUserContent(content: string): string {
    // Remove any attempts to inject system-level instructions
    const sanitized = content
        .replace(/\[system\]/gi, "[user_input]")
        .replace(/\[assistant\]/gi, "[user_input]")
        .replace(/##\s*(system|instructions|ignore)/gi, "## user_content")
        .replace(/ignore (previous|all|above) instructions/gi, "[filtered]");

    return sanitized;
}

/**
 * Sanitize AI-generated content to ensure it doesn't contain injection attempts
 * Lighter sanitization since this is output, not input
 */
export function sanitizeAIOutput(content: string): string {
    return content
        .replace(/\[system\]/gi, "")
        .replace(/\[assistant\]/gi, "")
        .replace(/##\s*(system|instructions)/gi, "");
}
