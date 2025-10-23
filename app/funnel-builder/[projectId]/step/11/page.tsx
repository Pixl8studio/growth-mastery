"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { BarChart3, TrendingUp, Users, DollarSign, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";

interface Analytics {
    registrations: number;
    views: number;
    conversions: number;
    revenue: number;
}

export default function Step11Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [analytics, setAnalytics] = useState<Analytics>({
        registrations: 0,
        views: 0,
        conversions: 0,
        revenue: 0,
    });
    const [publishing, setPublishing] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [registrationPage, setRegistrationPage] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const { toast } = useToast();

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

            setIsPublished(true);
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
                : `${window.location.origin}/p/${registrationPage.id}`;

            navigator.clipboard.writeText(url);

            toast({
                title: "URL Copied!",
                description: "Public funnel URL copied to clipboard",
            });
        }
    };

    const conversionRate =
        analytics.views > 0
            ? ((analytics.conversions / analytics.views) * 100).toFixed(2)
            : "0.00";

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={11}
            projectId={projectId}
            funnelName={project?.name}
            stepTitle="Analytics & Performance"
            stepDescription="Track your funnel's performance and optimize for conversions"
        >
            <div className="space-y-8">
                <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                            <BarChart3 className="h-8 w-8 text-blue-600" />
                        </div>
                        <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                            Funnel Analytics
                        </h2>
                        <p className="mx-auto max-w-lg text-gray-600">
                            Monitor key metrics and optimize your funnel for better
                            performance.
                        </p>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-600">
                                Registrations
                            </h3>
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                            {analytics.registrations.toLocaleString()}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            Total sign-ups to date
                        </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-600">
                                Video Views
                            </h3>
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                            {analytics.views.toLocaleString()}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            Presentation watches
                        </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-600">
                                Conversions
                            </h3>
                            <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                            {analytics.conversions.toLocaleString()}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            {conversionRate}% conversion rate
                        </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-600">
                                Revenue
                            </h3>
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                            ${analytics.revenue.toLocaleString()}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Total generated</p>
                    </div>
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
                                        : `${window.location.origin}/p/${registrationPage.id}`
                                }
                                readOnly
                                className="flex-1"
                            />
                            <Button variant="outline" size="sm" onClick={copyPublicUrl}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
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
