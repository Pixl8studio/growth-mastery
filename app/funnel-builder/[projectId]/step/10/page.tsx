"use client";

/**
 * Step 10: Flow Configuration
 * Connect pages into complete funnel flow
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { StepLayout } from "@/components/funnel/step-layout";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, CheckCircle } from "lucide-react";

interface FunnelProject {
    id: string;
    name: string;
    current_step: number;
}

interface RegistrationPage {
    id: string;
    headline: string;
}

interface WatchPage {
    id: string;
    headline: string;
}

interface EnrollmentPage {
    id: string;
    headline: string;
}

interface FunnelFlow {
    id: string;
    name: string;
}

export default function Step10Page() {
    const params = useParams();
    const projectId = params.projectId as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [project, setProject] = useState<FunnelProject | null>(null);
    const [registrationPages, setRegistrationPages] = useState<RegistrationPage[]>([]);
    const [watchPages, setWatchPages] = useState<WatchPage[]>([]);
    const [enrollmentPages, setEnrollmentPages] = useState<EnrollmentPage[]>([]);
    const [flow, setFlow] = useState<FunnelFlow | null>(null);

    const [flowName, setFlowName] = useState("");

    const loadData = useCallback(async () => {
        try {
            const supabase = createClient();

            const { data: projectData } = await supabase
                .from("funnel_projects")
                .select("*")
                .eq("id", projectId)
                .single();

            setProject(projectData);
            setFlowName(projectData.name + " Flow");

            const { data: regPages } = await supabase
                .from("registration_pages")
                .select("*")
                .eq("funnel_project_id", projectId);

            const { data: watchPagesData } = await supabase
                .from("watch_pages")
                .select("*")
                .eq("funnel_project_id", projectId);

            const { data: enrollPages } = await supabase
                .from("enrollment_pages")
                .select("*")
                .eq("funnel_project_id", projectId);

            setRegistrationPages(regPages || []);
            setWatchPages(watchPagesData || []);
            setEnrollmentPages(enrollPages || []);

            const { data: flowData } = await supabase
                .from("funnel_flows")
                .select("*")
                .eq("funnel_project_id", projectId)
                .limit(1)
                .single();

            if (flowData) {
                setFlow(flowData);
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

    const handleSaveFlow = async () => {
        setSaving(true);

        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            const flowData = {
                funnel_project_id: projectId,
                user_id: user.id,
                flow_name: flowName,
                registration_page_id: registrationPages[0]?.id,
                watch_page_id: watchPages[0]?.id,
                enrollment_page_id: enrollmentPages[0]?.id,
                page_sequence: ["registration", "watch", "enrollment"],
                routing_config: {
                    registrationToWatch: "auto",
                    watchToEnrollment: "button",
                },
                is_active: true,
            };

            if (flow) {
                await supabase.from("funnel_flows").update(flowData).eq("id", flow.id);
            } else {
                await supabase.from("funnel_flows").insert(flowData);
            }

            logger.info({ projectId }, "Funnel flow saved");
            await loadData();
        } catch (err) {
            logger.error({ error: err }, "Failed to save flow");
        } finally {
            setSaving(false);
        }
    };

    const hasAllPages =
        registrationPages.length > 0 &&
        watchPages.length > 0 &&
        enrollmentPages.length > 0;
    const hasFlow = !!flow;

    if (loading) {
        return (
            <StepLayout
                projectId={projectId}
                currentStep={10}
                stepTitle="Flow Configuration"
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
            currentStep={10}
            stepTitle="Flow Configuration"
            stepDescription="Connect your pages into a complete funnel"
            funnelName={project?.name}
            nextDisabled={!hasFlow}
            nextLabel="Continue to Analytics & Publish"
        >
            <div className="space-y-6">
                {!hasAllPages && (
                    <Card className="border-yellow-200 bg-yellow-50">
                        <CardContent className="py-6">
                            <p className="text-sm text-yellow-800">
                                You need to create all three page types before
                                configuring the flow:
                            </p>
                            <ul className="mt-3 space-y-1 text-sm text-yellow-700">
                                {registrationPages.length === 0 && (
                                    <li>• Registration Page (Step 9)</li>
                                )}
                                {watchPages.length === 0 && (
                                    <li>• Watch Page (Step 8)</li>
                                )}
                                {enrollmentPages.length === 0 && (
                                    <li>• Enrollment Page (Step 5)</li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                {hasAllPages && (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Funnel Flow</CardTitle>
                                <CardDescription>
                                    Your funnel page sequence
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 text-center">
                                        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                                            <CheckCircle className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">
                                            Registration
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Capture leads
                                        </p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-gray-400" />
                                    <div className="flex-1 text-center">
                                        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                            <CheckCircle className="h-6 w-6 text-green-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">
                                            Watch
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Show video
                                        </p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-gray-400" />
                                    <div className="flex-1 text-center">
                                        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                                            <CheckCircle className="h-6 w-6 text-purple-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">
                                            Enrollment
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Close sale
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Flow Name
                                    </label>
                                    <Input
                                        value={flowName}
                                        onChange={(e) => setFlowName(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>

                                <Button
                                    onClick={handleSaveFlow}
                                    disabled={saving || !flowName}
                                    className="mt-4 w-full"
                                >
                                    {saving
                                        ? "Saving..."
                                        : hasFlow
                                          ? "Update Flow"
                                          : "Create Flow"}
                                </Button>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </StepLayout>
    );
}
