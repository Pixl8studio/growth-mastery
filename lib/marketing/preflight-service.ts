/**
 * Preflight Validation Service
 * Validates content for compliance, accessibility, brand voice, and platform rules
 * Ensures content meets all requirements before publishing
 */

import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import {
    validateContent,
    calculateReadabilityLevel,
} from "./platform-knowledge-service";
import { getProfile } from "./brand-voice-service";
import type {
    PostVariant,
    MarketingPlatform,
    PreflightStatus,
    PreflightResult,
} from "@/types/marketing";

/**
 * Run complete preflight validation on a post variant
 * Checks compliance, accessibility, brand voice, and character limits
 */
export async function runPreflightValidation(
    variant: Partial<PostVariant>,
    platform: MarketingPlatform,
    profileId: string
): Promise<{ success: boolean; result?: PreflightResult; error?: string }> {
    try {
        const checks = {
            compliance: { passed: false, issues: [] as string[] },
            accessibility: { passed: false, issues: [] as string[] },
            brand_voice: { passed: false, issues: [] as string[] },
            character_limit: { passed: false, issues: [] as string[] },
        };

        // Run all checks in parallel
        const [
            complianceResult,
            accessibilityResult,
            brandVoiceResult,
            platformResult,
        ] = await Promise.all([
            validateCompliance(variant),
            checkAccessibility(variant, platform),
            verifyBrandVoice(variant, profileId),
            validateContent(variant, platform),
        ]);

        // Compliance check
        if (complianceResult.success) {
            checks.compliance.passed = complianceResult.passed || false;
            checks.compliance.issues = complianceResult.violations || [];
        }

        // Accessibility check
        if (accessibilityResult.success) {
            checks.accessibility.passed = accessibilityResult.passed || false;
            checks.accessibility.issues = accessibilityResult.violations || [];
        }

        // Brand voice check
        if (brandVoiceResult.success) {
            checks.brand_voice.passed = brandVoiceResult.passed || false;
            checks.brand_voice.issues = brandVoiceResult.violations || [];
        }

        // Platform validation (character limits, etc.)
        if (platformResult.success) {
            checks.character_limit.passed = platformResult.valid;
            checks.character_limit.issues = platformResult.violations;
        }

        const allPassed =
            checks.compliance.passed &&
            checks.accessibility.passed &&
            checks.brand_voice.passed &&
            checks.character_limit.passed;

        const result: PreflightResult = {
            passed: allPassed,
            checks,
        };

        logger.info(
            {
                platform,
                passed: allPassed,
                compliancePassed: checks.compliance.passed,
                accessibilityPassed: checks.accessibility.passed,
                brandVoicePassed: checks.brand_voice.passed,
                characterLimitPassed: checks.character_limit.passed,
            },
            "Preflight validation complete"
        );

        return { success: true, result };
    } catch (error) {
        logger.error({ error, platform, profileId }, "Preflight validation error");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Validate content for legal and safety compliance
 * Checks for sensitive topics, claims, disclaimers
 */
export async function validateCompliance(variant: Partial<PostVariant>): Promise<{
    success: boolean;
    passed?: boolean;
    violations?: string[];
    warnings?: string[];
}> {
    try {
        const violations: string[] = [];
        const warnings: string[] = [];

        if (!variant.copy_text) {
            return { success: true, passed: true, violations: [], warnings: [] };
        }

        const content = variant.copy_text.toLowerCase();

        // Check for sensitive topics requiring disclaimers
        const sensitiveTopics = {
            health: [
                "cure",
                "heal",
                "treat",
                "diagnose",
                "medical",
                "disease",
                "illness",
            ],
            finance: [
                "guaranteed returns",
                "risk-free",
                "investment",
                "stock",
                "crypto",
                "trading",
            ],
            legal: ["guarantee", "guaranteed", "lawsuit", "sue", "legal advice"],
        };

        Object.entries(sensitiveTopics).forEach(([category, keywords]) => {
            const hasKeywords = keywords.some((keyword) => content.includes(keyword));
            if (hasKeywords) {
                warnings.push(
                    `Content contains ${category}-related terms. Consider adding appropriate disclaimer.`
                );
            }
        });

        // Check for absolute claims
        const absoluteClaims = [
            "100%",
            "always",
            "never fails",
            "guaranteed",
            "proven",
            "best",
            "perfect",
        ];

        absoluteClaims.forEach((claim) => {
            if (content.includes(claim)) {
                warnings.push(
                    `Absolute claim detected: "${claim}". Consider softening language.`
                );
            }
        });

        // Check for missing context in testimonials
        if (content.includes("testimonial") || content.includes("review")) {
            if (!content.includes("result") && !content.includes("may vary")) {
                violations.push(
                    'Testimonials should include "results may vary" or similar disclaimer'
                );
            }
        }

        // Check for FTC compliance (affiliate links, sponsorships)
        if (content.includes("link in bio") || content.includes("swipe up")) {
            if (
                !content.includes("#ad") &&
                !content.includes("#sponsored") &&
                !content.includes("affiliate")
            ) {
                warnings.push(
                    "If post contains affiliate links or sponsorship, add appropriate disclosure (#ad, #sponsored)"
                );
            }
        }

        // Check income/earnings claims
        const earningsClaims = ["$", "earned", "made", "income", "revenue", "profit"];
        const hasEarningsClaim = earningsClaims.some((term) => content.includes(term));

        if (hasEarningsClaim && !content.includes("result")) {
            warnings.push(
                'Income claims should include disclosure like "results not typical" or "individual results may vary"'
            );
        }

        // Check for competitor disparagement
        const negativeTerms = ["worst", "terrible", "awful", "scam", "fraud"];
        negativeTerms.forEach((term) => {
            if (content.includes(term)) {
                warnings.push(
                    `Potentially disparaging language detected: "${term}". Review for competitor mention.`
                );
            }
        });

        const passed = violations.length === 0;

        return { success: true, passed, violations, warnings };
    } catch (error) {
        logger.error({ error }, "Compliance validation error");
        return {
            success: false,
            passed: false,
            violations: ["Compliance check failed"],
        };
    }
}

/**
 * Check content for accessibility requirements
 * Alt text, captions, reading level, etc.
 */
export async function checkAccessibility(
    variant: Partial<PostVariant>,
    platform: MarketingPlatform
): Promise<{
    success: boolean;
    passed?: boolean;
    violations?: string[];
    warnings?: string[];
}> {
    try {
        const violations: string[] = [];
        const warnings: string[] = [];

        // Check alt text for images
        if (variant.media_urls && variant.media_urls.length > 0) {
            if (!variant.alt_text || variant.alt_text.trim().length === 0) {
                violations.push(
                    "Alt text is required for accessibility. Describe the image for screen readers."
                );
            } else {
                // Check alt text quality
                if (variant.alt_text.length < 10) {
                    warnings.push(
                        "Alt text is too brief. Provide more descriptive text."
                    );
                }
                if (variant.alt_text.toLowerCase().startsWith("image of")) {
                    warnings.push(
                        'Alt text should not start with "image of" - screen readers announce that already.'
                    );
                }
            }
        }

        // Check reading level
        if (variant.copy_text) {
            const readingLevel = calculateReadabilityLevel(variant.copy_text);

            if (readingLevel > 8) {
                warnings.push(
                    `Reading level is grade ${readingLevel}. Consider simplifying for grade 8 or below for broader accessibility.`
                );
            }
        }

        // Check emoji accessibility
        if (variant.copy_text) {
            const emojiCount = (
                variant.copy_text.match(/[\u{1F600}-\u{1F64F}]/gu) || []
            ).length;

            if (emojiCount > 5) {
                warnings.push(
                    "Excessive emojis can be confusing for screen readers. Consider reducing."
                );
            }
        }

        // Check for ASCII art or special characters
        if (variant.copy_text) {
            const specialChars = /[░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥]/g;
            if (specialChars.test(variant.copy_text)) {
                warnings.push(
                    "ASCII art or special characters may not be accessible to screen readers."
                );
            }
        }

        // Platform-specific accessibility checks
        if (
            platform === "instagram" &&
            variant.media_urls &&
            variant.media_urls.length > 0
        ) {
            if (!variant.alt_text) {
                violations.push(
                    "Instagram requires alt text for posts with images for accessibility compliance."
                );
            }
        }

        const passed = violations.length === 0;

        return { success: true, passed, violations, warnings };
    } catch (error) {
        logger.error({ error, platform }, "Accessibility check error");
        return {
            success: false,
            passed: false,
            violations: ["Accessibility check failed"],
        };
    }
}

/**
 * Verify content matches brand voice (Echo Mode drift detection)
 */
export async function verifyBrandVoice(
    variant: Partial<PostVariant>,
    profileId: string
): Promise<{
    success: boolean;
    passed?: boolean;
    violations?: string[];
    warnings?: string[];
    score?: number;
}> {
    try {
        const violations: string[] = [];
        const warnings: string[] = [];

        if (!variant.copy_text) {
            return { success: true, passed: true, violations: [], warnings: [] };
        }

        // Get profile for brand voice guidelines
        const profileResult = await getProfile(profileId);
        if (!profileResult.success || !profileResult.profile) {
            return {
                success: false,
                passed: false,
                violations: ["Unable to fetch brand voice profile"],
            };
        }

        const profile = profileResult.profile;
        const toneSettings = profile.tone_settings as any;
        const echoMode = profile.echo_mode_config as any;

        // Use AI to analyze brand voice alignment
        const prompt = `Analyze if this content matches the brand voice guidelines.

CONTENT:
${variant.copy_text}

BRAND VOICE GUIDELINES:
${profile.brand_voice}

TONE SETTINGS:
- Conversational vs Professional: ${toneSettings.conversational_professional}/100
- Warmth: ${toneSettings.warmth}/100
- Urgency: ${toneSettings.urgency}/100
- Empathy: ${toneSettings.empathy}/100
- Confidence: ${toneSettings.confidence}/100

${
    echoMode.enabled
        ? `
ECHO MODE CHARACTERISTICS:
- Voice patterns: ${echoMode.voice_characteristics.join(", ")}
- Pacing: ${echoMode.pacing}
- Cadence: ${echoMode.cadence}
`
        : ""
}

Rate alignment from 0-100 and identify any significant deviations.

Return as JSON:
{
  "alignment_score": 85,
  "matches": ["What aligns well"],
  "deviations": ["What doesn't match"],
  "passed": true
}

Score 70+ = passed, 50-69 = warning, below 50 = failed.`;

        const result = await generateWithAI<{
            alignment_score: number;
            matches: string[];
            deviations: string[];
            passed: boolean;
        }>(
            [
                {
                    role: "system",
                    content:
                        "You are a brand voice analysis expert who evaluates content alignment with brand guidelines.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.3,
                maxTokens: 800,
            }
        );

        if (result.alignment_score < 50) {
            violations.push(
                `Brand voice alignment is low (${result.alignment_score}/100). Major deviations detected.`
            );
            result.deviations.forEach((dev) =>
                violations.push(`Voice deviation: ${dev}`)
            );
        } else if (result.alignment_score < 70) {
            warnings.push(
                `Brand voice alignment is moderate (${result.alignment_score}/100). Consider adjustments.`
            );
            result.deviations.forEach((dev) =>
                warnings.push(`Minor deviation: ${dev}`)
            );
        }

        const passed = violations.length === 0;

        logger.info(
            {
                profileId,
                alignmentScore: result.alignment_score,
                passed,
            },
            "Brand voice verified"
        );

        return {
            success: true,
            passed,
            violations,
            warnings,
            score: result.alignment_score,
        };
    } catch (error) {
        logger.error({ error, profileId }, "Brand voice verification error");
        return {
            success: false,
            passed: false,
            violations: ["Brand voice check failed"],
        };
    }
}

/**
 * Enforce platform character limits
 * This is also handled by validateContent, but provided as standalone for clarity
 */
export async function enforceCharacterLimits(
    content: string,
    platform: MarketingPlatform
): Promise<{
    success: boolean;
    withinLimit: boolean;
    currentLength: number;
    maxLength: number;
    excess?: number;
}> {
    try {
        const limits: Record<MarketingPlatform, number> = {
            instagram: 2200,
            facebook: 63206,
            linkedin: 3000,
            twitter: 280,
        };

        const maxLength = limits[platform];
        const currentLength = content.length;
        const withinLimit = currentLength <= maxLength;
        const excess = withinLimit ? 0 : currentLength - maxLength;

        return {
            success: true,
            withinLimit,
            currentLength,
            maxLength,
            excess,
        };
    } catch (error) {
        logger.error({ error, platform }, "Character limit check error");
        return {
            success: false,
            withinLimit: false,
            currentLength: 0,
            maxLength: 0,
        };
    }
}

/**
 * Generate preflight status object for database storage
 */
export function createPreflightStatus(result: PreflightResult): PreflightStatus {
    return {
        passed: result.passed,
        compliance_check: result.checks.compliance.passed ? "passed" : "failed",
        accessibility_check: result.checks.accessibility.passed ? "passed" : "failed",
        brand_voice_check: result.checks.brand_voice.passed ? "passed" : "failed",
        character_limit_check: result.checks.character_limit.passed
            ? "passed"
            : "failed",
        issues: [
            ...result.checks.compliance.issues,
            ...result.checks.accessibility.issues,
            ...result.checks.brand_voice.issues,
            ...result.checks.character_limit.issues,
        ],
    };
}
