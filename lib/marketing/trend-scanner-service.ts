/**
 * Trend Scanner Service
 * Identifies trending topics and timely content opportunities
 * Scores relevance to user's niche and suggests content angles
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import type { TrendSignal, SuggestedAngles } from "@/types/marketing";

/**
 * Scan for current trends (would be called daily by cron)
 * In a real implementation, this would integrate with trend APIs or RSS feeds
 */
export async function scanTrends(
    userId?: string
): Promise<{ success: boolean; trends?: TrendSignal[]; error?: string }> {
    try {
        // In production, this would:
        // 1. Query trend APIs (Google Trends, Twitter Trends, etc.)
        // 2. Parse whitelisted RSS feeds
        // 3. Monitor industry news sources
        // 4. Track social media hashtags

        // For now, we'll create a placeholder that generates sample trends
        const supabase = await createClient();

        // If userId provided, get their profile to determine niche
        let userNiche = "business";
        if (userId) {
            const { data: profile } = await supabase
                .from("marketing_profiles")
                .select("business_context")
                .eq("user_id", userId)
                .eq("is_active", true)
                .single();

            if (profile && profile.business_context) {
                const context = profile.business_context as { industry?: string };
                userNiche = context.industry || "business";
            }
        }

        logger.info({ userId, niche: userNiche }, "Scanning trends");

        // Placeholder: In production, replace with actual trend discovery
        const sampleTrends = await generateSampleTrends(userNiche);

        return { success: true, trends: sampleTrends };
    } catch (error) {
        logger.error({ error, userId }, "Error scanning trends");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Generate sample trends (placeholder for real trend discovery)
 */
async function generateSampleTrends(_niche: string): Promise<TrendSignal[]> {
    // In production, this would be replaced with real trend data
    // For now, return empty array
    return [];
}

/**
 * Suggest content topics based on a trend
 * Creates 3 angles: founder perspective, myth-buster, industry POV
 */
export async function suggestTopicsFromTrend(
    trendTopic: string,
    userNiche: string,
    userContext?: string
): Promise<{ success: boolean; angles?: SuggestedAngles; error?: string }> {
    try {
        const prompt = `Generate 3 content angle suggestions connecting this trending topic to the user's business.

TRENDING TOPIC: ${trendTopic}
USER'S NICHE: ${userNiche}
${userContext ? `USER CONTEXT: ${userContext}` : ""}

Create 3 angles:
1. **Founder Perspective** - Personal take connecting trend to their journey/experience
2. **Myth-Buster** - Challenge a common belief about this trend
3. **Industry POV** - Expert analysis of what this trend means for ${userNiche}

Each angle should:
- Be authentic and specific
- Connect trend to user's expertise
- Suggest a clear content direction
- Be timely and relevant

Return as JSON:
{
  "founder_perspective": "Angle description...",
  "myth_buster": "Angle description...",
  "industry_pov": "Angle description..."
}`;

        const result = await generateWithAI<SuggestedAngles>(
            [
                {
                    role: "system",
                    content:
                        "You are a content strategist who identifies timely content opportunities by connecting trends to personal brand expertise.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                temperature: 0.7,
                maxTokens: 800,
            }
        );

        logger.info({ trendTopic, niche: userNiche }, "Topic suggestions generated");

        return { success: true, angles: result };
    } catch (error) {
        logger.error(
            { error, trendTopic, niche: userNiche },
            "Error suggesting topics"
        );
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Rank trend relevance to a user's niche
 * Returns 0-100 relevance score
 */
export async function rankTrendRelevance(
    trendTopic: string,
    userNiche: string,
    businessContext?: Record<string, unknown>
): Promise<{ success: boolean; score?: number; reasoning?: string; error?: string }> {
    try {
        const contextInfo = businessContext
            ? `
Business: ${businessContext.business_name || ""}
Target Audience: ${businessContext.target_audience || ""}
Main Challenge: ${businessContext.main_challenge || ""}`
            : "";

        const prompt = `Rate the relevance of this trending topic to the user's business.

TREND: ${trendTopic}
USER'S NICHE: ${userNiche}
${contextInfo}

Score from 0-100:
- 0-30: Not relevant, don't suggest
- 31-60: Somewhat relevant, could work with creative angle
- 61-85: Relevant, good content opportunity
- 86-100: Highly relevant, urgent/timely opportunity

Consider:
- Direct relevance to niche
- Audience interest level
- Timeliness/urgency
- Content opportunity strength

Return as JSON:
{
  "score": 75,
  "reasoning": "Why this score..."
}`;

        const result = await generateWithAI<{
            score: number;
            reasoning: string;
        }>(
            [
                {
                    role: "system",
                    content:
                        "You are a trend analysis expert who evaluates trend relevance to specific business niches.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                temperature: 0.3,
                maxTokens: 500,
            }
        );

        return {
            success: true,
            score: result.score,
            reasoning: result.reasoning,
        };
    } catch (error) {
        logger.error({ error, trendTopic, niche: userNiche }, "Error ranking trend");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Store a trend signal in the database
 */
export async function storeTrendSignal(
    trend: {
        topic: string;
        source: string;
        relevance_score: number;
        matched_niches: string[];
        suggested_angles: SuggestedAngles;
    },
    userId?: string
): Promise<{ success: boolean; trendId?: string; error?: string }> {
    try {
        const supabase = await createClient();

        // Set expiration (trends are time-sensitive, default 7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { data, error } = await supabase
            .from("marketing_trend_signals")
            .insert({
                user_id: userId || null,
                topic: trend.topic,
                source: trend.source,
                relevance_score: trend.relevance_score,
                matched_niches: trend.matched_niches,
                suggested_angles: trend.suggested_angles,
                status: "active",
                expires_at: expiresAt.toISOString(),
            })
            .select("id")
            .single();

        if (error) {
            logger.error({ error, trend }, "Failed to store trend signal");
            return { success: false, error: error.message };
        }

        logger.info({ trendId: data.id, topic: trend.topic }, "Trend signal stored");

        return { success: true, trendId: data.id };
    } catch (error) {
        logger.error({ error, trend }, "Error storing trend signal");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get active trends for a user
 * Returns trends sorted by relevance score
 */
export async function getActiveTrends(
    userId: string,
    limit: number = 10
): Promise<{ success: boolean; trends?: TrendSignal[]; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: trends, error } = await supabase
            .from("marketing_trend_signals")
            .select("*")
            .or(`user_id.eq.${userId},user_id.is.null`) // User-specific or global trends
            .eq("status", "active")
            .gte("expires_at", new Date().toISOString()) // Not expired
            .order("relevance_score", { ascending: false })
            .limit(limit);

        if (error) {
            logger.error({ error, userId }, "Failed to fetch active trends");
            return { success: false, error: error.message };
        }

        logger.info(
            { userId, trendCount: trends?.length || 0 },
            "Active trends fetched"
        );

        return { success: true, trends: (trends as TrendSignal[]) || [] };
    } catch (error) {
        logger.error({ error, userId }, "Error getting active trends");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Mark a trend as used
 */
export async function markTrendUsed(
    trendId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("marketing_trend_signals")
            .update({
                times_used:
                    (
                        await supabase
                            .from("marketing_trend_signals")
                            .select("times_used")
                            .eq("id", trendId)
                            .single()
                    ).data?.times_used + 1 || 1,
            })
            .eq("id", trendId);

        if (error) {
            logger.error({ error, trendId }, "Failed to mark trend as used");
            return { success: false, error: error.message };
        }

        logger.info({ trendId }, "Trend marked as used");

        return { success: true };
    } catch (error) {
        logger.error({ error, trendId }, "Error marking trend as used");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Dismiss a trend (user doesn't find it relevant)
 */
export async function dismissTrend(
    trendId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("marketing_trend_signals")
            .update({
                status: "dismissed",
                dismissed_by: userId,
                dismissed_at: new Date().toISOString(),
            })
            .eq("id", trendId);

        if (error) {
            logger.error({ error, trendId, userId }, "Failed to dismiss trend");
            return { success: false, error: error.message };
        }

        logger.info({ trendId, userId }, "Trend dismissed");

        return { success: true };
    } catch (error) {
        logger.error({ error, trendId, userId }, "Error dismissing trend");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Clean up expired trends (would be called by daily cron)
 */
export async function cleanupExpiredTrends(): Promise<{
    success: boolean;
    deleted?: number;
    error?: string;
}> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("marketing_trend_signals")
            .delete()
            .lt("expires_at", new Date().toISOString())
            .select("id");

        if (error) {
            logger.error({ error }, "Failed to cleanup expired trends");
            return { success: false, error: error.message };
        }

        const deletedCount = data?.length || 0;

        logger.info({ deletedCount }, "Expired trends cleaned up");

        return { success: true, deleted: deletedCount };
    } catch (error) {
        logger.error({ error }, "Error cleaning up expired trends");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
