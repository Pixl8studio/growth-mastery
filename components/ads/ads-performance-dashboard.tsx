"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    MousePointer,
    Eye,
    Target,
    Lightbulb,
    Pause,
    Play,
} from "lucide-react";
import { logger } from "@/lib/client-logger";

interface AdsPerformanceDashboardProps {
    campaignId: string;
}

export function AdsPerformanceDashboard({ campaignId }: AdsPerformanceDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<any>(null);
    const [campaign, setCampaign] = useState<any>(null);
    const [snapshots, setSnapshots] = useState<any[]>([]);
    const [optimizations, setOptimizations] = useState<any[]>([]);
    const [timeRange, setTimeRange] = useState("7");

    useEffect(() => {
        loadMetrics();
        loadOptimizations();
    }, [campaignId, timeRange]);

    const loadMetrics = async () => {
        try {
            setLoading(true);

            const response = await fetch(`/api/ads/metrics/${campaignId}`);

            if (!response.ok) {
                throw new Error("Failed to load metrics");
            }

            const data = await response.json();

            setMetrics(data.metrics);
            setCampaign(data.campaign);
            setSnapshots(data.snapshots || []);
        } catch (error) {
            logger.error({ error }, "Error loading metrics");
        } finally {
            setLoading(false);
        }
    };

    const loadOptimizations = async () => {
        try {
            const response = await fetch(`/api/ads/optimize?campaign_id=${campaignId}`);

            if (!response.ok) return;

            const data = await response.json();
            setOptimizations(data.optimizations || []);
        } catch (error) {
            logger.error({ error }, "Error loading optimizations");
        }
    };

    const handleExecuteOptimization = async (optimizationId: string) => {
        try {
            // Execute optimization logic here
            logger.info({ optimizationId }, "Executing optimization");
            await loadOptimizations();
        } catch (error) {
            logger.error({ error }, "Error executing optimization");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading performance data...</div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No metrics available yet. Ads may still be in review or just started.
            </div>
        );
    }

    const cplDollars = (metrics.cost_per_lead_cents / 100).toFixed(2);
    const spendDollars = (metrics.spend_cents / 100).toFixed(2);
    const cpcDollars = (metrics.cpc_cents / 100).toFixed(2);

    return (
        <div className="space-y-6">
            {/* Campaign Status Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{campaign?.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Campaign Performance Dashboard
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="14">Last 14 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="lifetime">Lifetime</SelectItem>
                        </SelectContent>
                    </Select>
                    <Badge variant={campaign?.is_active ? "default" : "secondary"}>
                        {campaign?.is_active ? "Active" : "Paused"}
                    </Badge>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Spend
                            </p>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-3xl font-bold">${spendDollars}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Daily budget: $
                            {((campaign?.daily_budget_cents || 0) / 100).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Leads
                            </p>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-3xl font-bold">{metrics.leads}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Webinar registrations
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Cost Per Lead
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-3xl font-bold">${cplDollars}</p>
                        <div className="flex items-center gap-1 mt-1">
                            {metrics.cost_per_lead_cents < 500 ? (
                                <TrendingDown className="h-3 w-3 text-green-600" />
                            ) : (
                                <TrendingUp className="h-3 w-3 text-orange-600" />
                            )}
                            <p className="text-xs text-muted-foreground">
                                {metrics.cost_per_lead_cents < 500 ? "Below" : "Above"}{" "}
                                target
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                CTR
                            </p>
                            <MousePointer className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-3xl font-bold">
                            {metrics.ctr_percent.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {metrics.clicks.toLocaleString()} clicks
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Impressions
                                </p>
                                <p className="text-2xl font-bold mt-1">
                                    {metrics.impressions.toLocaleString()}
                                </p>
                            </div>
                            <Eye className="h-6 w-6 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">CPC</p>
                                <p className="text-2xl font-bold mt-1">${cpcDollars}</p>
                            </div>
                            <MousePointer className="h-6 w-6 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">CPM</p>
                                <p className="text-2xl font-bold mt-1">
                                    ${(metrics.cpm_cents / 100).toFixed(2)}
                                </p>
                            </div>
                            <DollarSign className="h-6 w-6 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* AI Optimizations */}
            {optimizations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-primary" />
                            AI Optimization Recommendations ({optimizations.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {optimizations.map((opt) => (
                            <div
                                key={opt.id}
                                className="flex items-start justify-between rounded-lg border bg-accent/50 p-4"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="capitalize">
                                            {opt.optimization_type.replace("_", " ")}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            {new Date(
                                                opt.created_at
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm">{opt.reason}</p>
                                </div>
                                {opt.status === "recommended" && (
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            handleExecuteOptimization(opt.id)
                                        }
                                    >
                                        Execute
                                    </Button>
                                )}
                                {opt.status === "executed" && (
                                    <Badge variant="secondary">Executed</Badge>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Performance Chart Placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle>Performance Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                    {snapshots.length > 0 ? (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                            Chart visualization would go here (Line chart of CPL, Leads,
                            Spend over time)
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                            Not enough data yet. Check back after 24-48 hours.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
