/**
 * Funnel Analytics Dashboard Component
 *
 * Client-side component that displays comprehensive funnel performance metrics.
 * Fetches and displays registrations, views, conversions, and revenue data.
 */

"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Users, DollarSign, Video, Target } from "lucide-react";
import { logger } from "@/lib/client-logger";

interface Analytics {
    registrations: number;
    views: number;
    conversions: number;
    revenue: number;
    watchRate?: number;
    enrollmentRate?: number;
    revenuePerRegistrant?: number;
}

interface FunnelAnalyticsDashboardProps {
    projectId: string;
}

export function FunnelAnalyticsDashboard({ projectId }: FunnelAnalyticsDashboardProps) {
    const [analytics, setAnalytics] = useState<Analytics>({
        registrations: 0,
        views: 0,
        conversions: 0,
        revenue: 0,
        watchRate: 0,
        enrollmentRate: 0,
        revenuePerRegistrant: 0,
    });
    const [timeRange, setTimeRange] = useState("30");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAnalytics = async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `/api/analytics/funnel?project_id=${projectId}&time_range=${timeRange}`
                );
                const data = await response.json();

                if (response.ok) {
                    setAnalytics({
                        registrations: data.registrations,
                        views: data.views,
                        conversions: data.enrollments,
                        revenue: data.revenue,
                        watchRate: data.watchRate,
                        enrollmentRate: data.enrollmentRate,
                        revenuePerRegistrant: data.revenuePerRegistrant,
                    });
                } else {
                    logger.error({ error: data.error }, "Failed to load analytics");
                }
            } catch (error) {
                logger.error({ error }, "Failed to load analytics");
            } finally {
                setLoading(false);
            }
        };

        loadAnalytics();
    }, [projectId, timeRange]);

    const conversionRate = analytics.enrollmentRate?.toFixed(2) || "0.00";

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
                    <p className="mt-4 text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Time Range Selector */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    <span>Performance Metrics</span>
                </div>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="rounded-lg border border-border bg-card px-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                </select>
            </div>

            {/* Primary Metrics Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Registrations */}
                <div className="rounded-lg border border-border bg-gradient-to-br from-primary/5 to-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Registrations
                        </h3>
                        <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-foreground">
                        {analytics.registrations.toLocaleString()}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Total sign-ups</p>
                </div>

                {/* Video Views */}
                <div className="rounded-lg border border-border bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Video Views
                        </h3>
                        <Video className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-foreground">
                        {analytics.views.toLocaleString()}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {analytics.watchRate?.toFixed(1)}% watch rate
                    </p>
                </div>

                {/* Conversions */}
                <div className="rounded-lg border border-border bg-gradient-to-br from-green-50 to-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Conversions
                        </h3>
                        <Target className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-foreground">
                        {analytics.conversions.toLocaleString()}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {conversionRate}% conversion rate
                    </p>
                </div>

                {/* Revenue */}
                <div className="rounded-lg border border-border bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Revenue
                        </h3>
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-3xl font-bold text-foreground">
                        ${analytics.revenue.toLocaleString()}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Total generated
                    </p>
                </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid gap-6 sm:grid-cols-3">
                {/* Watch Rate */}
                <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                    <div className="mb-2 flex items-center gap-2">
                        <div className="rounded-full bg-purple-100 p-2">
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                        </div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Watch Rate
                        </h3>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {analytics.watchRate?.toFixed(1)}%
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Registrants who watched video
                    </p>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                            className="h-full rounded-full bg-purple-500 transition-all"
                            style={{ width: `${analytics.watchRate || 0}%` }}
                        />
                    </div>
                </div>

                {/* Enrollment Rate */}
                <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                    <div className="mb-2 flex items-center gap-2">
                        <div className="rounded-full bg-green-100 p-2">
                            <Target className="h-4 w-4 text-green-600" />
                        </div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Enrollment Rate
                        </h3>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {analytics.enrollmentRate?.toFixed(1)}%
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Viewers who viewed enrollment
                    </p>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                            className="h-full rounded-full bg-green-500 transition-all"
                            style={{ width: `${analytics.enrollmentRate || 0}%` }}
                        />
                    </div>
                </div>

                {/* Revenue Per Registrant */}
                <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                    <div className="mb-2 flex items-center gap-2">
                        <div className="rounded-full bg-emerald-100 p-2">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                        </div>
                        <h3 className="text-sm font-medium text-muted-foreground">
                            Rev per Registrant
                        </h3>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        ${analytics.revenuePerRegistrant?.toFixed(2)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Average revenue per sign-up
                    </p>
                </div>
            </div>

            {/* Funnel Visualization */}
            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                <h3 className="mb-4 text-sm font-semibold text-foreground">
                    Conversion Funnel
                </h3>
                <div className="space-y-3">
                    {/* Registrations */}
                    <div className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium text-foreground">
                            Registrations
                        </div>
                        <div className="flex-1">
                            <div className="flex h-10 items-center rounded-lg bg-primary/50 px-4 text-white shadow-soft">
                                <span className="text-sm font-medium">
                                    {analytics.registrations.toLocaleString()} (100%)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Video Views */}
                    <div className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium text-foreground">
                            Watched Video
                        </div>
                        <div className="flex-1">
                            <div
                                className="flex h-10 items-center rounded-lg bg-purple-500 px-4 text-white shadow-sm transition-all"
                                style={{
                                    width: `${analytics.registrations > 0 ? (analytics.views / analytics.registrations) * 100 : 0}%`,
                                }}
                            >
                                <span className="text-sm font-medium">
                                    {analytics.views.toLocaleString()} (
                                    {analytics.watchRate?.toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Conversions */}
                    <div className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium text-foreground">
                            Converted
                        </div>
                        <div className="flex-1">
                            <div
                                className="flex h-10 items-center rounded-lg bg-green-500 px-4 text-white shadow-sm transition-all"
                                style={{
                                    width: `${analytics.registrations > 0 ? (analytics.conversions / analytics.registrations) * 100 : 0}%`,
                                }}
                            >
                                <span className="text-sm font-medium">
                                    {analytics.conversions.toLocaleString()} (
                                    {conversionRate}%)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {analytics.registrations === 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-8 text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-primary/40" />
                    <h3 className="mt-4 text-lg font-semibold text-primary">
                        No Data Yet
                    </h3>
                    <p className="mt-2 text-sm text-primary">
                        Complete your funnel setup and start driving traffic to see
                        analytics here. Once visitors start registering, you'll see
                        comprehensive metrics and conversion data.
                    </p>
                </div>
            )}
        </div>
    );
}
