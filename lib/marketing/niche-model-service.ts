/**
 * Niche Conversion Model Service
 * ML-based prediction of best formats and learning from performance data
 * Implements 70/30 bandit allocation for experimentation
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type {
    NicheModel,
    MarketingFormat,
    MarketingStoryFramework,
    MarketingPlatform,
    FormatPerformance,
    BanditAllocation,
} from "@/types/marketing";

/**
 * Predict best format for a given niche and goal
 * Uses learned data or defaults for new niches
 */
export async function predictBestFormat(
    niche: string,
    goal: string,
    userId: string
): Promise<{
    success: boolean;
    format?: MarketingFormat;
    confidence?: number;
    reasoning?: string;
    error?: string;
}> {
    try {
        const supabase = await createClient();

        // Try to get existing model for this niche
        const { data: model, error } = await supabase
            .from("marketing_niche_models")
            .select("*")
            .eq("user_id", userId)
            .eq("niche", niche)
            .single();

        if (error || !model) {
            // No model yet - return defaults
            logger.info({ niche, userId }, "No model found, using defaults");
            return {
                success: true,
                format: "post", // Default
                confidence: 0.3,
                reasoning:
                    "No historical data yet. Starting with standard post format.",
            };
        }

        const nicheModel = model as NicheModel;
        const bestFormats = nicheModel.best_formats as FormatPerformance;

        // Find format with highest conversion rate and sufficient sample size
        let bestFormat: MarketingFormat = "post";
        let bestRate = 0;
        let confidence = 0;

        Object.entries(bestFormats).forEach(([format, data]) => {
            if (data.sample_size >= 10 && data.conversion_rate > bestRate) {
                bestRate = data.conversion_rate;
                bestFormat = format as MarketingFormat;
                // Confidence based on sample size (max at 100 samples)
                confidence = Math.min(data.sample_size / 100, 1.0);
            }
        });

        logger.info(
            { niche, format: bestFormat, confidence, rate: bestRate },
            "Format predicted"
        );

        return {
            success: true,
            format: bestFormat,
            confidence,
            reasoning: `${bestFormat} has ${bestRate.toFixed(1)}% conversion rate based on ${bestFormats[bestFormat].sample_size} samples`,
        };
    } catch (error) {
        logger.error({ error, niche, userId }, "Error predicting format");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Learn from performance data
 * Updates niche model with new analytics
 */
export async function learnFromPerformance(
    userId: string,
    niche: string,
    postData: {
        format: MarketingFormat;
        platform: MarketingPlatform;
        framework: MarketingStoryFramework;
        impressions: number;
        opt_ins: number;
        oi_1000: number;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        // Get or create model
        const { data: model, error } = await supabase
            .from("marketing_niche_models")
            .select("*")
            .eq("user_id", userId)
            .eq("niche", niche)
            .single();

        if (error || !model) {
            // Create new model
            const { data: newModel, error: createError } = await supabase
                .from("marketing_niche_models")
                .insert({
                    user_id: userId,
                    niche,
                    total_posts: 0,
                    total_opt_ins: 0,
                    overall_oi_1000: 0,
                })
                .select()
                .single();

            if (createError || !newModel) {
                logger.error({ createError, userId, niche }, "Failed to create model");
                return { success: false, error: "Failed to create model" };
            }

            model = newModel;
        }

        const nicheModel = model as NicheModel;

        // Update format performance
        const bestFormats = { ...(nicheModel.best_formats as FormatPerformance) };
        const currentFormat = bestFormats[postData.format] || {
            conversion_rate: 0,
            sample_size: 0,
        };

        // Calculate new average conversion rate
        const totalSamples = currentFormat.sample_size + 1;
        const formatTotalOptIns =
            currentFormat.conversion_rate * currentFormat.sample_size +
            (postData.opt_ins / postData.impressions) * 100;
        const newConversionRate = formatTotalOptIns / totalSamples;

        bestFormats[postData.format] = {
            conversion_rate: newConversionRate,
            sample_size: totalSamples,
        };

        // Update framework performance
        const conversionRates = {
            ...(nicheModel.conversion_rates as any),
        };
        const currentFramework = conversionRates[postData.framework] || 0;
        // Simple moving average
        conversionRates[postData.framework] = (currentFramework + postData.oi_1000) / 2;

        // Update platform insights
        const platformInsights = { ...(nicheModel.platform_insights as any) };
        if (!platformInsights[postData.platform]) {
            platformInsights[postData.platform] = {};
        }
        platformInsights[postData.platform].last_oi_1000 = postData.oi_1000;
        platformInsights[postData.platform].total_posts =
            (platformInsights[postData.platform].total_posts || 0) + 1;

        // Update overall metrics
        const totalPosts = nicheModel.total_posts + 1;
        const totalOptIns = nicheModel.total_opt_ins + postData.opt_ins;
        const overallOI1000 =
            (nicheModel.overall_oi_1000 * nicheModel.total_posts + postData.oi_1000) /
            totalPosts;

        // Update bandit allocation (70/30 split)
        const banditAllocation = updateBanditAllocation(
            bestFormats,
            conversionRates,
            nicheModel.bandit_allocation as BanditAllocation
        );

        // Save updates
        const { error: updateError } = await supabase
            .from("marketing_niche_models")
            .update({
                best_formats: bestFormats,
                conversion_rates: conversionRates,
                platform_insights: platformInsights,
                total_posts: totalPosts,
                total_opt_ins: totalOptIns,
                overall_oi_1000: overallOI1000,
                bandit_allocation: banditAllocation,
                last_trained_at: new Date().toISOString(),
            })
            .eq("id", model.id);

        if (updateError) {
            logger.error({ updateError, userId, niche }, "Failed to update model");
            return { success: false, error: updateError.message };
        }

        logger.info(
            { userId, niche, totalPosts, overallOI1000 },
            "Model learned from performance"
        );

        return { success: true };
    } catch (error) {
        logger.error({ error, userId, niche }, "Error learning from performance");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Update bandit allocation based on performance
 * 70% to top performers, 30% to experiments
 */
function updateBanditAllocation(
    formatPerformance: FormatPerformance,
    frameworkPerformance: any,
    currentAllocation: BanditAllocation
): BanditAllocation {
    // Sort formats by performance
    const formatScores = Object.entries(formatPerformance)
        .filter(([_, data]) => data.sample_size >= 5) // Minimum sample size
        .map(([format, data]) => ({
            format,
            score: data.conversion_rate,
            sampleSize: data.sample_size,
        }))
        .sort((a, b) => b.score - a.score);

    // Sort frameworks by performance
    const frameworkScores = Object.entries(frameworkPerformance)
        .map(([framework, score]) => ({
            framework,
            score: score as number,
        }))
        .sort((a, b) => b.score - a.score);

    // Top 70% allocation
    const topPerformers: string[] = [];

    // Add top formats
    formatScores.slice(0, 2).forEach((item) => {
        topPerformers.push(`format:${item.format}`);
    });

    // Add top frameworks
    frameworkScores.slice(0, 2).forEach((item) => {
        topPerformers.push(`framework:${item.framework}`);
    });

    // Remaining 30% for experiments
    const experiments: string[] = [];

    // Add underexplored formats
    formatScores.slice(2).forEach((item) => {
        if (item.sampleSize < 20) {
            // Still exploring
            experiments.push(`format:${item.format}`);
        }
    });

    // Add underexplored frameworks
    frameworkScores.slice(2).forEach((item) => {
        experiments.push(`framework:${item.framework}`);
    });

    return {
        top_performers: topPerformers,
        experiments,
        top_percentage: 70,
        experiment_percentage: 30,
    };
}

/**
 * Get bandit allocation for content planning
 * Tells you what to test vs what to scale
 */
export async function getBanditAllocation(
    userId: string,
    niche: string
): Promise<{
    success: boolean;
    allocation?: BanditAllocation;
    error?: string;
}> {
    try {
        const supabase = await createClient();

        const { data: model, error } = await supabase
            .from("marketing_niche_models")
            .select("bandit_allocation")
            .eq("user_id", userId)
            .eq("niche", niche)
            .single();

        if (error || !model) {
            // Return default allocation for new niches
            return {
                success: true,
                allocation: {
                    top_performers: [],
                    experiments: ["format:post", "format:carousel", "format:reel"],
                    top_percentage: 70,
                    experiment_percentage: 30,
                },
            };
        }

        return {
            success: true,
            allocation: model.bandit_allocation as BanditAllocation,
        };
    } catch (error) {
        logger.error({ error, userId, niche }, "Error getting bandit allocation");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get niche model for a user
 */
export async function getNicheModel(
    userId: string,
    niche: string
): Promise<{
    success: boolean;
    model?: NicheModel;
    error?: string;
}> {
    try {
        const supabase = await createClient();

        const { data: model, error } = await supabase
            .from("marketing_niche_models")
            .select("*")
            .eq("user_id", userId)
            .eq("niche", niche)
            .single();

        if (error) {
            return { success: false, error: "Model not found" };
        }

        return { success: true, model: model as NicheModel };
    } catch (error) {
        logger.error({ error, userId, niche }, "Error getting niche model");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get all niche models for a user
 */
export async function getAllNicheModels(userId: string): Promise<{
    success: boolean;
    models?: NicheModel[];
    error?: string;
}> {
    try {
        const supabase = await createClient();

        const { data: models, error } = await supabase
            .from("marketing_niche_models")
            .select("*")
            .eq("user_id", userId)
            .order("overall_oi_1000", { ascending: false });

        if (error) {
            logger.error({ error, userId }, "Failed to fetch niche models");
            return { success: false, error: error.message };
        }

        return { success: true, models: (models as NicheModel[]) || [] };
    } catch (error) {
        logger.error({ error, userId }, "Error getting niche models");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get recommendation for next content to create
 * Based on bandit allocation and current performance
 */
export async function getNextContentRecommendation(
    userId: string,
    niche: string
): Promise<{
    success: boolean;
    recommendation?: {
        format: MarketingFormat;
        framework: MarketingStoryFramework;
        reasoning: string;
        category: "top_performer" | "experiment";
    };
    error?: string;
}> {
    try {
        const allocationResult = await getBanditAllocation(userId, niche);
        if (!allocationResult.success || !allocationResult.allocation) {
            return { success: false, error: "Unable to get allocation" };
        }

        const allocation = allocationResult.allocation;

        // 70% chance to pick from top performers, 30% from experiments
        const useTopPerformer = Math.random() < 0.7;
        const pool = useTopPerformer
            ? allocation.top_performers
            : allocation.experiments;

        if (pool.length === 0) {
            // Fallback to defaults
            return {
                success: true,
                recommendation: {
                    format: "post",
                    framework: "founder_saga",
                    reasoning: "Starting with defaults - no historical data yet",
                    category: "experiment",
                },
            };
        }

        // Pick random from pool
        const randomPick = pool[Math.floor(Math.random() * pool.length)];
        const [type, value] = randomPick.split(":");

        // Build recommendation
        let format: MarketingFormat = "post";
        let framework: MarketingStoryFramework = "founder_saga";

        if (type === "format") {
            format = value as MarketingFormat;
            // Pick complementary framework
            const frameworks: MarketingStoryFramework[] = [
                "founder_saga",
                "myth_buster",
                "philosophy_pov",
            ];
            framework = frameworks[Math.floor(Math.random() * frameworks.length)];
        } else if (type === "framework") {
            framework = value as MarketingStoryFramework;
            // Use default format
            format = "post";
        }

        const reasoning = useTopPerformer
            ? `${format} + ${framework} is a proven combination in your niche (top 70%)`
            : `Testing ${format} + ${framework} to explore new opportunities (exploration 30%)`;

        return {
            success: true,
            recommendation: {
                format,
                framework,
                reasoning,
                category: useTopPerformer ? "top_performer" : "experiment",
            },
        };
    } catch (error) {
        logger.error({ error, userId, niche }, "Error getting recommendation");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
