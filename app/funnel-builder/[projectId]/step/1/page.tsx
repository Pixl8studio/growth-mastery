"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { Phone, CheckCircle, Clock, MessageSquare } from "lucide-react";
import { VapiCallWidget } from "@/components/funnel/vapi-call-widget";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";

interface VapiTranscript {
    id: string;
    call_id: string;
    transcript_text: string;
    call_duration: number;
    call_status: string;
    created_at: string;
    extracted_data?: any;
}

interface FunnelProject {
    id: string;
    name: string;
    user_id: string;
}

export default function Step1Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<FunnelProject | null>(null);
    const [userId, setUserId] = useState("");
    const [transcripts, setTranscripts] = useState<VapiTranscript[]>([]);
    const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(true);

    // Load completion status
    const { completedSteps, refreshCompletion } = useStepCompletion(projectId);

    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setProjectId(resolved.projectId);
        };
        resolveParams();
    }, [params]);

    // Load project data
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
                setUserId(projectData.user_id);
            } catch (error) {
                logger.error({ error }, "Failed to load project");
            }
        };

        loadProject();
    }, [projectId]);

    // Load transcripts
    const loadTranscripts = async () => {
        if (!projectId) return;

        try {
            setIsLoadingTranscripts(true);
            const supabase = createClient();

            // Get all transcripts for this project
            const { data: transcriptData, error } = await supabase
                .from("vapi_transcripts")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            logger.info({ count: transcriptData?.length || 0 }, "Loaded transcripts");
            setTranscripts(transcriptData || []);
        } catch (error) {
            logger.error({ error }, "Failed to load transcripts");
        } finally {
            setIsLoadingTranscripts(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            loadTranscripts();
        }
    }, [projectId]);

    const hasCompletedCall = transcripts.length > 0;

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    if (!projectId || !userId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={1}
            projectId={projectId}
            funnelName={project?.name}
            completedSteps={completedSteps}
            nextDisabled={!hasCompletedCall}
            nextLabel={
                hasCompletedCall ? "Generate Deck Structure" : "Complete Call First"
            }
            stepTitle="AI Intake Call"
            stepDescription="Have a natural conversation with our AI assistant about your business"
        >
            <div className="space-y-8">
                {/* Instructions */}
                {!hasCompletedCall && (
                    <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-purple-50 p-8">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                                <Phone className="h-8 w-8 text-blue-600" />
                            </div>
                            <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                                Start Your AI Intake Call
                            </h2>
                            <p className="mx-auto max-w-lg text-gray-600">
                                Have a 15-20 minute conversation about your business. AI
                                will extract key insights to generate your complete
                                funnel.
                            </p>
                        </div>

                        <div className="mb-6 rounded-lg bg-blue-50 p-6">
                            <h3 className="mb-3 flex items-center text-lg font-semibold text-blue-900">
                                <span className="mr-2">💡</span> How this works
                            </h3>
                            <ul className="space-y-2 text-blue-800">
                                <li className="flex items-start">
                                    <span className="mr-2">1.</span>
                                    <span>
                                        Click the <strong>"🎙️ Start Call"</strong>{" "}
                                        button below
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">2.</span>
                                    <span>
                                        Have a natural conversation about your business
                                        and offer
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">3.</span>
                                    <span>
                                        Watch the conversation appear in real-time
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">4.</span>
                                    <span>
                                        Your transcript is automatically saved for
                                        funnel generation
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* VAPI Widget */}
                <VapiCallWidget
                    projectId={projectId}
                    userId={userId}
                    onCallComplete={() => {
                        loadTranscripts();
                        refreshCompletion();
                    }}
                />

                {/* Saved Calls List */}
                {hasCompletedCall && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">
                            Your Intake Calls
                        </h3>

                        {isLoadingTranscripts ? (
                            <div className="py-8 text-center text-gray-500">
                                Loading calls...
                            </div>
                        ) : transcripts.length === 0 ? (
                            <div className="py-8 text-center text-gray-500">
                                <MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-50" />
                                <p>No calls yet. Start your first call above!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {transcripts.map((transcript) => (
                                    <div
                                        key={transcript.id}
                                        className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-gray-300 hover:bg-gray-100"
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div
                                                    className={`h-3 w-3 rounded-full ${
                                                        transcript.call_status ===
                                                        "completed"
                                                            ? "bg-green-500"
                                                            : transcript.call_status ===
                                                                "in_progress"
                                                              ? "bg-blue-500"
                                                              : "bg-red-500"
                                                    }`}
                                                />
                                                <span className="font-medium text-gray-900">
                                                    {formatDate(transcript.created_at)}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="h-4 w-4" />
                                                    <span>
                                                        {formatDuration(
                                                            transcript.call_duration ||
                                                                0
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                    <span className="capitalize">
                                                        {transcript.call_status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {transcript.transcript_text && (
                                            <div className="mt-3">
                                                <details className="group">
                                                    <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                                                        View Transcript
                                                    </summary>
                                                    <div className="mt-3 max-h-64 overflow-y-auto rounded bg-white p-3 text-sm text-gray-700">
                                                        {transcript.transcript_text}
                                                    </div>
                                                </details>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* What's Next */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                        <span className="mr-2">👉</span> After This Call
                    </h3>
                    <p className="mb-3 text-sm text-gray-600">
                        Once you complete your intake call, the AI will:
                    </p>
                    <ul className="space-y-1 text-sm text-gray-600">
                        <li>• Extract key business insights from your conversation</li>
                        <li>• Identify your target audience and pain points</li>
                        <li>• Understand your offer and value proposition</li>
                        <li>
                            • Generate your complete 55-slide presentation structure
                        </li>
                    </ul>
                </div>
            </div>
        </StepLayout>
    );
}
