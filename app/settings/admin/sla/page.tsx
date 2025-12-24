"use client";

/**
 * Admin SLA Tracking Dashboard
 * Response time metrics and support quality tracking
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";

interface SlaMetrics {
    totalInteractions: number;
    avgResponseTimeMinutes: number | null;
    avgResolutionTimeMinutes: number | null;
    openIssues: number;
}

interface AdminSlaMetrics {
    adminEmail: string;
    interactionsCount: number;
    avgResponseTime: number | null;
    avgResolutionTime: number | null;
    unresolved: number;
}

export default function AdminSlaPage() {
    const [overallMetrics, setOverallMetrics] = useState<SlaMetrics | null>(null);
    const [adminMetrics, setAdminMetrics] = useState<AdminSlaMetrics[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSlaData = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Fetch all support interactions
            const { data: interactions, error: intError } = await supabase
                .from("admin_support_interactions")
                .select("*");

            if (intError) throw intError;

            // Calculate overall metrics
            const total = interactions?.length || 0;
            const responseTimes =
                interactions
                    ?.filter((i) => i.response_time_minutes !== null)
                    .map((i) => i.response_time_minutes) || [];
            const resolutionTimes =
                interactions
                    ?.filter((i) => i.resolution_time_minutes !== null)
                    .map((i) => i.resolution_time_minutes) || [];
            const openIssues = interactions?.filter((i) => !i.resolved_at).length || 0;

            const avgResponse =
                responseTimes.length > 0
                    ? Math.round(
                          responseTimes.reduce((a, b) => a + b, 0) /
                              responseTimes.length
                      )
                    : null;
            const avgResolution =
                resolutionTimes.length > 0
                    ? Math.round(
                          resolutionTimes.reduce((a, b) => a + b, 0) /
                              resolutionTimes.length
                      )
                    : null;

            setOverallMetrics({
                totalInteractions: total,
                avgResponseTimeMinutes: avgResponse,
                avgResolutionTimeMinutes: avgResolution,
                openIssues,
            });

            // Aggregate by admin
            const adminMap = new Map<
                string,
                {
                    count: number;
                    responseTimes: number[];
                    resolutionTimes: number[];
                    unresolved: number;
                }
            >();

            interactions?.forEach((i) => {
                if (!i.admin_user_id) return;
                const existing = adminMap.get(i.admin_user_id) || {
                    count: 0,
                    responseTimes: [],
                    resolutionTimes: [],
                    unresolved: 0,
                };
                existing.count++;
                if (i.response_time_minutes !== null) {
                    existing.responseTimes.push(i.response_time_minutes);
                }
                if (i.resolution_time_minutes !== null) {
                    existing.resolutionTimes.push(i.resolution_time_minutes);
                }
                if (!i.resolved_at) {
                    existing.unresolved++;
                }
                adminMap.set(i.admin_user_id, existing);
            });

            // Get admin emails
            const adminIds = [...adminMap.keys()];
            const { data: admins } = await supabase
                .from("user_profiles")
                .select("id, email")
                .in("id", adminIds);

            const adminEmailMap = new Map(admins?.map((a) => [a.id, a.email]) || []);

            const adminMetricsArray: AdminSlaMetrics[] = [...adminMap.entries()]
                .map(([adminId, data]) => ({
                    adminEmail: adminEmailMap.get(adminId) || "Unknown",
                    interactionsCount: data.count,
                    avgResponseTime:
                        data.responseTimes.length > 0
                            ? Math.round(
                                  data.responseTimes.reduce((a, b) => a + b, 0) /
                                      data.responseTimes.length
                              )
                            : null,
                    avgResolutionTime:
                        data.resolutionTimes.length > 0
                            ? Math.round(
                                  data.resolutionTimes.reduce((a, b) => a + b, 0) /
                                      data.resolutionTimes.length
                              )
                            : null,
                    unresolved: data.unresolved,
                }))
                .sort((a, b) => b.interactionsCount - a.interactionsCount);

            setAdminMetrics(adminMetricsArray);
        } catch (err) {
            logger.error({ error: err }, "Failed to fetch SLA data");
            setError("Failed to load SLA data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSlaData();
    }, [fetchSlaData]);

    const formatTime = (minutes: number | null) => {
        if (minutes === null) return "—";
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">
                    Loading SLA data...
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
        <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Total Interactions
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {overallMetrics?.totalInteractions || 0}
                    </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Avg Response Time
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {formatTime(overallMetrics?.avgResponseTimeMinutes || null)}
                    </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Avg Resolution Time
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {formatTime(overallMetrics?.avgResolutionTimeMinutes || null)}
                    </p>
                </div>
                <div
                    className={`rounded-lg border p-4 ${
                        (overallMetrics?.openIssues || 0) > 0
                            ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/30"
                            : "border-border bg-card"
                    }`}
                >
                    <p className="text-sm font-medium text-muted-foreground">
                        Open Issues
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {overallMetrics?.openIssues || 0}
                    </p>
                </div>
            </div>

            {/* Per-Admin Metrics */}
            <div>
                <h3 className="mb-4 font-semibold text-foreground">
                    Performance by Admin
                </h3>
                {adminMetrics.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-border">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Admin
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Interactions
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Avg Response
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Avg Resolution
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Unresolved
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {adminMetrics.map((admin, idx) => (
                                    <tr key={idx}>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                                            {admin.adminEmail}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                                            {admin.interactionsCount}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                                            {formatTime(admin.avgResponseTime)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                                            {formatTime(admin.avgResolutionTime)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <span
                                                className={
                                                    admin.unresolved > 0
                                                        ? "text-yellow-600 dark:text-yellow-400"
                                                        : "text-foreground"
                                                }
                                            >
                                                {admin.unresolved}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="rounded-lg border border-border bg-card p-8 text-center">
                        <p className="text-muted-foreground">
                            No support interactions recorded yet. Data will appear here
                            as admins respond to user issues.
                        </p>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                    <strong>How SLA is tracked:</strong> Response time is measured from
                    when an issue is detected (error spike, notification) to when an
                    admin first responds. Resolution time is measured until the issue is
                    marked as resolved.
                </p>
            </div>
        </div>
    );
}
