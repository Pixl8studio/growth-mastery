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
    Edit2,
    Check,
    X,
    Palette,
    DollarSign,
    ArrowLeft,
} from "lucide-react";
import { VapiCallWidget } from "@/components/funnel/vapi-call-widget";
import { ContextMethodSelector } from "@/components/context/context-method-selector";
import { ContextWizard } from "@/components/context/context-wizard";
import { GptPasteMode } from "@/components/context/gpt-paste-mode";
import { PasteIntake } from "@/components/intake/paste-intake";
import { UploadIntake } from "@/components/intake/upload-intake";
import { ScrapeIntake } from "@/components/intake/scrape-intake";
import { IntakeDataViewer } from "@/components/intake/intake-data-viewer";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ContextMethod } from "@/types/business-profile";
import type { BusinessProfile } from "@/types/business-profile";

interface IntakeSession {
    id: string;
    call_id: string;
    transcript_text: string;
    call_duration: number;
    call_status: string;
    created_at: string;
    extracted_data?: {
        pricing?: Array<{
            amount: number;
            currency: string;
            context: string;
            confidence: "high" | "medium" | "low";
        }>;
    };
    brand_data?: {
        colors: {
            primary: string;
            secondary: string;
            accent: string;
            background: string;
            text: string;
        };
        fonts: {
            primary?: string;
            secondary?: string;
            weights: string[];
        };
        style: {
            borderRadius?: string;
            shadows?: boolean;
            gradients?: boolean;
        };
        confidence: {
            colors: number;
            fonts: number;
            overall: number;
        };
    };
    intake_method: string;
    session_name?: string;
    file_urls?: string[];
    scraped_url?: string;
    metadata?: Record<string, unknown>;
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
    const [selectedMethod, setSelectedMethod] = useState<ContextMethod | null>(null);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(
        null
    );
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingSessionName, setEditingSessionName] = useState<string>("");
    const [isRenaming, setIsRenaming] = useState(false);
    const [selectedSession, setSelectedSession] = useState<IntakeSession | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);

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

                if (projectError) {
                    logger.error(
                        {
                            code: projectError.code,
                            message: projectError.message,
                            details: projectError.details,
                            hint: projectError.hint,
                            projectId,
                        },
                        "Failed to load project from Supabase"
                    );
                    return;
                }

                if (!projectData) {
                    logger.error({ projectId }, "Project not found");
                    return;
                }

                setProject(projectData);
                setUserId(projectData.user_id);
            } catch (error) {
                logger.error(
                    {
                        errorMessage:
                            error instanceof Error ? error.message : String(error),
                        errorName: error instanceof Error ? error.name : "Unknown",
                        projectId,
                    },
                    "Failed to load project"
                );
            }
        };

        loadProject();
    }, [projectId]);

    // Load intake sessions (legacy support)
    const loadIntakeSessions = async () => {
        if (!projectId) return;

        try {
            setIsLoadingSessions(true);
            const supabase = createClient();

            const { data: sessionData, error } = await supabase
                .from("vapi_transcripts")
                .select(
                    "id, call_id, transcript_text, call_duration, call_status, created_at, extracted_data, brand_data, intake_method, session_name, file_urls, scraped_url, metadata"
                )
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

    // Load business profile (non-critical - gracefully handle errors)
    const loadBusinessProfile = async () => {
        if (!projectId || !userId) return; // Wait for auth to be ready

        try {
            const response = await fetch(
                `/api/context/business-profile?projectId=${projectId}`,
                { credentials: "include" }
            );

            // Silently handle auth errors - profile loading is optional
            if (response.status === 401) {
                logger.info(
                    {},
                    "Business profile not loaded - user not authenticated yet"
                );
                return;
            }

            const result = await response.json();

            if (response.ok && result.profile) {
                setBusinessProfile(result.profile);
            }
        } catch (error) {
            // Non-critical error - don't break the page
            logger.warn({ error }, "Failed to load business profile (non-critical)");
        }
    };

    useEffect(() => {
        if (projectId) {
            loadIntakeSessions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // Load business profile only after userId is available (auth ready)
    useEffect(() => {
        if (projectId && userId) {
            loadBusinessProfile();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, userId]);

    // Check if context is complete (either via business profile or legacy intake)
    const hasCompletedContext =
        (businessProfile?.completion_status?.overall ?? 0) > 0 ||
        intakeSessions.length > 0;

    const handleIntakeComplete = () => {
        setSelectedMethod(null);
        loadIntakeSessions();
        loadBusinessProfile();
        refreshCompletion();
    };

    const handleWizardComplete = () => {
        loadBusinessProfile();
        refreshCompletion();
        toast({
            title: "Business Profile Complete!",
            description: "You can now proceed to define your offer.",
        });
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

            toast({
                title: "Session renamed",
                description: "Session name has been updated successfully.",
            });

            await loadIntakeSessions();
            setEditingSessionId(null);
            setEditingSessionName("");
        } catch (error) {
            logger.error({ error }, "Failed to rename session");
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
            nextDisabled={!hasCompletedContext}
            nextLabel={hasCompletedContext ? "Define Offer" : "Complete Context First"}
            stepTitle="Context"
            stepDescription="Build your business profile through AI-assisted questions, voice call, or your own GPT"
        >
            <div className="space-y-8">
                {/* Context Method Selector or Active Method Interface */}
                {!selectedMethod ? (
                    <ContextMethodSelector
                        onSelectMethod={setSelectedMethod}
                        selectedMethod={selectedMethod || undefined}
                    />
                ) : (
                    <div className="space-y-4">
                        {/* Back Button */}
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedMethod(null)}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Choose a different method
                        </Button>

                        {/* Wizard Mode */}
                        {selectedMethod === "wizard" && (
                            <ContextWizard
                                projectId={projectId}
                                userId={userId}
                                initialProfile={businessProfile || undefined}
                                onComplete={handleWizardComplete}
                            />
                        )}

                        {/* Voice Call Mode */}
                        {selectedMethod === "voice" && (
                            <VapiCallWidget
                                projectId={projectId}
                                userId={userId}
                                onCallComplete={handleIntakeComplete}
                            />
                        )}

                        {/* GPT Paste Mode */}
                        {selectedMethod === "gpt_paste" && (
                            <GptPasteMode
                                projectId={projectId}
                                userId={userId}
                                initialProfile={businessProfile || undefined}
                                onComplete={handleWizardComplete}
                            />
                        )}
                    </div>
                )}

                {/* Business Profile Progress */}
                {businessProfile && businessProfile.completion_status && (
                    <Card className="p-6">
                        <h3 className="mb-4 text-lg font-semibold text-foreground">
                            Business Profile Progress
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Overall Completion
                                </span>
                                <span className="text-sm font-semibold text-primary">
                                    {businessProfile.completion_status.overall}%
                                </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-500"
                                    style={{
                                        width: `${businessProfile.completion_status.overall}%`,
                                    }}
                                />
                            </div>
                            <div className="grid grid-cols-5 gap-2 pt-2">
                                {[
                                    { id: "section1", label: "Customer" },
                                    { id: "section2", label: "Story" },
                                    { id: "section3", label: "Offer" },
                                    { id: "section4", label: "Beliefs" },
                                    { id: "section5", label: "CTA" },
                                ].map((section, index) => {
                                    const completion =
                                        businessProfile.completion_status[
                                            section.id as keyof typeof businessProfile.completion_status
                                        ] || 0;
                                    return (
                                        <div key={section.id} className="text-center">
                                            <div
                                                className={`mx-auto mb-1 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                                    completion === 100
                                                        ? "bg-green-100 text-green-700"
                                                        : completion > 0
                                                          ? "bg-primary/20 text-primary"
                                                          : "bg-muted text-muted-foreground"
                                                }`}
                                            >
                                                {completion === 100 ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    index + 1
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {section.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Legacy Intake Sessions List */}
                {intakeSessions.length > 0 && (
                    <Card className="p-6">
                        <h3 className="mb-4 text-lg font-semibold text-foreground">
                            Previous Intake Sessions
                        </h3>

                        {isLoadingSessions ? (
                            <div className="py-8 text-center text-muted-foreground">
                                Loading sessions...
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {intakeSessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="cursor-pointer rounded-lg border border-border bg-muted/50 p-4 transition-all hover:border-primary/50 hover:bg-muted hover:shadow-md"
                                        onClick={() => {
                                            if (editingSessionId !== session.id) {
                                                setSelectedSession(session);
                                                setIsViewerOpen(true);
                                            }
                                        }}
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex flex-1 items-center space-x-3">
                                                <div
                                                    className={`h-3 w-3 flex-shrink-0 rounded-full ${
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
                                                    <div className="flex flex-1 items-center space-x-2">
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStartRename(session);
                                                        }}
                                                        className="p-1 text-muted-foreground hover:text-foreground"
                                                        title="Rename session"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Data Availability Badges */}
                                        <div className="mb-3 flex flex-wrap gap-2">
                                            {session.brand_data && (
                                                <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                                                    <Palette className="h-3 w-3" />
                                                    Brand Data
                                                </span>
                                            )}
                                            {session.extracted_data?.pricing &&
                                                session.extracted_data.pricing.length >
                                                    0 && (
                                                    <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                                        <DollarSign className="h-3 w-3" />
                                                        {
                                                            session.extracted_data
                                                                .pricing.length
                                                        }{" "}
                                                        Price
                                                        {session.extracted_data.pricing
                                                            .length !== 1
                                                            ? "s"
                                                            : ""}
                                                    </span>
                                                )}
                                            {session.metadata &&
                                                Object.keys(session.metadata).length >
                                                    0 && (
                                                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                                                        Metadata
                                                    </span>
                                                )}
                                        </div>

                                        {/* Additional Info */}
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

                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Click to view all data →
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {/* What's Next */}
                <Card className="border-border bg-muted/50 p-6">
                    <h3 className="mb-3 flex items-center text-sm font-semibold text-foreground">
                        <span className="mr-2">👉</span> After Context Setup
                    </h3>
                    <p className="mb-3 text-sm text-muted-foreground">
                        Once you complete your business profile, the AI will use it to:
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Generate your complete offer definition</li>
                        <li>• Create your 55-slide presentation structure</li>
                        <li>• Build high-converting landing pages</li>
                        <li>• Craft personalized follow-up sequences</li>
                    </ul>
                </Card>
            </div>

            {/* Intake Data Viewer Modal */}
            <IntakeDataViewer
                session={selectedSession}
                isOpen={isViewerOpen}
                onClose={() => {
                    setIsViewerOpen(false);
                    setSelectedSession(null);
                }}
            />
        </StepLayout>
    );
}
