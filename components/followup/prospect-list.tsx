/**
 * Prospect List Component
 *
 * Displays list of prospects with filtering by segment and engagement.
 * Shows watch percentage, intent score, and engagement level.
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
    consent_state: string;
}

export function ProspectList({ funnelProjectId }: { funnelProjectId: string }) {
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSegment, setSelectedSegment] = useState<string>("all");

    useEffect(() => {
        async function loadProspects() {
            try {
                const params = new URLSearchParams({
                    funnel_project_id: funnelProjectId,
                });

                if (selectedSegment !== "all") {
                    params.append("segment", selectedSegment);
                }

                const response = await fetch(`/api/followup/prospects?${params}`);
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
    }, [funnelProjectId, selectedSegment]);

    if (loading) {
        return <div className="text-center py-12">Loading prospects...</div>;
    }

    return (
        <Card className="p-6">
            <div className="mb-4 flex gap-2">
                <button
                    onClick={() => setSelectedSegment("all")}
                    className={`px-3 py-1 rounded ${selectedSegment === "all" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                >
                    All
                </button>
                {["no_show", "skimmer", "sampler", "engaged", "hot"].map((seg) => (
                    <button
                        key={seg}
                        onClick={() => setSelectedSegment(seg)}
                        className={`px-3 py-1 rounded capitalize ${selectedSegment === seg ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                    >
                        {seg.replace("_", " ")}
                    </button>
                ))}
            </div>

            <div className="space-y-2">
                {prospects.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        No prospects found for this segment
                    </div>
                ) : (
                    prospects.map((prospect) => (
                        <div
                            key={prospect.id}
                            className="border rounded p-4 flex justify-between items-center"
                        >
                            <div>
                                <div className="font-medium">
                                    {prospect.first_name || prospect.email}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {prospect.email}
                                </div>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="text-sm">
                                    <span className="text-gray-600">Watch:</span>{" "}
                                    {prospect.watch_percentage}%
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-600">Score:</span>{" "}
                                    {prospect.intent_score}
                                </div>
                                <Badge
                                    variant={
                                        prospect.engagement_level === "hot"
                                            ? "default"
                                            : "secondary"
                                    }
                                >
                                    {prospect.engagement_level}
                                </Badge>
                                <Badge
                                    variant={
                                        prospect.segment === "hot"
                                            ? "default"
                                            : "outline"
                                    }
                                >
                                    {prospect.segment}
                                </Badge>
                                {prospect.converted && (
                                    <Badge variant="default">Converted</Badge>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}
