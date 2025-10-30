/**
 * Platform Knowledge Service
 * Manages platform specifications (PKG) and content validation
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { PlatformSpec, MarketingPlatform, PostVariant } from "@/types/marketing";

/**
 * Get platform specification
 * Returns current specs for character limits, media requirements, etc.
 */
export async function getPlatformSpec(
    platform: MarketingPlatform
): Promise<{ success: boolean; spec?: PlatformSpec; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: spec, error } = await supabase
            .from("marketing_platform_specs")
            .select("*")
            .eq("platform", platform)
            .single();

        if (error || !spec) {
            logger.error({ error, platform }, "Failed to fetch platform spec");
            return { success: false, error: "Platform spec not found" };
        }

        return { success: true, spec: spec as PlatformSpec };
    } catch (error) {
        logger.error({ error, platform }, "Error getting platform spec");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get all platform specifications
 */
export async function getAllPlatformSpecs(): Promise<{
    success: boolean;
    specs?: Record<MarketingPlatform, PlatformSpec>;
    error?: string;
}> {
    try {
        const supabase = await createClient();

        const { data: specs, error } = await supabase
            .from("marketing_platform_specs")
            .select("*")
            .order("platform");

        if (error) {
            logger.error({ error }, "Failed to fetch platform specs");
            return { success: false, error: error.message };
        }

        // Convert array to record keyed by platform
        const specsRecord = (specs || []).reduce(
            (acc, spec) => {
                acc[spec.platform as MarketingPlatform] = spec as PlatformSpec;
                return acc;
            },
            {} as Record<MarketingPlatform, PlatformSpec>
        );

        return { success: true, specs: specsRecord };
    } catch (error) {
        logger.error({ error }, "Error getting all platform specs");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Validate content against platform rules
 * Checks character limits, hashtag counts, media requirements
 */
export async function validateContent(
    content: Partial<PostVariant>,
    platform: MarketingPlatform
): Promise<{
    success: boolean;
    valid: boolean;
    violations: string[];
    warnings: string[];
}> {
    const violations: string[] = [];
    const warnings: string[] = [];

    try {
        // Get platform spec
        const specResult = await getPlatformSpec(platform);
        if (!specResult.success || !specResult.spec) {
            return {
                success: false,
                valid: false,
                violations: ["Unable to fetch platform specifications"],
                warnings: [],
            };
        }

        const spec = specResult.spec;

        // Validate text length
        if (content.copy_text) {
            const textLength = content.copy_text.length;
            if (textLength > spec.max_text_length) {
                violations.push(
                    `Text exceeds ${spec.max_text_length} characters (current: ${textLength})`
                );
            }

            // Warn if significantly under optimal length
            const bestPractices = spec.best_practices as any;
            if (
                bestPractices.optimal_post_length &&
                textLength < bestPractices.optimal_post_length * 0.5
            ) {
                warnings.push(
                    `Text is shorter than recommended (optimal: ${bestPractices.optimal_post_length} chars)`
                );
            }
        }

        // Validate hashtags
        if (content.hashtags && content.hashtags.length > 0) {
            if (content.hashtags.length > spec.max_hashtags) {
                violations.push(
                    `Too many hashtags (max: ${spec.max_hashtags}, current: ${content.hashtags.length})`
                );
            }

            const hashtagRules = spec.hashtag_rules as any;
            if (
                hashtagRules.optimal_count &&
                content.hashtags.length > hashtagRules.optimal_count * 1.5
            ) {
                warnings.push(
                    `Hashtag count exceeds optimal range (optimal: ${hashtagRules.optimal_count})`
                );
            }

            // Validate hashtag format
            content.hashtags.forEach((tag) => {
                if (!tag.startsWith("#")) {
                    violations.push(
                        `Invalid hashtag format: "${tag}" (must start with #)`
                    );
                }
                if (tag.includes(" ")) {
                    violations.push(
                        `Invalid hashtag format: "${tag}" (cannot contain spaces)`
                    );
                }
            });
        }

        // Validate media URLs
        if (content.media_urls && content.media_urls.length > 0) {
            content.media_urls.forEach((url) => {
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    violations.push(`Invalid media URL: ${url}`);
                }
            });
        }

        // Platform-specific validations
        switch (platform) {
            case "instagram":
                validateInstagramContent(content, violations, warnings);
                break;
            case "linkedin":
                validateLinkedInContent(content, violations, warnings);
                break;
            case "twitter":
                validateTwitterContent(content, violations, warnings);
                break;
            case "facebook":
                validateFacebookContent(content, violations, warnings);
                break;
        }

        const valid = violations.length === 0;

        logger.info(
            { platform, valid, violationCount: violations.length },
            "Content validation complete"
        );

        return {
            success: true,
            valid,
            violations,
            warnings,
        };
    } catch (error) {
        logger.error({ error, platform }, "Error validating content");
        return {
            success: false,
            valid: false,
            violations: ["Validation error occurred"],
            warnings: [],
        };
    }
}

/**
 * Instagram-specific validation rules
 */
function validateInstagramContent(
    content: Partial<PostVariant>,
    violations: string[],
    warnings: string[]
): void {
    // Instagram requires alt text for accessibility
    if (content.media_urls && content.media_urls.length > 0 && !content.alt_text) {
        violations.push("Alt text is required for Instagram posts with media");
    }

    // Instagram CTA handling
    const cta = content.cta_config as any;
    if (cta && cta.type === "direct_link") {
        warnings.push(
            "Instagram doesn't support clickable links in captions. Consider using bio link or story swipe-up."
        );
    }
}

/**
 * LinkedIn-specific validation rules
 */
function validateLinkedInContent(
    content: Partial<PostVariant>,
    violations: string[],
    warnings: string[]
): void {
    // LinkedIn prefers professional tone
    if (content.copy_text) {
        const hasEmojis = /[\u{1F600}-\u{1F64F}]/u.test(content.copy_text);
        if (hasEmojis) {
            warnings.push(
                "LinkedIn posts with excessive emojis may perform worse (professional platform)"
            );
        }
    }

    // LinkedIn hashtag limits
    if (content.hashtags && content.hashtags.length > 5) {
        warnings.push(
            "LinkedIn posts perform better with 3-5 hashtags (current exceeds 5)"
        );
    }
}

/**
 * Twitter-specific validation rules
 */
function validateTwitterContent(
    content: Partial<PostVariant>,
    violations: string[],
    warnings: string[]
): void {
    // Twitter character limit is strict
    if (content.copy_text) {
        // Account for URLs (Twitter shortens to 23 chars)
        const urlMatches = content.copy_text.match(/https?:\/\/[^\s]+/g);
        let effectiveLength = content.copy_text.length;

        if (urlMatches) {
            urlMatches.forEach((url) => {
                effectiveLength = effectiveLength - url.length + 23;
            });
        }

        if (effectiveLength > 280) {
            violations.push(
                `Tweet exceeds 280 characters including shortened URLs (effective: ${effectiveLength})`
            );
        }
    }

    // Twitter thread detection
    if (content.copy_text && content.copy_text.length > 240) {
        warnings.push("Consider breaking this into a thread for better engagement");
    }
}

/**
 * Facebook-specific validation rules
 */
function validateFacebookContent(
    content: Partial<PostVariant>,
    violations: string[],
    warnings: string[]
): void {
    // Facebook algorithm preferences
    if (content.copy_text && content.copy_text.length > 500) {
        warnings.push(
            "Facebook posts shorter than 500 characters tend to get more engagement"
        );
    }

    // Facebook link handling
    if (content.copy_text) {
        const linkCount = (content.copy_text.match(/https?:\/\//g) || []).length;
        if (linkCount > 1) {
            warnings.push(
                "Multiple links in Facebook posts can reduce reach (algorithm prefers single link)"
            );
        }
    }
}

/**
 * Update platform specifications
 * This would be called by a daily cron job to refresh PKG
 */
export async function updatePlatformSpecs(): Promise<{
    success: boolean;
    updated: string[];
    error?: string;
}> {
    try {
        const supabase = await createClient();
        const updated: string[] = [];

        // In a real implementation, this would fetch latest specs from platform APIs
        // For now, we'll just update the last_updated timestamp

        const platforms: MarketingPlatform[] = [
            "instagram",
            "facebook",
            "linkedin",
            "twitter",
        ];

        for (const platform of platforms) {
            const { error } = await supabase
                .from("marketing_platform_specs")
                .update({ last_updated: new Date().toISOString() })
                .eq("platform", platform);

            if (!error) {
                updated.push(platform);
                logger.info({ platform }, "Platform spec updated");
            } else {
                logger.error({ error, platform }, "Failed to update platform spec");
            }
        }

        logger.info({ updated }, "Platform specs update complete");

        return { success: true, updated };
    } catch (error) {
        logger.error({ error }, "Error updating platform specs");
        return {
            success: false,
            updated: [],
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get optimal posting times for a platform based on niche
 * This would integrate with the Niche Model in the future
 */
export async function getOptimalPostingTimes(
    platform: MarketingPlatform,
    niche?: string
): Promise<{
    success: boolean;
    times?: string[];
    error?: string;
}> {
    try {
        // Default optimal times by platform (in UTC)
        const defaultTimes: Record<MarketingPlatform, string[]> = {
            instagram: ["13:00", "17:00", "20:00"], // 1pm, 5pm, 8pm UTC
            facebook: ["09:00", "13:00", "15:00"], // 9am, 1pm, 3pm UTC
            linkedin: ["08:00", "12:00", "17:00"], // 8am, 12pm, 5pm UTC (business hours)
            twitter: ["09:00", "12:00", "18:00"], // 9am, 12pm, 6pm UTC
        };

        // In future, this would query niche_models table for learned optimal times
        // For now, return defaults

        return {
            success: true,
            times: defaultTimes[platform],
        };
    } catch (error) {
        logger.error({ error, platform }, "Error getting optimal posting times");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Calculate readability level of content
 * Returns grade level (1-12+)
 */
export function calculateReadabilityLevel(text: string): number {
    // Flesch-Kincaid Grade Level approximation
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
    const words = text.split(/\s+/).filter((w) => w.trim().length > 0).length;
    const syllables = countSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    const gradeLevel = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;

    return Math.max(0, Math.round(gradeLevel));
}

/**
 * Count syllables in text (approximation)
 */
function countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let totalSyllables = 0;

    words.forEach((word) => {
        // Remove non-alphabetic characters
        word = word.replace(/[^a-z]/g, "");

        if (word.length === 0) return;

        // Count vowel groups
        const vowelGroups = word.match(/[aeiouy]+/g);
        let syllables = vowelGroups ? vowelGroups.length : 0;

        // Adjust for silent e
        if (word.endsWith("e") && syllables > 1) {
            syllables--;
        }

        // Minimum 1 syllable per word
        syllables = Math.max(1, syllables);

        totalSyllables += syllables;
    });

    return totalSyllables;
}
