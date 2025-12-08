/**
 * Ad Metrics API
 * Fetch performance metrics for campaigns
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError } from "@/lib/errors";

type RouteContext = {
    params: Promise<{ campaignId: string }>;
};

/**
 * GET /api/ads/metrics/[campaignId]
 * Get performance metrics for a campaign
 */
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { campaignId } = await context.params;

        // Get campaign/brief
        const { data: brief } = await supabase
            .from("marketing_content_briefs")
            .select("*")
            .eq("id", campaignId)
            .eq("user_id", user.id)
            .single();

        if (!brief) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        // Get all variants for this campaign
        const { data: variants } = await supabase
            .from("marketing_post_variants")
            .select("id")
            .eq("content_brief_id", campaignId);

        const variantIds = variants?.map((v) => v.id) || [];

        // Get analytics for all variants
        const { data: analytics } = await supabase
            .from("marketing_analytics")
            .select("*")
            .in("post_variant_id", variantIds);

        // Aggregate metrics
        const aggregated = {
            impressions: 0,
            clicks: 0,
            spend_cents: 0,
            leads: 0,
            cpc_cents: 0,
            cpm_cents: 0,
            ctr_percent: 0,
            cost_per_lead_cents: 0,
        };

        if (analytics && analytics.length > 0) {
            for (const metric of analytics) {
                aggregated.impressions += metric.impressions || 0;
                aggregated.clicks += metric.clicks || 0;
                aggregated.spend_cents += metric.spend_cents || 0;
                aggregated.leads += metric.leads_count || 0;
            }

            // Calculate averages
            if (aggregated.clicks > 0) {
                aggregated.cpc_cents = Math.round(
                    aggregated.spend_cents / aggregated.clicks
                );
            }

            if (aggregated.impressions > 0) {
                aggregated.cpm_cents = Math.round(
                    (aggregated.spend_cents / aggregated.impressions) * 1000
                );
                aggregated.ctr_percent =
                    (aggregated.clicks / aggregated.impressions) * 100;
            }

            if (aggregated.leads > 0) {
                aggregated.cost_per_lead_cents = Math.round(
                    aggregated.spend_cents / aggregated.leads
                );
            }
        }

        // Get historical snapshots
        const { data: snapshots } = await supabase
            .from("marketing_ad_snapshots")
            .select("*")
            .in("post_variant_id", variantIds)
            .order("snapshot_date", { ascending: true })
            .limit(100);

        logger.info({ campaignId, userId: user.id }, "Metrics fetched");

        return NextResponse.json({
            success: true,
            campaign: brief,
            metrics: aggregated,
            snapshots: snapshots || [],
            variants_count: variantIds.length,
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/ads/metrics/[campaignId]");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "fetch_campaign_metrics",
                endpoint: "GET /api/ads/metrics/[campaignId]",
            },
            extra: {
                errorType: error instanceof Error ? error.constructor.name : typeof error,
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
