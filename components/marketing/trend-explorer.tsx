/**
 * Trend Explorer
 * Discover trending topics and create content from them
 */

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { TrendingUp, X, Plus } from "lucide-react";
import type { TrendSignal } from "@/types/marketing";

interface TrendExplorerProps {
    profileId: string;
    funnelProjectId: string;
}

export function TrendExplorer({ profileId, funnelProjectId }: TrendExplorerProps) {
    const { toast } = useToast();
    const [trends, setTrends] = useState<TrendSignal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTrends();
    }, []);

    const loadTrends = async () => {
        setLoading(true);

        try {
            const response = await fetch("/api/marketing/trends?limit=10");

            const data = await response.json();

            if (data.success) {
                setTrends(data.trends || []);
                logger.info({ count: data.trends?.length || 0 }, "Trends loaded");
            }
        } catch (error) {
            logger.error({ error }, "Failed to load trends");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBrief = async (trend: TrendSignal, angle: string) => {
        try {
            const response = await fetch(`/api/marketing/trends/${trend.id}/brief`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    funnel_project_id: funnelProjectId,
                    marketing_profile_id: profileId,
                    goal: "drive_registrations",
                    selected_angle: angle,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Brief Created",
                    description: `Content brief created from trend: ${trend.topic}`,
                });
                logger.info(
                    { briefId: data.brief?.id, trendId: trend.id },
                    "Brief from trend"
                );
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Failed to create brief from trend");
            toast({
                title: "Creation Failed",
                description: "Unable to create brief from this trend",
                variant: "destructive",
            });
        }
    };

    const handleDismissTrend = async (trendId: string) => {
        try {
            const response = await fetch(`/api/marketing/trends?trend_id=${trendId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                setTrends(trends.filter((t) => t.id !== trendId));
                toast({
                    title: "Trend Dismissed",
                    description: "This trend won't be shown again",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to dismiss trend");
        }
    };

    const getRelevanceColor = (score: number) => {
        if (score >= 86) return "text-green-600 bg-green-100";
        if (score >= 61) return "text-blue-600 bg-blue-100";
        if (score >= 31) return "text-yellow-600 bg-yellow-100";
        return "text-gray-600 bg-gray-100";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading trends...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50">
                <div className="flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-orange-500" />
                    <div>
                        <h3 className="text-lg font-semibold">Trending Topics</h3>
                        <p className="text-sm text-gray-600">
                            Timely content opportunities matched to your niche
                        </p>
                    </div>
                </div>
            </Card>

            {/* Trends List */}
            {trends.length === 0 ? (
                <Card className="p-12 text-center">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No Trends Available
                    </h3>
                    <p className="text-gray-600">
                        Trends are scanned daily. Check back tomorrow for new
                        opportunities.
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {trends.map((trend) => {
                        const suggestedAngles = trend.suggested_angles as any;

                        return (
                            <Card key={trend.id} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-lg font-semibold">
                                                {trend.topic}
                                            </h4>
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${getRelevanceColor(trend.relevance_score)}`}
                                            >
                                                {trend.relevance_score}% relevant
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Source: {trend.source}
                                        </div>
                                        {trend.matched_niches.length > 0 && (
                                            <div className="text-sm text-gray-600 mt-1">
                                                Niches:{" "}
                                                {trend.matched_niches.join(", ")}
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={() => handleDismissTrend(trend.id)}
                                        variant="ghost"
                                        size="sm"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Suggested Angles */}
                                <div className="space-y-3">
                                    <div className="text-sm font-medium">
                                        Suggested Angles:
                                    </div>

                                    {suggestedAngles.founder_perspective && (
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-blue-900 mb-1">
                                                        Founder Perspective
                                                    </div>
                                                    <div className="text-sm text-blue-800">
                                                        {
                                                            suggestedAngles.founder_perspective
                                                        }
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() =>
                                                        handleCreateBrief(
                                                            trend,
                                                            "founder_perspective"
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                    className="ml-3"
                                                >
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Create
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {suggestedAngles.myth_buster && (
                                        <div className="p-3 bg-purple-50 rounded-lg">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-purple-900 mb-1">
                                                        Myth-Buster
                                                    </div>
                                                    <div className="text-sm text-purple-800">
                                                        {suggestedAngles.myth_buster}
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() =>
                                                        handleCreateBrief(
                                                            trend,
                                                            "myth_buster"
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                    className="ml-3"
                                                >
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Create
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {suggestedAngles.industry_pov && (
                                        <div className="p-3 bg-green-50 rounded-lg">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-green-900 mb-1">
                                                        Industry POV
                                                    </div>
                                                    <div className="text-sm text-green-800">
                                                        {suggestedAngles.industry_pov}
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() =>
                                                        handleCreateBrief(
                                                            trend,
                                                            "industry_pov"
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                    className="ml-3"
                                                >
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Create
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
