"use client";

/**
 * Admin Overview Dashboard
 * Aggregate stats and AI-prioritized attention feed
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import Link from "next/link";

interface DashboardStats {
    totalUsers: number;
    activeToday: number;
    avgHealthScore: number;
    totalCostCents: number;
    newUsersThisWeek: number;
    atRiskUsers: number;
}

interface AttentionItem {
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

export default function AdminOverviewPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const supabase = createClient();
                const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                // Fetch all data in parallel for improved performance
                const [
                    usersResult,
                    healthScoresResult,
                    monthlyCostsResult,
                    notificationsResult,
                ] = await Promise.all([
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
                if (usersError) throw usersError;

                const totalUsers = users?.length || 0;
                const newUsersThisWeek =
                    users?.filter((u) => new Date(u.created_at) > oneWeekAgo).length ||
                    0;

                const { data: healthScores, error: healthError } = healthScoresResult;
                if (healthError) {
                    logger.warn(
                        { error: healthError },
                        "Failed to fetch health scores"
                    );
                }

                const avgHealthScore =
                    healthScores && healthScores.length > 0
                        ? Math.round(
                              healthScores.reduce(
                                  (sum, h) => sum + h.overall_score,
                                  0
                              ) / healthScores.length
                          )
                        : 75; // Default if no data

                const atRiskUsers =
                    healthScores?.filter((h) => h.overall_score < 50).length || 0;

                const { data: monthlyCosts, error: costsError } = monthlyCostsResult;
                if (costsError) {
                    logger.warn({ error: costsError }, "Failed to fetch costs");
                }

                const totalCostCents =
                    monthlyCosts?.reduce((sum, c) => sum + c.total_cost_cents, 0) || 0;

                // For active today, we'd need activity tracking - placeholder for now
                const activeToday = Math.round(totalUsers * 0.15); // Estimate 15%

                setStats({
                    totalUsers,
                    activeToday,
                    avgHealthScore,
                    totalCostCents,
                    newUsersThisWeek,
                    atRiskUsers,
                });

                const { data: notifications, error: notifError } = notificationsResult;
                if (notifError) {
                    logger.warn({ error: notifError }, "Failed to fetch notifications");
                }

                // Map notifications to attention items
                const items: AttentionItem[] = (notifications || []).map((n) => ({
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

                setAttentionItems(items);
            } catch (err) {
                logger.error({ error: err }, "Failed to fetch dashboard data");
                setError("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, []);

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hr ago`;
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">
                    Loading dashboard...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Key Metrics Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Total Users
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {stats?.totalUsers || 0}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        +{stats?.newUsersThisWeek || 0} this week
                    </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Active Today
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {stats?.activeToday || 0}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        ~
                        {stats?.totalUsers
                            ? Math.round((stats.activeToday / stats.totalUsers) * 100)
                            : 0}
                        % of users
                    </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Avg Health Score
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        <span
                            className={
                                (stats?.avgHealthScore || 0) >= 80
                                    ? "text-green-600 dark:text-green-400"
                                    : (stats?.avgHealthScore || 0) >= 50
                                      ? "text-yellow-600 dark:text-yellow-400"
                                      : "text-red-600 dark:text-red-400"
                            }
                        >
                            {stats?.avgHealthScore || 0}
                        </span>
                        /100
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {stats?.atRiskUsers || 0} at-risk users
                    </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Total Cost (MTD)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {formatCurrency(stats?.totalCostCents || 0)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">All API usage</p>
                </div>
            </div>

            {/* Attention Feed */}
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">
                        Attention Feed
                    </h2>
                    <Link
                        href="/settings/admin/notifications"
                        className="text-sm text-primary hover:underline"
                    >
                        View all notifications
                    </Link>
                </div>

                {attentionItems.length === 0 ? (
                    <div className="rounded-lg border border-border bg-card p-8 text-center">
                        <p className="text-muted-foreground">
                            No items requiring attention. Great job!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {attentionItems.map((item) => (
                            <div
                                key={item.id}
                                className={`rounded-lg border p-4 ${
                                    item.priority === "urgent"
                                        ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
                                        : "border-border bg-card"
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3">
                                        <span
                                            className={`mt-0.5 inline-block h-2 w-2 rounded-full ${
                                                item.priority === "urgent"
                                                    ? "bg-red-500"
                                                    : "bg-yellow-500"
                                            }`}
                                        />
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {item.title}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {item.message}
                                            </p>
                                            <div className="mt-2 flex items-center space-x-3">
                                                {item.targetUserId && (
                                                    <Link
                                                        href={`/settings/admin/users/${item.targetUserId}`}
                                                        className="text-sm text-primary hover:underline"
                                                    >
                                                        View User
                                                    </Link>
                                                )}
                                                {item.requiresAcknowledgment &&
                                                    !item.acknowledged && (
                                                        <button className="text-sm text-primary hover:underline">
                                                            Mark Handled
                                                        </button>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {formatTimeAgo(item.createdAt)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Links */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link
                    href="/settings/admin/users?filter=at-risk"
                    className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
                >
                    <p className="font-medium text-foreground">At-Risk Users</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View users with low health scores
                    </p>
                </Link>

                <Link
                    href="/settings/admin/costs"
                    className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
                >
                    <p className="font-medium text-foreground">Cost Analysis</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Review API usage by user and service
                    </p>
                </Link>

                <Link
                    href="/settings/admin/emails"
                    className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
                >
                    <p className="font-medium text-foreground">Email Queue</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Review AI-drafted outreach emails
                    </p>
                </Link>

                <Link
                    href="/settings/admin/reports"
                    className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
                >
                    <p className="font-medium text-foreground">Generate Reports</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Export data and summaries
                    </p>
                </Link>
            </div>
        </div>
    );
}
