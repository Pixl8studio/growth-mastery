"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Target,
    Plus,
    TrendingUp,
    DollarSign,
    Users,
    Pause,
    Play,
    ExternalLink,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";

export default function AdsManagerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [funnels, setFunnels] = useState<any[]>([]);
    const [selectedFunnel, setSelectedFunnel] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [aggregateMetrics, setAggregateMetrics] = useState({
        totalSpend: 0,
        totalLeads: 0,
        avgCPL: 0,
        activeCampaigns: 0,
    });

    useEffect(() => {
        loadData();
    }, [selectedFunnel, statusFilter]);

    const loadData = async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            // Load funnels
            const { data: funnelsData } = await supabase
                .from("funnel_projects")
                .select("id, name")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            setFunnels(funnelsData || []);

            // Load campaigns
            let campaignsQuery = supabase
                .from("marketing_content_briefs")
                .select("*, funnel_projects(name)")
                .eq("user_id", user.id)
                .eq("campaign_type", "paid_ad")
                .order("created_at", { ascending: false });

            if (selectedFunnel !== "all") {
                campaignsQuery = campaignsQuery.eq("funnel_project_id", selectedFunnel);
            }

            if (statusFilter !== "all") {
                campaignsQuery = campaignsQuery.eq(
                    "is_active",
                    statusFilter === "active"
                );
            }

            const { data: campaignsData } = await campaignsQuery;

            // Load metrics for each campaign
            const campaignsWithMetrics = await Promise.all(
                (campaignsData || []).map(async (campaign) => {
                    const { data: variants } = await supabase
                        .from("marketing_post_variants")
                        .select("id")
                        .eq("content_brief_id", campaign.id);

                    const variantIds = variants?.map((v) => v.id) || [];

                    if (variantIds.length === 0) {
                        return { ...campaign, metrics: null };
                    }

                    const { data: analytics } = await supabase
                        .from("marketing_analytics")
                        .select("*")
                        .in("post_variant_id", variantIds);

                    // Aggregate metrics
                    const metrics = {
                        impressions: 0,
                        clicks: 0,
                        spend_cents: 0,
                        leads: 0,
                        cpl_cents: 0,
                    };

                    if (analytics && analytics.length > 0) {
                        for (const a of analytics) {
                            metrics.impressions += a.impressions || 0;
                            metrics.clicks += a.clicks || 0;
                            metrics.spend_cents += a.spend_cents || 0;
                            metrics.leads += a.leads_count || 0;
                        }

                        metrics.cpl_cents =
                            metrics.leads > 0
                                ? Math.round(metrics.spend_cents / metrics.leads)
                                : 0;
                    }

                    return { ...campaign, metrics };
                })
            );

            setCampaigns(campaignsWithMetrics);

            // Calculate aggregate metrics
            const aggregate = {
                totalSpend: 0,
                totalLeads: 0,
                avgCPL: 0,
                activeCampaigns: 0,
            };

            for (const campaign of campaignsWithMetrics) {
                if (campaign.metrics) {
                    aggregate.totalSpend += campaign.metrics.spend_cents;
                    aggregate.totalLeads += campaign.metrics.leads;
                }
                if (campaign.is_active) {
                    aggregate.activeCampaigns++;
                }
            }

            aggregate.avgCPL =
                aggregate.totalLeads > 0
                    ? Math.round(aggregate.totalSpend / aggregate.totalLeads)
                    : 0;

            setAggregateMetrics(aggregate);
        } catch (error) {
            logger.error({ error }, "Error loading ads manager data");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaign = () => {
        if (funnels.length === 0) {
            alert("Create a funnel first to launch campaigns");
            router.push("/funnel-builder/create");
            return;
        }

        // Redirect to first funnel's step 14
        router.push(`/funnel-builder/${funnels[0].id}/step/14`);
    };

    const handleViewCampaign = (funnelId: string) => {
        router.push(`/funnel-builder/${funnelId}`);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Loading campaigns...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Ads Manager</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage all your Meta/Instagram ad campaigns
                    </p>
                </div>
                <Button onClick={handleCreateCampaign} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Campaign
                </Button>
            </div>

            {/* Aggregate Metrics */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Spend (Today)
                            </p>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-3xl font-bold">
                            ${(aggregateMetrics.totalSpend / 100).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Leads
                            </p>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-3xl font-bold">
                            {aggregateMetrics.totalLeads}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Avg CPL
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-3xl font-bold">
                            ${(aggregateMetrics.avgCPL / 100).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Active Campaigns
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-3xl font-bold">
                            {aggregateMetrics.activeCampaigns}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Funnels" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Funnels</SelectItem>
                        {funnels.map((funnel) => (
                            <SelectItem key={funnel.id} value={funnel.id}>
                                {funnel.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Campaigns List */}
            {campaigns.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Campaigns Yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Create your first ad campaign to start generating leads
                        </p>
                        <Button onClick={handleCreateCampaign}>Create Campaign</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {campaigns.map((campaign) => (
                        <Card
                            key={campaign.id}
                            className="hover:border-primary/50 transition-colors"
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold">
                                                {campaign.name}
                                            </h3>
                                            <Badge
                                                variant={
                                                    campaign.is_active
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {campaign.is_active ? (
                                                    <>
                                                        <Play className="h-3 w-3 mr-1" />
                                                        Active
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pause className="h-3 w-3 mr-1" />
                                                        Paused
                                                    </>
                                                )}
                                            </Badge>
                                            {campaign.funnel_projects && (
                                                <span className="text-sm text-muted-foreground">
                                                    {campaign.funnel_projects.name}
                                                </span>
                                            )}
                                        </div>

                                        {campaign.metrics && (
                                            <div className="grid grid-cols-4 gap-4 mt-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Spend
                                                    </p>
                                                    <p className="text-lg font-semibold">
                                                        $
                                                        {(
                                                            campaign.metrics
                                                                .spend_cents / 100
                                                        ).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Leads
                                                    </p>
                                                    <p className="text-lg font-semibold">
                                                        {campaign.metrics.leads}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        CPL
                                                    </p>
                                                    <p className="text-lg font-semibold">
                                                        $
                                                        {(
                                                            campaign.metrics.cpl_cents /
                                                            100
                                                        ).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Impressions
                                                    </p>
                                                    <p className="text-lg font-semibold">
                                                        {campaign.metrics.impressions.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {!campaign.metrics && (
                                            <p className="text-sm text-muted-foreground mt-2">
                                                No performance data yet
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            handleViewCampaign(
                                                campaign.funnel_project_id
                                            )
                                        }
                                        className="gap-2"
                                    >
                                        View Details
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
