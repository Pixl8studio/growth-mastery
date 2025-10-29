/**
 * Funnel Project Dashboard Page
 *
 * Comprehensive dashboard showing horizontal progress stepper and analytics.
 * Provides at-a-glance view of funnel completion status and performance metrics.
 */

import { getCurrentUserWithProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HorizontalProgress } from "@/components/funnel/horizontal-progress";
import { Header } from "@/components/layout/header";
import { getStepCompletionStatus } from "@/app/funnel-builder/completion-utils";
import { calculateCompletionPercentage } from "@/app/funnel-builder/completion-types";
import { FunnelAnalyticsDashboard } from "@/components/funnel/analytics-dashboard";

interface PageProps {
    params: Promise<{
        projectId: string;
    }>;
}

export default async function FunnelProjectPage({ params }: PageProps) {
    const { projectId } = await params;
    const { user } = await getCurrentUserWithProfile();
    const supabase = await createClient();

    // Fetch project
    const { data: project, error } = await supabase
        .from("funnel_projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

    if (error || !project) {
        notFound();
    }

    // Get completion status
    const completionStatus = await getStepCompletionStatus(projectId);
    const completionPercentage = calculateCompletionPercentage(completionStatus);
    const completedSteps = completionStatus
        .filter((s) => s.isCompleted)
        .map((s) => s.step);

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Project Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {project.name}
                        </h1>
                        <Badge
                            variant={
                                project.status === "active"
                                    ? "success"
                                    : project.status === "archived"
                                      ? "secondary"
                                      : "default"
                            }
                        >
                            {project.status}
                        </Badge>
                    </div>
                </div>

                {/* Horizontal Progress Stepper */}
                <Card className="mb-8">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Funnel Progress</CardTitle>
                                <CardDescription>
                                    {completedSteps.length} of 12 steps complete •{" "}
                                    {completionPercentage}% done
                                </CardDescription>
                            </div>
                            <Link
                                href={`/funnel-builder/${projectId}/step/${project.current_step}`}
                            >
                                <Button>Build Funnel</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <HorizontalProgress
                            projectId={projectId}
                            currentStep={project.current_step}
                            completedSteps={completedSteps}
                        />
                    </CardContent>
                </Card>

                {/* Analytics Dashboard */}
                <Card>
                    <CardHeader>
                        <CardTitle>Performance Dashboard</CardTitle>
                        <CardDescription>
                            Track your funnel's performance and conversion metrics
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FunnelAnalyticsDashboard projectId={projectId} />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
