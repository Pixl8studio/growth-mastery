/**
 * Analytics Service
 *
 * Calculates metrics for AI follow-up engine performance.
 * Provides deliverability, engagement, conversion, and segmentation analytics.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface DeliverabilityMetrics {
    total_scheduled: number;
    total_sent: number;
    total_delivered: number;
    total_bounced: number;
    total_failed: number;
    delivery_rate: number;
    bounce_rate: number;
    send_rate: number;
}

export interface EngagementMetrics {
    total_opens: number;
    total_clicks: number;
    total_replies: number;
    open_rate: number;
    click_rate: number;
    reply_rate: number;
    click_to_open_rate: number;
}

export interface ConversionMetrics {
    total_prospects: number;
    total_converted: number;
    conversion_rate: number;
    total_revenue: number;
    average_order_value: number;
    revenue_per_prospect: number;
}

export interface SegmentMetrics {
    segment: string;
    prospect_count: number;
    conversion_rate: number;
    average_intent_score: number;
    average_watch_percentage: number;
}

/**
 * Get deliverability metrics for a funnel project.
 */
export async function getDeliverabilityMetrics(
    funnelProjectId: string,
    dateRange?: { start: string; end: string }
): Promise<{ success: boolean; metrics?: DeliverabilityMetrics; error?: string }> {
    const supabase = await createClient();

    logger.info(
        { funnelProjectId, dateRange },
        "📊 Calculating deliverability metrics"
    );

    let query = supabase
        .from("followup_deliveries")
        .select("delivery_status, followup_prospects!inner(funnel_project_id)")
        .eq("followup_prospects.funnel_project_id", funnelProjectId);

    if (dateRange) {
        query = query
            .gte("created_at", dateRange.start)
            .lte("created_at", dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
        logger.error(
            { error, funnelProjectId },
            "❌ Failed to fetch deliverability data"
        );
        return { success: false, error: error.message };
    }

    const totalScheduled = data.length;
    const totalSent = data.filter((d) => d.delivery_status !== "pending").length;
    const totalDelivered = data.filter((d) => d.delivery_status === "delivered").length;
    const totalBounced = data.filter((d) => d.delivery_status === "bounced").length;
    const totalFailed = data.filter((d) => d.delivery_status === "failed").length;

    const metrics: DeliverabilityMetrics = {
        total_scheduled: totalScheduled,
        total_sent: totalSent,
        total_delivered: totalDelivered,
        total_bounced: totalBounced,
        total_failed: totalFailed,
        delivery_rate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        bounce_rate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
        send_rate: totalScheduled > 0 ? (totalSent / totalScheduled) * 100 : 0,
    };

    logger.info(
        { funnelProjectId, ...metrics },
        "✅ Deliverability metrics calculated"
    );

    return { success: true, metrics };
}

/**
 * Get engagement metrics for a funnel project.
 */
export async function getEngagementMetrics(
    funnelProjectId: string,
    dateRange?: { start: string; end: string }
): Promise<{ success: boolean; metrics?: EngagementMetrics; error?: string }> {
    const supabase = await createClient();

    logger.info({ funnelProjectId, dateRange }, "📊 Calculating engagement metrics");

    let query = supabase
        .from("followup_deliveries")
        .select(
            "opened_at, first_click_at, replied_at, total_clicks, delivery_status, followup_prospects!inner(funnel_project_id)"
        )
        .eq("followup_prospects.funnel_project_id", funnelProjectId)
        .in("delivery_status", ["sent", "delivered", "opened", "clicked", "replied"]);

    if (dateRange) {
        query = query
            .gte("created_at", dateRange.start)
            .lte("created_at", dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
        logger.error({ error, funnelProjectId }, "❌ Failed to fetch engagement data");
        return { success: false, error: error.message };
    }

    const totalDeliveries = data.length;
    const totalOpens = data.filter((d) => d.opened_at).length;
    const totalClicks = data.filter((d) => d.first_click_at).length;
    const totalReplies = data.filter((d) => d.replied_at).length;

    const metrics: EngagementMetrics = {
        total_opens: totalOpens,
        total_clicks: totalClicks,
        total_replies: totalReplies,
        open_rate: totalDeliveries > 0 ? (totalOpens / totalDeliveries) * 100 : 0,
        click_rate: totalDeliveries > 0 ? (totalClicks / totalDeliveries) * 100 : 0,
        reply_rate: totalDeliveries > 0 ? (totalReplies / totalDeliveries) * 100 : 0,
        click_to_open_rate: totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0,
    };

    logger.info({ funnelProjectId, ...metrics }, "✅ Engagement metrics calculated");

    return { success: true, metrics };
}

/**
 * Get conversion metrics for a funnel project.
 */
export async function getConversionMetrics(
    funnelProjectId: string,
    dateRange?: { start: string; end: string }
): Promise<{ success: boolean; metrics?: ConversionMetrics; error?: string }> {
    const supabase = await createClient();

    logger.info({ funnelProjectId, dateRange }, "📊 Calculating conversion metrics");

    let query = supabase
        .from("followup_prospects")
        .select("converted, conversion_value")
        .eq("funnel_project_id", funnelProjectId);

    if (dateRange) {
        query = query
            .gte("created_at", dateRange.start)
            .lte("created_at", dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
        logger.error({ error, funnelProjectId }, "❌ Failed to fetch conversion data");
        return { success: false, error: error.message };
    }

    const totalProspects = data.length;
    const totalConverted = data.filter((p) => p.converted).length;
    const totalRevenue = data
        .filter((p) => p.converted && p.conversion_value)
        .reduce((sum, p) => sum + Number(p.conversion_value), 0);

    const metrics: ConversionMetrics = {
        total_prospects: totalProspects,
        total_converted: totalConverted,
        conversion_rate:
            totalProspects > 0 ? (totalConverted / totalProspects) * 100 : 0,
        total_revenue: totalRevenue,
        average_order_value: totalConverted > 0 ? totalRevenue / totalConverted : 0,
        revenue_per_prospect: totalProspects > 0 ? totalRevenue / totalProspects : 0,
    };

    logger.info({ funnelProjectId, ...metrics }, "✅ Conversion metrics calculated");

    return { success: true, metrics };
}

/**
 * Get segmentation breakdown for a funnel project.
 */
export async function getSegmentMetrics(
    funnelProjectId: string
): Promise<{ success: boolean; metrics?: SegmentMetrics[]; error?: string }> {
    const supabase = await createClient();

    logger.info({ funnelProjectId }, "📊 Calculating segment metrics");

    const { data, error } = await supabase
        .from("followup_prospects")
        .select("segment, converted, intent_score, watch_percentage")
        .eq("funnel_project_id", funnelProjectId);

    if (error) {
        logger.error({ error, funnelProjectId }, "❌ Failed to fetch segment data");
        return { success: false, error: error.message };
    }

    // Group by segment
    const segments = ["no_show", "skimmer", "sampler", "engaged", "hot"];
    const metrics: SegmentMetrics[] = segments.map((segment) => {
        const segmentProspects = data.filter((p) => p.segment === segment);
        const converted = segmentProspects.filter((p) => p.converted).length;

        return {
            segment,
            prospect_count: segmentProspects.length,
            conversion_rate:
                segmentProspects.length > 0
                    ? (converted / segmentProspects.length) * 100
                    : 0,
            average_intent_score:
                segmentProspects.length > 0
                    ? segmentProspects.reduce((sum, p) => sum + p.intent_score, 0) /
                      segmentProspects.length
                    : 0,
            average_watch_percentage:
                segmentProspects.length > 0
                    ? segmentProspects.reduce((sum, p) => sum + p.watch_percentage, 0) /
                      segmentProspects.length
                    : 0,
        };
    });

    logger.info(
        { funnelProjectId, segmentCount: metrics.length },
        "✅ Segment metrics calculated"
    );

    return { success: true, metrics };
}

/**
 * Get complete analytics dashboard data.
 */
export async function getDashboardAnalytics(
    funnelProjectId: string,
    dateRange?: { start: string; end: string }
): Promise<{
    success: boolean;
    analytics?: {
        deliverability: DeliverabilityMetrics;
        engagement: EngagementMetrics;
        conversion: ConversionMetrics;
        segments: SegmentMetrics[];
    };
    error?: string;
}> {
    logger.info(
        { funnelProjectId, dateRange },
        "📊 Fetching complete dashboard analytics"
    );

    const [deliverability, engagement, conversion, segments] = await Promise.all([
        getDeliverabilityMetrics(funnelProjectId, dateRange),
        getEngagementMetrics(funnelProjectId, dateRange),
        getConversionMetrics(funnelProjectId, dateRange),
        getSegmentMetrics(funnelProjectId),
    ]);

    if (
        !deliverability.success ||
        !engagement.success ||
        !conversion.success ||
        !segments.success
    ) {
        return {
            success: false,
            error: "Failed to fetch complete analytics",
        };
    }

    return {
        success: true,
        analytics: {
            deliverability: deliverability.metrics!,
            engagement: engagement.metrics!,
            conversion: conversion.metrics!,
            segments: segments.metrics!,
        },
    };
}
