/**
 * Content Architect Service
 * Atomizes content briefs into platform-specific variants
 * Generates optimized copy, hashtags, and formatting per platform
 */

import { generateWithAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { getPlatformSpec, validateContent } from "./platform-knowledge-service";
import { getVoiceGuidelines } from "./brand-voice-service";
import type {
    ContentBrief,
    MarketingPlatform,
    PostVariant,
    StoryAngle,
} from "@/types/marketing";

interface PlatformVariantInput {
    baseContent: string;
    platforms: MarketingPlatform[];
    brief: ContentBrief;
    profileId: string;
    storyAngle?: StoryAngle;
}

/**
 * Generate platform-specific variants from base content
 * Adapts copy, length, tone, and formatting for each platform
 */
export async function generatePlatformVariants(input: PlatformVariantInput): Promise<{
    success: boolean;
    variants?: Partial<PostVariant>[];
    error?: string;
}> {
    try {
        const { baseContent, platforms, brief, profileId, storyAngle } = input;

        // Get voice guidelines
        const voiceResult = await getVoiceGuidelines(profileId);
        if (!voiceResult.success || !voiceResult.guidelines) {
            return {
                success: false,
                error: "Unable to fetch voice guidelines",
            };
        }

        // Generate variants for each platform in parallel
        const variantPromises = platforms.map((platform) =>
            generateSinglePlatformVariant(
                baseContent,
                platform,
                brief,
                voiceResult.guidelines!,
                storyAngle
            )
        );

        const results = await Promise.all(variantPromises);

        const variants: Partial<PostVariant>[] = [];
        const errors: string[] = [];

        results.forEach((result, index) => {
            if (result.success && result.variant) {
                variants.push(result.variant);
            } else if (result.error) {
                errors.push(`${platforms[index]}: ${result.error}`);
            }
        });

        if (variants.length === 0) {
            return {
                success: false,
                error: `Failed to generate variants: ${errors.join(", ")}`,
            };
        }

        logger.info(
            {
                briefId: brief.id,
                platformCount: platforms.length,
                variantCount: variants.length,
            },
            "Platform variants generated"
        );

        return { success: true, variants };
    } catch (error) {
        logger.error({ error, briefId: input.brief.id }, "Failed to generate variants");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Generate a single platform variant
 */
async function generateSinglePlatformVariant(
    baseContent: string,
    platform: MarketingPlatform,
    brief: ContentBrief,
    voiceGuidelines: string,
    storyAngle?: StoryAngle
): Promise<{
    success: boolean;
    variant?: Partial<PostVariant>;
    error?: string;
}> {
    try {
        // Get platform specifications
        const specResult = await getPlatformSpec(platform);
        if (!specResult.success || !specResult.spec) {
            return {
                success: false,
                error: "Failed to fetch platform specifications",
            };
        }

        const spec = specResult.spec;
        const bestPractices = spec.best_practices as any;

        // Platform-specific optimization instructions
        const platformInstructions = getPlatformInstructions(platform, spec);

        const prompt = `Adapt this content for ${platform.toUpperCase()}.

BASE CONTENT:
${baseContent}

PLATFORM SPECIFICATIONS:
- Max Length: ${spec.max_text_length} characters
- Optimal Length: ${bestPractices.optimal_post_length || "N/A"} characters
- Link Handling: ${bestPractices.link_handling}
- CTA Placement: ${bestPractices.cta_placement}

PLATFORM-SPECIFIC GUIDANCE:
${platformInstructions}

${voiceGuidelines}

REQUIREMENTS:
- Adapt the content to fit ${platform}'s audience and culture
- Optimize length and formatting for ${platform}
- Maintain the core message and story beats
- Include appropriate hashtags (return separately)
- Ensure it feels native to the platform

Return as JSON:
{
  "copy_text": "The adapted post content",
  "hashtags": ["hashtag1", "hashtag2", ...],
  "caption": "Optional caption if different from copy",
  "format_notes": "Suggested format (post, carousel, etc.)"
}`;

        const result = await generateWithAI<{
            copy_text: string;
            hashtags: string[];
            caption?: string;
            format_notes?: string;
        }>(
            [
                {
                    role: "system",
                    content: `You are an expert at optimizing content for ${platform}. You understand platform-specific best practices, audience expectations, and algorithm preferences.`,
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.7,
                maxTokens: 1500,
            }
        );

        // Format hashtags correctly
        const formattedHashtags = result.hashtags.map((tag) =>
            tag.startsWith("#") ? tag : `#${tag}`
        );

        const variant: Partial<PostVariant> = {
            platform,
            copy_text: result.copy_text,
            hashtags: formattedHashtags,
            caption: result.caption || result.copy_text,
            format_type: "post", // Default, can be inferred from format_notes
            story_framework: storyAngle?.framework,
            story_angle: storyAngle?.angle,
        };

        // Validate the variant
        const validation = await validateContent(variant, platform);
        if (!validation.valid) {
            logger.warn(
                { platform, violations: validation.violations },
                "Generated variant has validation issues"
            );
        }

        return { success: true, variant };
    } catch (error) {
        logger.error({ error, platform }, "Failed to generate platform variant");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get platform-specific optimization instructions
 */
function getPlatformInstructions(platform: MarketingPlatform, spec: any): string {
    const instructions: Record<MarketingPlatform, string> = {
        instagram: `Instagram Optimization:
- Visual-first platform: Assume post will have compelling imagery
- Use line breaks for readability (2-3 line paragraphs)
- First 2 lines are critical (before "more" cut-off)
- Emojis are welcomed and expected
- Hashtags can be in caption or first comment
- Links don't work in captions (use bio link strategy)
- Conversational, authentic tone performs best
- Questions and calls to engage (comment/DM) drive interaction`,

        facebook: `Facebook Optimization:
- Algorithm favors meaningful conversations
- Keep it concise (under 500 chars for best reach)
- Ask questions to spark comments
- Personal stories and vulnerability resonate
- Tagging and @mentions can expand reach
- Links in posts are okay but may reduce initial reach
- Native video > external links
- Casual, friendly tone`,

        linkedin: `LinkedIn Optimization:
- Professional but human tone
- Lead with a strong hook or question
- Use white space (single-line paragraphs)
- Share insights, lessons, or frameworks
- Tag relevant people/companies when appropriate
- 3-5 hashtags maximum
- Thought leadership and experience-based content
- Encourage professional discussion in comments`,

        twitter: `Twitter Optimization:
- Brevity is key (under 280 chars)
- Every word must count
- Thread-worthy content should be broken up
- Use of emojis and line breaks for scanning
- Links are shortened to 23 characters automatically
- Hashtags: 1-2 maximum for best engagement
- Conversational, quick-to-consume
- Hooks matter even more (you have 1 second)`,
    };

    return instructions[platform];
}

/**
 * Optimize content for a specific platform
 * Used when adapting existing content or refining generated variants
 */
export async function optimizeForPlatform(
    content: string,
    platform: MarketingPlatform,
    profileId: string
): Promise<{
    success: boolean;
    optimized?: string;
    suggestions?: string[];
    error?: string;
}> {
    try {
        const voiceResult = await getVoiceGuidelines(profileId);
        if (!voiceResult.success || !voiceResult.guidelines) {
            return {
                success: false,
                error: "Unable to fetch voice guidelines",
            };
        }

        const specResult = await getPlatformSpec(platform);
        if (!specResult.success || !specResult.spec) {
            return {
                success: false,
                error: "Failed to fetch platform specifications",
            };
        }

        const spec = specResult.spec;
        const platformInstructions = getPlatformInstructions(platform, spec);

        const prompt = `Optimize this content for ${platform}.

CURRENT CONTENT:
${content}

${platformInstructions}

${voiceResult.guidelines}

Optimize for:
1. Platform-appropriate length and formatting
2. Audience expectations on ${platform}
3. Algorithm preferences
4. Maximum engagement
5. Brand voice consistency

Return as JSON:
{
  "optimized": "The optimized content",
  "suggestions": ["improvement 1", "improvement 2", ...]
}`;

        const result = await generateWithAI<{
            optimized: string;
            suggestions: string[];
        }>(
            [
                {
                    role: "system",
                    content: `You are a ${platform} optimization expert who improves content for maximum engagement while maintaining authenticity.`,
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.6,
                maxTokens: 1000,
            }
        );

        logger.info(
            {
                platform,
                originalLength: content.length,
                optimizedLength: result.optimized.length,
            },
            "Content optimized for platform"
        );

        return {
            success: true,
            optimized: result.optimized,
            suggestions: result.suggestions,
        };
    } catch (error) {
        logger.error({ error, platform }, "Failed to optimize content");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Generate hashtags for specific content and platform
 */
export async function generateHashtags(
    content: string,
    platform: MarketingPlatform,
    niche?: string,
    count: number = 10
): Promise<{
    success: boolean;
    hashtags?: string[];
    error?: string;
}> {
    try {
        const specResult = await getPlatformSpec(platform);
        if (!specResult.success || !specResult.spec) {
            return {
                success: false,
                error: "Failed to fetch platform specifications",
            };
        }

        const spec = specResult.spec;
        const hashtagRules = spec.hashtag_rules as any;

        const prompt = `Generate ${count} relevant hashtags for this ${platform} post.

CONTENT:
${content}

${niche ? `NICHE: ${niche}` : ""}

PLATFORM RULES:
- Maximum hashtags allowed: ${spec.max_hashtags}
- Optimal count: ${hashtagRules.optimal_count || count}

Generate hashtags that:
1. Are relevant to the content and niche
2. Mix popular and niche-specific tags
3. Are appropriate for ${platform}
4. Follow current trends when relevant
5. Help content reach the right audience

Return as JSON array:
{
  "hashtags": ["tag1", "tag2", ...]
}

Do not include the # symbol, just the tag text.`;

        const result = await generateWithAI<{ hashtags: string[] }>(
            [
                {
                    role: "system",
                    content: `You are a hashtag research expert who identifies the most effective tags for ${platform} content.`,
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.6,
                maxTokens: 500,
            }
        );

        // Format with # prefix
        const formattedHashtags = result.hashtags
            .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
            .slice(0, count);

        logger.info(
            { platform, count: formattedHashtags.length },
            "Hashtags generated"
        );

        return { success: true, hashtags: formattedHashtags };
    } catch (error) {
        logger.error({ error, platform }, "Failed to generate hashtags");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Atomize a brief into platform-specific content plans
 * Creates a blueprint for content across multiple platforms
 */
export async function atomizeBrief(brief: ContentBrief): Promise<{
    success: boolean;
    plans?: Record<MarketingPlatform, ContentPlan>;
    error?: string;
}> {
    try {
        const plans: Record<MarketingPlatform, ContentPlan> = {} as any;

        // Get specs for all platforms
        const specPromises = brief.target_platforms.map((platform) =>
            getPlatformSpec(platform)
        );
        const specResults = await Promise.all(specPromises);

        specResults.forEach((result, index) => {
            if (result.success && result.spec) {
                const platform = brief.target_platforms[index];
                const spec = result.spec;
                const bestPractices = spec.best_practices as any;

                plans[platform] = {
                    platform,
                    optimal_length: bestPractices.optimal_post_length || 200,
                    format_recommendation: "post", // Default
                    key_elements: getKeyElementsForPlatform(platform),
                    timing_notes: getTimingNotes(platform),
                };
            }
        });

        logger.info(
            { briefId: brief.id, platformCount: Object.keys(plans).length },
            "Brief atomized into platform plans"
        );

        return { success: true, plans };
    } catch (error) {
        logger.error({ error, briefId: brief.id }, "Failed to atomize brief");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

interface ContentPlan {
    platform: MarketingPlatform;
    optimal_length: number;
    format_recommendation: string;
    key_elements: string[];
    timing_notes: string;
}

function getKeyElementsForPlatform(platform: MarketingPlatform): string[] {
    const elements: Record<MarketingPlatform, string[]> = {
        instagram: [
            "Strong visual hook",
            "Scroll-stopping first line",
            "Line breaks for readability",
            "Emojis for emphasis",
            "Relevant hashtags",
            "Clear CTA (comment/DM/bio link)",
        ],
        facebook: [
            "Personal connection",
            "Question or conversation starter",
            "Concise paragraphs",
            "Authentic voice",
            "Community engagement",
        ],
        linkedin: [
            "Professional insight",
            "Thought leadership angle",
            "White space formatting",
            "Industry relevance",
            "Encourage discussion",
        ],
        twitter: [
            "Ultra-concise hook",
            "Thread potential",
            "Hashtag discipline (1-2 max)",
            "Quick value delivery",
            "Conversation starter",
        ],
    };

    return elements[platform];
}

function getTimingNotes(platform: MarketingPlatform): string {
    const notes: Record<MarketingPlatform, string> = {
        instagram: "Peak: lunch (12-1pm) and evening (7-9pm) local time",
        facebook: "Peak: midday (1-3pm) and evening (7-9pm) local time",
        linkedin: "Peak: business hours, especially morning (7-9am) and lunch (12pm)",
        twitter: "Peak: morning (9am), lunch (12pm), and evening (6pm) local time",
    };

    return notes[platform];
}
