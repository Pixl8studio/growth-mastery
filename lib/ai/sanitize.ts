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
 * - Current risk is minimal: chat API limits HTML to 1MB and messages are typically short
 *
 * PR #414 Improvements:
 * - Maximum length protection to prevent ReDoS attacks
 * - Security event tracking with Sentry
 * - Improved pattern matching for injection attempts
 */

import * as Sentry from "@sentry/nextjs";

/**
 * Maximum content length for sanitization
 * Larger inputs are truncated to prevent ReDoS attacks on regex patterns
 * 100KB is sufficient for landing page content while preventing abuse
 */
const MAX_SANITIZE_LENGTH = 100 * 1024;

/**
 * Security event types for metrics tracking
 */
type SecurityEventType =
    | "prompt_injection_attempt"
    | "role_marker_detected"
    | "instruction_override_attempt"
    | "content_truncated";

/**
 * Track security events in Sentry for monitoring
 * Enables dashboards and alerts for suspicious activity
 */
function trackSecurityEvent(
    eventType: SecurityEventType,
    details: Record<string, unknown>
): void {
    Sentry.addBreadcrumb({
        category: "security.sanitization",
        message: `Security event: ${eventType}`,
        level: "warning",
        data: {
            eventType,
            ...details,
        },
    });

    // Also set a custom metric for aggregation
    Sentry.setTag("security_event", eventType);
}

/**
 * Sanitize user content to prevent prompt injection
 *
 * Protections include:
 * - Maximum length enforcement (ReDoS protection)
 * - Removing [system] and [assistant] role markers (brackets are a clear signal)
 * - Filtering specific instruction override patterns
 * - Sanitizing markdown headers that appear to be directive headers
 * - Detecting and logging security events
 *
 * Note: This prioritizes avoiding false positives. Legitimate content like
 * "## System Requirements" or "ignore previous instructions from the manual"
 * should pass through unchanged.
 *
 * @param content - User-provided content to sanitize
 * @returns Sanitized content safe for AI processing
 */
export function sanitizeUserContent(content: string): string {
    if (!content) return "";

    let sanitized = content;
    let securityEventsDetected = 0;

    // Length protection - truncate before regex processing
    if (sanitized.length > MAX_SANITIZE_LENGTH) {
        trackSecurityEvent("content_truncated", {
            originalLength: sanitized.length,
            maxLength: MAX_SANITIZE_LENGTH,
        });
        sanitized = sanitized.slice(0, MAX_SANITIZE_LENGTH);
        securityEventsDetected++;
    }

    const originalContent = sanitized;

    // Detect role markers (for tracking)
    const roleMarkerPatterns = [
        { pattern: /\[system\]/gi, type: "role_marker_detected" as const },
        { pattern: /\[assistant\]/gi, type: "role_marker_detected" as const },
        { pattern: /\[human\]/gi, type: "role_marker_detected" as const },
    ];

    for (const { pattern, type } of roleMarkerPatterns) {
        if (pattern.test(sanitized)) {
            trackSecurityEvent(type, {
                pattern: pattern.source,
                contentPreview: sanitized.slice(0, 100),
            });
            securityEventsDetected++;
        }
    }

    // Apply sanitization replacements
    // [system] and [assistant] in brackets are clear prompt injection attempts
    sanitized = sanitized
        .replace(/\[system\]/gi, "[user_input]")
        .replace(/\[assistant\]/gi, "[user_input]")
        .replace(/\[human\]/gi, "[user_input]");

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
    const originalBeforeFilter = sanitized;
    sanitized = sanitized.replace(
        /(?:^|[.!?]\s*)ignore\s+(previous|all|above)\s+instructions(?:\s*[.!?\n]|$)/gim,
        "[filtered]"
    );

    if (sanitized !== originalBeforeFilter) {
        trackSecurityEvent("instruction_override_attempt", {
            pattern: "ignore instructions directive",
            contentPreview: originalBeforeFilter.slice(0, 100),
        });
        securityEventsDetected++;
    }

    // Log summary if security events were detected
    if (securityEventsDetected > 0) {
        Sentry.captureMessage(
            `Sanitization detected ${securityEventsDetected} security event(s)`,
            {
                level: "warning",
                tags: { security: "sanitization" },
                extra: { eventCount: securityEventsDetected },
            }
        );
    }

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
 *
 * @param content - AI-generated content to sanitize
 * @returns Sanitized content safe for display
 */
export function sanitizeAIOutput(content: string): string {
    if (!content) return "";

    // Apply length limit for safety
    let sanitized = content;
    if (sanitized.length > MAX_SANITIZE_LENGTH) {
        sanitized = sanitized.slice(0, MAX_SANITIZE_LENGTH);
    }

    return (
        sanitized
            .replace(/\[system\]/gi, "")
            .replace(/\[assistant\]/gi, "")
            // Only match standalone headers, not "## System Requirements" etc.
            .replace(/^(##\s*)(system|instructions)(\s*[:\n]|$)/gim, "$1$3")
    );
}

/**
 * Check if content appears to contain prompt injection attempts
 * Useful for pre-validation before processing
 *
 * @param content - Content to check
 * @returns true if suspicious patterns detected
 */
export function hasSuspiciousContent(content: string): boolean {
    if (!content) return false;

    // Check first 10KB for performance
    const sample = content.slice(0, 10 * 1024);

    const suspiciousPatterns = [
        /\[system\]/i,
        /\[assistant\]/i,
        /<system>/i,
        /ignore.*instructions/i,
        /disregard.*rules/i,
        /you are now/i,
        /pretend you are/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(sample));
}
