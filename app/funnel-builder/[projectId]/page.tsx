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
import { ArrowLeft, Settings, Play } from "lucide-react";

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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link
                                href="/funnel-builder"
                                className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                All Funnels
                            </Link>
                        </div>
                        <div className="flex items-center space-x-3">
                            {project.status === "active" && (
                                <Link href={`/funnel-builder/${projectId}/analytics`}>
                                    <Button variant="outline" size="sm">
                                        <Play className="mr-2 h-4 w-4" />
                                        View Live Funnel
                                    </Button>
                                </Link>
                            )}
                            <Button variant="outline" size="sm">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

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
                            You're on step {project.current_step} of 11
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProgressBar currentStep={project.current_step} />
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
                            completedSteps={[]}
                        />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
