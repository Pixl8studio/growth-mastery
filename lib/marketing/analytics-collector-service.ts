/**
 * Analytics Collector Service
 * Collects and aggregates marketing analytics data
 * Calculates north-star metric (O/I-1000) and feeds niche models
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { learnFromPerformance } from "./niche-model-service";
import type {
    AnalyticsDashboard,
    MarketingPlatform,
    MarketingStoryFramework,
} from "@/types/marketing";

/**
 * Record an opt-in conversion from a marketing post
 * Links post to contact for attribution
 */
export async function recordOptIn(
    postVariantId: string,
    contactId: string,
    timeToOptInMinutes?: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        // Get or create analytics record
        const { data: fetchedAnalytics, error: fetchError } = await supabase
            .from("marketing_analytics")
            .select("*")
            .eq("post_variant_id", postVariantId)
            .single();

        let analytics = fetchedAnalytics;

        if (fetchError || !analytics) {
            // Create new analytics record
            const { data: newAnalytics, error: createError } = await supabase
                .from("marketing_analytics")
                .insert({
                    post_variant_id: postVariantId,
                    user_id: "", // Will be set by trigger
                    opt_ins: 1,
                    time_to_opt_in: timeToOptInMinutes ? [timeToOptInMinutes] : [],
                })
                .select()
                .single();

            if (createError || !newAnalytics) {
                logger.error(
                    { createError, postVariantId },
                    "Failed to create analytics"
                );
                return { success: false, error: "Failed to record opt-in" };
            }

            analytics = newAnalytics;
        } else {
            // Update existing record
            const currentOptIns = analytics.opt_ins || 0;
            const currentTimes = analytics.time_to_opt_in || [];

            const { error: updateError } = await supabase
                .from("marketing_analytics")
                .update({
                    opt_ins: currentOptIns + 1,
                    time_to_opt_in: timeToOptInMinutes
                        ? [...currentTimes, timeToOptInMinutes]
                        : currentTimes,
                })
                .eq("id", analytics.id);

            if (updateError) {
                logger.error(
                    { updateError, postVariantId },
                    "Failed to update analytics"
                );
                return { success: false, error: "Failed to record opt-in" };
            }
        }

        // Recalculate O/I-1000
        await calculateOI1000(postVariantId);

        logger.info({ postVariantId, contactId }, "Opt-in recorded");

        return { success: true };
    } catch (error) {
        logger.error({ error, postVariantId }, "Error recording opt-in");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Calculate O/I-1000 (Opt-ins per 1,000 impressions)
 * North-star metric for marketing content performance
 */
export async function calculateOI1000(
    postVariantId: string
): Promise<{ success: boolean; oi1000?: number; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: analytics, error } = await supabase
            .from("marketing_analytics")
            .select("*")
            .eq("post_variant_id", postVariantId)
            .single();

        if (error || !analytics) {
            return { success: false, error: "Analytics not found" };
        }

        const impressions = analytics.impressions || 0;
        const optIns = analytics.opt_ins || 0;

        if (impressions === 0) {
            return { success: true, oi1000: 0 };
        }

        const oi1000 = (optIns / impressions) * 1000;

        // Update the record
        await supabase
            .from("marketing_analytics")
            .update({ oi_1000: oi1000 })
            .eq("id", analytics.id);

        logger.info(
            { postVariantId, oi1000, impressions, optIns },
            "O/I-1000 calculated"
        );

        return { success: true, oi1000 };
    } catch (error) {
        logger.error({ error, postVariantId }, "Error calculating O/I-1000");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Fetch analytics from platform APIs
 * Would be called daily by cron to sync metrics
 */
export async function fetchPlatformAnalytics(
    postVariantId: string,
    platform: MarketingPlatform
): Promise<{ success: boolean; error?: string }> {
    try {
        // In production, this would:
        // 1. Get the platform connection
        // 2. Call platform API to fetch post metrics
        // 3. Update marketing_analytics table

        // Placeholder implementation
        logger.info(
            { postVariantId, platform },
            "Platform analytics fetch - placeholder"
        );

        // Would fetch from:
        // - Instagram Insights API
        // - Facebook Graph API Insights
        // - LinkedIn Analytics API
        // - Twitter Analytics API

        return { success: true };
    } catch (error) {
        logger.error({ error, postVariantId, platform }, "Error fetching analytics");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Update niche model with analytics data
 * Feeds the learning loop
 */
export async function updateNicheModelFromAnalytics(
    postVariantId: string,
    userId: string,
    niche: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        // Get post variant and analytics
        const { data: variant, error: variantError } = await supabase
            .from("marketing_post_variants")
            .select("*")
            .eq("id", postVariantId)
            .single();

        if (variantError || !variant) {
            return { success: false, error: "Variant not found" };
        }

        const { data: analytics, error: analyticsError } = await supabase
            .from("marketing_analytics")
            .select("*")
            .eq("post_variant_id", postVariantId)
            .single();

        if (analyticsError || !analytics) {
            return { success: false, error: "Analytics not found" };
        }

        // Feed to niche model
        await learnFromPerformance(userId, niche, {
            format: variant.format_type as any,
            platform: variant.platform as any,
            framework: variant.story_framework as any,
            impressions: analytics.impressions || 0,
            opt_ins: analytics.opt_ins || 0,
            oi_1000: analytics.oi_1000 || 0,
        });

        logger.info({ postVariantId, niche }, "Niche model updated");

        return { success: true };
    } catch (error) {
        logger.error({ error, postVariantId }, "Error updating niche model");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get dashboard analytics for a funnel project
 */
export async function getDashboardAnalytics(
    funnelProjectId: string,
    dateRange?: { start: string; end: string }
): Promise<{
    success: boolean;
    dashboard?: AnalyticsDashboard;
    error?: string;
}> {
    try {
        const supabase = await createClient();

        // Get all variants for this funnel
        const { data: variants, error: variantsError } = await supabase
            .from("marketing_post_variants")
            .select("*, marketing_analytics(*)")
            .eq("content_brief_id", funnelProjectId); // Note: would need to join through briefs

        // For now, get variants from all briefs linked to this funnel
        const { data: briefs } = await supabase
            .from("marketing_content_briefs")
            .select("id")
            .eq("funnel_project_id", funnelProjectId);

        if (!briefs || briefs.length === 0) {
            // No data yet
            return {
                success: true,
                dashboard: getEmptyDashboard(),
            };
        }

        const briefIds = briefs.map((b) => b.id);

        const { data: allVariants } = await supabase
            .from("marketing_post_variants")
            .select("*, marketing_analytics(*)")
            .in("content_brief_id", briefIds);

        if (!allVariants || allVariants.length === 0) {
            return {
                success: true,
                dashboard: getEmptyDashboard(),
            };
        }

        // Aggregate analytics
        const dashboard = aggregateAnalytics(allVariants as any);

        logger.info({ funnelProjectId }, "Dashboard analytics compiled");

        return { success: true, dashboard };
    } catch (error) {
        logger.error({ error, funnelProjectId }, "Error getting dashboard analytics");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Aggregate analytics from multiple posts
 */
function aggregateAnalytics(variants: any[]): AnalyticsDashboard {
    const dashboard: AnalyticsDashboard = {
        overview: {
            total_posts: variants.length,
            total_impressions: 0,
            total_opt_ins: 0,
            overall_oi_1000: 0,
            avg_engagement_rate: 0,
        },
        by_platform: {} as any,
        by_framework: {} as any,
        top_performers: [],
        experiments: [],
    };

    let totalEngagement = 0;

    variants.forEach((variant) => {
        const analytics = Array.isArray(variant.marketing_analytics)
            ? variant.marketing_analytics[0]
            : null;

        if (!analytics) return;

        // Overview
        dashboard.overview.total_impressions += analytics.impressions || 0;
        dashboard.overview.total_opt_ins += analytics.opt_ins || 0;

        // Calculate engagement
        const engagement =
            (analytics.likes || 0) +
            (analytics.comments || 0) +
            (analytics.shares || 0);
        totalEngagement += engagement;

        // By platform
        const platform = variant.platform as MarketingPlatform;
        if (!dashboard.by_platform[platform]) {
            dashboard.by_platform[platform] = {
                posts: 0,
                impressions: 0,
                opt_ins: 0,
                oi_1000: 0,
            };
        }
        dashboard.by_platform[platform].posts += 1;
        dashboard.by_platform[platform].impressions += analytics.impressions || 0;
        dashboard.by_platform[platform].opt_ins += analytics.opt_ins || 0;

        // By framework
        if (variant.story_framework) {
            const framework = variant.story_framework as MarketingStoryFramework;
            if (!dashboard.by_framework[framework]) {
                dashboard.by_framework[framework] = {
                    posts: 0,
                    impressions: 0,
                    opt_ins: 0,
                    oi_1000: 0,
                };
            }
            dashboard.by_framework[framework].posts += 1;
            dashboard.by_framework[framework].impressions += analytics.impressions || 0;
            dashboard.by_framework[framework].opt_ins += analytics.opt_ins || 0;
        }

        // Top performers
        if (analytics.oi_1000 > 0) {
            dashboard.top_performers.push({
                post_variant_id: variant.id,
                platform: variant.platform,
                oi_1000: analytics.oi_1000,
                impressions: analytics.impressions || 0,
                opt_ins: analytics.opt_ins || 0,
            });
        }
    });

    // Calculate overall metrics
    if (dashboard.overview.total_impressions > 0) {
        dashboard.overview.overall_oi_1000 =
            (dashboard.overview.total_opt_ins / dashboard.overview.total_impressions) *
            1000;
        dashboard.overview.avg_engagement_rate =
            (totalEngagement / dashboard.overview.total_impressions) * 100;
    }

    // Calculate platform O/I-1000
    Object.keys(dashboard.by_platform).forEach((platform) => {
        const platformData = dashboard.by_platform[platform as MarketingPlatform];
        if (platformData.impressions > 0) {
            platformData.oi_1000 =
                (platformData.opt_ins / platformData.impressions) * 1000;
        }
    });

    // Calculate framework O/I-1000
    (Object.keys(dashboard.by_framework) as MarketingStoryFramework[]).forEach(
        (framework) => {
            const frameworkData = dashboard.by_framework[framework];
            if (frameworkData.impressions > 0) {
                frameworkData.oi_1000 =
                    (frameworkData.opt_ins / frameworkData.impressions) * 1000;
            }
        }
    );

    // Sort top performers
    dashboard.top_performers.sort((a, b) => b.oi_1000 - a.oi_1000);
    dashboard.top_performers = dashboard.top_performers.slice(0, 10); // Top 10

    return dashboard;
}

/**
 * Get empty dashboard structure
 */
function getEmptyDashboard(): AnalyticsDashboard {
    return {
        overview: {
            total_posts: 0,
            total_impressions: 0,
            total_opt_ins: 0,
            overall_oi_1000: 0,
            avg_engagement_rate: 0,
        },
        by_platform: {
            instagram: { posts: 0, impressions: 0, opt_ins: 0, oi_1000: 0 },
            facebook: { posts: 0, impressions: 0, opt_ins: 0, oi_1000: 0 },
            linkedin: { posts: 0, impressions: 0, opt_ins: 0, oi_1000: 0 },
            twitter: { posts: 0, impressions: 0, opt_ins: 0, oi_1000: 0 },
        },
        by_framework: {
            founder_saga: { posts: 0, impressions: 0, opt_ins: 0, oi_1000: 0 },
            myth_buster: { posts: 0, impressions: 0, opt_ins: 0, oi_1000: 0 },
            philosophy_pov: { posts: 0, impressions: 0, opt_ins: 0, oi_1000: 0 },
            current_event: { posts: 0, impressions: 0, opt_ins: 0, oi_1000: 0 },
            how_to: { posts: 0, impressions: 0, opt_ins: 0, oi_1000: 0 },
        },
        top_performers: [],
        experiments: [],
    };
}

/**
 * Daily analytics collection job
 * Would be called by cron
 */
export async function collectDailyAnalytics(): Promise<{
    success: boolean;
    processed?: number;
    error?: string;
}> {
    try {
        const supabase = await createClient();

        // Get all published posts from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: calendarEntries } = await supabase
            .from("marketing_content_calendar")
            .select("post_variant_id, marketing_post_variants(platform)")
            .eq("publish_status", "published")
            .gte("actual_published_at", thirtyDaysAgo.toISOString());

        if (!calendarEntries || calendarEntries.length === 0) {
            return { success: true, processed: 0 };
        }

        let processed = 0;

        // Fetch analytics for each post
        for (const entry of calendarEntries) {
            const variant = (entry as any).marketing_post_variants;
            if (variant) {
                await fetchPlatformAnalytics(entry.post_variant_id, variant.platform);
                processed++;
            }
        }

        logger.info({ processed }, "Daily analytics collection complete");

        return { success: true, processed };
    } catch (error) {
        logger.error({ error }, "Error in daily analytics collection");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
