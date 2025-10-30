/**
 * Marketing Analytics Dashboard
 * Display comprehensive performance metrics with O/I-1000 north-star metric
 */

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/client-logger";
import { TrendingUp, Users, Share2, MessageSquare, Target } from "lucide-react";
import type { AnalyticsDashboard } from "@/types/marketing";

interface MarketingAnalyticsDashboardProps {
    funnelProjectId: string;
}

export function MarketingAnalyticsDashboard({
    funnelProjectId,
}: MarketingAnalyticsDashboardProps) {
    const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("30");

    useEffect(() => {
        loadAnalytics();
    }, [funnelProjectId, dateRange]);

    const loadAnalytics = async () => {
        setLoading(true);

        try {
            const response = await fetch(
                `/api/marketing/analytics?funnel_project_id=${funnelProjectId}`
            );

            const data = await response.json();

            if (data.success) {
                setDashboard(data.dashboard);
                logger.info({ dashboard: data.dashboard }, "Analytics loaded");
            }
        } catch (error) {
            logger.error({ error }, "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading analytics...</div>
            </div>
        );
    }

    if (!dashboard) {
        return (
            <Card className="p-12 text-center">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No Analytics Yet
                </h3>
                <p className="text-gray-600">
                    Publish your first post to start tracking performance
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="flex justify-end">
                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="all">All time</option>
                </select>
            </div>

            {/* North-Star Metric */}
            <Card className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
                <div className="text-center">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                        North-Star Metric
                    </div>
                    <div className="text-5xl font-bold text-blue-600 mb-2">
                        {dashboard.overview.overall_oi_1000.toFixed(1)}
                    </div>
                    <div className="text-lg text-gray-700">
                        Opt-ins per 1,000 Impressions (O/I-1000)
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                        {dashboard.overview.total_opt_ins} opt-ins from{" "}
                        {dashboard.overview.total_impressions.toLocaleString()}{" "}
                        impressions
                    </div>
                </div>
            </Card>

            {/* Key Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Total Posts</div>
                            <div className="text-2xl font-bold">
                                {dashboard.overview.total_posts}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-100 rounded">
                            <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Total Opt-ins</div>
                            <div className="text-2xl font-bold">
                                {dashboard.overview.total_opt_ins}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-100 rounded">
                            <Share2 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Impressions</div>
                            <div className="text-2xl font-bold">
                                {dashboard.overview.total_impressions.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-orange-100 rounded">
                            <MessageSquare className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Engagement</div>
                            <div className="text-2xl font-bold">
                                {dashboard.overview.avg_engagement_rate.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Platform Breakdown */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance by Platform</h3>
                <div className="space-y-4">
                    {Object.entries(dashboard.by_platform).map(([platform, data]) => (
                        <div
                            key={platform}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="font-medium capitalize">{platform}</div>
                                <div className="text-sm text-gray-600">
                                    {data.posts} posts
                                </div>
                            </div>
                            <div className="flex gap-6 text-sm">
                                <div>
                                    <div className="text-gray-600">Impressions</div>
                                    <div className="font-semibold">
                                        {data.impressions.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-600">Opt-ins</div>
                                    <div className="font-semibold">{data.opt_ins}</div>
                                </div>
                                <div>
                                    <div className="text-gray-600">O/I-1000</div>
                                    <div className="font-semibold text-blue-600">
                                        {data.oi_1000.toFixed(1)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Framework Performance */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                    Performance by Story Framework
                </h3>
                <div className="space-y-4">
                    {Object.entries(dashboard.by_framework)
                        .filter(([_, data]) => data.posts > 0)
                        .map(([framework, data]) => (
                            <div
                                key={framework}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="font-medium">
                                        {framework
                                            .split("_")
                                            .map(
                                                (w) =>
                                                    w.charAt(0).toUpperCase() +
                                                    w.slice(1)
                                            )
                                            .join(" ")}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {data.posts} posts
                                    </div>
                                </div>
                                <div className="flex gap-6 text-sm">
                                    <div>
                                        <div className="text-gray-600">Impressions</div>
                                        <div className="font-semibold">
                                            {data.impressions.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-600">Opt-ins</div>
                                        <div className="font-semibold">
                                            {data.opt_ins}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-600">O/I-1000</div>
                                        <div className="font-semibold text-blue-600">
                                            {data.oi_1000.toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </Card>

            {/* Top Performers */}
            {dashboard.top_performers.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Top Performing Posts</h3>
                    <div className="space-y-3">
                        {dashboard.top_performers.slice(0, 5).map((post, index) => (
                            <div
                                key={post.post_variant_id}
                                className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium capitalize">
                                            {post.platform}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {post.impressions.toLocaleString()}{" "}
                                            impressions • {post.opt_ins} opt-ins
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-green-600">
                                        {post.oi_1000.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        O/I-1000
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
