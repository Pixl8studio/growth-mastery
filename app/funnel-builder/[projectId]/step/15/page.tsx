"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { TrendingUp, Users, DollarSign } from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";

interface Analytics {
    registrations: number;
    views: number;
    conversions: number;
    revenue: number;
    watchRate?: number;
    enrollmentRate?: number;
    revenuePerRegistrant?: number;
}

export default function Step15Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<{ name?: string } | null>(null);
    const [analytics, setAnalytics] = useState<Analytics>({
        registrations: 0,
        views: 0,
        conversions: 0,
        revenue: 0,
        watchRate: 0,
        enrollmentRate: 0,
        revenuePerRegistrant: 0,
    });
    const [timeRange, setTimeRange] = useState("30");
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setProjectId(resolved.projectId);
        };
        resolveParams();
    }, [params]);

    useEffect(() => {
        const loadProject = async () => {
            if (!projectId) return;
            try {
                const supabase = createClient();
                const { data: projectData, error: projectError } = await supabase
                    .from("funnel_projects")
                    .select("*")
                    .eq("id", projectId)
                    .single();

                if (projectError) throw projectError;
                setProject(projectData);
            } catch (error) {
                logger.error({ error }, "Failed to load project");
            }
        };
        loadProject();
    }, [projectId]);

    useEffect(() => {
        const loadAnalytics = async () => {
            if (!projectId) return;

            setLoadingAnalytics(true);
            try {
                const response = await fetch(
                    `/api/analytics/funnel?project_id=${projectId}&time_range=${timeRange}`
                );
                const data = await response.json();

                if (response.ok) {
                    setAnalytics({
                        registrations: data.registrations,
                        views: data.views,
                        conversions: data.enrollments,
                        revenue: data.revenue,
                        watchRate: data.watchRate,
                        enrollmentRate: data.enrollmentRate,
                        revenuePerRegistrant: data.revenuePerRegistrant,
                    });
                } else {
                    logger.error({ error: data.error }, "Failed to load analytics");
                }
            } catch (error) {
                logger.error({ error }, "Failed to load analytics");
            } finally {
                setLoadingAnalytics(false);
            }
        };

        loadAnalytics();
    }, [projectId, timeRange]);

    const conversionRate = analytics.enrollmentRate?.toFixed(2) || "0.00";

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={15}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            stepTitle="Analytics & Performance"
            stepDescription="Track your funnel's performance and optimize for conversions"
        >
            <div className="space-y-8">
                <div className="rounded-lg border border-brand-100 bg-gradient-to-br from-brand-50 to-primary/5 p-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex flex-col items-end">
                            <label
                                htmlFor="timeRange"
                                className="text-sm font-medium text-foreground mb-2"
                            >
                                Time Range
                            </label>
                            <select
                                id="timeRange"
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="rounded-md border border-border bg-card px-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="7">Last 7 days</option>
                                <option value="30">Last 30 days</option>
                                <option value="90">Last 90 days</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loadingAnalytics && (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-muted-foreground">
                            Loading analytics...
                        </div>
                    </div>
                )}

                {!loadingAnalytics && (
                    <>
                        {/* Key Metrics */}
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-muted-foreground">
                                        Registrations
                                    </h3>
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div className="text-3xl font-bold text-foreground">
                                    {analytics.registrations.toLocaleString()}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Total sign-ups to date
                                </p>
                            </div>

                            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-muted-foreground">
                                        Video Views
                                    </h3>
                                    <TrendingUp className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="text-3xl font-bold text-foreground">
                                    {analytics.views.toLocaleString()}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Presentation watches
                                </p>
                            </div>

                            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-muted-foreground">
                                        Conversions
                                    </h3>
                                    <Users className="h-5 w-5 text-green-600" />
                                </div>
                                <div className="text-3xl font-bold text-foreground">
                                    {analytics.conversions.toLocaleString()}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {conversionRate}% conversion rate
                                </p>
                            </div>

                            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-muted-foreground">
                                        Revenue
                                    </h3>
                                    <DollarSign className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="text-3xl font-bold text-foreground">
                                    ${analytics.revenue.toLocaleString()}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Total generated
                                </p>
                            </div>
                        </div>

                        {/* Additional Metrics Row */}
                        <div className="grid gap-6 sm:grid-cols-3">
                            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    Watch Rate
                                </h3>
                                <div className="text-3xl font-bold text-foreground">
                                    {analytics.watchRate?.toFixed(1)}%
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Percentage of registrants who watched video
                                </p>
                            </div>

                            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    Enrollment Rate
                                </h3>
                                <div className="text-3xl font-bold text-foreground">
                                    {analytics.enrollmentRate?.toFixed(1)}%
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Percentage of viewers who viewed enrollment page
                                </p>
                            </div>

                            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    Revenue Per Registrant
                                </h3>
                                <div className="text-3xl font-bold text-foreground">
                                    ${analytics.revenuePerRegistrant?.toFixed(2)}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Average revenue generated per sign-up
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* Completion Message */}
                <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
                    <div className="mb-4 text-6xl">🎉</div>
                    <h2 className="mb-3 text-2xl font-bold text-green-900">
                        Congratulations! Your Funnel is Complete
                    </h2>
                    <p className="mx-auto max-w-2xl text-green-800">
                        You've successfully created your complete webinar funnel with
                        AI. All your pages are generated and ready to be published.
                        Track your performance here and optimize for better conversions.
                    </p>
                </div>
            </div>
        </StepLayout>
    );
}
