"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { DeckStructureEditor } from "@/components/funnel/deck-structure-editor";
import {
    Sparkles,
    FileText,
    Trash2,
    Pencil,
    Download,
    Copy,
    User,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { exportDeckToDocx } from "@/lib/export/deck-to-docx";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useIsMobile } from "@/lib/mobile-utils.client";
import type { BusinessProfile } from "@/types/business-profile";

interface DeckStructure {
    id: string;
    title: string;
    slideCount: number;
    status: "generating" | "completed" | "failed";
    slides: Array<{
        slideNumber: number;
        title: string;
        description: string;
        section: string;
    }>;
    version: number;
    created_at: string;
    presentation_type?: "webinar" | "vsl" | "sales_page";
    template_type?: string;
    sections?: any;
}

export default function Step4Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const router = useRouter();
    const isMobile = useIsMobile("lg");
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [selectedDeck, setSelectedDeck] = useState<DeckStructure | null>(null);
    const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
    const [editingDeckName, setEditingDeckName] = useState("");
    // Fixed to 60-slide webinar deck framework (per issue #285)
    const slideCount = "60" as const;
    const presentationType = "webinar" as const;
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(
        null
    );
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    // Redirect mobile users to desktop-required page
    useEffect(() => {
        if (isMobile && projectId) {
            const params = new URLSearchParams({
                feature: "Deck Structure Editor",
                description:
                    "The deck structure editor requires a desktop computer for drag-and-drop editing and managing complex slide layouts.",
                returnPath: `/funnel-builder/${projectId}`,
            });
            router.push(`/desktop-required?${params.toString()}`);
        }
    }, [isMobile, projectId, router]);

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
        const loadBusinessProfile = async () => {
            if (!projectId) return;

            setIsLoadingProfile(true);
            try {
                const profileResponse = await fetch(
                    `/api/context/business-profile?projectId=${projectId}`,
                    { credentials: "include" }
                );

                if (profileResponse.ok) {
                    const profileResult = await profileResponse.json();
                    if (
                        profileResult.profile &&
                        profileResult.profile.completion_status?.overall > 0
                    ) {
                        setBusinessProfile(profileResult.profile);
                    }
                }
            } catch (profileError) {
                logger.warn({ error: profileError }, "Failed to load business profile");
            } finally {
                setIsLoadingProfile(false);
            }
        };

        loadBusinessProfile();
    }, [projectId]);

    useEffect(() => {
        const loadDeckStructures = async () => {
            if (!projectId) return;

            try {
                const supabase = createClient();
                const { data: deckData, error: deckError } = await supabase
                    .from("deck_structures")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (deckError) throw deckError;

                const transformed = (deckData || []).map((deck: any) => ({
                    id: deck.id,
                    title: deck.metadata?.title || "Untitled Presentation",
                    slideCount: Array.isArray(deck.slides)
                        ? deck.slides.length
                        : deck.total_slides || 60,
                    status: "completed" as const,
                    slides: deck.slides || [],
                    version: 1,
                    created_at: deck.created_at,
                    presentation_type: deck.presentation_type || "webinar",
                    template_type: deck.template_type,
                    sections: deck.sections,
                }));
                setDeckStructures(transformed);
            } catch (error) {
                logger.error({ error }, "Failed to load deck structures");
            }
        };

        loadDeckStructures();
    }, [projectId]);

    const handleGenerateDeck = async () => {
        if (!businessProfile) {
            return;
        }

        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            const progressSteps = [5, 15, 30, 45, 60, 75, 85, 95, 100];
            let currentStep = 0;

            const progressInterval = setInterval(() => {
                if (currentStep < progressSteps.length) {
                    setGenerationProgress(progressSteps[currentStep]);
                    currentStep++;
                } else {
                    clearInterval(progressInterval);
                }
            }, 3000);

            const requestBody = {
                projectId,
                businessProfileId: businessProfile.id,
                slideCount,
                presentationType,
            };

            const response = await fetch("/api/generate/deck-structure", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            clearInterval(progressInterval);
            setGenerationProgress(100);

            if (!response.ok) {
                let errorMessage = "Failed to generate deck structure";
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                    if (errorData.details) {
                        const details = Array.isArray(errorData.details)
                            ? errorData.details.map((d: any) => d.message).join(", ")
                            : JSON.stringify(errorData.details);
                        errorMessage = `${errorMessage}: ${details}`;
                    }
                    logger.error(
                        { error: errorData, statusCode: response.status },
                        "API error generating deck structure"
                    );
                } catch {
                    logger.error(
                        { statusCode: response.status },
                        "Failed to generate deck structure (non-JSON response)"
                    );
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            const newDeck: DeckStructure = {
                id: result.deckStructure.id,
                title: result.deckStructure.title || "Presentation Structure",
                slideCount: result.deckStructure.slides?.length || 60,
                status: "completed",
                slides: result.deckStructure.slides || [],
                version: 1,
                created_at: result.deckStructure.created_at,
                presentation_type:
                    result.deckStructure.presentation_type || presentationType,
                template_type: result.deckStructure.template_type,
                sections: result.deckStructure.sections,
            };

            setDeckStructures((prev) => [newDeck, ...prev]);

            setTimeout(() => {
                setIsGenerating(false);
                setGenerationProgress(0);
            }, 1000);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error occurred";
            logger.error({ error, errorMessage }, "Failed to generate deck structure");
            setIsGenerating(false);
            setGenerationProgress(0);
            alert(`Failed to generate deck structure: ${errorMessage}`);
        }
    };

    const handleViewDeck = (deck: DeckStructure) => {
        setSelectedDeck(deck);
    };

    const handleDownloadDeck = async (deck: DeckStructure) => {
        try {
            await exportDeckToDocx({
                title: deck.title,
                slides: deck.slides,
            });
            logger.info({ deckId: deck.id }, "Deck exported to Word document");
        } catch (error) {
            logger.error({ error, deckId: deck.id }, "Failed to export deck to Word");
            alert("Failed to export deck. Please try again.");
        }
    };

    const handleDeleteDeck = async (deckId: string) => {
        if (!confirm("Delete this presentation structure?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("deck_structures")
                .delete()
                .eq("id", deckId);

            if (!error) {
                setDeckStructures((prev) => prev.filter((d) => d.id !== deckId));
                if (selectedDeck?.id === deckId) {
                    setSelectedDeck(null);
                }
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete presentation structure");
        }
    };

    const handleDuplicateDeck = async (deck: DeckStructure) => {
        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const duplicatedMetadata = {
                title: `${deck.title} (Copy)`,
            };

            const { error } = await supabase.from("deck_structures").insert({
                funnel_project_id: projectId,
                user_id: user.id,
                template_type: deck.template_type,
                total_slides: deck.slideCount,
                slides: deck.slides,
                sections: deck.sections || {},
                metadata: duplicatedMetadata,
                presentation_type: deck.presentation_type || "webinar",
            });

            if (error) throw error;

            // Refresh deck list
            const { data: deckData } = await supabase
                .from("deck_structures")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false });

            if (deckData) {
                const transformed = deckData.map((d: any) => ({
                    id: d.id,
                    title: d.metadata?.title || "Untitled Presentation",
                    slideCount: Array.isArray(d.slides)
                        ? d.slides.length
                        : d.total_slides || 60,
                    status: "completed" as const,
                    slides: d.slides || [],
                    version: 1,
                    created_at: d.created_at,
                    presentation_type: d.presentation_type || "webinar",
                    template_type: d.template_type,
                    sections: d.sections,
                }));
                setDeckStructures(transformed);
            }

            logger.info({}, "Presentation structure duplicated");
        } catch (error) {
            logger.error({ error }, "Failed to duplicate presentation structure");
            alert("Failed to duplicate. Please try again.");
        }
    };

    const startEditingName = (deck: DeckStructure) => {
        setEditingDeckId(deck.id);
        setEditingDeckName(deck.title);
    };

    const saveDeckName = async (deckId: string) => {
        try {
            const supabase = createClient();

            const { data: currentDeck } = await supabase
                .from("deck_structures")
                .select("metadata")
                .eq("id", deckId)
                .single();

            const updatedMetadata = {
                ...(currentDeck?.metadata || {}),
                title: editingDeckName.trim(),
            };

            const { error } = await supabase
                .from("deck_structures")
                .update({ metadata: updatedMetadata })
                .eq("id", deckId);

            if (!error) {
                setDeckStructures((prev) =>
                    prev.map((d) =>
                        d.id === deckId ? { ...d, title: editingDeckName.trim() } : d
                    )
                );
                setEditingDeckId(null);
                setEditingDeckName("");
            }
        } catch (error) {
            logger.error({ error }, "Failed to update presentation name");
        }
    };

    // Profile completion state helpers
    const profileCompletion = businessProfile?.completion_status?.overall ?? 0;
    const hasProfile = businessProfile !== null && profileCompletion > 0;
    const isProfileComplete = profileCompletion === 100;
    // TEMPORARY: Bypass business profile prerequisite for testing (Issue #323)
    // Original: const canGenerateDeck = hasProfile;
    // TODO: Restore prerequisite check when Step 3 is functional
    const canGenerateDeck = true;
    const hasCompletedDeck = deckStructures.some((d) => d.status === "completed");

    // Dynamic sub-headline based on profile state
    const getSubHeadline = () => {
        if (isProfileComplete) {
            return "Now that your business profile is complete, let's generate your 60 slide magnetic masterclass presentation outline";
        }
        if (hasProfile) {
            return "Let's generate your 60 slide magnetic masterclass presentation outline based on your business profile progress";
        }
        return "Complete your business profile in Step 1 to generate your 60 slide magnetic masterclass presentation outline";
    };

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={4}
            projectId={projectId}
            funnelName={project?.name}
            completedSteps={completedSteps}
            nextDisabled={!hasCompletedDeck}
            nextLabel={
                hasCompletedDeck ? "Create Presentation" : "Generate Structure First"
            }
            stepTitle="Presentation Structure"
            stepDescription={getSubHeadline()}
        >
            <div className="space-y-8">
                {/* TEMPORARY: Dependency Warning bypassed for testing (Issue #323)
                    Original condition: {!isLoadingProfile && !hasProfile && (...)}
                    TODO: Restore when Step 3 is functional */}
                {/* Dependency Warning - No business profile - BYPASSED */}
                {false && !isLoadingProfile && !hasProfile && (
                    <DependencyWarning
                        message="Complete your business profile in Step 1 to generate a presentation structure. Your profile provides the context AI needs to create a personalized 60-slide masterclass outline."
                        requiredStep={1}
                        requiredStepName="Business Profile"
                        projectId={projectId}
                    />
                )}

                {/* Recommendation Banner - Profile incomplete but exists */}
                {hasProfile && !isProfileComplete && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                            <div className="flex-1">
                                <p className="font-medium text-amber-800">
                                    Your business profile is {profileCompletion}%
                                    complete
                                </p>
                                <p className="mt-1 text-sm text-amber-700">
                                    For the best results, we recommend completing your
                                    full business profile before generating your
                                    presentation structure.{" "}
                                    <Link
                                        href={`/funnel-builder/${projectId}/step/1`}
                                        className="font-medium underline hover:text-amber-900"
                                    >
                                        Complete your profile in Step 1
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Generation Interface */}
                {!isGenerating ? (
                    <div className="rounded-lg border border-primary/10 bg-gradient-to-br from-primary/5 to-emerald-light/5 p-8">
                        <div className="mx-auto mb-6 max-w-md space-y-4">
                            {/* Business Profile Status Card - Always shown, non-interactive */}
                            {!isLoadingProfile && (
                                <div
                                    className={`flex items-center gap-3 rounded-lg border p-4 ${
                                        hasProfile
                                            ? isProfileComplete
                                                ? "border-green-300 bg-green-50"
                                                : "border-primary/30 bg-primary/5"
                                            : "border-gray-200 bg-gray-50"
                                    }`}
                                >
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                            hasProfile
                                                ? isProfileComplete
                                                    ? "bg-green-500 text-white"
                                                    : "bg-primary text-white"
                                                : "bg-gray-300 text-gray-500"
                                        }`}
                                    >
                                        {hasProfile && isProfileComplete ? (
                                            <CheckCircle2 className="h-5 w-5" />
                                        ) : (
                                            <User className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div
                                            className={`font-medium ${
                                                hasProfile
                                                    ? "text-foreground"
                                                    : "text-gray-500"
                                            }`}
                                        >
                                            Business Profile
                                        </div>
                                        <div
                                            className={`text-sm ${
                                                hasProfile
                                                    ? "text-muted-foreground"
                                                    : "text-gray-400"
                                            }`}
                                        >
                                            {hasProfile ? (
                                                <>
                                                    {profileCompletion}% complete
                                                    {isProfileComplete &&
                                                        " - Ready to use"}
                                                </>
                                            ) : (
                                                "Not started"
                                            )}
                                        </div>
                                    </div>
                                    {hasProfile && (
                                        <div className="text-green-600">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {isLoadingProfile && (
                                <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <div className="text-sm text-muted-foreground">
                                        Loading profile status...
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="text-center">
                            <button
                                onClick={handleGenerateDeck}
                                disabled={!canGenerateDeck}
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    canGenerateDeck
                                        ? "bg-primary text-white shadow-md hover:bg-primary/90"
                                        : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                }`}
                            >
                                <Sparkles className="h-6 w-6" />
                                {canGenerateDeck
                                    ? "Generate Deck Structure"
                                    : "Complete Business Profile First"}
                            </button>

                            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                                <p>Generation time: ~3-5 minutes</p>
                                <p>
                                    Creates 60 slides using Magnetic Masterclass
                                    Framework
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-primary/10">
                                <Sparkles className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-primary">
                                Generating Presentation Outline...
                            </h3>
                            <p className="text-primary">
                                AI is analyzing your business profile and creating your
                                structure
                            </p>
                        </div>

                        <div className="mx-auto mb-4 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            Please do not close this page while your outline is
                            generating.
                        </div>

                        <div className="mx-auto max-w-md">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-primary">
                                    Progress
                                </span>
                                <span className="text-sm text-primary">
                                    {generationProgress}%
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-primary/20">
                                <div
                                    className="h-3 rounded-full bg-primary transition-all duration-500 ease-out"
                                    style={{ width: `${generationProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Generated Presentation Structures */}
                <div className="rounded-lg border border-border bg-card shadow-soft">
                    <div className="border-b border-border p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-foreground">
                                Your Presentation Structures
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {deckStructures.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {deckStructures.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p className="mb-2">No presentation structures yet.</p>
                                {hasProfile ? (
                                    <p className="text-sm">
                                        Click &quot;Generate Deck Structure&quot; above
                                        to create your first one!
                                    </p>
                                ) : (
                                    <p className="text-sm">
                                        <Link
                                            href={`/funnel-builder/${projectId}/step/1`}
                                            className="text-primary underline hover:text-primary/80"
                                        >
                                            Complete your business profile in Step 1
                                        </Link>{" "}
                                        to get started.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {deckStructures.map((deck) => (
                                    <div
                                        key={deck.id}
                                        onClick={() => handleViewDeck(deck)}
                                        className="cursor-pointer rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                                    >
                                        <div
                                            className="flex items-start justify-between"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex-1">
                                                <div className="mb-2 flex items-center gap-3">
                                                    {editingDeckId === deck.id ? (
                                                        <div className="flex flex-1 items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={editingDeckName}
                                                                onChange={(e) =>
                                                                    setEditingDeckName(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="flex-1 rounded border border-primary/30 px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                                                onKeyDown={(e) => {
                                                                    if (
                                                                        e.key ===
                                                                        "Enter"
                                                                    )
                                                                        saveDeckName(
                                                                            deck.id
                                                                        );
                                                                    if (
                                                                        e.key ===
                                                                        "Escape"
                                                                    )
                                                                        setEditingDeckId(
                                                                            null
                                                                        );
                                                                }}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() =>
                                                                    saveDeckName(
                                                                        deck.id
                                                                    )
                                                                }
                                                                className="rounded bg-primary px-2 py-1 text-sm text-white hover:bg-primary/90"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setEditingDeckId(
                                                                        null
                                                                    )
                                                                }
                                                                className="rounded bg-gray-300 px-2 py-1 text-sm text-foreground hover:bg-gray-400"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <h4
                                                                className="cursor-pointer text-lg font-semibold text-foreground hover:text-primary"
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startEditingName(
                                                                        deck
                                                                    );
                                                                }}
                                                            >
                                                                {deck.title}
                                                            </h4>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startEditingName(
                                                                        deck
                                                                    );
                                                                }}
                                                                className="rounded p-1 text-primary hover:bg-primary/5"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span>
                                                        {deck.slideCount} slides
                                                    </span>
                                                    <span>
                                                        {new Date(
                                                            deck.created_at
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewDeck(deck);
                                                    }}
                                                    className="rounded p-2 text-primary hover:bg-primary/5"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownloadDeck(deck);
                                                    }}
                                                    className="rounded p-2 text-muted-foreground hover:bg-muted/50"
                                                    title="Download Word Document"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDuplicateDeck(deck);
                                                    }}
                                                    className="rounded p-2 text-muted-foreground hover:bg-muted/50"
                                                    title="Duplicate"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteDeck(deck.id);
                                                    }}
                                                    className="rounded p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Deck Editor Modal */}
            {selectedDeck && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-card shadow-2xl">
                        <div className="rounded-t-lg border-b border-border bg-muted/50 p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-foreground">
                                    {selectedDeck.title}
                                </h2>
                                <button
                                    onClick={() => setSelectedDeck(null)}
                                    className="text-2xl font-bold text-muted-foreground hover:text-muted-foreground"
                                >
                                    x
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-scroll p-6">
                            <DeckStructureEditor
                                initialSlides={selectedDeck.slides}
                                onSave={async (slides) => {
                                    try {
                                        const supabase = createClient();
                                        const { error } = await supabase
                                            .from("deck_structures")
                                            .update({ slides })
                                            .eq("id", selectedDeck.id);

                                        if (!error) {
                                            const { data: deckData } = await supabase
                                                .from("deck_structures")
                                                .select("*")
                                                .eq("funnel_project_id", projectId)
                                                .order("created_at", {
                                                    ascending: false,
                                                });

                                            if (deckData) {
                                                const transformed = deckData.map(
                                                    (deck: any) => ({
                                                        id: deck.id,
                                                        title:
                                                            deck.metadata?.title ||
                                                            "Untitled Presentation",
                                                        slideCount: Array.isArray(
                                                            deck.slides
                                                        )
                                                            ? deck.slides.length
                                                            : deck.total_slides || 60,
                                                        status: "completed" as const,
                                                        slides: deck.slides || [],
                                                        version: 1,
                                                        created_at: deck.created_at,
                                                        presentation_type:
                                                            deck.presentation_type ||
                                                            "webinar",
                                                        template_type:
                                                            deck.template_type,
                                                        sections: deck.sections,
                                                    })
                                                );
                                                setDeckStructures(transformed);
                                            }
                                            setSelectedDeck(null);
                                        }
                                    } catch (error) {
                                        logger.error(
                                            { error },
                                            "Failed to save deck structure"
                                        );
                                        throw error;
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </StepLayout>
    );
}
