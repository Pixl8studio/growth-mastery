/**
 * Prospects Kanban Component
 *
 * Kanban board view organized by engagement level.
 * Visualizes prospects in Cold, Warm, and Hot columns.
 */

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    next_scheduled_touch: string | null;
    funnel_projects?: {
        id: string;
        name: string;
    };
}

interface ProspectsKanbanProps {
    userId: string;
}

export function ProspectsKanban({ userId }: ProspectsKanbanProps) {
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProspects() {
            try {
                setLoading(true);

                const response = await fetch("/api/followup/global-prospects");
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
    }, [userId]);

    const columns = [
        {
            id: "cold",
            title: "❄️ Cold",
            color: "border-blue-300 bg-blue-50",
            headerColor: "bg-blue-100 text-blue-900",
        },
        {
            id: "warm",
            title: "🌤️ Warm",
            color: "border-yellow-300 bg-yellow-50",
            headerColor: "bg-yellow-100 text-yellow-900",
        },
        {
            id: "hot",
            title: "🔥 Hot",
            color: "border-red-300 bg-red-50",
            headerColor: "bg-red-100 text-red-900",
        },
    ];

    const getProspectsByEngagement = (level: string) => {
        return prospects.filter((p) => p.engagement_level === level);
    };

    const getSegmentColor = (segment: string) => {
        const colors: Record<string, string> = {
            no_show: "bg-gray-500",
            skimmer: "bg-yellow-500",
            sampler: "bg-blue-500",
            engaged: "bg-green-500",
            hot: "bg-red-500",
        };
        return colors[segment] || "bg-gray-500";
    };

    if (loading) {
        return (
            <Card className="p-8">
                <div className="text-center text-gray-600">Loading kanban board...</div>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((column) => {
                const columnProspects = getProspectsByEngagement(column.id);

                return (
                    <Card
                        key={column.id}
                        className={`border-2 ${column.color} overflow-hidden`}
                    >
                        {/* Column Header */}
                        <div className={`p-4 ${column.headerColor}`}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg">
                                    {column.title}
                                </h3>
                                <Badge variant="secondary">
                                    {columnProspects.length}
                                </Badge>
                            </div>
                        </div>

                        {/* Column Content */}
                        <div className="p-4 space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto">
                            {columnProspects.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 text-sm">
                                    No prospects in this category
                                </div>
                            ) : (
                                columnProspects.map((prospect) => (
                                    <Card
                                        key={prospect.id}
                                        className="p-3 bg-white hover:shadow-md transition-shadow cursor-pointer"
                                    >
                                        <div className="space-y-2">
                                            {/* Name & Status */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm text-gray-900 truncate">
                                                        {prospect.first_name ||
                                                            prospect.email}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate">
                                                        {prospect.email}
                                                    </div>
                                                </div>
                                                {prospect.converted && (
                                                    <Badge
                                                        variant="default"
                                                        className="text-xs"
                                                    >
                                                        ✓
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Funnel */}
                                            {prospect.funnel_projects && (
                                                <div className="text-xs text-gray-600 truncate">
                                                    📊 {prospect.funnel_projects.name}
                                                </div>
                                            )}

                                            {/* Metrics */}
                                            <div className="flex items-center gap-3 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        className={`w-2 h-2 rounded-full ${getSegmentColor(prospect.segment)}`}
                                                    />
                                                    <span className="text-gray-600">
                                                        {prospect.segment}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <div className="text-gray-500">
                                                        Watch
                                                    </div>
                                                    <div className="font-medium">
                                                        {prospect.watch_percentage}%
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">
                                                        Intent
                                                    </div>
                                                    <div className="font-medium">
                                                        {prospect.intent_score}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">
                                                        Touches
                                                    </div>
                                                    <div className="font-medium">
                                                        {prospect.total_touches}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Next Touch */}
                                            {prospect.next_scheduled_touch && (
                                                <div className="text-xs text-gray-500 pt-1 border-t">
                                                    Next:{" "}
                                                    {new Date(
                                                        prospect.next_scheduled_touch
                                                    ).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
