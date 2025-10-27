/**
 * Funnel Project Overview Page
 * Shows project details and step navigation
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
import { StepperNav } from "@/components/funnel/stepper-nav";
import { ProgressBar } from "@/components/funnel/progress-bar";
import { formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { getStepCompletionStatus } from "@/app/funnel-builder/completion-utils";
import { calculateCompletionPercentage } from "@/app/funnel-builder/completion-types";

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
            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                {/* Project Info */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {project.name}
                            </h1>
                            {project.description && (
                                <p className="mt-2 text-gray-600">
                                    {project.description}
                                </p>
                            )}
                        </div>
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

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                        {project.target_audience && (
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Target Audience
                                </p>
                                <p className="mt-1 text-sm text-gray-900">
                                    {project.target_audience}
                                </p>
                            </div>
                        )}
                        {project.business_niche && (
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Business Niche
                                </p>
                                <p className="mt-1 text-sm text-gray-900">
                                    {project.business_niche}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-medium text-gray-600">Created</p>
                            <p className="mt-1 text-sm text-gray-900">
                                {formatDate(project.created_at)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Progress</CardTitle>
                        <CardDescription>
                            {completionPercentage}% complete • {completedSteps.length}{" "}
                            of 11 steps done
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Visual Progress Bar */}
                        <div className="mb-6">
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700">
                                    Funnel Completion
                                </span>
                                <span className="font-bold text-blue-600">
                                    {completionPercentage}%
                                </span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                                    style={{ width: `${completionPercentage}%` }}
                                />
                            </div>
                        </div>

                        <div className="mt-6">
                            <Link
                                href={`/funnel-builder/${projectId}/step/${project.current_step}`}
                            >
                                <Button className="w-full">
                                    Continue from Step {project.current_step}
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Step Navigation */}
                <Card>
                    <CardHeader>
                        <CardTitle>Funnel Steps</CardTitle>
                        <CardDescription>
                            Click any step to jump directly to it
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <StepperNav
                            projectId={projectId}
                            currentStep={project.current_step}
                            completedSteps={completedSteps}
                        />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
