/**
 * Ads Metrics Fetcher
 * Syncs ad performance data from Meta every 12 hours
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getCampaignInsights } from "@/lib/integrations/meta-ads";
import { decryptToken } from "@/lib/crypto/token-encryption";

/**
 * Sync all active ad campaigns and create snapshots
 * Should be run via cron every 12 hours
 */
export async function syncAllAdMetrics() {
    try {
        const supabase = await createClient();

        // Get all active campaigns
        const { data: briefs } = await supabase
            .from("marketing_content_briefs")
            .select("*, user_id")
            .eq("campaign_type", "paid_ad")
            .eq("is_active", true)
            .not("meta_campaign_id", "is", null);

        if (!briefs || briefs.length === 0) {
            logger.info({}, "No active ad campaigns to sync");
            return { success: true, synced: 0 };
        }

        let syncedCount = 0;

        for (const brief of briefs) {
            try {
                await syncCampaignMetrics(brief.id, brief.user_id);
                syncedCount++;
            } catch (error) {
                logger.error(
                    { error, briefId: brief.id },
                    "Failed to sync campaign metrics"
                );
            }
        }

        logger.info(
            { syncedCount, totalCount: briefs.length },
            "Metrics sync complete"
        );

        return { success: true, synced: syncedCount };
    } catch (error) {
        logger.error({ error }, "Error in syncAllAdMetrics");
        throw error;
    }
}

/**
 * Sync metrics for a specific campaign
 */
export async function syncCampaignMetrics(briefId: string, userId: string) {
    try {
        const supabase = await createClient();

        // Get campaign brief
        const { data: brief } = await supabase
            .from("marketing_content_briefs")
            .select("*")
            .eq("id", briefId)
            .eq("user_id", userId)
            .single();

        if (!brief || !brief.meta_campaign_id) {
            throw new Error("Campaign not found or not deployed");
        }

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

        // Fetch insights from Meta
        const insights = await getCampaignInsights(
            brief.meta_campaign_id,
            "lifetime",
            accessToken
        );

        if (!insights.data || insights.data.length === 0) {
            logger.warn({ briefId }, "No insights data returned from Meta");
            return;
        }

        const insightData = insights.data[0];

        // Get all variants for this campaign
        const { data: variants } = await supabase
            .from("marketing_post_variants")
            .select("id")
            .eq("content_brief_id", briefId);

        if (!variants || variants.length === 0) {
            logger.warn({ briefId }, "No variants found for campaign");
            return;
        }

        // Parse Meta metrics
        const impressions = parseInt(insightData.impressions || "0");
        const clicks = parseInt(insightData.clicks || "0");
        const spend = parseFloat(insightData.spend || "0");
        const spendCents = Math.round(spend * 100);

        // Calculate derived metrics
        const cpcCents = clicks > 0 ? Math.round(spendCents / clicks) : 0;
        const cpmCents =
            impressions > 0 ? Math.round((spendCents / impressions) * 1000) : 0;
        const ctrPercent = impressions > 0 ? (clicks / impressions) * 100 : 0;

        // Extract lead generation actions
        let leads = 0;
        if (insightData.actions) {
            for (const action of insightData.actions) {
                if (
                    action.action_type === "lead" ||
                    action.action_type === "onsite_conversion.lead_grouped"
                ) {
                    leads += parseInt(action.value || "0");
                }
            }
        }

        const costPerLeadCents = leads > 0 ? Math.round(spendCents / leads) : 0;

        // Update or create analytics for the first variant (aggregate level)
        const primaryVariant = variants[0];

        const { error: analyticsError } = await supabase
            .from("marketing_analytics")
            .upsert(
                {
                    post_variant_id: primaryVariant.id,
                    user_id: userId,
                    impressions,
                    clicks,
                    spend_cents: spendCents,
                    leads_count: leads,
                    cpc_cents: cpcCents,
                    cpm_cents: cpmCents,
                    ctr_percent: ctrPercent,
                    cost_per_lead_cents: costPerLeadCents,
                    last_synced_at: new Date().toISOString(),
                },
                {
                    onConflict: "post_variant_id",
                }
            );

        if (analyticsError) {
            throw analyticsError;
        }

        // Create snapshot
        await supabase.from("marketing_ad_snapshots").insert({
            post_variant_id: primaryVariant.id,
            user_id: userId,
            snapshot_date: new Date().toISOString(),
            impressions,
            clicks,
            spend_cents: spendCents,
            leads,
            cpc_cents: cpcCents,
            cpm_cents: cpmCents,
            ctr_percent: ctrPercent,
            cost_per_lead_cents: costPerLeadCents,
            raw_metrics: insightData,
        });

        logger.info(
            {
                briefId,
                impressions,
                clicks,
                leads,
                spendCents,
            },
            "Campaign metrics synced successfully"
        );
    } catch (error) {
        logger.error({ error, briefId }, "Error syncing campaign metrics");
        throw error;
    }
}

/**
 * Sync metrics for a specific user
 * Useful for on-demand refresh
 */
export async function syncUserAdMetrics(userId: string) {
    try {
        const supabase = await createClient();

        // Get user's active campaigns
        const { data: briefs } = await supabase
            .from("marketing_content_briefs")
            .select("id")
            .eq("user_id", userId)
            .eq("campaign_type", "paid_ad")
            .eq("is_active", true)
            .not("meta_campaign_id", "is", null);

        if (!briefs || briefs.length === 0) {
            return { success: true, synced: 0 };
        }

        let syncedCount = 0;

        for (const brief of briefs) {
            try {
                await syncCampaignMetrics(brief.id, userId);
                syncedCount++;
            } catch (error) {
                logger.error({ error, briefId: brief.id }, "Failed to sync campaign");
            }
        }

        return { success: true, synced: syncedCount };
    } catch (error) {
        logger.error({ error, userId }, "Error syncing user ad metrics");
        throw error;
    }
}
