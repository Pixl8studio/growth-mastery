/**
 * Admin Overview Dashboard - Server Component
 * Fetches stats server-side and passes to client for interactivity
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { estimateActiveToday } from "@/lib/admin/config";
import AdminOverviewClient from "./overview-client";

export interface DashboardStats {
    totalUsers: number;
    activeToday: number;
    avgHealthScore: number;
    totalCostCents: number;
    newUsersThisWeek: number;
    atRiskUsers: number;
}

export interface AttentionItem {
    id: string;
    type: "error_spike" | "cost_alert" | "user_struggling" | "new_user" | "milestone";
    priority: "urgent" | "normal";
    title: string;
    message: string;
    targetUserId: string | null;
    targetUserName: string | null;
    createdAt: string;
    requiresAcknowledgment: boolean;
    acknowledged: boolean;
}

async function fetchDashboardData(): Promise<{
    stats: DashboardStats;
    attentionItems: AttentionItem[];
}> {
    const supabase = await createClient();
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch all data in parallel for improved performance
    const [usersResult, healthScoresResult, monthlyCostsResult, notificationsResult] =
        await Promise.all([
            // Fetch users count and stats
            supabase
                .from("user_profiles")
                .select("id, created_at, role")
                .eq("role", "user"),
            // Fetch health scores
            supabase.from("user_health_scores").select("overall_score"),
            // Fetch monthly costs
            supabase
                .from("api_usage_monthly")
                .select("total_cost_cents")
                .eq("month", currentMonth),
            // Fetch notifications for attention feed
            supabase
                .from("admin_notifications")
                .select(
                    `
                    id,
                    type,
                    priority,
                    title,
                    message,
                    target_user_id,
                    created_at,
                    requires_acknowledgment,
                    acknowledged_at
                `
                )
                .order("priority", { ascending: true })
                .order("created_at", { ascending: false })
                .limit(20),
        ]);

    const { data: users, error: usersError } = usersResult;
    if (usersError) {
        logger.error(
            { error: usersError },
            "Failed to fetch users for admin dashboard"
        );
    }

    const totalUsers = users?.length || 0;
    const newUsersThisWeek =
        users?.filter((u) => new Date(u.created_at) > oneWeekAgo).length || 0;

    const { data: healthScores, error: healthError } = healthScoresResult;
    if (healthError) {
        logger.warn({ error: healthError }, "Failed to fetch health scores");
    }

    const avgHealthScore =
        healthScores && healthScores.length > 0
            ? Math.round(
                  healthScores.reduce((sum, h) => sum + h.overall_score, 0) /
                      healthScores.length
              )
            : 75; // Default if no data

    const atRiskUsers = healthScores?.filter((h) => h.overall_score < 50).length || 0;

    const { data: monthlyCosts, error: costsError } = monthlyCostsResult;
    if (costsError) {
        logger.warn({ error: costsError }, "Failed to fetch costs");
    }

    const totalCostCents =
        monthlyCosts?.reduce((sum, c) => sum + c.total_cost_cents, 0) || 0;

    // For active today, use centralized estimation until real activity tracking is implemented
    // See lib/admin/config.ts for methodology documentation
    const activeToday = estimateActiveToday(totalUsers);

    const stats: DashboardStats = {
        totalUsers,
        activeToday,
        avgHealthScore,
        totalCostCents,
        newUsersThisWeek,
        atRiskUsers,
    };

    const { data: notifications, error: notifError } = notificationsResult;
    if (notifError) {
        logger.warn({ error: notifError }, "Failed to fetch notifications");
    }

    // Map notifications to attention items
    const attentionItems: AttentionItem[] = (notifications || []).map((n) => ({
        id: n.id,
        type: n.type as AttentionItem["type"],
        priority: n.priority as "urgent" | "normal",
        title: n.title,
        message: n.message,
        targetUserId: n.target_user_id,
        targetUserName: null, // Would need a join to get this
        createdAt: n.created_at,
        requiresAcknowledgment: n.requires_acknowledgment,
        acknowledged: !!n.acknowledged_at,
    }));

    return { stats, attentionItems };
}

export default async function AdminOverviewPage() {
    const { stats, attentionItems } = await fetchDashboardData();

    return <AdminOverviewClient stats={stats} attentionItems={attentionItems} />;
}
