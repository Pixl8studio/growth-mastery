"use client";

/**
 * Step 11: Analytics & Publish
 * View analytics and publish funnel
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Rocket, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface FunnelProject {
    id: string;
    name: string;
    current_step: number;
    status?: string;
}

interface FlowConfig {
    id: string;
    name: string;
}

interface RegistrationPage {
    id: string;
    public_id: string;
    vanity_slug?: string;
}

interface UserProfile {
    id: string;
    username?: string;
}

export default function Step11Page() {
    const params = useParams();
    const projectId = params.projectId as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);

    const [project, setProject] = useState<FunnelProject | null>(null);
    const [flows, setFlows] = useState<FlowConfig[]>([]);
    const [registrationPage, setRegistrationPage] = useState<RegistrationPage | null>(
        null
    );
    const [profile, setProfile] = useState<UserProfile | null>(null);

    const loadData = useCallback(async () => {
        try {
            const supabase = createClient();

            const { data: projectData } = await supabase
                .from("funnel_projects")
                .select("*")
                .eq("id", projectId)
                .single();

            setProject(projectData);

            const { data: flowsData } = await supabase
                .from("funnel_flows")
                .select("*")
                .eq("funnel_project_id", projectId);

            setFlows(flowsData || []);

            const { data: regPage } = await supabase
                .from("registration_pages")
                .select("*")
                .eq("funnel_project_id", projectId)
                .limit(1)
                .single();

            setRegistrationPage(regPage);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const { data: userProfile } = await supabase
                    .from("user_profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                setProfile(userProfile);
            }
        } catch (err) {
            logger.error({ error: err }, "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handlePublish = async () => {
        setPublishing(true);

        try {
            const supabase = createClient();

            // Update project status
            await supabase
                .from("funnel_projects")
                .update({ status: "active" })
                .eq("id", projectId);

            // Publish all pages
            await Promise.all([
                supabase
                    .from("registration_pages")
                    .update({ is_published: true })
                    .eq("funnel_project_id", projectId),
                supabase
                    .from("watch_pages")
                    .update({ is_published: true })
                    .eq("funnel_project_id", projectId),
                supabase
                    .from("enrollment_pages")
                    .update({ is_published: true })
                    .eq("funnel_project_id", projectId),
            ]);

            logger.info({ projectId }, "Funnel published");

            toast({
                title: "Funnel Published!",
                description: "Your funnel is now live and accepting leads.",
            });

            await loadData();
        } catch (err) {
            logger.error({ error: err }, "Failed to publish funnel");
            toast({
                title: "Publish Failed",
                description: "Could not publish funnel",
                variant: "destructive",
            });
        } finally {
            setPublishing(false);
        }
    };

    const copyPublicUrl = () => {
        if (registrationPage && profile) {
            const url = registrationPage.vanity_slug
                ? `${window.location.origin}/${profile.username}/${registrationPage.vanity_slug}`
                : `${window.location.origin}/${registrationPage.id}`;

            navigator.clipboard.writeText(url);

            toast({
                title: "URL Copied!",
                description: "Public funnel URL copied to clipboard",
            });
        }
    };

    const hasFlow = flows.length > 0;
    const isPublished = project?.status === "active";

    if (loading) {
        return (
            <StepLayout
                projectId={projectId}
                currentStep={11}
                stepTitle="Analytics & Publish"
                stepDescription="Loading..."
            >
                <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </StepLayout>
        );
    }

    return (
        <StepLayout
            projectId={projectId}
            currentStep={11}
            stepTitle="Analytics & Publish"
            stepDescription="View performance and publish your funnel"
            funnelName={project?.name}
            nextDisabled={false}
            nextLabel="Back to Dashboard"
            onNext={async () => {
                window.location.href = "/funnel-builder";
            }}
        >
            <div className="space-y-6">
                {!hasFlow && (
                    <DependencyWarning
                        missingStep={10}
                        missingStepName="Flow Configuration"
                        projectId={projectId}
                        message="Configure your funnel flow before publishing"
                    />
                )}

                {/* Analytics (Placeholder) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <BarChart3 className="mr-2 h-5 w-5 text-gray-600" />
                            Analytics Overview
                        </CardTitle>
                        <CardDescription>
                            Performance metrics for your funnel
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div>
                                <p className="text-sm text-gray-600">Registrations</p>
                                <p className="text-2xl font-bold text-gray-900">0</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Video Views</p>
                                <p className="text-2xl font-bold text-gray-900">0</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Enrollments</p>
                                <p className="text-2xl font-bold text-gray-900">0</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">$0</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Publish */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Rocket className="mr-2 h-5 w-5 text-gray-600" />
                            Publish Funnel
                        </CardTitle>
                        <CardDescription>
                            Make your funnel live and start accepting leads
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                                Status:
                            </span>
                            <Badge variant={isPublished ? "success" : "secondary"}>
                                {isPublished ? "Published" : "Draft"}
                            </Badge>
                        </div>

                        {isPublished && registrationPage && (
                            <div>
                                <p className="mb-2 text-sm font-medium text-gray-700">
                                    Public URL:
                                </p>
                                <div className="flex space-x-2">
                                    <Input
                                        value={
                                            registrationPage.vanity_slug
                                                ? `${window.location.origin}/${profile?.username}/${registrationPage.vanity_slug}`
                                                : `${window.location.origin}/${registrationPage.id}`
                                        }
                                        readOnly
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={copyPublicUrl}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handlePublish}
                            disabled={publishing || !hasFlow}
                            className="w-full"
                        >
                            {publishing
                                ? "Publishing..."
                                : isPublished
                                  ? "Update & Republish"
                                  : "Publish Funnel"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </StepLayout>
    );
}
