/**
 * Enhanced Marketing Analytics Dashboard
 * Complete rebuild with overview cards, performance table, platform breakdown,
 * story framework performance, experiments view, time series charts, export
 */

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    TrendingUp,
    Download,
    FileText,
    Eye,
    Heart,
    Users,
    Target,
} from "lucide-react";

interface MarketingAnalyticsDashboardEnhancedProps {
    funnelProjectId: string;
}

interface PerformanceData {
    id: string;
    post_preview: string;
    platform: string;
    published_at: string;
    impressions: number;
    engagement_rate: number;
    opt_ins: number;
    oi_1000: number;
}

export function MarketingAnalyticsDashboardEnhanced({
    funnelProjectId,
}: MarketingAnalyticsDashboardEnhancedProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");
    const [sortBy, setSortBy] = useState<"date" | "engagement" | "opt_ins">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Overview Stats
    const [overviewStats, setOverviewStats] = useState({
        totalPosts: 0,
        totalOptIns: 0,
        overallOI1000: 0,
        avgEngagementRate: 0,
        topPlatform: "",
        activeExperiments: 0,
    });

    // Performance Data
    const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);

    // Platform Breakdown
    const [platformBreakdown, setPlatformBreakdown] = useState<any[]>([]);

    // Story Framework Performance
    const [frameworkPerformance, setFrameworkPerformance] = useState<any[]>([]);

    // Experiments
    const [experiments, setExperiments] = useState<any[]>([]);

    useEffect(() => {
        loadAnalytics();
    }, [funnelProjectId, dateRange]);

    const loadAnalytics = async () => {
        setLoading(true);

        try {
            const response = await fetch(
                `/api/marketing/analytics?funnel_project_id=${funnelProjectId}&range=${dateRange}`
            );

            const data = await response.json();

            if (data.success) {
                const dashboard = data.dashboard;

                // Set overview stats
                setOverviewStats({
                    totalPosts: dashboard.overview?.total_posts || 0,
                    totalOptIns: dashboard.overview?.total_opt_ins || 0,
                    overallOI1000: dashboard.overview?.overall_oi_1000 || 0,
                    avgEngagementRate: dashboard.overview?.avg_engagement_rate || 0,
                    topPlatform: dashboard.overview?.top_platform || "N/A",
                    activeExperiments: dashboard.experiments?.length || 0,
                });

                // Set performance data
                setPerformanceData(dashboard.performance_by_post || []);

                // Set platform breakdown
                setPlatformBreakdown(dashboard.platform_breakdown || []);

                // Set framework performance
                setFrameworkPerformance(dashboard.framework_performance || []);

                // Set experiments
                setExperiments(dashboard.experiments || []);

                logger.info(
                    { postsCount: dashboard.overview?.total_posts },
                    "Analytics loaded"
                );
            }
        } catch (error) {
            logger.error({ error }, "Failed to load analytics");
            toast({
                title: "Error",
                description: "Failed to load analytics",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            toast({
                title: "Exporting...",
                description: "Generating CSV export",
            });

            const response = await fetch(
                `/api/marketing/analytics/export?funnel_project_id=${funnelProjectId}&range=${dateRange}&format=csv`
            );

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `marketing-analytics-${dateRange}.csv`;
            a.click();

            toast({
                title: "Export Complete",
                description: "Analytics downloaded as CSV",
            });
        } catch (error) {
            logger.error({ error }, "Export failed");
            toast({
                title: "Export Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleExportPDF = async () => {
        try {
            toast({
                title: "Generating PDF...",
                description: "Creating analytics report",
            });

            const response = await fetch(
                `/api/marketing/analytics/export?funnel_project_id=${funnelProjectId}&range=${dateRange}&format=pdf`
            );

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `marketing-report-${dateRange}.pdf`;
            a.click();

            toast({
                title: "Report Generated",
                description: "PDF report downloaded",
            });
        } catch (error) {
            logger.error({ error }, "PDF generation failed");
            toast({
                title: "PDF Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const sortPerformanceData = (data: PerformanceData[]) => {
        return [...data].sort((a, b) => {
            let aVal, bVal;

            switch (sortBy) {
                case "date":
                    aVal = new Date(a.published_at).getTime();
                    bVal = new Date(b.published_at).getTime();
                    break;
                case "engagement":
                    aVal = a.engagement_rate;
                    bVal = b.engagement_rate;
                    break;
                case "opt_ins":
                    aVal = a.opt_ins;
                    bVal = b.opt_ins;
                    break;
                default:
                    return 0;
            }

            return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
        });
    };

    const handleSort = (column: "date" | "engagement" | "opt_ins") => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("desc");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    const sortedData = sortPerformanceData(performanceData);

    return (
        <div className="space-y-6">
            {/* Date Range & Export Controls */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <Button
                        onClick={() => setDateRange("7d")}
                        variant={dateRange === "7d" ? "default" : "outline"}
                        size="sm"
                    >
                        Last 7 Days
                    </Button>
                    <Button
                        onClick={() => setDateRange("30d")}
                        variant={dateRange === "30d" ? "default" : "outline"}
                        size="sm"
                    >
                        Last 30 Days
                    </Button>
                    <Button
                        onClick={() => setDateRange("90d")}
                        variant={dateRange === "90d" ? "default" : "outline"}
                        size="sm"
                    >
                        Last 90 Days
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleExportCSV} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button onClick={handleExportPDF} variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        PDF Report
                    </Button>
                </div>
            </div>

            {/* Section 1: Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <h4 className="text-sm font-medium text-gray-600">
                            Total Posts
                        </h4>
                    </div>
                    <div className="text-2xl font-bold">{overviewStats.totalPosts}</div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-green-500" />
                        <h4 className="text-sm font-medium text-gray-600">Opt-ins</h4>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                        {overviewStats.totalOptIns}
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        <h4 className="text-sm font-medium text-gray-600">O/I-1000</h4>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                        {overviewStats.overallOI1000.toFixed(1)}
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Heart className="h-4 w-4 text-pink-500" />
                        <h4 className="text-sm font-medium text-gray-600">
                            Avg Engagement
                        </h4>
                    </div>
                    <div className="text-2xl font-bold text-pink-600">
                        {overviewStats.avgEngagementRate.toFixed(1)}%
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                        <h4 className="text-sm font-medium text-gray-600">
                            Top Platform
                        </h4>
                    </div>
                    <div className="text-lg font-bold capitalize">
                        {overviewStats.topPlatform}
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-indigo-500" />
                        <h4 className="text-sm font-medium text-gray-600">
                            Experiments
                        </h4>
                    </div>
                    <div className="text-2xl font-bold text-indigo-600">
                        {overviewStats.activeExperiments}
                    </div>
                </Card>
            </div>

            {/* Section 2: Performance Table */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Post Performance</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">
                                    Post Preview
                                </th>
                                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">
                                    Platform
                                </th>
                                <th
                                    className="text-left py-3 px-2 text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                                    onClick={() => handleSort("date")}
                                >
                                    Published {sortBy === "date" && (sortOrder === "desc" ? "↓" : "↑")}
                                </th>
                                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600">
                                    Impressions
                                </th>
                                <th
                                    className="text-right py-3 px-2 text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                                    onClick={() => handleSort("engagement")}
                                >
                                    Engagement {sortBy === "engagement" && (sortOrder === "desc" ? "↓" : "↑")}
                                </th>
                                <th
                                    className="text-right py-3 px-2 text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                                    onClick={() => handleSort("opt_ins")}
                                >
                                    Opt-ins {sortBy === "opt_ins" && (sortOrder === "desc" ? "↓" : "↑")}
                                </th>
                                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600">
                                    O/I-1000
                                </th>
                                <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.slice(0, 20).map((post) => (
                                <tr key={post.id} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-2 text-sm max-w-xs">
                                        <div className="truncate">{post.post_preview}</div>
                                    </td>
                                    <td className="py-3 px-2">
                                        <span className="text-sm capitalize">
                                            {post.platform}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-sm text-gray-600">
                                        {new Date(post.published_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-2 text-right text-sm">
                                        {post.impressions.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        <span
                                            className={`text-sm font-medium ${
                                                post.engagement_rate > 5
                                                    ? "text-green-600"
                                                    : post.engagement_rate > 2
                                                      ? "text-blue-600"
                                                      : "text-gray-600"
                                            }`}
                                        >
                                            {post.engagement_rate.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-right text-sm font-medium">
                                        {post.opt_ins}
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        <span
                                            className={`text-sm font-medium ${
                                                post.oi_1000 > 10
                                                    ? "text-green-600"
                                                    : post.oi_1000 > 5
                                                      ? "text-blue-600"
                                                      : "text-gray-600"
                                            }`}
                                        >
                                            {post.oi_1000.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                        <Button variant="ghost" size="sm">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sortedData.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No performance data available yet
                        </div>
                    )}
                </div>
            </Card>

            {/* Section 3: Platform Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Platform Performance</h3>
                    <div className="space-y-3">
                        {platformBreakdown.map((platform) => (
                            <div key={platform.platform}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium capitalize flex items-center gap-2">
                                        {platform.platform === "instagram" && "📸"}
                                        {platform.platform === "facebook" && "👍"}
                                        {platform.platform === "linkedin" && "💼"}
                                        {platform.platform === "twitter" && "🐦"}
                                        {platform.platform}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                        {platform.post_count} posts • {platform.total_opt_ins}{" "}
                                        opt-ins
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${
                                            platform.platform === "instagram"
                                                ? "bg-pink-500"
                                                : platform.platform === "facebook"
                                                  ? "bg-blue-600"
                                                  : platform.platform === "linkedin"
                                                    ? "bg-blue-700"
                                                    : "bg-sky-500"
                                        }`}
                                        style={{
                                            width: `${platform.engagement_rate}%`,
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-gray-600 mt-1">
                                    <span>Engagement: {platform.engagement_rate.toFixed(1)}%</span>
                                    <span>O/I-1000: {platform.oi_1000.toFixed(1)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Section 4: Story Framework Performance */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        Story Framework Performance
                    </h3>
                    <div className="space-y-3">
                        {frameworkPerformance.map((framework) => (
                            <div key={framework.framework}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">
                                        {framework.framework.replace("_", " ")}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                        {framework.post_count} posts
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-purple-500 h-2 rounded-full"
                                        style={{
                                            width: `${Math.min(framework.avg_oi_1000 * 5, 100)}%`,
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-gray-600 mt-1">
                                    <span>
                                        Avg Engagement: {framework.avg_engagement_rate.toFixed(1)}%
                                    </span>
                                    <span>
                                        Avg O/I-1000: {framework.avg_oi_1000.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {frameworkPerformance.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No framework data yet
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Section 5: Experiments View */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">A/B Testing Experiments</h3>
                <div className="space-y-4">
                    {experiments.map((experiment) => (
                        <div
                            key={experiment.id}
                            className="p-4 border rounded-lg bg-gray-50"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="font-semibold">{experiment.name}</h4>
                                    <p className="text-sm text-gray-600">
                                        {experiment.experiment_type} • {experiment.status}
                                    </p>
                                </div>
                                {experiment.status === "completed" &&
                                    experiment.winner_variant && (
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                            Winner: Variant{" "}
                                            {experiment.winner_variant.toUpperCase()}
                                        </span>
                                    )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Variant A */}
                                <div className="p-3 bg-white rounded border">
                                    <div className="text-sm font-semibold mb-2">
                                        Variant A{" "}
                                        {experiment.winner_variant === "a" && "🏆"}
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Impressions:</span>
                                            <span className="font-medium">
                                                {experiment.variant_a_impressions?.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Engagement:</span>
                                            <span className="font-medium">
                                                {experiment.variant_a_engagement_rate?.toFixed(
                                                    1
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Opt-ins:</span>
                                            <span className="font-medium">
                                                {experiment.variant_a_opt_ins}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Variant B */}
                                <div className="p-3 bg-white rounded border">
                                    <div className="text-sm font-semibold mb-2">
                                        Variant B{" "}
                                        {experiment.winner_variant === "b" && "🏆"}
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Impressions:</span>
                                            <span className="font-medium">
                                                {experiment.variant_b_impressions?.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Engagement:</span>
                                            <span className="font-medium">
                                                {experiment.variant_b_engagement_rate?.toFixed(
                                                    1
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Opt-ins:</span>
                                            <span className="font-medium">
                                                {experiment.variant_b_opt_ins}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {experiment.status === "running" && (
                                <div className="mt-3 flex gap-2">
                                    <Button variant="outline" size="sm">
                                        Declare Winner
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                        End Experiment
                                    </Button>
                                </div>
                            )}

                            {experiment.confidence_level && (
                                <div className="mt-3 text-xs text-gray-600">
                                    Statistical Confidence:{" "}
                                    {(experiment.confidence_level * 100).toFixed(1)}%
                                </div>
                            )}
                        </div>
                    ))}

                    {experiments.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>No experiments running</p>
                            <p className="text-sm mt-1">
                                Create A/B tests from the Generate tab
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Section 6: Time Series Placeholder (would need chart library) */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Trends Over Time</h3>
                <div className="text-center py-12 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Time series charts coming soon</p>
                    <p className="text-sm mt-1">
                        Visualization of posts, opt-ins, and engagement over time
                    </p>
                </div>
            </Card>
        </div>
    );
}

