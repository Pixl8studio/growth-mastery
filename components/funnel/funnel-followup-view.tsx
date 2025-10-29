/**
 * Funnel Followup View Component
 *
 * Displays AI followup prospects and stats for a specific funnel.
 */

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Mail, TrendingUp, DollarSign } from "lucide-react";
import { ProspectList } from "@/components/followup/prospect-list";

interface FollowupStats {
    total_prospects: number;
    total_touches: number;
    conversion_rate: number;
    revenue_generated: number;
}

interface FunnelFollowupViewProps {
    projectId: string;
}

export function FunnelFollowupView({ projectId }: FunnelFollowupViewProps) {
    const [stats, setStats] = useState<FollowupStats>({
        total_prospects: 0,
        total_touches: 0,
        conversion_rate: 0,
        revenue_generated: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [projectId]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const supabase = createClient();

            const { data: prospects } = await supabase
                .from("followup_prospects")
                .select("total_touches, converted, conversion_value")
                .eq("funnel_project_id", projectId);

            if (prospects) {
                const totalTouches = prospects.reduce(
                    (sum, p) => sum + (p.total_touches || 0),
                    0
                );
                const converted = prospects.filter((p) => p.converted).length;
                const revenue = prospects.reduce(
                    (sum, p) => sum + Number(p.conversion_value || 0),
                    0
                );

                setStats({
                    total_prospects: prospects.length,
                    total_touches: totalTouches,
                    conversion_rate:
                        prospects.length > 0 ? (converted / prospects.length) * 100 : 0,
                    revenue_generated: revenue,
                });
            }
        } catch (error) {
            logger.error({ error, projectId }, "Failed to load followup stats");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-32 animate-pulse rounded-lg bg-gray-200"
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Prospects
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.total_prospects}
                        </div>
                        <p className="text-xs text-gray-500">Active in sequence</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Touches
                        </CardTitle>
                        <Mail className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_touches}</div>
                        <p className="text-xs text-gray-500">Messages sent</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Conversion Rate
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.conversion_rate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-gray-500">From followup</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Revenue Generated
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${stats.revenue_generated.toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500">Total from followup</p>
                    </CardContent>
                </Card>
            </div>

            {/* Prospects List */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Prospects</h3>
                <ProspectList funnelProjectId={projectId} />
            </div>
        </div>
    );
}
