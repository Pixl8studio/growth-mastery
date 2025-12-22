"use client";

/**
 * Admin NPS & Feedback Dashboard
 * User satisfaction tracking and feedback management
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import Link from "next/link";

interface NpsResponse {
    id: string;
    userId: string;
    userEmail: string;
    score: number;
    feedback: string | null;
    surveyType: string;
    createdAt: string;
}

interface NpsMetrics {
    npsScore: number;
    promoters: number;
    passives: number;
    detractors: number;
    totalResponses: number;
}

export default function AdminFeedbackPage() {
    const [responses, setResponses] = useState<NpsResponse[]>([]);
    const [metrics, setMetrics] = useState<NpsMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFeedbackData = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Fetch NPS responses
            const { data: npsData, error: npsError } = await supabase
                .from("nps_responses")
                .select("*")
                .order("created_at", { ascending: false });

            if (npsError) throw npsError;

            // Get user emails
            const userIds = [...new Set(npsData?.map((n) => n.user_id) || [])];
            const { data: users } = await supabase
                .from("user_profiles")
                .select("id, email")
                .in("id", userIds);

            const userEmailMap = new Map(users?.map((u) => [u.id, u.email]) || []);

            const mappedResponses: NpsResponse[] =
                npsData?.map((n) => ({
                    id: n.id,
                    userId: n.user_id,
                    userEmail: userEmailMap.get(n.user_id) || "Unknown",
                    score: n.score,
                    feedback: n.feedback,
                    surveyType: n.survey_type,
                    createdAt: n.created_at,
                })) || [];

            setResponses(mappedResponses);

            // Calculate NPS metrics
            if (mappedResponses.length > 0) {
                const promoters = mappedResponses.filter((r) => r.score >= 9).length;
                const passives = mappedResponses.filter(
                    (r) => r.score >= 7 && r.score <= 8
                ).length;
                const detractors = mappedResponses.filter((r) => r.score <= 6).length;
                const total = mappedResponses.length;

                const npsScore = Math.round(((promoters - detractors) / total) * 100);

                setMetrics({
                    npsScore,
                    promoters,
                    passives,
                    detractors,
                    totalResponses: total,
                });
            } else {
                setMetrics({
                    npsScore: 0,
                    promoters: 0,
                    passives: 0,
                    detractors: 0,
                    totalResponses: 0,
                });
            }
        } catch (err) {
            logger.error({ error: err }, "Failed to fetch feedback data");
            setError("Failed to load feedback data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeedbackData();
    }, [fetchFeedbackData]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const getScoreColor = (score: number) => {
        if (score >= 9)
            return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        if (score >= 7)
            return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    };

    const detractors = responses.filter((r) => r.score <= 6);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">
                    Loading feedback data...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* NPS Overview */}
            <div className="grid gap-4 sm:grid-cols-5">
                <div className="rounded-lg border border-border bg-card p-4 sm:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">
                        NPS Score
                    </p>
                    <p
                        className={`mt-1 text-4xl font-bold ${
                            (metrics?.npsScore || 0) >= 50
                                ? "text-green-600 dark:text-green-400"
                                : (metrics?.npsScore || 0) >= 0
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400"
                        }`}
                    >
                        {metrics?.npsScore || 0}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Based on {metrics?.totalResponses || 0} responses
                    </p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        Promoters (9-10)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-400">
                        {metrics?.promoters || 0}
                    </p>
                </div>
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-950/30">
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        Passives (7-8)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                        {metrics?.passives || 0}
                    </p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        Detractors (0-6)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">
                        {metrics?.detractors || 0}
                    </p>
                </div>
            </div>

            {/* Detractor Alerts */}
            {detractors.length > 0 && (
                <div>
                    <h3 className="mb-4 font-semibold text-foreground">
                        Detractor Alerts
                    </h3>
                    <div className="space-y-3">
                        {detractors.slice(0, 5).map((response) => (
                            <div
                                key={response.id}
                                className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${getScoreColor(response.score)}`}
                                            >
                                                {response.score}
                                            </span>
                                            <span className="text-sm font-medium text-foreground">
                                                {response.userEmail}
                                            </span>
                                        </div>
                                        {response.feedback && (
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                &ldquo;{response.feedback}&rdquo;
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(response.createdAt)}
                                        </span>
                                        <Link
                                            href={`/settings/admin/users/${response.userId}`}
                                            className="text-sm text-primary hover:underline"
                                        >
                                            View User
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Responses */}
            <div>
                <h3 className="mb-4 font-semibold text-foreground">All Responses</h3>
                {responses.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-border">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Score
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Feedback
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {responses.map((response) => (
                                    <tr key={response.id}>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                                            <Link
                                                href={`/settings/admin/users/${response.userId}`}
                                                className="hover:underline"
                                            >
                                                {response.userEmail}
                                            </Link>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${getScoreColor(response.score)}`}
                                            >
                                                {response.score}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-muted-foreground">
                                            {response.surveyType}
                                        </td>
                                        <td className="max-w-xs truncate px-6 py-4 text-sm text-muted-foreground">
                                            {response.feedback || "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                                            {formatDate(response.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="rounded-lg border border-border bg-card p-8 text-center">
                        <p className="text-muted-foreground">
                            No NPS responses yet. Surveys are sent quarterly and at key
                            milestones.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
