"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { Link2, Check, AlertCircle } from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";

interface FlowSetup {
    hasWatchPage: boolean;
    hasEnrollmentPage: boolean;
    hasRegistrationPage: boolean;
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
    });

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
                const [watchResult, enrollmentResult, registrationResult] =
                    await Promise.all([
                        supabase
                            .from("watch_pages")
                            .select("id")
                            .eq("funnel_project_id", projectId),
                        supabase
                            .from("enrollment_pages")
                            .select("id")
                            .eq("funnel_project_id", projectId),
                        supabase
                            .from("registration_pages")
                            .select("id")
                            .eq("funnel_project_id", projectId),
                    ]);

                setFlowSetup({
                    hasWatchPage: (watchResult.data?.length || 0) > 0,
                    hasEnrollmentPage: (enrollmentResult.data?.length || 0) > 0,
                    hasRegistrationPage: (registrationResult.data?.length || 0) > 0,
                });
            } catch (error) {
                logger.error({ error }, "Failed to load flow setup");
            }
        };
        loadFlowSetup();
    }, [projectId]);

    const allPagesCreated =
        flowSetup.hasWatchPage &&
        flowSetup.hasEnrollmentPage &&
        flowSetup.hasRegistrationPage;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={10}
            projectId={projectId}
            funnelName={project?.name}
            nextDisabled={!allPagesCreated}
            nextLabel={allPagesCreated ? "View Analytics" : "Complete All Pages First"}
            stepTitle="Flow Setup"
            stepDescription="Connect your funnel pages together"
        >
            <div className="space-y-8">
                {!allPagesCreated && (
                    <DependencyWarning
                        message="Complete all previous steps to setup your funnel flow."
                        requiredStep={9}
                        requiredStepName="Registration Page"
                        projectId={projectId}
                    />
                )}

                <div className="rounded-lg border border-slate-100 bg-gradient-to-br from-slate-50 to-gray-50 p-8">
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                            <Link2 className="h-8 w-8 text-slate-600" />
                        </div>
                        <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                            Funnel Flow Setup
                        </h2>
                        <p className="mx-auto max-w-lg text-gray-600">
                            Connect your pages to create a seamless user journey through
                            your funnel.
                        </p>
                    </div>

                    <div className="mx-auto max-w-2xl space-y-4">
                        {/* Registration Page */}
                        <div
                            className={`rounded-lg border p-6 ${
                                flowSetup.hasRegistrationPage
                                    ? "border-green-200 bg-green-50"
                                    : "border-gray-200 bg-white"
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                                        1. Registration Page
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Lead capture page where prospects sign up for
                                        your webinar
                                    </p>
                                </div>
                                {flowSetup.hasRegistrationPage ? (
                                    <Check className="h-6 w-6 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-6 w-6 text-gray-400" />
                                )}
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <div className="h-8 w-0.5 bg-gray-300"></div>
                        </div>

                        {/* Watch Page */}
                        <div
                            className={`rounded-lg border p-6 ${
                                flowSetup.hasWatchPage
                                    ? "border-green-200 bg-green-50"
                                    : "border-gray-200 bg-white"
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                                        2. Watch Page
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Video landing page where prospects watch your
                                        presentation
                                    </p>
                                </div>
                                {flowSetup.hasWatchPage ? (
                                    <Check className="h-6 w-6 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-6 w-6 text-gray-400" />
                                )}
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <div className="h-8 w-0.5 bg-gray-300"></div>
                        </div>

                        {/* Enrollment Page */}
                        <div
                            className={`rounded-lg border p-6 ${
                                flowSetup.hasEnrollmentPage
                                    ? "border-green-200 bg-green-50"
                                    : "border-gray-200 bg-white"
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                                        3. Enrollment Page
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Sales page where prospects purchase your offer
                                    </p>
                                </div>
                                {flowSetup.hasEnrollmentPage ? (
                                    <Check className="h-6 w-6 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-6 w-6 text-gray-400" />
                                )}
                            </div>
                        </div>
                    </div>

                    {allPagesCreated && (
                        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
                            <Check className="mx-auto mb-3 h-12 w-12 text-green-600" />
                            <h3 className="mb-2 text-xl font-semibold text-green-900">
                                Funnel Flow Complete!
                            </h3>
                            <p className="text-green-800">
                                All pages are created and ready to be connected. Proceed
                                to analytics to track your funnel performance.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </StepLayout>
    );
}
