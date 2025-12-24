"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    MousePointer,
    Eye,
    Target,
    Loader2,
    RefreshCw,
    AlertCircle,
    Zap,
    ArrowRight,
} from "lucide-react";

interface Campaign {
    id: string;
    name: string;
    funnel_project_id: string;
    meta_campaign_id: string | null;
    is_active: boolean;
    daily_budget_cents: number;
    created_at: string;
}

interface CampaignMetrics {
    impressions: number;
    clicks: number;
    leads: number;
    spend_cents: number;
    ctr_percent: number;
    cpc_cents: number;
    cost_per_lead_cents: number;
}

interface Optimization {
    id: string;
    optimization_type: string;
    reason: string;
    status: string;
    created_at: string;
}

type DateRange = "today" | "7d" | "30d" | "lifetime";

export default function AdsManagerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>("7d");
    const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
    const [optimizations, setOptimizations] = useState<Optimization[]>([]);
    const [projects, setProjects] = useState<Record<string, string>>({});

    useEffect(() => {
        loadCampaigns();
    }, []);

    useEffect(() => {
        if (selectedCampaign) {
            loadCampaignMetrics(selectedCampaign);
            loadOptimizations(selectedCampaign);
        }
    }, [selectedCampaign, dateRange]);

    const loadCampaigns = async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Load campaigns (marketing_content_briefs with paid_ad type)
            const { data: briefs, error } = await supabase
                .from("marketing_content_briefs")
                .select("*, funnel_projects(name)")
                .eq("campaign_type", "paid_ad")
                .order("created_at", { ascending: false });

            if (error) {
                throw error;
            }

            const campaignData: Campaign[] = (briefs || []).map((brief: any) => ({
                id: brief.id,
                name: brief.name,
                funnel_project_id: brief.funnel_project_id,
                meta_campaign_id: brief.meta_campaign_id,
                is_active: brief.is_active,
                daily_budget_cents: brief.daily_budget_cents || 0,
                created_at: brief.created_at,
            }));

            const projectMap: Record<string, string> = {};
            briefs?.forEach((brief: any) => {
                if (brief.funnel_projects?.name) {
                    projectMap[brief.funnel_project_id] = brief.funnel_projects.name;
                }
            });

            setCampaigns(campaignData);
            setProjects(projectMap);

            if (campaignData.length > 0 && !selectedCampaign) {
                setSelectedCampaign(campaignData[0].id);
            }
        } catch (error) {
            logger.error({ error }, "Error loading campaigns");
        } finally {
            setLoading(false);
        }
    };

    const loadCampaignMetrics = async (campaignId: string) => {
        try {
            const supabase = createClient();

            // Get variants for this campaign
            const { data: variants } = await supabase
                .from("marketing_post_variants")
                .select("id")
                .eq("content_brief_id", campaignId);

            if (!variants || variants.length === 0) {
                setMetrics(null);
                return;
            }

            const variantIds = variants.map((v) => v.id);

            // Get analytics
            const { data: analytics } = await supabase
                .from("marketing_analytics")
                .select("*")
                .in("post_variant_id", variantIds);

            if (!analytics || analytics.length === 0) {
                setMetrics(null);
                return;
            }

            // Aggregate metrics
            const aggregated: CampaignMetrics = {
                impressions: 0,
                clicks: 0,
                leads: 0,
                spend_cents: 0,
                ctr_percent: 0,
                cpc_cents: 0,
                cost_per_lead_cents: 0,
            };

            analytics.forEach((a) => {
                aggregated.impressions += a.impressions || 0;
                aggregated.clicks += a.clicks || 0;
                aggregated.leads += a.leads_count || 0;
                aggregated.spend_cents += a.spend_cents || 0;
            });

            // Calculate derived metrics
            if (aggregated.impressions > 0) {
                aggregated.ctr_percent =
                    (aggregated.clicks / aggregated.impressions) * 100;
            }
            if (aggregated.clicks > 0) {
                aggregated.cpc_cents = Math.round(
                    aggregated.spend_cents / aggregated.clicks
                );
            }
            if (aggregated.leads > 0) {
                aggregated.cost_per_lead_cents = Math.round(
                    aggregated.spend_cents / aggregated.leads
                );
            }

            setMetrics(aggregated);
        } catch (error) {
            logger.error({ error, campaignId }, "Error loading campaign metrics");
            setMetrics(null);
        }
    };

    const loadOptimizations = async (campaignId: string) => {
        try {
            const supabase = createClient();

            const { data } = await supabase
                .from("marketing_ad_optimizations")
                .select("*")
                .eq("content_brief_id", campaignId)
                .order("created_at", { ascending: false })
                .limit(10);

            setOptimizations(data || []);
        } catch (error) {
            logger.error({ error, campaignId }, "Error loading optimizations");
            setOptimizations([]);
        }
    };

    const handleRefresh = async () => {
        if (!selectedCampaign) return;

        setRefreshing(true);
        try {
            const response = await fetch("/api/ads/metrics/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaign_id: selectedCampaign }),
            });

            if (response.ok) {
                await loadCampaignMetrics(selectedCampaign);
            }
        } catch (error) {
            logger.error({ error }, "Error refreshing metrics");
        } finally {
            setRefreshing(false);
        }
    };

    const formatCurrency = (cents: number) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (campaigns.length === 0) {
        return (
            <div className="container max-w-4xl mx-auto py-12 px-4">
                <Card>
                    <CardContent className="py-12 text-center">
                        <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-2xl font-bold mb-2">No Campaigns Yet</h2>
                        <p className="text-muted-foreground mb-6">
                            Create your first ad campaign from the funnel builder to
                            start tracking performance.
                        </p>
                        <Button onClick={() => router.push("/dashboard")}>
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const selectedCampaignData = campaigns.find((c) => c.id === selectedCampaign);

    return (
        <div className="container max-w-7xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Ads Manager</h1>
                    <p className="text-muted-foreground">
                        Track performance and optimize your Meta ad campaigns
                    </p>
                </div>
                <div className="flex gap-3">
                    <Select
                        value={dateRange}
                        onValueChange={(v) => setDateRange(v as DateRange)}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="lifetime">Lifetime</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        {refreshing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Campaign Selector */}
            <Card className="mb-6">
                <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium">Campaign:</label>
                        <Select
                            value={selectedCampaign || ""}
                            onValueChange={setSelectedCampaign}
                        >
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="Select campaign" />
                            </SelectTrigger>
                            <SelectContent>
                                {campaigns.map((campaign) => (
                                    <SelectItem key={campaign.id} value={campaign.id}>
                                        {campaign.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedCampaignData && (
                            <div className="flex items-center gap-2 ml-auto">
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        selectedCampaignData.is_active
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                    }`}
                                >
                                    {selectedCampaignData.is_active
                                        ? "Active"
                                        : "Paused"}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    Budget:{" "}
                                    {formatCurrency(
                                        selectedCampaignData.daily_budget_cents
                                    )}
                                    /day
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <Eye className="h-8 w-8 text-blue-500" />
                            <span className="text-2xl font-bold">
                                {metrics ? formatNumber(metrics.impressions) : "-"}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Impressions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <MousePointer className="h-8 w-8 text-green-500" />
                            <span className="text-2xl font-bold">
                                {metrics ? formatNumber(metrics.clicks) : "-"}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">Clicks</p>
                        {metrics && metrics.ctr_percent > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                                {metrics.ctr_percent.toFixed(2)}% CTR
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <Users className="h-8 w-8 text-purple-500" />
                            <span className="text-2xl font-bold">
                                {metrics ? formatNumber(metrics.leads) : "-"}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">Leads</p>
                        {metrics && metrics.cost_per_lead_cents > 0 && (
                            <p className="text-xs text-purple-600 mt-1">
                                {formatCurrency(metrics.cost_per_lead_cents)}/lead
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <DollarSign className="h-8 w-8 text-orange-500" />
                            <span className="text-2xl font-bold">
                                {metrics ? formatCurrency(metrics.spend_cents) : "-"}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">Spend</p>
                        {metrics && metrics.cpc_cents > 0 && (
                            <p className="text-xs text-orange-600 mt-1">
                                {formatCurrency(metrics.cpc_cents)}/click
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Optimizations Panel */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-yellow-500" />
                                AI Optimization Recommendations
                            </CardTitle>
                            <CardDescription>
                                Actionable insights to improve your campaign performance
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {optimizations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No optimization recommendations yet</p>
                            <p className="text-sm mt-2">
                                Recommendations will appear as your campaign collects
                                data
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {optimizations.map((opt) => (
                                <div
                                    key={opt.id}
                                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                                        opt.status === "recommended"
                                            ? "border-yellow-200 bg-yellow-50"
                                            : opt.status === "executed"
                                              ? "border-green-200 bg-green-50"
                                              : "border-gray-200 bg-gray-50"
                                    }`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium capitalize">
                                                {opt.optimization_type.replace(
                                                    "_",
                                                    " "
                                                )}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs ${
                                                    opt.status === "recommended"
                                                        ? "bg-yellow-200 text-yellow-800"
                                                        : opt.status === "executed"
                                                          ? "bg-green-200 text-green-800"
                                                          : "bg-gray-200 text-gray-800"
                                                }`}
                                            >
                                                {opt.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {opt.reason}
                                        </p>
                                    </div>
                                    {opt.status === "recommended" && (
                                        <Button size="sm" variant="outline">
                                            Apply
                                            <ArrowRight className="h-3 w-3 ml-1" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
