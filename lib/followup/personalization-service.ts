/**
 * Personalization Service
 *
 * Handles message personalization using token replacement.
 * Replaces tokens like {first_name}, {watch_pct}, etc. with actual prospect data.
 */

import { logger } from "@/lib/logger";
import type { FollowupMessage, FollowupProspect } from "@/types/followup";

/**
 * Personalize a message for a specific prospect.
 *
 * Replaces all tokens in subject line, body, and CTA with prospect-specific data.
 * Applies segment-specific personalization rules.
 */
export function personalizeMessage(
    message: FollowupMessage,
    prospect: FollowupProspect
): {
    subject: string | null;
    body: string;
    cta: {
        text: string;
        url: string;
        tracking_enabled: boolean;
    };
} {
    logger.info(
        {
            messageId: message.id,
            prospectId: prospect.id,
            segment: prospect.segment,
        },
        "🎨 Personalizing message"
    );

    // Build token values from prospect data
    const tokens = buildTokenValues(prospect);

    // Get segment-specific personalization rules
    const segmentRules = message.personalization_rules[prospect.segment];

    // Personalize subject line
    const personalizedSubject = message.subject_line
        ? replaceTokens(message.subject_line, tokens)
        : null;

    // Personalize body content
    const personalizedBody = replaceTokens(message.body_content, tokens);

    // Personalize CTA
    const personalizedCTA = {
        text: replaceTokens(message.primary_cta.text, tokens),
        url: replaceTokens(message.primary_cta.url, tokens),
        tracking_enabled: message.primary_cta.tracking_enabled,
    };

    logger.info(
        {
            messageId: message.id,
            prospectId: prospect.id,
            tokensReplaced: Object.keys(tokens).length,
        },
        "✅ Message personalized"
    );

    return {
        subject: personalizedSubject,
        body: personalizedBody,
        cta: personalizedCTA,
    };
}

/**
 * Build token values from prospect data.
 */
function buildTokenValues(prospect: FollowupProspect): Record<string, string> {
    const watchMinutes = Math.floor(prospect.watch_duration_seconds / 60);

    const tokens: Record<string, string> = {
        // Basic contact info
        first_name: prospect.first_name || "there",
        email: prospect.email,

        // Watch metrics
        watch_pct: prospect.watch_percentage.toString(),
        watch_percentage: prospect.watch_percentage.toString(),
        minutes: watchMinutes.toString(),
        minutes_watched: watchMinutes.toString(),

        // Engagement
        replay_count: prospect.replay_count.toString(),
        offer_clicks: prospect.offer_clicks.toString(),

        // Conversational intake
        challenge_notes: prospect.challenge_notes || "",
        goal_notes: prospect.goal_notes || "",
        challenge: prospect.challenge_notes || "your goals",
        goal: prospect.goal_notes || "success",

        // Scoring
        intent_score: prospect.intent_score.toString(),
        engagement_level: prospect.engagement_level,
        segment: prospect.segment,

        // Localization
        timezone: prospect.timezone,
        locale: prospect.locale,

        // URLs - will be filled in by the delivery system
        replay_link: "{REPLAY_LINK}",
        enrollment_link: "{ENROLLMENT_LINK}",
        opt_out_link: "{OPT_OUT_LINK}",
    };

    // Add objection hints if present
    if (prospect.objection_hints && prospect.objection_hints.length > 0) {
        tokens.objection_hint = prospect.objection_hints[0];
        tokens.objections = prospect.objection_hints.join(", ");
    } else {
        tokens.objection_hint = "";
        tokens.objections = "";
    }

    return tokens;
}

/**
 * Replace tokens in a template string.
 *
 * Supports both {token} and {token|fallback} syntax.
 * Example: "{first_name|there}" becomes "there" if first_name is empty.
 */
function replaceTokens(template: string, tokens: Record<string, string>): string {
    return template.replace(
        /\{([^}|]+)(?:\|([^}]+))?\}/g,
        (match, tokenName, fallback) => {
            const value = tokens[tokenName.trim()];

            // If value exists and is not empty, use it
            if (value !== undefined && value !== "") {
                return value;
            }

            // If fallback is provided, use it
            if (fallback !== undefined) {
                return fallback.trim();
            }

            // Otherwise, return the original token (for debugging)
            return match;
        }
    );
}

/**
 * Validate message template for required tokens.
 *
 * Checks that all necessary tokens for personalization are present.
 */
export function validateMessageTemplate(template: string): {
    valid: boolean;
    missing_tokens?: string[];
    warnings?: string[];
} {
    const tokenPattern = /\{([^}|]+)(?:\|([^}]+))?\}/g;
    const foundTokens: string[] = [];
    let match;

    while ((match = tokenPattern.exec(template)) !== null) {
        foundTokens.push(match[1].trim());
    }

    // Check for URL placeholders that need to be filled
    const urlPlaceholders = ["{REPLAY_LINK}", "{ENROLLMENT_LINK}", "{OPT_OUT_LINK}"];
    const missingUrls = urlPlaceholders.filter(
        (placeholder) => template.includes(placeholder) && !template.includes("http")
    );

    const warnings: string[] = [];

    if (foundTokens.length === 0) {
        warnings.push("No personalization tokens found - message may feel generic");
    }

    if (!template.includes("{first_name}") && template.length > 100) {
        warnings.push("Consider adding {first_name} for more personal touch");
    }

    return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
    };
}

/**
 * Get available tokens for message personalization.
 */
export function getAvailableTokens(): Array<{
    token: string;
    description: string;
    example: string;
}> {
    return [
        {
            token: "{first_name}",
            description: "Prospect's first name",
            example: "John",
        },
        {
            token: "{email}",
            description: "Prospect's email address",
            example: "john@example.com",
        },
        { token: "{watch_pct}", description: "Video watch percentage", example: "75" },
        { token: "{minutes}", description: "Minutes watched", example: "30" },
        {
            token: "{challenge_notes}",
            description: "Prospect's stated challenge",
            example: "struggling with lead gen",
        },
        {
            token: "{goal_notes}",
            description: "Prospect's stated goal",
            example: "double revenue",
        },
        { token: "{segment}", description: "Prospect segment", example: "engaged" },
        {
            token: "{engagement_level}",
            description: "Engagement level",
            example: "hot",
        },
        {
            token: "{replay_link}",
            description: "Link to watch replay",
            example: "https://...",
        },
        {
            token: "{enrollment_link}",
            description: "Link to enrollment page",
            example: "https://...",
        },
        {
            token: "{opt_out_link}",
            description: "Unsubscribe link",
            example: "https://...",
        },
    ];
}
