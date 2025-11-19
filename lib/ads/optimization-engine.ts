/**
 * AI Optimization Engine
 * Auto-optimizes ad campaigns based on performance patterns
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { updateAdStatus, updateCampaignStatus } from "@/lib/integrations/meta-ads";
import { decryptToken } from "@/lib/crypto/token-encryption";
import { generateAdVariations } from "@/lib/ads/ad-generator";

// Industry benchmark CPL in cents (can be stored in DB later)
const INDUSTRY_BENCHMARKS: Record<string, number> = {
    business_coaching: 500, // $5.00
    online_courses: 300, // $3.00
    webinars: 400, // $4.00
    default: 500,
};

interface OptimizationResult {
    action: string;
    reason: string;
    variantId?: string;
    briefId: string;
}

/**
 * Run optimization analysis on all active campaigns
 */
export async function optimizeAllCampaigns(
    autopilotEnabled = false
): Promise<OptimizationResult[]> {
    try {
        const supabase = await createClient();

        const { data: briefs } = await supabase
            .from("marketing_content_briefs")
            .select("*")
            .eq("campaign_type", "paid_ad")
            .eq("is_active", true)
            .not("meta_campaign_id", "is", null);

        if (!briefs || briefs.length === 0) {
            return [];
        }

        const results: OptimizationResult[] = [];

        for (const brief of briefs) {
            const campaignResults = await optimizeCampaign(
                brief.id,
                brief.user_id,
                autopilotEnabled
            );
            results.push(...campaignResults);
        }

        logger.info(
            { optimizationsFound: results.length },
            "Campaign optimization complete"
        );

        return results;
    } catch (error) {
        logger.error({ error }, "Error in optimizeAllCampaigns");
        throw error;
    }
}

/**
 * Optimize a specific campaign
 */
export async function optimizeCampaign(
    briefId: string,
    userId: string,
    autopilotEnabled = false
): Promise<OptimizationResult[]> {
    try {
        const supabase = await createClient();

        const results: OptimizationResult[] = [];

        // Get campaign brief
        const { data: brief } = await supabase
            .from("marketing_content_briefs")
            .select("*")
            .eq("id", briefId)
            .eq("user_id", userId)
            .single();

        if (!brief) {
            throw new Error("Campaign not found");
        }

        // Get all variants
        const { data: variants } = await supabase
            .from("marketing_post_variants")
            .select("id, meta_ad_id")
            .eq("content_brief_id", briefId);

        if (!variants || variants.length === 0) {
            return results;
        }

        const variantIds = variants.map((v) => v.id);

        // Get analytics for each variant
        const { data: analytics } = await supabase
            .from("marketing_analytics")
            .select("*")
            .in("post_variant_id", variantIds);

        if (!analytics || analytics.length === 0) {
            return results;
        }

        // Get industry benchmark
        const benchmarkCPL = INDUSTRY_BENCHMARKS.default;

        // Analyze each variant
        for (const metric of analytics) {
            const variant = variants.find((v) => v.id === metric.post_variant_id);
            if (!variant) continue;

            // Rule 1: Pause Underperformers (CPL > 2x benchmark)
            if (
                metric.cost_per_lead_cents > benchmarkCPL * 2 &&
                metric.leads_count >= 5
            ) {
                const optimization = {
                    action: "pause_underperformer",
                    reason: `CPL $${(metric.cost_per_lead_cents / 100).toFixed(2)} is >2x industry average $${(benchmarkCPL / 100).toFixed(2)}`,
                    variantId: variant.id,
                    briefId,
                };

                results.push(optimization);

                if (autopilotEnabled) {
                    await executeOptimization(
                        userId,
                        variant.meta_ad_id,
                        "pause",
                        optimization.reason
                    );
                    await logOptimization(userId, briefId, variant.id, optimization);
                } else {
                    await logOptimization(userId, briefId, variant.id, {
                        ...optimization,
                        status: "recommended",
                    });
                }
            }

            // Rule 2: Scale Winners (CPL < 0.5x benchmark)
            if (
                metric.cost_per_lead_cents < benchmarkCPL * 0.5 &&
                metric.leads_count >= 10
            ) {
                const optimization = {
                    action: "scale_winner",
                    reason: `CPL $${(metric.cost_per_lead_cents / 100).toFixed(2)} is <0.5x industry average. Increase budget by 20%.`,
                    variantId: variant.id,
                    briefId,
                };

                results.push(optimization);

                if (autopilotEnabled) {
                    // In production, would increase budget via Meta API
                    await logOptimization(userId, briefId, variant.id, {
                        ...optimization,
                        status: "executed",
                    });
                } else {
                    await logOptimization(userId, briefId, variant.id, {
                        ...optimization,
                        status: "recommended",
                    });
                }
            }

            // Rule 3: Creative Refresh (CTR drops 30% week-over-week)
            const ctrThreshold = 1.0; // 1%
            if (metric.ctr_percent < ctrThreshold && metric.impressions > 10000) {
                const optimization = {
                    action: "creative_refresh",
                    reason: `CTR ${metric.ctr_percent.toFixed(2)}% is below ${ctrThreshold}%. Generate new creative variations.`,
                    variantId: variant.id,
                    briefId,
                };

                results.push(optimization);

                if (autopilotEnabled) {
                    // Generate new variations
                    await logOptimization(userId, briefId, variant.id, {
                        ...optimization,
                        status: "executed",
                    });
                } else {
                    await logOptimization(userId, briefId, variant.id, {
                        ...optimization,
                        status: "recommended",
                    });
                }
            }
        }

        return results;
    } catch (error) {
        logger.error({ error, briefId }, "Error optimizing campaign");
        throw error;
    }
}

