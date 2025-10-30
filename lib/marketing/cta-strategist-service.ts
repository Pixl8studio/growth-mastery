/**
 * CTA Strategist Service
 * Generates platform-appropriate calls-to-action optimized for opt-ins
 * Handles UTM tagging and link strategy per platform
 */

import { generateWithAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import type {
    ContentBrief,
    MarketingPlatform,
    CTAConfig,
    LinkStrategy,
    UTMParameters,
} from "@/types/marketing";

/**
 * Generate platform-appropriate CTA
 * Ensures opt-in first: DM keyword, comment trigger, or bio link
 */
export async function generateCTA(
    brief: ContentBrief,
    platform: MarketingPlatform,
    baseUrl?: string
): Promise<{
    success: boolean;
    cta?: CTAConfig;
    linkStrategy?: LinkStrategy;
    error?: string;
}> {
    try {
        const platformCTAGuidance = getPlatformCTAGuidance(platform);

        const prompt = `Generate an effective call-to-action for ${platform}.

CONTENT GOAL: ${brief.goal}
FUNNEL ENTRY POINT: ${brief.funnel_entry_point}
TARGET AUDIENCE: ${brief.icp_description || "General"}
TOPIC: ${brief.topic}

PLATFORM CONSTRAINTS:
${platformCTAGuidance}

The CTA should:
1. Be specific and action-oriented
2. Create urgency or curiosity
3. Be appropriate for ${platform}'s link handling
4. Optimize for the funnel entry point (${brief.funnel_entry_point})
5. Feel natural and conversational

Generate a CTA that drives opt-ins while respecting platform norms.

Return as JSON:
{
  "text": "The CTA copy",
  "type": "bio_link" | "dm_keyword" | "comment_trigger" | "direct_link",
  "dm_keyword": "If type is dm_keyword, the keyword to use",
  "comment_trigger": "If type is comment_trigger, what to tell them to comment",
  "reasoning": "Why this CTA works for this platform and goal"
}`;

        const result = await generateWithAI<{
            text: string;
            type: "bio_link" | "dm_keyword" | "comment_trigger" | "direct_link";
            dm_keyword?: string;
            comment_trigger?: string;
            reasoning: string;
        }>(
            [
                {
                    role: "system",
                    content: `You are a conversion optimization expert who creates high-performing CTAs for ${platform}.`,
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.7,
                maxTokens: 500,
            }
        );

        const cta: CTAConfig = {
            text: result.text,
            type: result.type,
            url: baseUrl || null,
            dm_keyword: result.dm_keyword || null,
            comment_trigger: result.comment_trigger || null,
        };

        // Generate link strategy if URL is provided
        let linkStrategy: LinkStrategy | undefined;
        if (baseUrl) {
            linkStrategy = generateLinkStrategy(
                baseUrl,
                platform,
                brief.name,
                brief.topic
            );
        }

        logger.info(
            { platform, ctaType: cta.type, briefId: brief.id },
            "CTA generated"
        );

        return { success: true, cta, linkStrategy };
    } catch (error) {
        logger.error({ error, platform, briefId: brief.id }, "Failed to generate CTA");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get platform-specific CTA guidance
 */
function getPlatformCTAGuidance(platform: MarketingPlatform): string {
    const guidance: Record<MarketingPlatform, string> = {
        instagram: `Instagram CTA Strategy:
- Links in captions don't work - use "link in bio" strategy
- DM keywords work great ("DM me GUIDE for free template")
- Comment triggers drive algorithm ("Comment YES if you want this")
- Story swipe-ups for verified accounts
- Bio link is the primary conversion path
- Make CTA feel like a natural next step in conversation`,

        facebook: `Facebook CTA Strategy:
- Direct links work but may reduce organic reach
- "Learn More" or "Sign Up" buttons on pages
- Messenger keywords can work well
- Comment engagement is algorithm-friendly
- Can use link in first comment strategy
- Group discussions can funnel to opt-ins`,

        linkedin: `LinkedIn CTA Strategy:
- Direct links are okay on LinkedIn
- "Connect with me" works for relationship building
- "Read the full article" for external content
- Newsletter subscriptions built into platform
- Professional, value-first language
- Can include link in post or first comment`,

        twitter: `Twitter CTA Strategy:
- Links count as 23 characters
- Use threads to build to CTA
- "Reply with X" for engagement
- "DM me for details" works
- Link in bio is common
- Keep CTA brief and punchy`,
    };

    return guidance[platform];
}

/**
 * Generate comprehensive link strategy with UTM parameters
 */
export function generateLinkStrategy(
    baseUrl: string,
    platform: MarketingPlatform,
    campaignName: string,
    content: string
): LinkStrategy {
    // Clean campaign name and content for URL safety
    const cleanCampaign = campaignName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const cleanContent = content
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .substring(0, 50); // Limit content param length

    const utmParameters: UTMParameters = {
        utm_source: platform,
        utm_medium: "organic_social",
        utm_campaign: cleanCampaign,
        utm_content: cleanContent,
    };

    // Build full URL with UTM parameters
    const url = new URL(baseUrl);
    Object.entries(utmParameters).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });

    const linkStrategy: LinkStrategy = {
        primary_url: url.toString(),
        utm_parameters: utmParameters,
        tracking_enabled: true,
    };

    return linkStrategy;
}

/**
 * Generate multiple CTA variants for A/B testing
 */
export async function generateCTAVariants(
    brief: ContentBrief,
    platform: MarketingPlatform,
    count: number = 3
): Promise<{
    success: boolean;
    variants?: CTAConfig[];
    error?: string;
}> {
    try {
        const platformGuidance = getPlatformCTAGuidance(platform);

        const prompt = `Generate ${count} different CTA variants for ${platform}.

CONTENT GOAL: ${brief.goal}
FUNNEL ENTRY POINT: ${brief.funnel_entry_point}
TARGET AUDIENCE: ${brief.icp_description || "General"}

${platformGuidance}

Generate ${count} different approaches:
1. Direct and urgent
2. Curious and intriguing
3. Value-focused and educational

Each should be platform-appropriate and optimized for conversions.

Return as JSON:
{
  "variants": [
    {
      "text": "CTA text",
      "type": "bio_link" | "dm_keyword" | "comment_trigger" | "direct_link",
      "dm_keyword": "optional",
      "comment_trigger": "optional",
      "style": "direct" | "curious" | "value"
    },
    ...
  ]
}`;

        const result = await generateWithAI<{
            variants: Array<{
                text: string;
                type: "bio_link" | "dm_keyword" | "comment_trigger" | "direct_link";
                dm_keyword?: string;
                comment_trigger?: string;
                style: string;
            }>;
        }>(
            [
                {
                    role: "system",
                    content: `You are a conversion optimization expert creating multiple CTA variants for A/B testing on ${platform}.`,
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.8,
                maxTokens: 800,
            }
        );

        const variants: CTAConfig[] = result.variants.map((v) => ({
            text: v.text,
            type: v.type,
            url: null,
            dm_keyword: v.dm_keyword || null,
            comment_trigger: v.comment_trigger || null,
        }));

        logger.info(
            { platform, variantCount: variants.length, briefId: brief.id },
            "CTA variants generated"
        );

        return { success: true, variants };
    } catch (error) {
        logger.error(
            { error, platform, briefId: brief.id },
            "Failed to generate CTA variants"
        );
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Optimize an existing CTA for better conversion
 */
export async function optimizeCTA(
    currentCTA: string,
    platform: MarketingPlatform,
    goal: string
): Promise<{
    success: boolean;
    optimized?: string;
    improvements?: string[];
    error?: string;
}> {
    try {
        const prompt = `Optimize this call-to-action for ${platform}.

CURRENT CTA: "${currentCTA}"
GOAL: ${goal}

Analyze the current CTA and improve it by:
1. Making it more specific and actionable
2. Creating urgency or curiosity
3. Ensuring platform appropriateness
4. Improving clarity and directness
5. Optimizing for conversion psychology

Return as JSON:
{
  "optimized": "The improved CTA",
  "improvements": ["Improvement 1", "Improvement 2", ...]
}`;

        const result = await generateWithAI<{
            optimized: string;
            improvements: string[];
        }>(
            [
                {
                    role: "system",
                    content: `You are a CTA optimization expert who improves calls-to-action for maximum conversion on ${platform}.`,
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

        logger.info({ platform, originalCTA: currentCTA }, "CTA optimized");

        return {
            success: true,
            optimized: result.optimized,
            improvements: result.improvements,
        };
    } catch (error) {
        logger.error({ error, platform }, "Failed to optimize CTA");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Analyze CTA effectiveness based on content and platform
 */
export async function analyzeCTAEffectiveness(
    cta: string,
    platform: MarketingPlatform,
    content: string
): Promise<{
    success: boolean;
    score?: number;
    analysis?: {
        clarity: number;
        specificity: number;
        urgency: number;
        platform_fit: number;
        overall: number;
    };
    recommendations?: string[];
    error?: string;
}> {
    try {
        const prompt = `Analyze the effectiveness of this CTA in the context of the full post.

PLATFORM: ${platform}
POST CONTENT:
${content}

CTA: "${cta}"

Rate the CTA on a scale of 1-10 for:
1. Clarity - Is it immediately clear what action to take?
2. Specificity - Is it specific vs generic?
3. Urgency - Does it create motivation to act now?
4. Platform Fit - Is it appropriate for ${platform}?

Provide recommendations for improvement.

Return as JSON:
{
  "clarity": 8,
  "specificity": 7,
  "urgency": 6,
  "platform_fit": 9,
  "overall": 7.5,
  "recommendations": ["rec 1", "rec 2", ...]
}`;

        const result = await generateWithAI<{
            clarity: number;
            specificity: number;
            urgency: number;
            platform_fit: number;
            overall: number;
            recommendations: string[];
        }>(
            [
                {
                    role: "system",
                    content: `You are a CTA analysis expert who evaluates calls-to-action with objective scoring criteria.`,
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

        logger.info(
            { platform, score: result.overall, cta },
            "CTA effectiveness analyzed"
        );

        return {
            success: true,
            score: result.overall,
            analysis: {
                clarity: result.clarity,
                specificity: result.specificity,
                urgency: result.urgency,
                platform_fit: result.platform_fit,
                overall: result.overall,
            },
            recommendations: result.recommendations,
        };
    } catch (error) {
        logger.error({ error, platform }, "Failed to analyze CTA");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Generate smart short link (placeholder for future URL shortener integration)
 */
export function generateShortLink(
    longUrl: string,
    campaign: string
): { success: boolean; shortUrl?: string; error?: string } {
    // Placeholder for future Bitly/TinyURL/custom shortener integration
    // For now, return the long URL with tracking
    logger.info({ campaign }, "Short link generation placeholder");

    return {
        success: true,
        shortUrl: longUrl, // Would be replaced with actual short URL
    };
}
