"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import {
    Phone,
    Clock,
    MessageSquare,
    Upload,
    FileText,
    Globe,
    Cloud,
} from "lucide-react";
import { VapiCallWidget } from "@/components/funnel/vapi-call-widget";
import {
    IntakeMethodSelector,
    type IntakeMethod,
} from "@/components/intake/intake-method-selector";
import { PasteIntake } from "@/components/intake/paste-intake";
import { UploadIntake } from "@/components/intake/upload-intake";
import { ScrapeIntake } from "@/components/intake/scrape-intake";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";

interface IntakeSession {
    id: string;
    call_id: string;
    transcript_text: string;
    call_duration: number;
    call_status: string;
    created_at: string;
    extracted_data?: unknown;
    intake_method: string;
    session_name?: string;
    file_urls?: string[];
    scraped_url?: string;
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
    const [intakeSessions, setIntakeSessions] = useState<IntakeSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [selectedMethod, setSelectedMethod] = useState<IntakeMethod | null>(null);

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

    // Load intake sessions
    const loadIntakeSessions = async () => {
        if (!projectId) return;

        try {
            setIsLoadingSessions(true);
            const supabase = createClient();

            // Get all intake sessions for this project
            const { data: sessionData, error } = await supabase
                .from("vapi_transcripts")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            logger.info({ count: sessionData?.length || 0 }, "Loaded intake sessions");
            setIntakeSessions(sessionData || []);
        } catch (error) {
            logger.error({ error }, "Failed to load intake sessions");
        } finally {
            setIsLoadingSessions(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            loadIntakeSessions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const hasCompletedIntake = intakeSessions.length > 0;

    const handleIntakeComplete = () => {
        setSelectedMethod(null); // Reset method selection
        loadIntakeSessions();
        refreshCompletion();
    };

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
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    const getMethodIcon = (method: string) => {
        switch (method) {
            case "voice":
                return <Phone className="h-4 w-4" />;
            case "upload":
                return <Upload className="h-4 w-4" />;
            case "paste":
                return <FileText className="h-4 w-4" />;
            case "scrape":
                return <Globe className="h-4 w-4" />;
            case "google_drive":
                return <Cloud className="h-4 w-4" />;
            default:
                return <MessageSquare className="h-4 w-4" />;
        }
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case "voice":
                return "Voice Call";
            case "upload":
                return "Document Upload";
            case "paste":
                return "Pasted Content";
            case "scrape":
                return "Web Scraping";
            case "google_drive":
                return "Google Drive";
            default:
                return "Unknown";
        }
    };

    return (
        <StepLayout
            currentStep={1}
            projectId={projectId}
            funnelName={project?.name}
            completedSteps={completedSteps}
            nextDisabled={!hasCompletedIntake}
            nextLabel={
                hasCompletedIntake ? "Generate Deck Structure" : "Complete Intake First"
            }
            stepTitle="Intake"
            stepDescription="Provide your business information through voice, documents, or other methods"
        >
            <div className="space-y-8">
                {/* Method Selector or Active Method Interface */}
                {!selectedMethod ? (
                    <IntakeMethodSelector
                        onSelectMethod={setSelectedMethod}
                        selectedMethod={selectedMethod || undefined}
                    />
                ) : (
                    <div className="space-y-4">
                        {/* Back Button */}
                        <button
                            onClick={() => setSelectedMethod(null)}
                            className="text-sm text-primary hover:text-primary"
                        >
                            ← Choose a different method
                        </button>

                        {/* Conditional Rendering Based on Selected Method */}
                        {selectedMethod === "voice" && (
                            <VapiCallWidget
                                projectId={projectId}
                                userId={userId}
                                onCallComplete={handleIntakeComplete}
                            />
                        )}

                        {selectedMethod === "paste" && (
                            <PasteIntake
                                projectId={projectId}
                                userId={userId}
                                onComplete={handleIntakeComplete}
                            />
                        )}

                        {selectedMethod === "upload" && (
                            <UploadIntake
                                projectId={projectId}
                                userId={userId}
                                onComplete={handleIntakeComplete}
                            />
                        )}

                        {selectedMethod === "scrape" && (
                            <ScrapeIntake
                                projectId={projectId}
                                userId={userId}
                                onComplete={handleIntakeComplete}
                            />
                        )}

                        {selectedMethod === "google_drive" && (
                            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center">
                                <Cloud className="mx-auto mb-4 h-16 w-16 text-yellow-600" />
                                <h3 className="mb-2 text-xl font-semibold text-foreground">
                                    Google Drive Integration Coming Soon
                                </h3>
                                <p className="mb-4 text-muted-foreground">
                                    We're working on bringing Google Drive integration
                                    to make it even easier to import your documents.
                                    Check back soon!
                                </p>
                                <button
                                    onClick={() => setSelectedMethod(null)}
                                    className="text-sm text-primary hover:text-primary"
                                >
                                    ← Choose a different method
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Intake Sessions List */}
                {hasCompletedIntake && (
                    <div className="rounded-lg border border-border bg-card p-6">
                        <h3 className="mb-4 text-lg font-semibold text-foreground">
                            Your Intake Sessions
                        </h3>

                        {isLoadingSessions ? (
                            <div className="py-8 text-center text-muted-foreground">
                                Loading sessions...
                            </div>
                        ) : intakeSessions.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-50" />
                                <p>
                                    No intake sessions yet. Choose a method above to get
                                    started!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {intakeSessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="rounded-lg border border-border bg-muted/50 p-4 transition-all hover:border-border hover:bg-muted"
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div
                                                    className={`h-3 w-3 rounded-full ${
                                                        session.call_status ===
                                                        "completed"
                                                            ? "bg-green-500"
                                                            : session.call_status ===
                                                                "in_progress"
                                                              ? "bg-primary/50"
                                                              : "bg-red-500"
                                                    }`}
                                                />
                                                {getMethodIcon(
                                                    session.intake_method || "voice"
                                                )}
                                                <span className="font-medium text-foreground">
                                                    {session.session_name ||
                                                        formatDate(session.created_at)}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                                    {getMethodLabel(
                                                        session.intake_method || "voice"
                                                    )}
                                                </span>
                                                {session.intake_method === "voice" &&
                                                    session.call_duration > 0 && (
                                                        <div className="flex items-center space-x-1">
                                                            <Clock className="h-4 w-4" />
                                                            <span>
                                                                {formatDuration(
                                                                    session.call_duration
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                            </div>
                                        </div>

                                        {/* Additional Info Based on Method */}
                                        {session.scraped_url && (
                                            <p className="mb-2 text-xs text-muted-foreground">
                                                Source: {session.scraped_url}
                                            </p>
                                        )}

                                        {session.file_urls &&
                                            session.file_urls.length > 0 && (
                                                <p className="mb-2 text-xs text-muted-foreground">
                                                    {session.file_urls.length}{" "}
                                                    {session.file_urls.length === 1
                                                        ? "file"
                                                        : "files"}{" "}
                                                    uploaded
                                                </p>
                                            )}

                                        {session.transcript_text && (
                                            <div className="mt-3">
                                                <details className="group">
                                                    <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary">
                                                        View Content
                                                    </summary>
                                                    <div className="mt-3 max-h-64 overflow-y-auto rounded bg-card p-3 text-sm text-foreground">
                                                        {session.transcript_text.substring(
                                                            0,
                                                            500
                                                        )}
                                                        {session.transcript_text
                                                            .length > 500 && "..."}
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
                <div className="rounded-lg border border-border bg-muted/50 p-6">
                    <h3 className="mb-3 flex items-center text-sm font-semibold text-foreground">
                        <span className="mr-2">👉</span> After Intake
                    </h3>
                    <p className="mb-3 text-sm text-muted-foreground">
                        Once you complete your intake, the AI will:
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
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
