/**
 * AI Content Sanitization Utilities
 * Prevents prompt injection attacks by sanitizing user-provided content
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
 * - Removing [system] and [assistant] role markers
 * - Filtering instruction override attempts
 * - Sanitizing markdown headers that might be interpreted as instructions
 * - Detecting and logging security events
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

    // Detect and replace role markers
    // Use simple string patterns to avoid ReDoS
    const roleMarkerPatterns = [
        { pattern: /\[system\]/gi, type: "role_marker_detected" as const },
        { pattern: /\[assistant\]/gi, type: "role_marker_detected" as const },
        { pattern: /\[human\]/gi, type: "role_marker_detected" as const },
        { pattern: /<system>/gi, type: "role_marker_detected" as const },
        { pattern: /<assistant>/gi, type: "role_marker_detected" as const },
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
    sanitized = sanitized
        // Role markers
        .replace(/\[system\]/gi, "[user_input]")
        .replace(/\[assistant\]/gi, "[user_input]")
        .replace(/\[human\]/gi, "[user_input]")
        .replace(/<system>/gi, "&lt;system&gt;")
        .replace(/<assistant>/gi, "&lt;assistant&gt;")
        // Markdown headers that could be interpreted as instructions
        .replace(/##\s*(system|instructions|ignore)/gi, "## user_content")
        // Instruction override attempts (simple patterns to avoid ReDoS)
        .replace(/ignore previous instructions/gi, "[filtered]")
        .replace(/ignore all instructions/gi, "[filtered]")
        .replace(/ignore above instructions/gi, "[filtered]")
        .replace(/disregard previous/gi, "[filtered]")
        .replace(/forget your instructions/gi, "[filtered]")
        .replace(/new instructions:/gi, "[filtered]")
        .replace(/override:/gi, "[filtered]");

    // Check for other injection patterns
    const injectionPatterns = [
        /ignore.*instructions/gi,
        /disregard.*rules/gi,
        /you are now/gi,
        /pretend you are/gi,
        /act as if/gi,
        /from now on/gi,
        /your new role/gi,
    ];

    for (const pattern of injectionPatterns) {
        if (pattern.test(sanitized)) {
            trackSecurityEvent("instruction_override_attempt", {
                pattern: pattern.source,
                contentPreview: sanitized.slice(0, 100),
            });
            securityEventsDetected++;
        }
    }

    // Apply final injection pattern filtering
    sanitized = sanitized
        .replace(/you are now/gi, "[filtered]")
        .replace(/pretend you are/gi, "[filtered]")
        .replace(/your new role/gi, "[filtered]");

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

    return sanitized;
}

/**
 * Sanitize AI-generated content to ensure it doesn't contain injection attempts
 * Lighter sanitization since this is output, not input
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

    return sanitized
        .replace(/\[system\]/gi, "")
        .replace(/\[assistant\]/gi, "")
        .replace(/##\s*(system|instructions)/gi, "");
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
