/**
 * Global Analytics Service
 *
 * Aggregates AI follow-up analytics across all funnels for a user.
 * Provides dashboard metrics, time-series data, and conversion funnels.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { FollowupProspect } from "@/types/followup";

interface GlobalAnalytics {
    totalProspects: number;
    avgIntentScore: number;
    conversionRate: number;
    activeSequences: number;
    bySegment: Record<string, number>;
    byEngagement: Record<string, number>;
    byFunnel: Array<{
        funnelId: string;
        funnelName: string;
        prospectCount: number;
        conversionRate: number;
    }>;
    recentActivity: Array<{
        id: string;
        prospectEmail: string;
        prospectName: string | null;
        eventType: string;
        timestamp: string;
        funnelName: string;
    }>;
}

interface ProspectWithFunnel extends FollowupProspect {
    funnel_projects?: {
        id: string;
        name: string;
    };
}

/**
 * Get all prospects for a user across all funnels.
 */
export async function getGlobalProspects(
    userId: string,
    filters?: {
        segment?: string;
        minIntentScore?: number;
        converted?: boolean;
        funnelProjectId?: string;
        search?: string;
    }
): Promise<{
    success: boolean;
    prospects?: ProspectWithFunnel[];
    error?: string;
}> {
    const supabase = await createClient();

    logger.info({ userId, filters }, "Fetching global prospects");

    let query = supabase
        .from("followup_prospects")
        .select(
            `
            *,
            funnel_projects (
                id,
                name
            )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (filters?.segment) {
        query = query.eq("segment", filters.segment);
    }

    if (filters?.minIntentScore !== undefined) {
        query = query.gte("intent_score", filters.minIntentScore);
    }

    if (filters?.converted !== undefined) {
        query = query.eq("converted", filters.converted);
    }

    if (filters?.funnelProjectId) {
        query = query.eq("funnel_project_id", filters.funnelProjectId);
    }

    if (filters?.search) {
        query = query.or(
            `email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%`
        );
    }

    const { data, error } = await query;

    if (error) {
        logger.error({ error, userId }, "Failed to fetch global prospects");
        return { success: false, error: error.message };
    }

    return { success: true, prospects: data as ProspectWithFunnel[] };
}

/**
 * Get comprehensive global analytics.
 */
export async function getGlobalAnalytics(
    userId: string,
    dateRange?: { start: string; end: string }
): Promise<{ success: boolean; analytics?: GlobalAnalytics; error?: string }> {
    const supabase = await createClient();

    logger.info({ userId, dateRange }, "Generating global analytics");

    // Fetch all prospects
    let prospectsQuery = supabase
        .from("followup_prospects")
        .select(
            `
            *,
            funnel_projects (
                id,
                name
            )
        `
        )
        .eq("user_id", userId);

    if (dateRange) {
        prospectsQuery = prospectsQuery
            .gte("created_at", dateRange.start)
            .lte("created_at", dateRange.end);
    }

    const { data: prospects, error: prospectsError } = await prospectsQuery;

    if (prospectsError) {
        logger.error({ error: prospectsError, userId }, "Failed to fetch prospects");
        return { success: false, error: prospectsError.message };
    }

    // Calculate metrics
    const totalProspects = prospects?.length || 0;
    const convertedProspects = prospects?.filter((p) => p.converted).length || 0;
    const conversionRate =
        totalProspects > 0 ? (convertedProspects / totalProspects) * 100 : 0;

    const avgIntentScore =
        totalProspects > 0
            ? prospects!.reduce((sum, p) => sum + p.intent_score, 0) / totalProspects
            : 0;

    // Segment breakdown
    const bySegment: Record<string, number> = {};
    prospects?.forEach((p) => {
        bySegment[p.segment] = (bySegment[p.segment] || 0) + 1;
    });

    // Engagement level breakdown
    const byEngagement: Record<string, number> = {};
    prospects?.forEach((p) => {
        byEngagement[p.engagement_level] = (byEngagement[p.engagement_level] || 0) + 1;
    });

    // Funnel breakdown
    const funnelMap = new Map<
        string,
        { name: string; count: number; converted: number }
    >();

    (prospects as ProspectWithFunnel[] | null)?.forEach((p) => {
        if (!p.funnel_projects) return;

        const funnelId = p.funnel_projects.id;
        const existing = funnelMap.get(funnelId) || {
            name: p.funnel_projects.name,
            count: 0,
            converted: 0,
        };

        funnelMap.set(funnelId, {
            name: existing.name,
            count: existing.count + 1,
            converted: existing.converted + (p.converted ? 1 : 0),
        });
    });

    const byFunnel = Array.from(funnelMap.entries()).map(([funnelId, stats]) => ({
        funnelId,
        funnelName: stats.name,
        prospectCount: stats.count,
        conversionRate: stats.count > 0 ? (stats.converted / stats.count) * 100 : 0,
    }));

    // Fetch recent activity (deliveries)
    const { data: recentDeliveries } = await supabase
        .from("followup_deliveries")
        .select(
            `
            id,
            delivery_status,
            actual_sent_at,
            followup_prospects (
                email,
                first_name,
                funnel_projects (
                    name
                )
            )
        `
        )
        .in("prospect_id", prospects?.map((p) => p.id) || [])
        .not("actual_sent_at", "is", null)
        .order("actual_sent_at", { ascending: false })
        .limit(20);

    const recentActivity =
        recentDeliveries?.map((d: any) => ({
            id: d.id,
            prospectEmail: d.followup_prospects?.email || "Unknown",
            prospectName: d.followup_prospects?.first_name || null,
            eventType: d.delivery_status,
            timestamp: d.actual_sent_at,
            funnelName: d.followup_prospects?.funnel_projects?.name || "Unknown",
        })) || [];

    // Count active sequences
    const { count: activeSequences } = await supabase
        .from("followup_sequences")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .in(
            "agent_config_id",
            await supabase
                .from("followup_agent_configs")
                .select("id")
                .eq("user_id", userId)
                .then((r) => r.data?.map((c) => c.id) || [])
        );

    const analytics: GlobalAnalytics = {
        totalProspects,
        avgIntentScore: Math.round(avgIntentScore),
        conversionRate: Math.round(conversionRate * 10) / 10,
        activeSequences: activeSequences || 0,
        bySegment,
        byEngagement,
        byFunnel,
        recentActivity,
    };

    logger.info(
        { userId, totalProspects, conversionRate },
        "Global analytics generated"
    );

    return { success: true, analytics };
}

/**
 * Get engagement timeline data for charting.
 */
export async function getEngagementTimeline(
    userId: string,
    days: number = 30
): Promise<{
    success: boolean;
    timeline?: Array<{ date: string; touches: number; opens: number; clicks: number }>;
    error?: string;
}> {
    const supabase = await createClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // This would be more efficient with a proper SQL query
    // For now, we'll fetch recent deliveries and group by date
    const { data: deliveries, error } = await supabase
        .from("followup_deliveries")
        .select("actual_sent_at, opened_at, first_click_at, prospect_id")
        .in(
            "prospect_id",
            await supabase
                .from("followup_prospects")
                .select("id")
                .eq("user_id", userId)
                .then((r) => r.data?.map((p) => p.id) || [])
        )
        .gte("actual_sent_at", startDate.toISOString());

    if (error) {
        logger.error({ error, userId }, "Failed to fetch engagement timeline");
        return { success: false, error: error.message };
    }

    // Group by date
    const dateMap = new Map<
        string,
        { touches: number; opens: number; clicks: number }
    >();

    deliveries?.forEach((d) => {
        if (!d.actual_sent_at) return;

        const date = d.actual_sent_at.split("T")[0];
        const existing = dateMap.get(date) || { touches: 0, opens: 0, clicks: 0 };

        dateMap.set(date, {
            touches: existing.touches + 1,
            opens: existing.opens + (d.opened_at ? 1 : 0),
            clicks: existing.clicks + (d.first_click_at ? 1 : 0),
        });
    });

    const timeline = Array.from(dateMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, timeline };
}

/**
 * Get conversion funnel metrics.
 */
export async function getConversionFunnel(userId: string): Promise<{
    success: boolean;
    funnel?: Array<{ stage: string; count: number; percentage: number }>;
    error?: string;
}> {
    const supabase = await createClient();

    const { data: prospects, error } = await supabase
        .from("followup_prospects")
        .select("segment, converted, total_touches")
        .eq("user_id", userId);

    if (error) {
        logger.error({ error, userId }, "Failed to fetch conversion funnel");
        return { success: false, error: error.message };
    }

    const total = prospects?.length || 0;
    const touched = prospects?.filter((p) => p.total_touches > 0).length || 0;
    const engaged = prospects?.filter((p) => p.total_touches >= 3).length || 0;
    const converted = prospects?.filter((p) => p.converted).length || 0;

    const funnel = [
        {
            stage: "Prospects",
            count: total,
            percentage: 100,
        },
        {
            stage: "Touched",
            count: touched,
            percentage: total > 0 ? (touched / total) * 100 : 0,
        },
        {
            stage: "Engaged (3+ touches)",
            count: engaged,
            percentage: total > 0 ? (engaged / total) * 100 : 0,
        },
        {
            stage: "Converted",
            count: converted,
            percentage: total > 0 ? (converted / total) * 100 : 0,
        },
    ];

    return { success: true, funnel };
}
