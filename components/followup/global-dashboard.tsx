/**
 * Global Dashboard Component
 *
 * Analytics overview with key metrics, charts, and recent activity.
 * Shows aggregated data across all funnels.
 */

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/client-logger";

interface GlobalDashboardProps {
    userId: string;
}

interface Analytics {
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

export function GlobalDashboard({ userId }: GlobalDashboardProps) {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadAnalytics() {
            try {
                const response = await fetch("/api/followup/global-analytics");
                const data = await response.json();

                if (data.success) {
                    setAnalytics(data.analytics);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load global analytics");
            } finally {
                setLoading(false);
            }
        }

        loadAnalytics();
    }, [userId]);

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="text-muted-foreground">Loading analytics...</div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <Card className="p-8 text-center">
                <p className="text-muted-foreground">No analytics data available</p>
            </Card>
        );
    }

    const segments = [
        { key: "no_show", label: "No Show", color: "bg-muted/500" },
        { key: "skimmer", label: "Skimmer", color: "bg-yellow-500" },
        { key: "sampler", label: "Sampler", color: "bg-primary/50" },
        { key: "engaged", label: "Engaged", color: "bg-green-500" },
        { key: "hot", label: "Hot", color: "bg-red-500" },
    ];

    const engagementLevels = [
        { key: "cold", label: "Cold", color: "bg-primary/40" },
        { key: "warm", label: "Warm", color: "bg-yellow-400" },
        { key: "hot", label: "Hot", color: "bg-red-400" },
    ];

    return (
        <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-6">
                    <div className="text-sm font-medium text-muted-foreground">
                        Total Prospects
                    </div>
                    <div className="mt-2 text-3xl font-bold text-foreground">
                        {analytics.totalProspects.toLocaleString()}
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="text-sm font-medium text-muted-foreground">
                        Avg Intent Score
                    </div>
                    <div className="mt-2 text-3xl font-bold text-foreground">
                        {analytics.avgIntentScore}
                        <span className="text-lg text-muted-foreground">/100</span>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="text-sm font-medium text-muted-foreground">
                        Conversion Rate
                    </div>
                    <div className="mt-2 text-3xl font-bold text-foreground">
                        {analytics.conversionRate}
                        <span className="text-lg text-muted-foreground">%</span>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="text-sm font-medium text-muted-foreground">
                        Active Sequences
                    </div>
                    <div className="mt-2 text-3xl font-bold text-foreground">
                        {analytics.activeSequences}
                    </div>
                </Card>
            </div>

            {/* Segment Breakdown */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Prospects by Segment
                </h3>
                <div className="space-y-3">
                    {segments.map((segment) => {
                        const count = analytics.bySegment[segment.key] || 0;
                        const percentage =
                            analytics.totalProspects > 0
                                ? (count / analytics.totalProspects) * 100
                                : 0;

                        return (
                            <div key={segment.key} className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium text-foreground">
                                            {segment.label}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {count} ({Math.round(percentage)}%)
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${segment.color}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Engagement Level Breakdown */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Prospects by Engagement Level
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                    {engagementLevels.map((level) => {
                        const count = analytics.byEngagement[level.key] || 0;
                        const percentage =
                            analytics.totalProspects > 0
                                ? (count / analytics.totalProspects) * 100
                                : 0;

                        return (
                            <Card key={level.key} className="p-4 border-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className={`w-3 h-3 rounded-full ${level.color}`}
                                    />
                                    <span className="font-medium text-foreground">
                                        {level.label}
                                    </span>
                                </div>
                                <div className="text-2xl font-bold text-foreground">
                                    {count}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {Math.round(percentage)}% of total
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </Card>

            {/* Funnel Performance */}
            {analytics.byFunnel.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        Performance by Funnel
                    </h3>
                    <div className="space-y-3">
                        {analytics.byFunnel.map((funnel) => (
                            <div
                                key={funnel.funnelId}
                                className="flex items-center justify-between p-3 border rounded"
                            >
                                <div>
                                    <div className="font-medium text-foreground">
                                        {funnel.funnelName}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {funnel.prospectCount} prospects
                                    </div>
                                </div>
                                <Badge
                                    variant={
                                        funnel.conversionRate > 10
                                            ? "default"
                                            : "secondary"
                                    }
                                >
                                    {Math.round(funnel.conversionRate * 10) / 10}%
                                    conversion
                                </Badge>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Recent Activity */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Recent Activity
                </h3>
                {analytics.recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No recent activity
                    </div>
                ) : (
                    <div className="space-y-3">
                        {analytics.recentActivity.slice(0, 10).map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-center justify-between p-3 border rounded"
                            >
                                <div className="flex-1">
                                    <div className="font-medium text-foreground">
                                        {activity.prospectName ||
                                            activity.prospectEmail}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {activity.funnelName}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge>{activity.eventType}</Badge>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {new Date(
                                            activity.timestamp
                                        ).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
