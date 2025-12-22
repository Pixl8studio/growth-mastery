"use client";

/**
 * Admin Overview Client Component
 * Handles interactive elements like acknowledging notifications
 */

import Link from "next/link";
import type { DashboardStats, AttentionItem } from "./page";

interface AdminOverviewClientProps {
    stats: DashboardStats;
    attentionItems: AttentionItem[];
}

export default function AdminOverviewClient({
    stats,
    attentionItems,
}: AdminOverviewClientProps) {
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

    return (
        <div className="space-y-8">
            {/* Key Metrics Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Total Users
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {stats.totalUsers}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        +{stats.newUsersThisWeek} this week
                    </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Active Today
                        <span
                            className="ml-1 cursor-help text-xs"
                            title="Estimated based on 15% typical daily active rate. Real tracking requires activity log implementation."
                        >
                            (est.)
                        </span>
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        ~{stats.activeToday}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        ~
                        {stats.totalUsers
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
                                stats.avgHealthScore >= 80
                                    ? "text-green-600 dark:text-green-400"
                                    : stats.avgHealthScore >= 50
                                      ? "text-yellow-600 dark:text-yellow-400"
                                      : "text-red-600 dark:text-red-400"
                            }
                        >
                            {stats.avgHealthScore}
                        </span>
                        /100
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {stats.atRiskUsers} at-risk users
                    </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Total Cost (MTD)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {formatCurrency(stats.totalCostCents)}
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
                                            aria-hidden="true"
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
                                                        <button
                                                            className="text-sm text-primary hover:underline"
                                                            aria-label={`Mark ${item.title} as handled`}
                                                        >
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
