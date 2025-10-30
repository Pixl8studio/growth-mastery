/**
 * Global Prospect List Component
 *
 * Simple list view of all prospects across funnels with filtering.
 */

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";

interface Prospect {
    id: string;
    email: string;
    first_name: string | null;
    watch_percentage: number;
    segment: string;
    intent_score: number;
    engagement_level: string;
    total_touches: number;
    converted: boolean;
    last_touch_at: string | null;
    funnel_projects?: {
        id: string;
        name: string;
    };
}

interface GlobalProspectListProps {
    userId: string;
}

export function GlobalProspectList({ userId }: GlobalProspectListProps) {
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSegment, setSelectedSegment] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        async function loadProspects() {
            try {
                setLoading(true);

                const params = new URLSearchParams();
                if (selectedSegment !== "all") {
                    params.append("segment", selectedSegment);
                }

                const response = await fetch(
                    `/api/followup/global-prospects?${params.toString()}`
                );
                const data = await response.json();

                if (data.success) {
                    setProspects(data.prospects || []);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load prospects");
            } finally {
                setLoading(false);
            }
        }

        loadProspects();
    }, [userId, selectedSegment]);

    const segments = ["all", "no_show", "skimmer", "sampler", "engaged", "hot"];

    const filteredProspects = prospects.filter((prospect) => {
        if (selectedSegment !== "all" && prospect.segment !== selectedSegment) {
            return false;
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                prospect.email.toLowerCase().includes(query) ||
                prospect.first_name?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const getSegmentColor = (segment: string) => {
        const colors: Record<string, string> = {
            no_show: "bg-muted/500",
            skimmer: "bg-yellow-500",
            sampler: "bg-primary/50",
            engaged: "bg-green-500",
            hot: "bg-red-500",
        };
        return colors[segment] || "bg-muted/500";
    };

    const getEngagementColor = (level: string) => {
        const colors: Record<string, string> = {
            cold: "text-primary bg-primary/5",
            warm: "text-yellow-600 bg-yellow-50",
            hot: "text-red-600 bg-red-50",
        };
        return colors[level] || "text-muted-foreground bg-muted/50";
    };

    if (loading) {
        return (
            <Card className="p-8">
                <div className="text-center text-muted-foreground">
                    Loading prospects...
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <Card className="p-4">
                <div className="space-y-4">
                    {/* Search */}
                    <div>
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    {/* Segment Filter */}
                    <div className="flex flex-wrap gap-2">
                        {segments.map((seg) => (
                            <Button
                                key={seg}
                                variant={
                                    selectedSegment === seg ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setSelectedSegment(seg)}
                            >
                                {seg.replace("_", " ").toUpperCase()}
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Prospects List */}
            <Card className="p-4">
                {filteredProspects.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No prospects found
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredProspects.map((prospect) => (
                            <div
                                key={prospect.id}
                                className="border rounded-lg p-4 hover:bg-muted/50 transition-smooth"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="font-medium text-foreground">
                                                {prospect.first_name || prospect.email}
                                            </div>
                                            <div
                                                className={`w-2 h-2 rounded-full ${getSegmentColor(prospect.segment)}`}
                                            />
                                            <Badge
                                                className={getEngagementColor(
                                                    prospect.engagement_level
                                                )}
                                            >
                                                {prospect.engagement_level}
                                            </Badge>
                                            {prospect.converted && (
                                                <Badge variant="default">
                                                    Converted
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <div>{prospect.email}</div>
                                            {prospect.funnel_projects && (
                                                <div className="text-xs text-muted-foreground">
                                                    Funnel:{" "}
                                                    {prospect.funnel_projects.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="space-y-1">
                                            <div className="text-sm font-medium text-foreground">
                                                Watch: {prospect.watch_percentage}%
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Intent: {prospect.intent_score}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Touches: {prospect.total_touches}
                                            </div>
                                            {prospect.last_touch_at && (
                                                <div className="text-xs text-muted-foreground">
                                                    Last:{" "}
                                                    {new Date(
                                                        prospect.last_touch_at
                                                    ).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
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
