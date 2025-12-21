"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { Check, AlertCircle, ArrowRight } from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface FlowSetup {
    hasWatchPage: boolean;
    hasEnrollmentPage: boolean;
    hasRegistrationPage: boolean;
    watchPagePublished: boolean;
    enrollmentPagePublished: boolean;
    registrationPagePublished: boolean;
    watchPageId: string | null;
    enrollmentPageId: string | null;
    registrationPageId: string | null;
}

interface FunnelFlow {
    id: string;
    flow_name: string;
    status: string;
    created_at: string;
}

export default function Step10Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [flowSetup, setFlowSetup] = useState<FlowSetup>({
        hasWatchPage: false,
        hasEnrollmentPage: false,
        hasRegistrationPage: false,
        watchPagePublished: false,
        enrollmentPagePublished: false,
        registrationPagePublished: false,
        watchPageId: null,
        enrollmentPageId: null,
        registrationPageId: null,
    });
    const [flow, setFlow] = useState<FunnelFlow | null>(null);
    const [isCreatingFlow, setIsCreatingFlow] = useState(false);

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
        const loadFlowSetup = async () => {
            if (!projectId) return;
            try {
                const supabase = createClient();
                const [watchResult, enrollmentResult, registrationResult, flowResult] =
                    await Promise.all([
                        supabase
                            .from("watch_pages")
                            .select("id, is_published")
                            .eq("funnel_project_id", projectId)
                            .limit(1)
                            .single(),
                        supabase
                            .from("enrollment_pages")
                            .select("id, is_published")
                            .eq("funnel_project_id", projectId)
                            .limit(1)
                            .single(),
                        supabase
                            .from("registration_pages")
                            .select("id, is_published")
                            .eq("funnel_project_id", projectId)
                            .limit(1)
                            .single(),
                        supabase
                            .from("funnel_flows")
                            .select("*")
                            .eq("funnel_project_id", projectId)
                            .limit(1)
                            .single(),
                    ]);

                setFlowSetup({
                    hasWatchPage: !!watchResult.data,
                    hasEnrollmentPage: !!enrollmentResult.data,
                    hasRegistrationPage: !!registrationResult.data,
                    watchPagePublished: watchResult.data?.is_published || false,
                    enrollmentPagePublished:
                        enrollmentResult.data?.is_published || false,
                    registrationPagePublished:
                        registrationResult.data?.is_published || false,
                    watchPageId: watchResult.data?.id || null,
                    enrollmentPageId: enrollmentResult.data?.id || null,
                    registrationPageId: registrationResult.data?.id || null,
                });

                if (flowResult.data) {
                    setFlow(flowResult.data);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load flow setup");
            }
        };
        loadFlowSetup();
    }, [projectId]);

    // Auto-create flow when all pages are published
    useEffect(() => {
        const createFlowIfReady = async () => {
            if (!projectId || !project || flow || isCreatingFlow) return;

            const allPagesPublished =
                flowSetup.watchPagePublished &&
                flowSetup.enrollmentPagePublished &&
                flowSetup.registrationPagePublished;

            if (!allPagesPublished) return;

            setIsCreatingFlow(true);
            try {
                const supabase = createClient();
                const { data: user } = await supabase.auth.getUser();

                if (!user.user) {
                    logger.error({}, "No user found when creating flow");
                    return;
                }

                const { data: newFlow, error } = await supabase
                    .from("funnel_flows")
                    .insert({
                        funnel_project_id: projectId,
                        user_id: user.user.id,
                        flow_name: project.name || "Main Flow",
                        registration_page_id: flowSetup.registrationPageId,
                        watch_page_id: flowSetup.watchPageId,
                        enrollment_page_id: flowSetup.enrollmentPageId,
                        status: "connected",
                        is_active: true,
                    })
                    .select()
                    .single();

                if (error) throw error;

                setFlow(newFlow);
                logger.info({ flowId: newFlow.id }, "Funnel flow auto-created");
            } catch (error) {
                logger.error({ error }, "Failed to auto-create flow");
            } finally {
                setIsCreatingFlow(false);
            }
        };

        createFlowIfReady();
    }, [projectId, project, flowSetup, flow, isCreatingFlow]);

    const allPagesCreated =
        flowSetup.hasWatchPage &&
        flowSetup.hasEnrollmentPage &&
        flowSetup.hasRegistrationPage;

    const allPagesPublished =
        flowSetup.watchPagePublished &&
        flowSetup.enrollmentPagePublished &&
        flowSetup.registrationPagePublished;

    const missingPages = [];
    if (!flowSetup.hasRegistrationPage) {
        missingPages.push({ name: "Registration Page", step: 9 });
    }
    if (!flowSetup.hasWatchPage) {
        missingPages.push({ name: "Watch Page", step: 8 });
    }
    if (!flowSetup.hasEnrollmentPage) {
        missingPages.push({ name: "Enrollment Page", step: 7 });
    }

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={10}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            nextDisabled={!allPagesCreated}
            nextLabel={
                allPagesCreated ? "Configure AI Follow-Up" : "Complete All Pages First"
            }
            stepTitle="Flow Setup"
            stepDescription="Connect your funnel pages together"
        >
            <div className="space-y-8">
                {/* Dependency Warnings */}
                {missingPages.length > 0 && (
                    <div className="space-y-3">
                        {missingPages.map((page) => (
                            <DependencyWarning
                                key={page.step}
                                message={`You need to create a ${page.name} (Step ${page.step})`}
                                requiredStep={page.step}
                                requiredStepName={page.name}
                                projectId={projectId}
                            />
                        ))}
                    </div>
                )}

                <div className="rounded-lg border border-slate-100 bg-gradient-to-br from-slate-50 to-gray-50 p-8">
                    <TooltipProvider>
                        <div className="mx-auto max-w-2xl space-y-4">
                            {/* Registration Page */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className={`cursor-help rounded-lg border p-6 transition-all ${
                                            flowSetup.hasRegistrationPage
                                                ? flowSetup.registrationPagePublished
                                                    ? "border-green-300 bg-green-50"
                                                    : "border-yellow-300 bg-yellow-50"
                                                : "border-border bg-card"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="mb-2 text-lg font-semibold text-foreground">
                                                    1. Registration Page
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Lead capture page where prospects
                                                    sign up for your webinar
                                                </p>
                                            </div>
                                            {flowSetup.hasRegistrationPage ? (
                                                flowSetup.registrationPagePublished ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Check className="h-6 w-6 text-green-600" />
                                                        <span className="text-xs font-medium text-green-700">
                                                            Live
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Check className="h-6 w-6 text-yellow-600" />
                                                        <span className="text-xs font-medium text-yellow-700">
                                                            Draft
                                                        </span>
                                                    </div>
                                                )
                                            ) : (
                                                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">
                                        Captures leads and collects contact information
                                    </p>
                                </TooltipContent>
                            </Tooltip>

                            <div className="flex justify-center">
                                <ArrowRight className="h-8 w-8 rotate-90 text-gray-300" />
                            </div>

                            {/* Watch Page */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className={`cursor-help rounded-lg border p-6 transition-all ${
                                            flowSetup.hasWatchPage
                                                ? flowSetup.watchPagePublished
                                                    ? "border-green-300 bg-green-50"
                                                    : "border-yellow-300 bg-yellow-50"
                                                : "border-border bg-card"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="mb-2 text-lg font-semibold text-foreground">
                                                    2. Watch Page
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Video landing page where prospects
                                                    watch your presentation
                                                </p>
                                            </div>
                                            {flowSetup.hasWatchPage ? (
                                                flowSetup.watchPagePublished ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Check className="h-6 w-6 text-green-600" />
                                                        <span className="text-xs font-medium text-green-700">
                                                            Live
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Check className="h-6 w-6 text-yellow-600" />
                                                        <span className="text-xs font-medium text-yellow-700">
                                                            Draft
                                                        </span>
                                                    </div>
                                                )
                                            ) : (
                                                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">
                                        Presents video training and builds value
                                    </p>
                                </TooltipContent>
                            </Tooltip>

                            <div className="flex justify-center">
                                <ArrowRight className="h-8 w-8 rotate-90 text-gray-300" />
                            </div>

                            {/* Enrollment Page */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className={`cursor-help rounded-lg border p-6 transition-all ${
                                            flowSetup.hasEnrollmentPage
                                                ? flowSetup.enrollmentPagePublished
                                                    ? "border-green-300 bg-green-50"
                                                    : "border-yellow-300 bg-yellow-50"
                                                : "border-border bg-card"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="mb-2 text-lg font-semibold text-foreground">
                                                    3. Enrollment Page
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Sales page where prospects purchase
                                                    your offer
                                                </p>
                                            </div>
                                            {flowSetup.hasEnrollmentPage ? (
                                                flowSetup.enrollmentPagePublished ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Check className="h-6 w-6 text-green-600" />
                                                        <span className="text-xs font-medium text-green-700">
                                                            Live
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Check className="h-6 w-6 text-yellow-600" />
                                                        <span className="text-xs font-medium text-yellow-700">
                                                            Draft
                                                        </span>
                                                    </div>
                                                )
                                            ) : (
                                                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">
                                        Converts viewers into customers
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>

                    {/* Flow Status Messages */}
                    {allPagesCreated && (
                        <div className="mt-8">
                            {flow ? (
                                <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
                                    <Check className="mx-auto mb-3 h-12 w-12 text-green-600" />
                                    <h3 className="mb-2 text-xl font-semibold text-green-900">
                                        Funnel Flow Connected!
                                    </h3>
                                    <p className="text-green-800">
                                        Your funnel flow has been created with status:{" "}
                                        {flow.status}. All pages are linked and ready
                                        for automation.
                                    </p>
                                </div>
                            ) : allPagesPublished ? (
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center">
                                    <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
                                    <h3 className="mb-2 text-xl font-semibold text-primary">
                                        Creating Your Flow...
                                    </h3>
                                    <p className="text-primary">
                                        Connecting your pages automatically.
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
                                    <AlertCircle className="mx-auto mb-3 h-12 w-12 text-yellow-600" />
                                    <h3 className="mb-2 text-xl font-semibold text-yellow-900">
                                        Publish All Pages to Connect Flow
                                    </h3>
                                    <p className="text-yellow-800">
                                        Return to Steps 5, 8, and 9 to publish your
                                        pages. Once all pages are published, your funnel
                                        flow will be created automatically.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </StepLayout>
    );
}
