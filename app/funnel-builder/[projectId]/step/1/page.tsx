"use client";

/**
 * Step 1 Page - Unified AI Wizard Flow
 * Simplified single-path entry with integrated voice-to-text throughout.
 * Features:
 * - Direct wizard entry without method selection
 * - Live business profile summary visible during wizard
 * - Persistent auto-save indicators
 * - Legacy intake session support
 */

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import {
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
    Wand2,
} from "lucide-react";
import { ContextWizard } from "@/components/context/context-wizard";
import { IntakeDataViewer } from "@/components/intake/intake-data-viewer";
import { IntakeCompletionCard } from "@/components/intake/intake-completion-card";
import { BusinessProfileSummaryCard } from "@/components/context/business-profile-summary-card";
import { BusinessProfileEditModal } from "@/components/context/business-profile-edit-modal";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    const [showWizard, setShowWizard] = useState(false);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(
        null
    );
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingSessionName, setEditingSessionName] = useState<string>("");
    const [isRenaming, setIsRenaming] = useState(false);
    const [selectedSession, setSelectedSession] = useState<IntakeSession | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [recentlyCompletedSession, setRecentlyCompletedSession] =
        useState<IntakeSession | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSectionId, setSelectedSectionId] = useState<string>("section1");

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

    // Handle section click from summary card
    const handleSectionClick = (sectionId: string) => {
        setSelectedSectionId(sectionId);
        setIsEditModalOpen(true);
    };

    // Handle profile update from edit modal (bidirectional sync)
    const handleProfileUpdate = (updatedProfile: BusinessProfile) => {
        setBusinessProfile(updatedProfile);
        refreshCompletion();
    };

    const handleWizardComplete = async () => {
        setShowWizard(false);

        // Create a simulated session for the completion card
        const simulatedSession: IntakeSession = {
            id: `wizard-${Date.now()}`,
            call_id: "",
            transcript_text: "Business profile completed via guided wizard",
            call_duration: 0,
            call_status: "completed",
            created_at: new Date().toISOString(),
            intake_method: "wizard",
        };

        setRecentlyCompletedSession(simulatedSession);

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
            stepTitle="Define Context"
            stepDescription="Build your business profile through our AI-assisted wizard with voice input support"
        >
            <div className="space-y-8">
                {/* Unified Wizard Entry or Active Wizard */}
                {!showWizard ? (
                    <Card className="overflow-hidden">
                        {/* Hero Section */}
                        <div className="relative bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent p-8 text-center">
                            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
                                <Wand2 className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-foreground">
                                AI-Powered Business Profile Builder
                            </h3>
                            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                                Answer questions section by section with AI assistance. Use voice input
                                or type your responses. Import existing content from files, URLs, or paste directly.
                            </p>
                        </div>

                        {/* Click to Begin Button */}
                        <div className="border-t border-border bg-muted/30 p-6">
                            <Button
                                size="lg"
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                                onClick={() => setShowWizard(true)}
                            >
                                <Wand2 className="mr-2 h-5 w-5" />
                                Click to Begin
                            </Button>
                            <p className="mt-3 text-center text-xs text-muted-foreground">
                                Your progress is automatically saved as you go
                            </p>
                        </div>
                    </Card>
                ) : (
                    <ContextWizard
                        projectId={projectId}
                        userId={userId}
                        initialProfile={businessProfile || undefined}
                        onComplete={handleWizardComplete}
                        onProfileUpdate={handleProfileUpdate}
                    />
                )}

                {/* Intake Completion Card - Shows after successful intake */}
                {recentlyCompletedSession && (
                    <IntakeCompletionCard
                        session={recentlyCompletedSession}
                        projectId={projectId}
                        onViewDetails={() => {
                            setSelectedSession(recentlyCompletedSession);
                            setIsViewerOpen(true);
                        }}
                        onDismiss={() => setRecentlyCompletedSession(null)}
                    />
                )}

                {/* Business Profile Summary Card - Always visible when profile has data */}
                {businessProfile &&
                    businessProfile.completion_status &&
                    businessProfile.completion_status.overall > 0 && (
                        <BusinessProfileSummaryCard
                            businessProfile={businessProfile}
                            onSectionClick={handleSectionClick}
                        />
                    )}

                {/* Legacy Intake Sessions List */}
                {intakeSessions.length > 0 && (
                    <Card className="p-6">
                        <h3 className="mb-4 text-lg font-semibold text-foreground">
                            Completed Business Profiles
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
                        <li>• Create your 60-slide presentation structure</li>
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

            {/* Business Profile Edit Modal */}
            {businessProfile && (
                <BusinessProfileEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    businessProfile={businessProfile}
                    projectId={projectId}
                    initialSection={selectedSectionId}
                    onProfileUpdate={handleProfileUpdate}
                />
            )}
        </StepLayout>
    );
}
