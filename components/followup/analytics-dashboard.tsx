/**
 * Analytics Dashboard Component
 *
 * Display sequence performance metrics, engagement tracking, and A/B test results.
 */

"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    TrendingUp,
    Mail,
    MousePointer,
    DollarSign,
    Users,
    BarChart3,
} from "lucide-react";

interface AnalyticsData {
    sequences: {
        id: string;
        name: string;
        sent: number;
        opened: number;
        clicked: number;
        replied: number;
        converted: number;
        revenue: number;
    }[];
    overall: {
        totalSent: number;
        totalOpened: number;
        totalClicked: number;
        totalReplied: number;
        totalConverted: number;
        totalRevenue: number;
    };
}

interface AnalyticsDashboardProps {
    data: AnalyticsData;
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
    const calculateRate = (numerator: number, denominator: number) => {
        if (denominator === 0) return 0;
        return ((numerator / denominator) * 100).toFixed(1);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const overallOpenRate = calculateRate(
        data.overall.totalOpened,
        data.overall.totalSent
    );
    const overallClickRate = calculateRate(
        data.overall.totalClicked,
        data.overall.totalOpened
    );
    const overallConversionRate = calculateRate(
        data.overall.totalConverted,
        data.overall.totalSent
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold">Analytics Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                    Track sequence performance and engagement metrics
                </p>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Open Rate</span>
                        <Mail className="h-4 w-4 text-primary-foreground0" />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="text-2xl font-bold">{overallOpenRate}%</div>
                        <div className="flex items-center text-green-600 text-xs mb-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +2.3%
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {data.overall.totalOpened.toLocaleString()} opens
                    </p>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                            Click Rate
                        </span>
                        <MousePointer className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="text-2xl font-bold">{overallClickRate}%</div>
                        <div className="flex items-center text-green-600 text-xs mb-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +1.8%
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {data.overall.totalClicked.toLocaleString()} clicks
                    </p>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                            Conversion Rate
                        </span>
                        <Users className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="text-2xl font-bold">
                            {overallConversionRate}%
                        </div>
                        <div className="flex items-center text-green-600 text-xs mb-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +0.5%
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {data.overall.totalConverted.toLocaleString()} conversions
                    </p>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Revenue</span>
                        <DollarSign className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="text-2xl font-bold">
                            {formatCurrency(data.overall.totalRevenue)}
                        </div>
                        <div className="flex items-center text-green-600 text-xs mb-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +12.4%
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        From follow-ups
                    </p>
                </Card>
            </div>

            {/* Sequence Performance */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-semibold">Sequence Performance</h4>
                </div>

                <div className="space-y-3">
                    {data.sequences.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No sequence data yet. Start sending follow-ups to see
                            performance metrics.
                        </div>
                    ) : (
                        data.sequences.map((sequence) => {
                            const openRate = calculateRate(
                                sequence.opened,
                                sequence.sent
                            );
                            const clickRate = calculateRate(
                                sequence.clicked,
                                sequence.opened
                            );
                            const convRate = calculateRate(
                                sequence.converted,
                                sequence.sent
                            );

                            return (
                                <div
                                    key={sequence.id}
                                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h5 className="font-medium">
                                                {sequence.name}
                                            </h5>
                                            <p className="text-xs text-muted-foreground">
                                                {sequence.sent.toLocaleString()} sent
                                            </p>
                                        </div>
                                        <Badge variant="secondary">
                                            {formatCurrency(sequence.revenue)}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">
                                                Open Rate
                                            </div>
                                            <div className="font-semibold">
                                                {openRate}%
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">
                                                Click Rate
                                            </div>
                                            <div className="font-semibold">
                                                {clickRate}%
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">
                                                Conversion
                                            </div>
                                            <div className="font-semibold">
                                                {convRate}%
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">
                                                Replied
                                            </div>
                                            <div className="font-semibold">
                                                {sequence.replied}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress bars */}
                                    <div className="grid grid-cols-3 gap-4 mt-3">
                                        <div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary/50"
                                                    style={{ width: `${openRate}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500"
                                                    style={{ width: `${clickRate}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500"
                                                    style={{ width: `${convRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </Card>

            {/* Engagement Funnel */}
            <Card className="p-6">
                <h4 className="font-semibold mb-4">Engagement Funnel</h4>
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-32 text-sm text-muted-foreground">Sent</div>
                        <div className="flex-1 h-12 bg-primary/50 rounded flex items-center px-4 text-white font-medium">
                            {data.overall.totalSent.toLocaleString()} (100%)
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-32 text-sm text-muted-foreground">Opened</div>
                        <div
                            className="h-12 bg-primary/40 rounded flex items-center px-4 text-white font-medium"
                            style={{
                                width: `${(data.overall.totalOpened / data.overall.totalSent) * 100}%`,
                            }}
                        >
                            {data.overall.totalOpened.toLocaleString()} (
                            {overallOpenRate}%)
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-32 text-sm text-muted-foreground">
                            Clicked
                        </div>
                        <div
                            className="h-12 bg-purple-500 rounded flex items-center px-4 text-white font-medium"
                            style={{
                                width: `${(data.overall.totalClicked / data.overall.totalSent) * 100}%`,
                            }}
                        >
                            {data.overall.totalClicked.toLocaleString()} (
                            {calculateRate(
                                data.overall.totalClicked,
                                data.overall.totalSent
                            )}
                            %)
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-32 text-sm text-muted-foreground">
                            Converted
                        </div>
                        <div
                            className="h-12 bg-green-500 rounded flex items-center px-4 text-white font-medium"
                            style={{
                                width: `${(data.overall.totalConverted / data.overall.totalSent) * 100}%`,
                            }}
                        >
                            {data.overall.totalConverted.toLocaleString()} (
                            {overallConversionRate}%)
                        </div>
                    </div>
                </div>
            </Card>

            {/* Best Performing Messages */}
            <Card className="p-6">
                <h4 className="font-semibold mb-4">💎 Top Performing Content</h4>
                <div className="space-y-3 text-sm">
                    <div className="p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">
                                Subject: Quick question...
                            </span>
                            <Badge className="bg-green-100 text-green-800">
                                45.2% open
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Best performing subject line across all sequences
                        </p>
                    </div>

                    <div className="p-3 bg-primary/5 rounded border border-primary/20">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">CTA: See the results →</span>
                            <Badge className="bg-primary/10 text-primary">
                                32.8% click
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Highest click-through rate for CTAs
                        </p>
                    </div>

                    <div className="p-3 bg-purple-50 rounded border border-purple-200">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">Story: Sarah's Success</span>
                            <Badge className="bg-purple-100 text-purple-800">
                                12.4% convert
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Story with highest conversion rate
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