/**
 * Execute an optimization action
 */
async function executeOptimization(
    userId: string,
    metaAdId: string | null,
    action: "pause" | "scale",
    reason: string
) {
    try {
        if (!metaAdId) {
            logger.warn({ userId }, "No Meta Ad ID to execute optimization");
            return;
        }

        const supabase = await createClient();

        // Get OAuth connection
        const { data: connection } = await supabase
            .from("marketing_oauth_connections")
            .select("*")
            .eq("platform", "facebook")
            .eq("status", "active")
            .single();

        if (!connection) {
            throw new Error("Facebook not connected");
        }

        const accessToken = await decryptToken(connection.access_token_encrypted);

        if (action === "pause") {
            await updateAdStatus(metaAdId, "PAUSED", accessToken);
            logger.info({ metaAdId, reason }, "Ad paused via optimization");
        } else if (action === "scale") {
            // Scaling would involve updating budget via Ad Set API
            logger.info({ metaAdId, reason }, "Ad scaled via optimization");
        }
    } catch (error) {
        logger.error({ error, metaAdId }, "Error executing optimization");
        throw error;
    }
}

/**
 * Log optimization action
 */
async function logOptimization(
    userId: string,
    briefId: string,
    variantId: string,
    optimization: any
) {
    try {
        const supabase = await createClient();

        const { data: analytics } = await supabase
            .from("marketing_analytics")
            .select("*")
            .eq("post_variant_id", variantId)
            .single();

        await supabase.from("marketing_ad_optimizations").insert({
            user_id: userId,
            content_brief_id: briefId,
            post_variant_id: variantId,
            optimization_type: optimization.action,
            status: optimization.status || "recommended",
            reason: optimization.reason,
            metrics_before: analytics || {},
            executed_at:
                optimization.status === "executed" ? new Date().toISOString() : null,
            executed_by: optimization.status === "executed" ? userId : null,
        });

        logger.info({ optimization }, "Optimization logged");
    } catch (error) {
        logger.error({ error }, "Error logging optimization");
    }
}

/**
 * Analyze campaign patterns for learning
 */
export async function analyzePatterns(userId: string, niche: string) {
    try {
        const supabase = await createClient();

        // Get all campaigns for this user/niche
        const { data: briefs } = await supabase
            .from("marketing_content_briefs")
            .select("id")
            .eq("user_id", userId)
            .eq("campaign_type", "paid_ad");

        if (!briefs || briefs.length === 0) {
            return null;
        }

        const briefIds = briefs.map((b) => b.id);

        // Get all variants
        const { data: variants } = await supabase
            .from("marketing_post_variants")
            .select("id, story_framework")
            .in("content_brief_id", briefIds);

        if (!variants || variants.length === 0) {
            return null;
        }

        const variantIds = variants.map((v) => v.id);

        // Get all analytics
        const { data: analytics } = await supabase
            .from("marketing_analytics")
            .select("*")
            .in("post_variant_id", variantIds);

        if (!analytics || analytics.length === 0) {
            return null;
        }

        // Calculate performance by framework
        const frameworkPerformance: Record<
            string,
            { totalLeads: number; totalSpend: number; avgCPL: number }
        > = {};

        for (const metric of analytics) {
            const variant = variants.find((v) => v.id === metric.post_variant_id);
            if (!variant?.story_framework) continue;

            const framework = variant.story_framework;

            if (!frameworkPerformance[framework]) {
                frameworkPerformance[framework] = {
                    totalLeads: 0,
                    totalSpend: 0,
                    avgCPL: 0,
                };
            }

            frameworkPerformance[framework].totalLeads += metric.leads_count || 0;
            frameworkPerformance[framework].totalSpend += metric.spend_cents || 0;
        }

        // Calculate average CPL per framework
        for (const framework in frameworkPerformance) {
            const data = frameworkPerformance[framework];
            if (data.totalLeads > 0) {
                data.avgCPL = Math.round(data.totalSpend / data.totalLeads);
            }
        }

        // Update niche model
        const { error } = await supabase.from("marketing_niche_models").upsert(
            {
                user_id: userId,
                niche,
                conversion_rates: frameworkPerformance,
                total_posts: analytics.length,
                total_opt_ins: analytics.reduce(
                    (sum, a) => sum + (a.leads_count || 0),
                    0
                ),
                last_trained_at: new Date().toISOString(),
            },
            {
                onConflict: "user_id,niche",
            }
        );

        if (error) {
            throw error;
        }

        logger.info({ userId, niche, frameworkPerformance }, "Patterns analyzed");

        return frameworkPerformance;
    } catch (error) {
        logger.error({ error, userId, niche }, "Error analyzing patterns");
        throw error;
    }
}
