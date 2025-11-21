"use client";

import { useState, useEffect, useRef } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import {
    Phone,
    Clock,
    MessageSquare,
    Upload,
    FileText,
    Globe,
    Cloud,
    // Sparkles,  // REMOVED: Only used in commented auto-generation section
    // RefreshCw,  // REMOVED: Only used in commented auto-generation section
    Edit2,
    Check,
    X,
} from "lucide-react";
import { VapiCallWidget } from "@/components/funnel/vapi-call-widget";
import {
    IntakeMethodSelector,
    type IntakeMethod,
} from "@/components/intake/intake-method-selector";
import { PasteIntake } from "@/components/intake/paste-intake";
import { UploadIntake } from "@/components/intake/upload-intake";
import { ScrapeIntake } from "@/components/intake/scrape-intake";
// REMOVED: import { AutoGenerationModal } from "@/components/funnel/auto-generation-modal";
// REMOVED: import {
//     AutoGenerationProgress,
//     type GenerationProgressItem,
// } from "@/components/funnel/auto-generation-progress";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

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
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<FunnelProject | null>(null);
    const [userId, setUserId] = useState("");
    const [intakeSessions, setIntakeSessions] = useState<IntakeSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [selectedMethod, setSelectedMethod] = useState<IntakeMethod | null>(null);
    // COMMENTED OUT: Auto-generation state variables
    // const [showGenerationModal, setShowGenerationModal] = useState(false);
    // const [generationMode, setGenerationMode] = useState<"generate" | "regenerate">(
    //     "generate"
    // );
    // const [hasExistingContent, setHasExistingContent] = useState(false);
    // const [isPolling, setIsPolling] = useState(false);
    // const [generationProgress, setGenerationProgress] = useState<
    //     GenerationProgressItem[]
    // >([]);
    // const [isGenerating, setIsGenerating] = useState(false);
    // const [currentGeneratingStep, setCurrentGeneratingStep] = useState<number | null>(
    //     null
    // );
    // const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingSessionName, setEditingSessionName] = useState<string>("");
    const [isRenaming, setIsRenaming] = useState(false);

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

    // COMMENTED OUT: Check for existing content
    // useEffect(() => {
    //     const checkExistingContent = () => {
    //         const hasContent = completedSteps.some((step) => step >= 2 && step <= 11);
    //         setHasExistingContent(hasContent);
    //     };

    //     if (completedSteps.length > 0) {
    //         checkExistingContent();
    //     }
    // }, [completedSteps]);

    // COMMENTED OUT: Poll for generation status
    // const pollGenerationStatus = async () => {
    //     if (!projectId) return;

    //     try {
    //         const response = await fetch(
    //             `/api/generate/generation-status?projectId=${projectId}`
    //         );

    //         if (!response.ok) {
    //             logger.error({}, "Failed to fetch generation status");
    //             return;
    //         }

    //         const data = await response.json();

    //         setIsGenerating(data.isGenerating);
    //         setCurrentGeneratingStep(data.currentStep);
    //         setGenerationProgress(data.progress || []);

    //         // If generation is complete, stop polling and refresh
    //         if (!data.isGenerating && isPolling) {
    //             setIsPolling(false);
    //             if (pollingIntervalRef.current) {
    //                 clearInterval(pollingIntervalRef.current);
    //                 pollingIntervalRef.current = null;
    //             }
    //             refreshCompletion();

    //             toast({
    //                 title: "Generation Complete! ✨",
    //                 description: `Successfully generated ${data.completedSteps.length} steps`,
    //             });
    //         }
    //     } catch (error) {
    //         logger.error({ error }, "Error polling generation status");
    //     }
    // };

    // COMMENTED OUT: Start polling when component mounts or projectId changes
    // useEffect(() => {
    //     if (!projectId) return;

    //     // Check initial status
    //     pollGenerationStatus();

    //     // Cleanup function
    //     return () => {
    //         if (pollingIntervalRef.current) {
    //             clearInterval(pollingIntervalRef.current);
    //             pollingIntervalRef.current = null;
    //         }
    //     };
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [projectId]);

    // COMMENTED OUT: Start/stop polling based on generation status
    // useEffect(() => {
    //     if (isGenerating && !pollingIntervalRef.current) {
    //         // Start polling every 2.5 seconds
    //         pollingIntervalRef.current = setInterval(pollGenerationStatus, 2500);
    //         setIsPolling(true);
    //     } else if (!isGenerating && pollingIntervalRef.current) {
    //         // Stop polling
    //         clearInterval(pollingIntervalRef.current);
    //         pollingIntervalRef.current = null;
    //         setIsPolling(false);
    //     }

    //     return () => {
    //         if (pollingIntervalRef.current) {
    //             clearInterval(pollingIntervalRef.current);
    //             pollingIntervalRef.current = null;
    //         }
    //     };
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [isGenerating]);

    const hasCompletedIntake = intakeSessions.length > 0;

    // COMMENTED OUT: Generation handlers
    // const handleGenerateAll = () => {
    //     setGenerationMode("generate");
    //     setShowGenerationModal(true);
    // };

    // const handleRegenerateAll = () => {
    //     setGenerationMode("regenerate");
    //     setShowGenerationModal(true);
    // };

    // const handleConfirmGeneration = async () => {
    //     try {
    //         setShowGenerationModal(false);
    //         setIsGenerating(true);

    //         toast({
    //             title: "Starting Generation...",
    //             description:
    //                 "Your content is being generated. This may take a few minutes.",
    //         });

    //         const response = await fetch("/api/generate/auto-generate-all", {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify({
    //                 projectId,
    //                 // Don't pass intakeId - API will fetch all intake records and combine them
    //                 regenerate: generationMode === "regenerate",
    //             }),
    //         });

    //         const data = await response.json();

    //         if (!response.ok) {
    //             const errorMessage =
    //                 data.error ||
    //                 `Failed to start generation: ${response.status} ${response.statusText}`;
    //             logger.error(
    //                 {
    //                     error: errorMessage,
    //                     status: response.status,
    //                     statusText: response.statusText,
    //                     projectId,
    //                     intakeSessionCount: intakeSessions.length,
    //                 },
    //                 "Failed to start generation"
    //             );
    //             throw new Error(errorMessage);
    //         }

    //         // Check if generation started successfully
    //         if (!data.success && data.failedSteps && data.failedSteps.length > 0) {
    //             logger.warn(
    //                 {
    //                     failedSteps: data.failedSteps,
    //                     completedSteps: data.completedSteps,
    //                     projectId,
    //                 },
    //                 "Generation started but some steps failed immediately"
    //             );
    //             toast({
    //                 title: "Generation Started with Warnings",
    //                 description: `Some steps failed: ${data.failedSteps.map((f: { step: number; error: string }) => `Step ${f.step}: ${f.error}`).join(", ")}`,
    //                 variant: "destructive",
    //             });
    //         }

    //         // Start polling for progress
    //         if (!pollingIntervalRef.current) {
    //             pollingIntervalRef.current = setInterval(pollGenerationStatus, 2500);
    //             setIsPolling(true);
    //         }

    //         toast({
    //             title: "Generation Started",
    //             description:
    //                 "Your content is being generated. This may take a few minutes.",
    //         });
    //     } catch (error) {
    //         logger.error(
    //             {
    //                 error,
    //                 errorMessage:
    //                     error instanceof Error ? error.message : String(error),
    //                 projectId,
    //                 intakeSessionCount: intakeSessions.length,
    //             },
    //             "Failed to start generation"
    //         );
    //         setIsGenerating(false);
    //         toast({
    //             title: "Generation Failed",
    //             description:
    //                 error instanceof Error
    //                     ? error.message
    //                     : "Failed to start content generation. Please try again.",
    //             variant: "destructive",
    //         });
    //     }
    // };

    const handleIntakeComplete = () => {
        setSelectedMethod(null); // Reset method selection
        loadIntakeSessions();
        refreshCompletion();
    };

    const handleStartRename = (session: IntakeSession) => {
        setEditingSessionId(session.id);
        setEditingSessionName(session.session_name || formatDate(session.created_at));
    };

    const handleCancelRename = () => {
        setEditingSessionId(null);
        setEditingSessionName("");
    };

    const handleSaveRename = async (sessionId: string) => {
        if (!editingSessionName.trim()) {
            toast({
                title: "Invalid name",
                description: "Session name cannot be empty.",
                variant: "destructive",
            });
            return;
        }

        setIsRenaming(true);

        try {
            const response = await fetch("/api/intake/rename", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intakeId: sessionId,
                    sessionName: editingSessionName.trim(),
                    projectId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to rename session");
            }

            logger.info(
                { intakeId: sessionId, newSessionName: editingSessionName.trim() },
                "Session renamed successfully"
            );

            toast({
                title: "Session renamed",
                description: "Session name has been updated successfully.",
            });

            // Reload sessions to reflect the change
            await loadIntakeSessions();

            // Reset editing state
            setEditingSessionId(null);
            setEditingSessionName("");
        } catch (error) {
            logger.error(
                {
                    error,
                    errorMessage:
                        error instanceof Error ? error.message : String(error),
                    intakeId: sessionId,
                },
                "Failed to rename session"
            );
            toast({
                title: "Rename failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to rename session. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsRenaming(false);
        }
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
            nextLabel={hasCompletedIntake ? "Define Offer" : "Complete Intake First"}
            stepTitle="Intake"
            stepDescription="Provide your business information through voice, documents, or other methods"
        >
            <div className="space-y-8">
                {/* COMMENTED OUT: Generation Progress - Show if generating or has progress */}
                {/* {(isGenerating || generationProgress.length > 0) && (
                    <AutoGenerationProgress
                        projectId={projectId}
                        progress={generationProgress}
                        isGenerating={isGenerating}
                        currentStep={currentGeneratingStep}
                        onClose={() => setGenerationProgress([])}
                    />
                )} */}

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
                                            <div className="flex items-center space-x-3 flex-1">
                                                <div
                                                    className={`h-3 w-3 rounded-full flex-shrink-0 ${
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
                                                {editingSessionId === session.id ? (
                                                    <div className="flex items-center space-x-2 flex-1">
                                                        <input
                                                            type="text"
                                                            value={editingSessionName}
                                                            onChange={(e) =>
                                                                setEditingSessionName(
                                                                    e.target.value
                                                                )
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    handleSaveRename(
                                                                        session.id
                                                                    );
                                                                } else if (
                                                                    e.key === "Escape"
                                                                ) {
                                                                    handleCancelRename();
                                                                }
                                                            }}
                                                            className="flex-1 rounded-md border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-primary"
                                                            autoFocus
                                                            disabled={isRenaming}
                                                        />
                                                        <button
                                                            onClick={() =>
                                                                handleSaveRename(
                                                                    session.id
                                                                )
                                                            }
                                                            disabled={isRenaming}
                                                            className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                                                            title="Save"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelRename}
                                                            disabled={isRenaming}
                                                            className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                                                            title="Cancel"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="font-medium text-foreground">
                                                        {session.session_name ||
                                                            formatDate(
                                                                session.created_at
                                                            )}
                                                    </span>
                                                )}
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
                                                {editingSessionId !== session.id && (
                                                    <button
                                                        onClick={() =>
                                                            handleStartRename(session)
                                                        }
                                                        className="p-1 text-muted-foreground hover:text-foreground"
                                                        title="Rename session"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
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

                {/* COMMENTED OUT: Auto-Generation Section */}
                {/* {hasCompletedIntake && (
                    <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h3 className="mb-2 flex items-center text-lg font-semibold text-foreground">
                                    <Sparkles className="mr-2 h-5 w-5 text-primary" />
                                    Auto-Generate All Content
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {hasExistingContent
                                        ? "Regenerate all funnel content based on your intake data. This will overwrite existing content."
                                        : "Generate all funnel content automatically based on your intake. Recommended to get started quickly!"}
                                </p>
                            </div>
                        </div>

                        <div className="mb-4 rounded-lg bg-card p-4">
                            <p className="mb-2 text-sm font-medium text-foreground">
                                This will generate:
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div>• Step 2: Offer</div>
                                <div>• Step 3: Deck Structure</div>
                                <div>• Step 5: Enrollment Page</div>
                                <div>• Step 8: Watch Page</div>
                                <div>• Step 9: Registration Page</div>
                                <div>• Step 11: AI Followup</div>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                                Plus: Marketing profile initialization
                            </p>
                            {intakeSessions.length > 1 && (
                                <div className="mt-3 rounded-lg bg-primary/10 p-3 border border-primary/20">
                                    <p className="text-xs font-medium text-primary">
                                        📋 Using {intakeSessions.length} intake session
                                        {intakeSessions.length > 1 ? "s" : ""} combined
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        All your intake methods (documents, URLs, pasted
                                        content, voice calls) will be combined for
                                        generation.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            {!hasExistingContent ? (
                                <Button
                                    onClick={handleGenerateAll}
                                    className="flex-1"
                                    size="lg"
                                >
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate All Content
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleRegenerateAll}
                                    variant="outline"
                                    className="flex-1"
                                    size="lg"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Regenerate All Content
                                </Button>
                            )}
                        </div>

                        {hasExistingContent && (
                            <p className="mt-3 text-xs text-amber-600">
                                ⚠️ Warning: Regeneration will overwrite all existing
                                content
                            </p>
                        )}
                    </div>
                )} */}

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

            {/* COMMENTED OUT: Auto-Generation Modal */}
            {/* <AutoGenerationModal
                isOpen={showGenerationModal}
                onClose={() => setShowGenerationModal(false)}
                onConfirm={handleConfirmGeneration}
                mode={generationMode}
                hasExistingContent={hasExistingContent}
            /> */}
        </StepLayout>
    );
}
