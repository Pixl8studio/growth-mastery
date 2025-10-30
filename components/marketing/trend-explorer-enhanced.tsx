/**
 * Enhanced Trend Explorer
 * Trend discovery, trend details panel, brief generation from trends, saved trends
 */

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    TrendingUp,
    Search,
    Sparkles,
    Bookmark,
    BookmarkCheck,
    X,
    Lightbulb,
    RefreshCw,
} from "lucide-react";

interface Trend {
    id: string;
    title: string;
    description: string;
    platforms: string[];
    trend_score: number;
    category: string;
    suggested_angles: string[];
    example_posts: string[];
    created_at: string;
}

interface TrendExplorerEnhancedProps {
    profileId: string;
    funnelProjectId: string;
}

export function TrendExplorerEnhanced({
    profileId,
    funnelProjectId,
}: TrendExplorerEnhancedProps) {
    const { toast } = useToast();
    const [trends, setTrends] = useState<Trend[]>([]);
    const [savedTrends, setSavedTrends] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<"7" | "30" | "90">("30");
    const [category, setCategory] = useState<string | null>(null);
    const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
    const [creatingBrief, setCreatingBrief] = useState(false);

    useEffect(() => {
        loadSavedTrends();
    }, [funnelProjectId]);

    const loadSavedTrends = async () => {
        try {
            const response = await fetch(
                `/api/marketing/trends/saved?funnel_project_id=${funnelProjectId}`
            );
            const data = await response.json();

            if (data.success) {
                setSavedTrends(data.trend_ids || []);
            }
        } catch (error) {
            logger.error({ error }, "Failed to load saved trends");
        }
    };

    const handleSearch = async () => {
        if (!searchTerm && selectedPlatforms.length === 0) {
            toast({
                title: "Search Required",
                description: "Enter a keyword or select platforms",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append("keyword", searchTerm);
            if (selectedPlatforms.length > 0)
                params.append("platforms", selectedPlatforms.join(","));
            params.append("days", dateRange);
            if (category) params.append("category", category);

            const response = await fetch(`/api/marketing/trends?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setTrends(data.trends || []);
                logger.info({ count: data.trends?.length }, "Trends loaded");
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Trend search failed");
            toast({
                title: "Search Failed",
                description: "Unable to fetch trends",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTrend = async (trendId: string) => {
        try {
            const response = await fetch("/api/marketing/trends/saved", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trend_id: trendId,
                    funnel_project_id: funnelProjectId,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSavedTrends([...savedTrends, trendId]);
                toast({
                    title: "Trend Saved",
                    description: "Added to your saved trends",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to save trend");
        }
    };

    const handleUnsaveTrend = async (trendId: string) => {
        try {
            const response = await fetch(`/api/marketing/trends/saved/${trendId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                setSavedTrends(savedTrends.filter((id) => id !== trendId));
                toast({
                    title: "Trend Removed",
                    description: "Removed from saved trends",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to unsave trend");
        }
    };

    const handleCreateBriefFromTrend = async (trend: Trend) => {
        setCreatingBrief(true);

        try {
            const response = await fetch(`/api/marketing/trends/${trend.id}/brief`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    funnel_project_id: funnelProjectId,
                    marketing_profile_id: profileId,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Brief Created from Trend",
                    description: `Created brief: ${data.brief.name}`,
                });
                // Navigate to generate tab or brief editor
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Brief creation failed");
            toast({
                title: "Brief Creation Failed",
                description: "Please try again",
                variant: "destructive",
            });
        } finally {
            setCreatingBrief(false);
        }
    };

    const togglePlatform = (platform: string) => {
        if (selectedPlatforms.includes(platform)) {
            setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
        } else {
            setSelectedPlatforms([...selectedPlatforms, platform]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Section 1: Trend Discovery */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Discover Trending Topics</h3>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                            placeholder="Search for trending topics or keywords..."
                            className="pl-10"
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Platform Filter</Label>
                        <div className="flex gap-2">
                            {[
                                { id: "instagram", label: "Instagram", icon: "📸" },
                                { id: "facebook", label: "Facebook", icon: "👍" },
                                { id: "linkedin", label: "LinkedIn", icon: "💼" },
                                { id: "twitter", label: "Twitter", icon: "🐦" },
                            ].map((platform) => (
                                <Button
                                    key={platform.id}
                                    onClick={() => togglePlatform(platform.id)}
                                    variant={
                                        selectedPlatforms.includes(platform.id)
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                >
                                    <span className="mr-1">{platform.icon}</span>
                                    {platform.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-2 block">Date Range</Label>
                            <select
                                value={dateRange}
                                onChange={(e) =>
                                    setDateRange(e.target.value as "7" | "30" | "90")
                                }
                                className="w-full rounded-md border border-border px-3 py-2"
                            >
                                <option value="7">Last 7 Days</option>
                                <option value="30">Last 30 Days</option>
                                <option value="90">Last 90 Days</option>
                            </select>
                        </div>

                        <div>
                            <Label className="mb-2 block">Category</Label>
                            <select
                                value={category || "all"}
                                onChange={(e) =>
                                    setCategory(
                                        e.target.value === "all" ? null : e.target.value
                                    )
                                }
                                className="w-full rounded-md border border-border px-3 py-2"
                            >
                                <option value="all">All Categories</option>
                                <option value="business">Business</option>
                                <option value="technology">Technology</option>
                                <option value="lifestyle">Lifestyle</option>
                                <option value="personal_development">
                                    Personal Development
                                </option>
                            </select>
                        </div>
                    </div>

                    <Button
                        onClick={handleSearch}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Searching...
                            </>
                        ) : (
                            <>
                                <Search className="h-4 w-4 mr-2" />
                                Search Trends
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Trending Now List */}
            {trends.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold">
                        Trending Now ({trends.length})
                    </h3>
                    {trends.map((trend) => {
                        const isSaved = savedTrends.includes(trend.id);

                        return (
                            <Card
                                key={trend.id}
                                className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => setSelectedTrend(trend)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-5 w-5 text-orange-500" />
                                            <h4 className="font-semibold">
                                                {trend.title}
                                            </h4>
                                            <Badge
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                Score: {trend.trend_score}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {trend.description}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {trend.platforms.map((platform) => (
                                                <Badge
                                                    key={platform}
                                                    variant="outline"
                                                    className="text-xs capitalize"
                                                >
                                                    {platform}
                                                </Badge>
                                            ))}
                                            <Badge
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                {trend.category}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isSaved) {
                                                    handleUnsaveTrend(trend.id);
                                                } else {
                                                    handleSaveTrend(trend.id);
                                                }
                                            }}
                                            variant="ghost"
                                            size="sm"
                                        >
                                            {isSaved ? (
                                                <BookmarkCheck className="h-4 w-4 text-primary-foreground0" />
                                            ) : (
                                                <Bookmark className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCreateBriefFromTrend(trend);
                                            }}
                                            disabled={creatingBrief}
                                            size="sm"
                                        >
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Create Brief
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Saved Trends */}
            {savedTrends.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        Saved Trends ({savedTrends.length})
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                        {trends
                            .filter((t) => savedTrends.includes(t.id))
                            .map((trend) => (
                                <div
                                    key={trend.id}
                                    className="p-3 border rounded-lg bg-primary/5 border-primary/20"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-sm">
                                            {trend.title}
                                        </h4>
                                        <button
                                            onClick={() => handleUnsaveTrend(trend.id)}
                                            className="text-muted-foreground hover:text-red-500"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {trend.description}
                                    </p>
                                    <Button
                                        onClick={() =>
                                            handleCreateBriefFromTrend(trend)
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                    >
                                        Create Brief
                                    </Button>
                                </div>
                            ))}
                    </div>
                </Card>
            )}

            {/* Empty State */}
            {trends.length === 0 && !loading && (
                <Card className="p-12 text-center border-dashed">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        Discover Trending Topics
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                        Search for trending topics to create timely, relevant content
                    </p>
                    <Button onClick={handleSearch}>
                        <Search className="h-4 w-4 mr-2" />
                        Search Trends
                    </Button>
                </Card>
            )}

            {/* Section 2: Trend Details Panel (Sidebar) */}
            {selectedTrend && (
                <div className="fixed inset-y-0 right-0 w-96 bg-card shadow-2xl border-l z-50 overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Trend Details</h3>
                            <button
                                onClick={() => setSelectedTrend(null)}
                                className="text-muted-foreground hover:text-muted-foreground"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Trend Info */}
                            <div>
                                <h4 className="font-semibold text-lg mb-2">
                                    {selectedTrend.title}
                                </h4>
                                <div className="flex items-center gap-2 mb-3">
                                    <Badge className="bg-orange-100 text-orange-700">
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        Score: {selectedTrend.trend_score}
                                    </Badge>
                                    <Badge variant="outline">
                                        {selectedTrend.category}
                                    </Badge>
                                </div>
                                <p className="text-sm text-foreground">
                                    {selectedTrend.description}
                                </p>
                            </div>

                            {/* Why It's Trending */}
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                <h4 className="font-semibold text-primary mb-2">
                                    Why It's Trending
                                </h4>
                                <p className="text-sm text-primary">
                                    This topic is gaining traction across{" "}
                                    {selectedTrend.platforms.join(", ")} with high
                                    engagement rates. Perfect timing to join the
                                    conversation.
                                </p>
                            </div>

                            {/* Suggested Angles */}
                            {selectedTrend.suggested_angles.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                                        Suggested Angles for Your Brand
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedTrend.suggested_angles.map(
                                            (angle, index) => (
                                                <div
                                                    key={index}
                                                    className="p-3 bg-muted/50 rounded border text-sm"
                                                >
                                                    {angle}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Example Posts */}
                            {selectedTrend.example_posts.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">
                                        Example Posts Using This Trend
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedTrend.example_posts.map(
                                            (post, index) => (
                                                <div
                                                    key={index}
                                                    className="p-3 bg-muted/50 rounded text-xs text-foreground"
                                                >
                                                    {post}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-2 pt-4 border-t">
                                <Button
                                    onClick={() =>
                                        handleCreateBriefFromTrend(selectedTrend)
                                    }
                                    disabled={creatingBrief}
                                    className="w-full"
                                >
                                    {creatingBrief ? (
                                        "Creating Brief..."
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Create Brief from This Trend
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (savedTrends.includes(selectedTrend.id)) {
                                            handleUnsaveTrend(selectedTrend.id);
                                        } else {
                                            handleSaveTrend(selectedTrend.id);
                                        }
                                    }}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {savedTrends.includes(selectedTrend.id) ? (
                                        <>
                                            <BookmarkCheck className="h-4 w-4 mr-2" />
                                            Saved
                                        </>
                                    ) : (
                                        <>
                                            <Bookmark className="h-4 w-4 mr-2" />
                                            Save for Later
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
