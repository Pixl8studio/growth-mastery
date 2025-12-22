"use client";

/**
 * Admin Notifications Center
 * View and manage notifications with priority filtering
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import Link from "next/link";

interface Notification {
    id: string;
    type: string;
    priority: "urgent" | "normal";
    title: string;
    message: string;
    targetUserId: string | null;
    targetUserEmail: string | null;
    requiresAcknowledgment: boolean;
    acknowledgedBy: string | null;
    acknowledgedAt: string | null;
    createdAt: string;
}

type FilterType = "all" | "urgent" | "unacknowledged";

export default function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>("all");
    const [acknowledging, setAcknowledging] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            const query = supabase
                .from("admin_notifications")
                .select("*")
                .order("priority", { ascending: true })
                .order("created_at", { ascending: false })
                .limit(100);

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            // Get user emails for target users
            const targetUserIds = [
                ...new Set(
                    data?.filter((n) => n.target_user_id).map((n) => n.target_user_id)
                ),
            ];

            let userEmailMap = new Map<string, string>();
            if (targetUserIds.length > 0) {
                const { data: users } = await supabase
                    .from("user_profiles")
                    .select("id, email")
                    .in("id", targetUserIds);

                userEmailMap = new Map(users?.map((u) => [u.id, u.email]) || []);
            }

            setNotifications(
                data?.map((n) => ({
                    id: n.id,
                    type: n.type,
                    priority: n.priority as "urgent" | "normal",
                    title: n.title,
                    message: n.message,
                    targetUserId: n.target_user_id,
                    targetUserEmail: n.target_user_id
                        ? userEmailMap.get(n.target_user_id) || null
                        : null,
                    requiresAcknowledgment: n.requires_acknowledgment,
                    acknowledgedBy: n.acknowledged_by,
                    acknowledgedAt: n.acknowledged_at,
                    createdAt: n.created_at,
                })) || []
            );
        } catch (err) {
            logger.error({ error: err }, "Failed to fetch notifications");
            setError("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleAcknowledge = async (notificationId: string) => {
        try {
            setAcknowledging(notificationId);
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("admin_notifications")
                .update({
                    acknowledged_by: user.id,
                    acknowledged_at: new Date().toISOString(),
                })
                .eq("id", notificationId);

            if (error) throw error;

            // Update local state
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId
                        ? {
                              ...n,
                              acknowledgedBy: user.id,
                              acknowledgedAt: new Date().toISOString(),
                          }
                        : n
                )
            );
        } catch (err) {
            logger.error({ error: err }, "Failed to acknowledge notification");
        } finally {
            setAcknowledging(null);
        }
    };

    const filteredNotifications = notifications.filter((n) => {
        if (filter === "urgent") return n.priority === "urgent";
        if (filter === "unacknowledged")
            return n.requiresAcknowledgment && !n.acknowledgedAt;
        return true;
    });

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            error_spike: "Error Spike",
            cost_alert: "Cost Alert",
            payment_failed: "Payment Failed",
            user_struggling: "User Struggling",
            ai_suggestion: "AI Suggestion",
            new_user: "New User",
            milestone: "Milestone",
            follow_up_due: "Follow-up Due",
            nps_detractor: "NPS Detractor",
        };
        return labels[type] || type;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">
                    Loading notifications...
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

    const urgentCount = notifications.filter((n) => n.priority === "urgent").length;
    const unackCount = notifications.filter(
        (n) => n.requiresAcknowledgment && !n.acknowledgedAt
    ).length;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {notifications.length}
                    </p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        Urgent
                    </p>
                    <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">
                        {urgentCount}
                    </p>
                </div>
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-950/30">
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        Requires Action
                    </p>
                    <p className="mt-1 text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                        {unackCount}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Filter:</span>
                <button
                    onClick={() => setFilter("all")}
                    className={`rounded-md px-3 py-1 text-sm ${
                        filter === "all"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                    All ({notifications.length})
                </button>
                <button
                    onClick={() => setFilter("urgent")}
                    className={`rounded-md px-3 py-1 text-sm ${
                        filter === "urgent"
                            ? "bg-red-500 text-white"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Urgent ({urgentCount})
                </button>
                <button
                    onClick={() => setFilter("unacknowledged")}
                    className={`rounded-md px-3 py-1 text-sm ${
                        filter === "unacknowledged"
                            ? "bg-yellow-500 text-white"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Requires Action ({unackCount})
                </button>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                    <p className="text-muted-foreground">No notifications found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`rounded-lg border p-4 ${
                                notification.priority === "urgent"
                                    ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
                                    : "border-border bg-card"
                            } ${notification.acknowledgedAt ? "opacity-60" : ""}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                    <span
                                        className={`mt-1 inline-block h-2 w-2 rounded-full ${
                                            notification.priority === "urgent"
                                                ? "bg-red-500"
                                                : "bg-yellow-500"
                                        }`}
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium text-foreground">
                                                {notification.title}
                                            </span>
                                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                                {getTypeLabel(notification.type)}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {notification.message}
                                        </p>
                                        {notification.targetUserEmail && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                User: {notification.targetUserEmail}
                                            </p>
                                        )}
                                        <div className="mt-3 flex items-center space-x-3">
                                            {notification.targetUserId && (
                                                <Link
                                                    href={`/settings/admin/users/${notification.targetUserId}`}
                                                    className="text-sm text-primary hover:underline"
                                                >
                                                    View User
                                                </Link>
                                            )}
                                            {notification.requiresAcknowledgment &&
                                                !notification.acknowledgedAt && (
                                                    <button
                                                        onClick={() =>
                                                            handleAcknowledge(
                                                                notification.id
                                                            )
                                                        }
                                                        disabled={
                                                            acknowledging ===
                                                            notification.id
                                                        }
                                                        className="text-sm text-primary hover:underline disabled:opacity-50"
                                                    >
                                                        {acknowledging ===
                                                        notification.id
                                                            ? "Marking..."
                                                            : "Mark Handled"}
                                                    </button>
                                                )}
                                            {notification.acknowledgedAt && (
                                                <span className="text-xs text-green-600 dark:text-green-400">
                                                    Handled{" "}
                                                    {formatTimeAgo(
                                                        notification.acknowledgedAt
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {formatTimeAgo(notification.createdAt)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
