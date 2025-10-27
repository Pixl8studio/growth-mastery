/**
 * Global Prospects Table Component
 *
 * Comprehensive table view with all prospect fields visible.
 * Includes sorting, filtering, and bulk actions.
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
    fit_score: number;
    combined_score: number;
    engagement_level: string;
    total_touches: number;
    last_touch_at: string | null;
    next_scheduled_touch: string | null;
    converted: boolean;
    consent_state: string;
    funnel_projects?: {
        id: string;
        name: string;
    };
}

interface GlobalProspectsTableProps {
    userId: string;
}

type SortField =
    | "email"
    | "watch_percentage"
    | "intent_score"
    | "total_touches"
    | "last_touch_at";
type SortDirection = "asc" | "desc";

export function GlobalProspectsTable({ userId }: GlobalProspectsTableProps) {
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState<SortField>("last_touch_at");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [searchQuery, setSearchQuery] = useState("");

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

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const sortedProspects = [...prospects].sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
            case "email":
                comparison = a.email.localeCompare(b.email);
                break;
            case "watch_percentage":
                comparison = a.watch_percentage - b.watch_percentage;
                break;
            case "intent_score":
                comparison = a.intent_score - b.intent_score;
                break;
            case "total_touches":
                comparison = a.total_touches - b.total_touches;
                break;
            case "last_touch_at":
                comparison =
                    new Date(a.last_touch_at || 0).getTime() -
                    new Date(b.last_touch_at || 0).getTime();
                break;
        }

        return sortDirection === "asc" ? comparison : -comparison;
    });

    const filteredProspects = sortedProspects.filter((prospect) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            prospect.email.toLowerCase().includes(query) ||
            prospect.first_name?.toLowerCase().includes(query) ||
            prospect.funnel_projects?.name.toLowerCase().includes(query)
        );
    });

    const getSegmentBadge = (segment: string) => {
        const colors: Record<string, string> = {
            no_show: "bg-gray-500 text-white",
            skimmer: "bg-yellow-500 text-white",
            sampler: "bg-blue-500 text-white",
            engaged: "bg-green-500 text-white",
            hot: "bg-red-500 text-white",
        };
        return (
            <Badge className={colors[segment] || "bg-gray-500 text-white"}>
                {segment.replace("_", " ")}
            </Badge>
        );
    };

    const getConsentBadge = (state: string) => {
        const colors: Record<string, string> = {
            opt_in: "bg-green-100 text-green-800",
            implied: "bg-blue-100 text-blue-800",
            opted_out: "bg-red-100 text-red-800",
            bounced: "bg-gray-100 text-gray-800",
            complained: "bg-orange-100 text-orange-800",
        };
        return <Badge className={colors[state]}>{state.replace("_", " ")}</Badge>;
    };

    if (loading) {
        return (
            <Card className="p-8">
                <div className="text-center text-gray-600">Loading prospects...</div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search prospects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <Button variant="outline">Export CSV</Button>
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-x-auto">
                {filteredProspects.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No prospects found
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort("email")}
                                >
                                    Name / Email{" "}
                                    {sortField === "email" &&
                                        (sortDirection === "asc" ? "↑" : "↓")}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Funnel
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Segment
                                </th>
                                <th
                                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort("watch_percentage")}
                                >
                                    Watch%{" "}
                                    {sortField === "watch_percentage" &&
                                        (sortDirection === "asc" ? "↑" : "↓")}
                                </th>
                                <th
                                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort("intent_score")}
                                >
                                    Intent{" "}
                                    {sortField === "intent_score" &&
                                        (sortDirection === "asc" ? "↑" : "↓")}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Fit
                                </th>
                                <th
                                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort("total_touches")}
                                >
                                    Touches{" "}
                                    {sortField === "total_touches" &&
                                        (sortDirection === "asc" ? "↑" : "↓")}
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort("last_touch_at")}
                                >
                                    Last Touch{" "}
                                    {sortField === "last_touch_at" &&
                                        (sortDirection === "asc" ? "↑" : "↓")}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Next Touch
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Consent
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredProspects.map((prospect) => (
                                <tr key={prospect.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">
                                            {prospect.first_name || prospect.email}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {prospect.email}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {prospect.funnel_projects?.name || "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {getSegmentBadge(prospect.segment)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-medium">
                                        {prospect.watch_percentage}%
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-medium">
                                        {prospect.intent_score}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                                        {prospect.fit_score}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-medium">
                                        {prospect.total_touches}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {prospect.last_touch_at
                                            ? new Date(
                                                  prospect.last_touch_at
                                              ).toLocaleDateString()
                                            : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {prospect.next_scheduled_touch
                                            ? new Date(
                                                  prospect.next_scheduled_touch
                                              ).toLocaleDateString()
                                            : "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {prospect.converted ? (
                                            <Badge variant="default">Converted</Badge>
                                        ) : (
                                            <Badge variant="secondary">Active</Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {getConsentBadge(prospect.consent_state)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
}
