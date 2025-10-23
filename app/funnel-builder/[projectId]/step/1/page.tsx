"use client";

/**
 * Step 1: AI Intake Call
 * VAPI-powered conversation to gather business information
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
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle, AlertCircle } from "lucide-react";

interface VapiTranscript {
    id: string;
    call_id: string;
    transcript_text: string;
    call_duration: number;
    call_status: string;
    created_at: string;
}

interface FunnelProject {
    id: string;
    name: string;
    current_step: number;
}

export default function Step1Page() {
    const params = useParams();
    const projectId = params.projectId as string;

    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState<FunnelProject | null>(null);
    const [transcript, setTranscript] = useState<VapiTranscript | null>(null);
    const [callInProgress, setCallInProgress] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const supabase = createClient();

            // Get project
            const { data: projectData, error: projectError } = await supabase
                .from("funnel_projects")
                .select("*")
                .eq("id", projectId)
                .single();

            if (projectError) throw projectError;
            setProject(projectData);

            // Get latest transcript for this project
            const { data: transcriptData } = await supabase
                .from("vapi_transcripts")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (transcriptData) {
                setTranscript(transcriptData);
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

    const handleStartCall = async () => {
        setCallInProgress(true);
        logger.info({ projectId }, "Initiating VAPI call");

        try {
            // TODO: Implement actual VAPI call initiation
            // For now, this is a placeholder
            // const response = await fetch('/api/vapi/initiate-call', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ projectId })
            // });

            logger.info({}, "VAPI call initiated");
        } catch (err) {
            logger.error({ error: err }, "Failed to start call");
        } finally {
            setCallInProgress(false);
        }
    };

    const hasCompletedCall = transcript && transcript.call_status === "completed";

    if (loading) {
        return (
            <StepLayout
                projectId={projectId}
                currentStep={1}
                stepTitle="AI Intake Call"
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
            currentStep={1}
            stepTitle="AI Intake Call"
            stepDescription="Have a natural conversation with our AI assistant about your business"
            funnelName={project?.name}
            nextDisabled={!hasCompletedCall}
            nextLabel={
                hasCompletedCall ? "Continue to Craft Offer" : "Complete Call First"
            }
        >
            <div className="space-y-6">
                {hasCompletedCall ? (
                    // Call Completed State
                    <Card className="border-green-200 bg-green-50">
                        <CardHeader>
                            <div className="flex items-center">
                                <CheckCircle className="mr-3 h-6 w-6 text-green-600" />
                                <div>
                                    <CardTitle className="text-green-900">
                                        Call Complete!
                                    </CardTitle>
                                    <CardDescription className="text-green-700">
                                        Your intake call has been saved and processed
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-green-700">
                                        Call Duration:
                                    </span>
                                    <span className="font-medium text-green-900">
                                        {Math.floor(
                                            (transcript.call_duration || 0) / 60
                                        )}{" "}
                                        minutes
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-green-700">Completed:</span>
                                    <span className="font-medium text-green-900">
                                        {new Date(
                                            transcript.created_at
                                        ).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Transcript Preview */}
                            {transcript.transcript_text && (
                                <div className="mt-4">
                                    <p className="mb-2 text-sm font-semibold text-green-900">
                                        Transcript Preview:
                                    </p>
                                    <div className="max-h-40 overflow-y-auto rounded-md bg-white p-3">
                                        <p className="text-sm text-gray-700">
                                            {transcript.transcript_text.substring(
                                                0,
                                                500
                                            )}
                                            {transcript.transcript_text.length > 500 &&
                                                "..."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleStartCall}
                                >
                                    Start New Call
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    // Call Not Started State
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>How It Works</CardTitle>
                                <CardDescription>
                                    Our AI will have a natural conversation with you
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ol className="space-y-3 text-sm text-gray-700">
                                    <li className="flex items-start">
                                        <span className="mr-3 font-bold text-blue-600">
                                            1.
                                        </span>
                                        <span>
                                            Click "Start AI Call" to begin a
                                            conversation with our AI assistant
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-3 font-bold text-blue-600">
                                            2.
                                        </span>
                                        <span>
                                            The AI will ask you about your business,
                                            target audience, and goals
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-3 font-bold text-blue-600">
                                            3.
                                        </span>
                                        <span>
                                            Have a natural conversation - the AI adapts
                                            to your responses
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-3 font-bold text-blue-600">
                                            4.
                                        </span>
                                        <span>
                                            The call typically takes 10-15 minutes
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-3 font-bold text-blue-600">
                                            5.
                                        </span>
                                        <span>
                                            We'll automatically transcribe and extract
                                            key information
                                        </span>
                                    </li>
                                </ol>
                            </CardContent>
                        </Card>

                        {/* Call Widget */}
                        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                            <CardContent className="pt-12 pb-12 text-center">
                                <div className="mx-auto mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-blue-100">
                                    <Phone className="h-12 w-12 text-blue-600" />
                                </div>
                                <h3 className="mb-2 text-2xl font-bold text-gray-900">
                                    Ready to Start Your AI Intake Call?
                                </h3>
                                <p className="mb-6 text-gray-600">
                                    This conversation will help us understand your
                                    business and create a customized funnel
                                </p>

                                <Button
                                    size="lg"
                                    onClick={handleStartCall}
                                    disabled={callInProgress}
                                    className="min-w-[200px]"
                                >
                                    {callInProgress ? (
                                        <>Starting Call...</>
                                    ) : (
                                        <>
                                            <Phone className="mr-2 h-5 w-5" />
                                            Start AI Call
                                        </>
                                    )}
                                </Button>

                                {callInProgress && (
                                    <div className="mt-4">
                                        <Badge variant="default">
                                            Call in progress...
                                        </Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Info Card */}
                        <Card>
                            <CardContent className="py-4">
                                <div className="flex items-start">
                                    <AlertCircle className="mr-3 h-5 w-5 text-blue-600" />
                                    <div className="text-sm text-gray-700">
                                        <p className="font-medium text-gray-900">
                                            Note:
                                        </p>
                                        <p className="mt-1">
                                            The AI will ask about your business, offer,
                                            target audience, pricing, and goals. The
                                            more detailed you are, the better your
                                            funnel will be.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </StepLayout>
    );
}
