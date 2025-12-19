"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import {
    Sparkles,
    FileText,
    Trash2,
    Download,
    Pencil,
    Play,
    Square,
    RefreshCw,
    Loader2,
    Image as ImageIcon,
    Type,
    Palette,
    X,
    LayoutGrid,
    AlertCircle,
    CheckCircle2,
    Info,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useIsMobile } from "@/lib/mobile-utils.client";
import {
    PRESENTATION_LIMIT,
    PresentationStatus,
    type PresentationStatusType,
    countsTowardQuota,
} from "@/lib/constants/presentations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import type { BusinessProfile } from "@/types/business-profile";

// Enhanced presentation components (Issue #327)
import {
    DraggableSlides,
    SlideEditorPanel,
    SlidePreview,
    GenerationBanner,
    GenerationErrorDialog,
    type SlideData,
    type BrandDesign as BrandDesignType,
} from "@/components/presentations";
import { useStreamingGeneration } from "@/lib/presentations/use-streaming-generation";

// ============================================
// Types
// ============================================

interface DeckStructure {
    id: string;
    title: string;
    slideCount: number;
    slides: Array<{
        slideNumber: number;
        title: string;
        description: string;
        section: string;
    }>;
    created_at: string;
}

interface BrandDesign {
    id: string;
    primary_color: string;
    secondary_color: string | null;
    accent_color: string | null;
    background_color: string;
    text_color: string;
    design_style: string | null;
    brand_name: string | null;
}

// Re-export the SlideData type as GeneratedSlide for backward compatibility
type GeneratedSlide = SlideData;

interface Presentation {
    id: string;
    title: string;
    slides: GeneratedSlide[];
    status: PresentationStatusType;
    deckStructureId: string;
    created_at: string;
    customization: PresentationCustomization;
    total_expected_slides?: number;
    error_message?: string;
}

interface PresentationCustomization {
    textDensity: "minimal" | "balanced" | "detailed";
    visualStyle: "professional" | "creative" | "minimal" | "bold";
    emphasisPreference: "text" | "visuals" | "balanced";
    animationLevel: "none" | "subtle" | "moderate" | "dynamic";
    imageStyle: "photography" | "illustration" | "abstract" | "icons";
}

// ============================================
// Main Component
// ============================================

export default function Step5Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const router = useRouter();
    const isMobile = useIsMobile("lg");
    const { toast } = useToast();

    // Core state
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(
        null
    );
    const [brandDesign, setBrandDesign] = useState<BrandDesign | null>(null);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [presentations, setPresentations] = useState<Presentation[]>([]);

    // Selection state
    const [selectedDeckId, setSelectedDeckId] = useState<string>("");

    // Customization state
    const [customization, setCustomization] = useState<PresentationCustomization>({
        textDensity: "balanced",
        visualStyle: "professional",
        emphasisPreference: "balanced",
        animationLevel: "subtle",
        imageStyle: "photography",
    });

    // Generation state - now using streaming hook (Issue #327, Issue #331)
    const streaming = useStreamingGeneration();
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorDialogType, setErrorDialogType] = useState<"timeout" | "general">(
        "general"
    );

    // Editor state
    const [selectedPresentation, setSelectedPresentation] =
        useState<Presentation | null>(null);
    const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editPrompt, setEditPrompt] = useState("");
    const [isEditingSlide, setIsEditingSlide] = useState(false);

    // Loading states
    const [isLoading, setIsLoading] = useState(true);

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    // Redirect mobile users
    useEffect(() => {
        if (isMobile && projectId) {
            const urlParams = new URLSearchParams({
                feature: "PowerPoint Presentation Generator",
                description:
                    "The presentation generator requires a desktop computer for the three-panel editing experience and drag-and-drop slide management.",
                returnPath: `/funnel-builder/${projectId}`,
            });
            router.push(`/desktop-required?${urlParams.toString()}`);
        }
    }, [isMobile, projectId, router]);

    // Resolve params
    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setProjectId(resolved.projectId);
        };
        resolveParams();
    }, [params]);

    // Load project and dependencies
    useEffect(() => {
        const loadData = async () => {
            if (!projectId) return;

            setIsLoading(true);
            try {
                const supabase = createClient();

                // Load project
                const { data: projectData, error: projectError } = await supabase
                    .from("funnel_projects")
                    .select("*")
                    .eq("id", projectId)
                    .single();

                if (projectError) throw projectError;
                setProject(projectData);

                // Load business profile
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
                    logger.warn(
                        { error: profileError },
                        "Failed to load business profile"
                    );
                }

                // Load brand design
                const { data: brandData } = await supabase
                    .from("brand_designs")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .maybeSingle();

                if (brandData) {
                    setBrandDesign(brandData);
                }

                // Load deck structures from Step 4
                const { data: deckData } = await supabase
                    .from("deck_structures")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (deckData) {
                    const transformed = deckData.map((deck: any) => ({
                        id: deck.id,
                        title: deck.metadata?.title || "Untitled Presentation",
                        slideCount: Array.isArray(deck.slides)
                            ? deck.slides.length
                            : deck.total_slides || 60,
                        slides: deck.slides || [],
                        created_at: deck.created_at,
                    }));
                    setDeckStructures(transformed);

                    // Auto-select first deck if available
                    if (transformed.length > 0 && !selectedDeckId) {
                        setSelectedDeckId(transformed[0].id);
                    }
                }

                // Load existing presentations from database
                try {
                    const presentationsResponse = await fetch(
                        `/api/presentations?projectId=${projectId}`,
                        { credentials: "include" }
                    );

                    if (presentationsResponse.ok) {
                        const presentationsResult = await presentationsResponse.json();
                        if (presentationsResult.presentations) {
                            const dbPresentations =
                                presentationsResult.presentations.map((p: any) => ({
                                    id: p.id,
                                    title: p.title,
                                    slides: p.slides || [],
                                    status: p.status,
                                    deckStructureId: p.deck_structure_id,
                                    created_at: p.created_at,
                                    customization: p.customization || {},
                                    total_expected_slides: p.total_expected_slides,
                                    error_message: p.error_message,
                                }));
                            setPresentations(dbPresentations);
                        }
                    }
                } catch (presentationsError) {
                    logger.warn(
                        { error: presentationsError },
                        "Failed to load presentations"
                    );
                }
            } catch (error) {
                logger.error({ error }, "Failed to load Step 5 data");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [projectId, selectedDeckId]);

    // Get selected deck
    const selectedDeck = useMemo(
        () => deckStructures.find((d) => d.id === selectedDeckId),
        [deckStructures, selectedDeckId]
    );

    // Count non-failed presentations (failed ones don't count against quota)
    // Uses shared countsTowardQuota function for consistency with backend
    const presentationCount = useMemo(() => {
        return presentations.filter((p) =>
            countsTowardQuota(p.status as PresentationStatusType)
        ).length;
    }, [presentations]);

    const hasReachedLimit = presentationCount >= PRESENTATION_LIMIT;
    const remainingGenerations = Math.max(0, PRESENTATION_LIMIT - presentationCount);

    // Check dependencies
    const hasBusinessProfile =
        businessProfile !== null &&
        (businessProfile.completion_status?.overall ?? 0) > 0;
    const hasBrandDesign = brandDesign !== null;
    const hasDeckStructure = deckStructures.length > 0;
    const canGenerate =
        hasBusinessProfile &&
        hasBrandDesign &&
        hasDeckStructure &&
        selectedDeckId &&
        !hasReachedLimit;

    // Helper functions for slide generation
    const generateSlideContent = useCallback(
        (deckSlide: any, customization: PresentationCustomization): string[] => {
            const baseContent = deckSlide?.description || "";
            const points = baseContent.split(". ").filter((p: string) => p.length > 0);

            switch (customization.textDensity) {
                case "minimal":
                    return points.slice(0, 2);
                case "detailed":
                    return points.length > 0 ? points : ["Content placeholder"];
                default:
                    return points.slice(0, 4);
            }
        },
        []
    );

    const generateSpeakerNotes = useCallback((deckSlide: any): string => {
        return deckSlide?.description || "Speaker notes will be generated here.";
    }, []);

    const determineLayoutType = useCallback(
        (index: number, section?: string): GeneratedSlide["layoutType"] => {
            if (index === 0) return "title";
            if (section === "hook" || section === "connect") {
                return index % 3 === 0 ? "quote" : "content_left";
            }
            if (section === "offer" || section === "invite") {
                return index % 2 === 0 ? "cta" : "bullets";
            }
            const layouts: GeneratedSlide["layoutType"][] = [
                "bullets",
                "content_left",
                "content_right",
                "statistics",
                "process",
            ];
            return layouts[index % layouts.length];
        },
        []
    );

    // Refresh presentations from database
    const refreshPresentations = useCallback(async () => {
        if (!projectId) return;

        try {
            const presentationsResponse = await fetch(
                `/api/presentations?projectId=${projectId}`,
                { credentials: "include" }
            );

            if (presentationsResponse.ok) {
                const presentationsResult = await presentationsResponse.json();
                if (presentationsResult.presentations) {
                    const dbPresentations = presentationsResult.presentations.map(
                        (p: any) => ({
                            id: p.id,
                            title: p.title,
                            slides: p.slides || [],
                            status: p.status,
                            deckStructureId: p.deck_structure_id,
                            created_at: p.created_at,
                            customization: p.customization || {},
                            total_expected_slides: p.total_expected_slides,
                            error_message: p.error_message,
                        })
                    );
                    setPresentations(dbPresentations);
                }
            }
        } catch (error) {
            logger.warn({ error }, "Failed to refresh presentations");
        }
    }, [projectId]);

    // Handle editor close with status update
    const handleEditorClose = useCallback(async () => {
        const wasGenerating = streaming.isGenerating;
        const currentPresentationId = selectedPresentation?.id;
        const slideCount = selectedPresentation?.slides.length || 0;

        // Stop generation if in progress
        if (wasGenerating) {
            streaming.stopGeneration();
        }

        // Close the editor
        setIsEditorOpen(false);

        // If we were generating, pause the presentation
        if (
            wasGenerating &&
            currentPresentationId &&
            !currentPresentationId.startsWith("generating-")
        ) {
            try {
                const response = await fetch("/api/presentations", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        presentationId: currentPresentationId,
                        status: PresentationStatus.PAUSED,
                    }),
                });

                if (response.ok) {
                    toast({
                        title: "Presentation Paused",
                        description: `Saved ${slideCount} slides. You can resume generation later.`,
                    });
                } else {
                    throw new Error("Failed to update status");
                }
            } catch (error) {
                logger.error({ error }, "Failed to pause presentation");
                toast({
                    title: "Warning",
                    description:
                        "Could not save pause status. Your slides are saved, but you may need to refresh to see the correct status.",
                    variant: "destructive",
                });
            }
        }

        // Refresh presentations to get latest status from database
        await refreshPresentations();
    }, [streaming, selectedPresentation, refreshPresentations, toast]);

    // Handle generation with real-time streaming (Issue #327, Issue #331)
    // Now immediately opens editor with skeleton loading - no intermediate screen
    const handleGeneratePresentation = useCallback(async () => {
        // CRITICAL: Prevent duplicate generation calls (Issue #345)
        if (streaming.isGenerating) {
            logger.warn({}, "Generation already in progress, ignoring duplicate click");
            return;
        }
        if (!canGenerate || !selectedDeck) return;

        // Create a temporary presentation object for immediate editor display (Issue #331)
        const tempPresentation: Presentation = {
            id: "generating-" + Date.now(),
            title: `${selectedDeck.title} - Generating...`,
            slides: [], // Start empty, slides will appear as they generate
            status: PresentationStatus.GENERATING,
            deckStructureId: selectedDeck.id,
            created_at: new Date().toISOString(),
            customization,
        };

        // Immediately open editor with skeleton loading state (Issue #331)
        setSelectedPresentation(tempPresentation);
        setSelectedSlideIndex(0);
        setIsEditorOpen(true);

        streaming.startGeneration({
            projectId,
            deckStructureId: selectedDeck.id,
            customization,
            onSlideGenerated: (slide, progress) => {
                // Guard against undefined or invalid slides from SSE (Issue #331)
                if (!slide || typeof slide.slideNumber !== "number") {
                    logger.warn(
                        { slide, progress },
                        "Received invalid slide data from SSE"
                    );
                    return;
                }

                // Update the temporary presentation with new slide (Issue #331)
                setSelectedPresentation((prev) => {
                    if (!prev) return prev;

                    // Guard against duplicate slides (can happen on SSE reconnection)
                    const slideExists = prev.slides.some(
                        (s) => s.slideNumber === slide.slideNumber
                    );
                    if (slideExists) {
                        return prev;
                    }

                    const updatedSlides = [...prev.slides, slide as GeneratedSlide];
                    // Auto-select the newest slide as it arrives to show real-time progress
                    setSelectedSlideIndex(updatedSlides.length - 1);
                    return {
                        ...prev,
                        slides: updatedSlides,
                    };
                });

                logger.info(
                    { slideNumber: slide.slideNumber, progress },
                    "Slide generated in real-time"
                );
            },
            onComplete: (presentationId, slides) => {
                // Create final presentation record for local state
                const newPresentation: Presentation = {
                    id: presentationId,
                    title: `${selectedDeck.title} - Generated`,
                    slides: slides as GeneratedSlide[],
                    status: PresentationStatus.COMPLETED,
                    deckStructureId: selectedDeck.id,
                    created_at: new Date().toISOString(),
                    customization,
                };

                // Update the selected presentation with final data
                setSelectedPresentation(newPresentation);
                setPresentations((prev) => [newPresentation, ...prev]);

                toast({
                    title: "Presentation Complete",
                    description: `Successfully created ${slides.length} slides. You can now edit and export.`,
                });

                logger.info(
                    { projectId, deckId: selectedDeck.id, slideCount: slides.length },
                    "Presentation generated with streaming"
                );
            },
            onError: (error, isTimeout) => {
                // Close editor on error
                setIsEditorOpen(false);
                setSelectedPresentation(null);

                // Show friendly dialog for timeout errors
                if (isTimeout || error === "AI_PROVIDER_TIMEOUT") {
                    setErrorDialogType("timeout");
                    setShowErrorDialog(true);
                } else {
                    setErrorDialogType("general");
                    setShowErrorDialog(true);
                }
            },
        });
    }, [
        canGenerate,
        selectedDeck,
        customization,
        projectId,
        streaming.isGenerating,
        toast,
    ]);

    // Handle resume generation for incomplete presentations
    const handleResumeGeneration = useCallback(
        (presentation: Presentation) => {
            // CRITICAL: Prevent duplicate generation calls (Issue #345)
            if (streaming.isGenerating) {
                logger.warn(
                    {},
                    "Generation already in progress, ignoring resume request"
                );
                return;
            }
            if (!presentation || !presentation.deckStructureId) return;

            const existingSlides = presentation.slides || [];
            const resumeFromSlide = existingSlides.length + 1;

            // Update presentation status to generating
            setSelectedPresentation({
                ...presentation,
                status: PresentationStatus.GENERATING,
            });

            streaming.startGeneration({
                projectId,
                deckStructureId: presentation.deckStructureId,
                customization: presentation.customization || customization,
                resumePresentationId: presentation.id,
                resumeFromSlide,
                existingSlides: existingSlides as GeneratedSlide[],
                onSlideGenerated: (slide, progress) => {
                    if (!slide || typeof slide.slideNumber !== "number") {
                        logger.warn(
                            { slide, progress },
                            "Received invalid slide data from SSE"
                        );
                        return;
                    }

                    setSelectedPresentation((prev) => {
                        if (!prev) return prev;
                        const updatedSlides = [...prev.slides, slide as GeneratedSlide];
                        return {
                            ...prev,
                            slides: updatedSlides,
                        };
                    });

                    logger.info(
                        { slideNumber: slide.slideNumber, progress },
                        "Slide generated during resume"
                    );
                },
                onComplete: (presentationId, slides) => {
                    const completedPresentation: Presentation = {
                        ...presentation,
                        id: presentationId,
                        slides: slides as GeneratedSlide[],
                        status: PresentationStatus.COMPLETED,
                    };

                    setSelectedPresentation(completedPresentation);
                    setPresentations((prev) =>
                        prev.map((p) =>
                            p.id === presentation.id ? completedPresentation : p
                        )
                    );

                    toast({
                        title: "Resume Complete",
                        description: `Presentation completed with ${slides.length} slides.`,
                    });

                    logger.info(
                        { presentationId, slideCount: slides.length },
                        "Resumed presentation generation complete"
                    );
                },
                onError: (error, isTimeout) => {
                    // Don't close editor on error - keep the partial presentation
                    setSelectedPresentation((prev) => {
                        if (!prev) return prev;

                        toast({
                            title: "Generation Paused",
                            description: `Generation stopped. You can resume later. ${prev.slides.length} slides saved.`,
                            variant: "destructive",
                        });

                        return { ...prev, status: PresentationStatus.DRAFT };
                    });
                },
            });
        },
        [projectId, customization, streaming.isGenerating, toast]
    );

    // Handle starting fresh - deletes existing slides and starts over
    const handleStartFresh = useCallback(
        async (presentation: Presentation) => {
            if (!presentation || !presentation.deckStructureId) return;

            const deck = deckStructures.find(
                (d) => d.id === presentation.deckStructureId
            );
            if (!deck) {
                toast({
                    title: "Error",
                    description: "Could not find the original deck structure.",
                    variant: "destructive",
                });
                return;
            }

            // Delete the existing presentation
            try {
                await fetch(`/api/presentations/${presentation.id}`, {
                    method: "DELETE",
                    credentials: "include",
                });

                setPresentations((prev) =>
                    prev.filter((p) => p.id !== presentation.id)
                );
            } catch (error) {
                logger.error(
                    { error },
                    "Failed to delete presentation for fresh start"
                );
            }

            // Start a new generation
            setSelectedDeckId(deck.id);
            handleGeneratePresentation();
        },
        [deckStructures, toast, handleGeneratePresentation]
    );

    // Handle slide actions
    const handleDuplicateSlide = useCallback(
        (index: number) => {
            if (!selectedPresentation) return;

            const slideToDuplicate = selectedPresentation.slides[index];
            const newSlide = {
                ...slideToDuplicate,
                slideNumber: selectedPresentation.slides.length + 1,
            };

            const updatedPresentation = {
                ...selectedPresentation,
                slides: [
                    ...selectedPresentation.slides.slice(0, index + 1),
                    newSlide,
                    ...selectedPresentation.slides.slice(index + 1),
                ],
            };

            setSelectedPresentation(updatedPresentation);
            setPresentations((prev) =>
                prev.map((p) =>
                    p.id === updatedPresentation.id ? updatedPresentation : p
                )
            );

            toast({
                title: "Slide Duplicated",
                description: `Slide ${index + 1} has been duplicated.`,
            });
        },
        [selectedPresentation, toast]
    );

    const handleDeleteSlide = useCallback(
        (index: number) => {
            if (!selectedPresentation || selectedPresentation.slides.length <= 1) {
                toast({
                    title: "Cannot Delete",
                    description: "Presentation must have at least one slide.",
                    variant: "destructive",
                });
                return;
            }

            const updatedPresentation = {
                ...selectedPresentation,
                slides: selectedPresentation.slides.filter((_, i) => i !== index),
            };

            setSelectedPresentation(updatedPresentation);
            setPresentations((prev) =>
                prev.map((p) =>
                    p.id === updatedPresentation.id ? updatedPresentation : p
                )
            );

            if (selectedSlideIndex >= index && selectedSlideIndex > 0) {
                setSelectedSlideIndex(selectedSlideIndex - 1);
            }

            toast({
                title: "Slide Deleted",
                description: `Slide ${index + 1} has been removed.`,
            });
        },
        [selectedPresentation, selectedSlideIndex, toast]
    );

    // Handle slide reordering with backend persistence (Issue #327)
    const handleSlideReorder = useCallback(
        async (newOrder: number[]) => {
            if (!selectedPresentation) return;

            try {
                const response = await fetch(
                    `/api/presentations/${selectedPresentation.id}/reorder`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ newOrder }),
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to reorder slides");
                }

                const result = await response.json();

                const updatedPresentation = {
                    ...selectedPresentation,
                    slides: result.slides,
                };

                setSelectedPresentation(updatedPresentation);
                setPresentations((prev) =>
                    prev.map((p) =>
                        p.id === updatedPresentation.id ? updatedPresentation : p
                    )
                );

                logger.info({ newOrder }, "Slides reordered successfully");
            } catch (error) {
                logger.error({ error }, "Failed to reorder slides");
                toast({
                    title: "Reorder Failed",
                    description: "Failed to save slide order. Please try again.",
                    variant: "destructive",
                });
            }
        },
        [selectedPresentation, toast]
    );

    // Handle slide update from editor panel (Issue #327)
    const handleSlideUpdate = useCallback(
        (updatedSlide: GeneratedSlide) => {
            if (!selectedPresentation) return;

            const updatedSlides = selectedPresentation.slides.map((s) =>
                s.slideNumber === updatedSlide.slideNumber ? updatedSlide : s
            );

            const updatedPresentation = {
                ...selectedPresentation,
                slides: updatedSlides,
            };

            setSelectedPresentation(updatedPresentation);
            setPresentations((prev) =>
                prev.map((p) =>
                    p.id === updatedPresentation.id ? updatedPresentation : p
                )
            );
        },
        [selectedPresentation]
    );

    const handleDeletePresentation = useCallback(
        async (presentationId: string) => {
            // Confirm deletion with warning about quota
            const confirmed = window.confirm(
                "Are you sure you want to delete this presentation?\n\n" +
                    "Note: Deleting a presentation does NOT free up your generation quota. " +
                    `You are limited to ${PRESENTATION_LIMIT} presentations per funnel regardless of deletions.`
            );

            if (!confirmed) return;

            try {
                const response = await fetch(`/api/presentations/${presentationId}`, {
                    method: "DELETE",
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error("Failed to delete presentation");
                }

                setPresentations((prev) => prev.filter((p) => p.id !== presentationId));
                toast({
                    title: "Presentation Deleted",
                    description: "The presentation has been removed.",
                });
            } catch (error) {
                logger.error({ error }, "Failed to delete presentation");
                toast({
                    title: "Delete Failed",
                    description: "Failed to delete presentation. Please try again.",
                    variant: "destructive",
                });
            }
        },
        [toast]
    );

    const handleDownloadPptx = useCallback(
        async (presentation: Presentation) => {
            try {
                toast({
                    title: "Exporting...",
                    description: "Generating your PowerPoint file.",
                });

                const response = await fetch("/api/presentations/export", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        presentationId: presentation.id,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to export presentation");
                }

                // Download the file
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${presentation.title}.pptx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast({
                    title: "Download Complete",
                    description: "Your PowerPoint presentation has been downloaded.",
                });

                logger.info(
                    { presentationId: presentation.id },
                    "PPTX downloaded successfully"
                );
            } catch (error) {
                logger.error({ error }, "Failed to download PPTX");
                toast({
                    title: "Export Failed",
                    description:
                        error instanceof Error
                            ? error.message
                            : "Failed to export presentation. Please try again.",
                    variant: "destructive",
                });
            }
        },
        [toast]
    );

    // Render loading state
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const hasCompletedPresentation = presentations.some(
        (p) => p.status === PresentationStatus.COMPLETED
    );

    // Render main page
    return (
        <StepLayout
            currentStep={5}
            projectId={projectId}
            funnelName={project?.name}
            completedSteps={completedSteps}
            nextDisabled={!hasCompletedPresentation}
            nextLabel={
                hasCompletedPresentation
                    ? "Continue to Enrollment Page"
                    : "Generate Presentation First"
            }
            stepTitle="Create Presentation"
            stepDescription="Transform your deck structure into a stunning PowerPoint presentation with AI-generated images and animations"
        >
            <div className="space-y-8">
                {/* Dependency Warnings */}
                {!hasDeckStructure && (
                    <DependencyWarning
                        message="Create your presentation structure in Step 4 before generating your PowerPoint presentation. The structure provides the framework for your slides."
                        requiredStep={4}
                        requiredStepName="Presentation Structure"
                        projectId={projectId}
                    />
                )}

                {hasDeckStructure && !hasBrandDesign && (
                    <DependencyWarning
                        message="Add your brand design in Step 3 to ensure your presentation matches your brand colors and style."
                        requiredStep={3}
                        requiredStepName="Brand Design"
                        projectId={projectId}
                    />
                )}

                {hasDeckStructure && hasBrandDesign && !hasBusinessProfile && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                            <div>
                                <p className="font-medium text-amber-800">
                                    Business profile not found
                                </p>
                                <p className="mt-1 text-sm text-amber-700">
                                    For best results, complete your business profile in
                                    Step 1. AI will use your business context to
                                    generate more personalized content.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Note: GenerationBanner removed per Issue #331 - now showing progress directly in editor header */}

                {/* Generation Interface */}
                {!streaming.isGenerating && !isEditorOpen && (
                    <>
                        {/* Deck Structure Selector */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Select Deck Structure
                                </CardTitle>
                                <CardDescription>
                                    Choose which presentation structure to transform
                                    into a PowerPoint
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {deckStructures.length > 0 ? (
                                    <Select
                                        value={selectedDeckId}
                                        onValueChange={setSelectedDeckId}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a deck structure" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {deckStructures.map((deck) => (
                                                <SelectItem
                                                    key={deck.id}
                                                    value={deck.id}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span>{deck.title}</span>
                                                        <span className="text-muted-foreground">
                                                            ({deck.slideCount} slides)
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No deck structures available. Create one in Step
                                        4 first.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Customization Panel */}
                        {selectedDeck && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Palette className="h-5 w-5 text-primary" />
                                        Customize Your Presentation
                                    </CardTitle>
                                    <CardDescription>
                                        Adjust these settings to control how AI
                                        generates your slides
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {/* Text Density */}
                                        <div className="space-y-3">
                                            <Label className="flex items-center gap-2">
                                                <Type className="h-4 w-4" />
                                                Text Density
                                            </Label>
                                            <Select
                                                value={customization.textDensity}
                                                onValueChange={(
                                                    value:
                                                        | "minimal"
                                                        | "balanced"
                                                        | "detailed"
                                                ) =>
                                                    setCustomization({
                                                        ...customization,
                                                        textDensity: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="minimal">
                                                        Minimal - Few words, high impact
                                                    </SelectItem>
                                                    <SelectItem value="balanced">
                                                        Balanced - Key points only
                                                    </SelectItem>
                                                    <SelectItem value="detailed">
                                                        Detailed - Comprehensive content
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Visual Style */}
                                        <div className="space-y-3">
                                            <Label className="flex items-center gap-2">
                                                <Palette className="h-4 w-4" />
                                                Visual Style
                                            </Label>
                                            <Select
                                                value={customization.visualStyle}
                                                onValueChange={(
                                                    value:
                                                        | "professional"
                                                        | "creative"
                                                        | "minimal"
                                                        | "bold"
                                                ) =>
                                                    setCustomization({
                                                        ...customization,
                                                        visualStyle: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="professional">
                                                        Professional - Clean and
                                                        corporate
                                                    </SelectItem>
                                                    <SelectItem value="creative">
                                                        Creative - Bold and expressive
                                                    </SelectItem>
                                                    <SelectItem value="minimal">
                                                        Minimal - Simple and elegant
                                                    </SelectItem>
                                                    <SelectItem value="bold">
                                                        Bold - High contrast and
                                                        striking
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Emphasis Preference */}
                                        <div className="space-y-3">
                                            <Label className="flex items-center gap-2">
                                                <LayoutGrid className="h-4 w-4" />
                                                Content Focus
                                            </Label>
                                            <Select
                                                value={customization.emphasisPreference}
                                                onValueChange={(
                                                    value:
                                                        | "text"
                                                        | "visuals"
                                                        | "balanced"
                                                ) =>
                                                    setCustomization({
                                                        ...customization,
                                                        emphasisPreference: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text">
                                                        Text-focused - Words drive the
                                                        story
                                                    </SelectItem>
                                                    <SelectItem value="visuals">
                                                        Visual-focused - Images lead
                                                    </SelectItem>
                                                    <SelectItem value="balanced">
                                                        Balanced - Equal emphasis
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Animation Level */}
                                        <div className="space-y-3">
                                            <Label className="flex items-center gap-2">
                                                <Play className="h-4 w-4" />
                                                Animation Level
                                            </Label>
                                            <Select
                                                value={customization.animationLevel}
                                                onValueChange={(
                                                    value:
                                                        | "none"
                                                        | "subtle"
                                                        | "moderate"
                                                        | "dynamic"
                                                ) =>
                                                    setCustomization({
                                                        ...customization,
                                                        animationLevel: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        None - Static slides
                                                    </SelectItem>
                                                    <SelectItem value="subtle">
                                                        Subtle - Gentle transitions
                                                    </SelectItem>
                                                    <SelectItem value="moderate">
                                                        Moderate - Standard animations
                                                    </SelectItem>
                                                    <SelectItem value="dynamic">
                                                        Dynamic - Rich motion effects
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Image Style */}
                                        <div className="space-y-3">
                                            <Label className="flex items-center gap-2">
                                                <ImageIcon className="h-4 w-4" />
                                                Image Style
                                            </Label>
                                            <Select
                                                value={customization.imageStyle}
                                                onValueChange={(
                                                    value:
                                                        | "photography"
                                                        | "illustration"
                                                        | "abstract"
                                                        | "icons"
                                                ) =>
                                                    setCustomization({
                                                        ...customization,
                                                        imageStyle: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="photography">
                                                        Photography - Real-world photos
                                                    </SelectItem>
                                                    <SelectItem value="illustration">
                                                        Illustration - Drawn graphics
                                                    </SelectItem>
                                                    <SelectItem value="abstract">
                                                        Abstract - Artistic visuals
                                                    </SelectItem>
                                                    <SelectItem value="icons">
                                                        Icons - Clean iconography
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Brand Preview */}
                                    {brandDesign && (
                                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                                            <h4 className="mb-3 text-sm font-medium">
                                                Brand Colors Applied
                                            </h4>
                                            <div className="flex gap-2">
                                                <div
                                                    className="h-8 w-8 rounded-full border"
                                                    style={{
                                                        backgroundColor:
                                                            brandDesign.primary_color,
                                                    }}
                                                    title="Primary"
                                                />
                                                <div
                                                    className="h-8 w-8 rounded-full border"
                                                    style={{
                                                        backgroundColor:
                                                            brandDesign.secondary_color ||
                                                            "#666",
                                                    }}
                                                    title="Secondary"
                                                />
                                                <div
                                                    className="h-8 w-8 rounded-full border"
                                                    style={{
                                                        backgroundColor:
                                                            brandDesign.accent_color ||
                                                            "#999",
                                                    }}
                                                    title="Accent"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Pre-generation tips */}
                                    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                                        <div className="flex items-start gap-2">
                                            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                            <p>
                                                Be sure your business profile on step 1,
                                                your offer definition on step 2, your
                                                brand guidelines on step 3, and your
                                                presentation script on step 4 are
                                                completed to your liking before
                                                generating.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Generation limit info */}
                                    {!hasReachedLimit && (
                                        <div className="mb-4 text-center text-sm text-muted-foreground">
                                            <span className="font-medium">
                                                {remainingGenerations}
                                            </span>{" "}
                                            of {PRESENTATION_LIMIT} presentations
                                            remaining
                                        </div>
                                    )}

                                    {/* Limit reached warning */}
                                    {hasReachedLimit && (
                                        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                                <div>
                                                    <p className="font-medium">
                                                        Generation limit reached
                                                    </p>
                                                    <p className="mt-1 text-amber-700">
                                                        You have used all{" "}
                                                        {PRESENTATION_LIMIT}{" "}
                                                        presentations for this funnel.
                                                        Edit your existing presentations
                                                        or contact support for
                                                        additional quota.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Generate Button */}
                                    <div className="flex justify-center pt-4">
                                        <Button
                                            onClick={handleGeneratePresentation}
                                            disabled={!canGenerate}
                                            size="lg"
                                            className="px-8"
                                            title={
                                                hasReachedLimit
                                                    ? `Limit of ${PRESENTATION_LIMIT} presentations reached`
                                                    : undefined
                                            }
                                        >
                                            <Sparkles className="mr-2 h-5 w-5" />
                                            {hasReachedLimit
                                                ? "Generation Limit Reached"
                                                : "Generate My Presentation"}
                                        </Button>
                                    </div>

                                    <p className="text-center text-sm text-muted-foreground">
                                        Generation time: ~12-18 minutes for{" "}
                                        {selectedDeck.slideCount} slides
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* My Presentations */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>My Presentations</CardTitle>
                                    <span className="text-sm text-muted-foreground">
                                        {presentationCount} of {PRESENTATION_LIMIT} used
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {presentations.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                        <p className="mb-2">No presentations yet.</p>
                                        <p className="text-sm">
                                            Select a deck structure and customize your
                                            settings to generate your first
                                            presentation!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {presentations.map((presentation) => {
                                            // Determine presentation status display
                                            const isDraft =
                                                presentation.status ===
                                                PresentationStatus.DRAFT;
                                            const isPaused =
                                                presentation.status ===
                                                PresentationStatus.PAUSED;
                                            const isIncomplete =
                                                (isDraft || isPaused) &&
                                                presentation.total_expected_slides &&
                                                presentation.slides.length <
                                                    presentation.total_expected_slides;
                                            const isFailed =
                                                presentation.status ===
                                                PresentationStatus.FAILED;
                                            const isGenerating =
                                                presentation.status ===
                                                PresentationStatus.GENERATING;

                                            // Build slide count text
                                            const slideCountText = isIncomplete
                                                ? `${presentation.slides.length} of ${presentation.total_expected_slides} slides`
                                                : `${presentation.slides.length} slides`;

                                            return (
                                                <div
                                                    key={presentation.id}
                                                    className={cn(
                                                        "flex items-center justify-between rounded-lg border p-4 transition-colors",
                                                        (isDraft || isPaused) &&
                                                            "border-amber-300 bg-amber-50/30",
                                                        isFailed &&
                                                            "border-red-300 bg-red-50/30",
                                                        isGenerating &&
                                                            "border-primary/50 bg-primary/5",
                                                        !isDraft &&
                                                            !isPaused &&
                                                            !isFailed &&
                                                            !isGenerating &&
                                                            "border-border hover:border-primary/40"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* Status badge */}
                                                        {isDraft && (
                                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                                                Draft
                                                            </span>
                                                        )}
                                                        {isPaused && (
                                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                                                <Square className="mr-1 h-3 w-3" />
                                                                Paused
                                                            </span>
                                                        )}
                                                        {isFailed && (
                                                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                                                                <AlertCircle className="mr-1 h-3 w-3" />
                                                                Failed
                                                            </span>
                                                        )}
                                                        {isGenerating && (
                                                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                                Generating
                                                            </span>
                                                        )}
                                                        {presentation.status ===
                                                            PresentationStatus.COMPLETED && (
                                                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                                Complete
                                                            </span>
                                                        )}
                                                        <div>
                                                            <h4 className="font-semibold">
                                                                {isDraft || isPaused
                                                                    ? `${isPaused ? "Paused" : "Draft"} - ${presentation.title}`
                                                                    : presentation.title}
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {slideCountText}
                                                                {isIncomplete &&
                                                                    " (incomplete)"}
                                                                {" • "}
                                                                {new Date(
                                                                    presentation.created_at
                                                                ).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedPresentation(
                                                                    presentation
                                                                );
                                                                setIsEditorOpen(true);
                                                                setSelectedSlideIndex(
                                                                    0
                                                                );
                                                            }}
                                                        >
                                                            <Pencil className="mr-1 h-4 w-4" />
                                                            {isDraft || isPaused
                                                                ? "Resume"
                                                                : "Edit"}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDownloadPptx(
                                                                    presentation
                                                                )
                                                            }
                                                            disabled={
                                                                presentation.slides
                                                                    .length === 0
                                                            }
                                                        >
                                                            <Download className="mr-1 h-4 w-4" />
                                                            Download PPTX
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDeletePresentation(
                                                                    presentation.id
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Note: Live Streaming Slide Grid removed per Issue #331 - slides now appear directly in editor */}

                {/* Enhanced Three-Panel Editor (Issue #327, Issue #331) */}
                {isEditorOpen && selectedPresentation && (
                    <div className="fixed inset-0 z-50 bg-background">
                        {/* Editor Header with Generation Progress (Issue #331) */}
                        <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleEditorClose}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                <h2 className="font-semibold">
                                    {selectedPresentation.status ===
                                    PresentationStatus.GENERATING
                                        ? `Generating Presentation...`
                                        : selectedPresentation.title}
                                </h2>
                                {/* Live generation progress indicator (Issue #331) */}
                                {streaming.isGenerating && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            <span className="text-sm text-primary">
                                                Slide {streaming.currentSlide} of{" "}
                                                {streaming.totalSlides}
                                            </span>
                                        </div>
                                        <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
                                                style={{
                                                    width: `${streaming.progress}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {streaming.progress}%
                                        </span>
                                    </div>
                                )}
                                {selectedPresentation.status ===
                                    PresentationStatus.COMPLETED && (
                                    <span className="flex items-center gap-1 text-sm text-green-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Complete
                                    </span>
                                )}
                                {(selectedPresentation.status ===
                                    PresentationStatus.DRAFT ||
                                    selectedPresentation.status ===
                                        PresentationStatus.PAUSED) &&
                                    !streaming.isGenerating && (
                                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-sm font-medium text-amber-800">
                                            {selectedPresentation.status ===
                                            PresentationStatus.PAUSED
                                                ? "Paused"
                                                : "Draft"}{" "}
                                            - {selectedPresentation.slides.length} of{" "}
                                            {selectedPresentation.total_expected_slides ||
                                                "?"}{" "}
                                            slides
                                        </span>
                                    )}
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Resume button for draft/paused presentations */}
                                {(selectedPresentation.status ===
                                    PresentationStatus.DRAFT ||
                                    selectedPresentation.status ===
                                        PresentationStatus.PAUSED) &&
                                    !streaming.isGenerating && (
                                        <>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() =>
                                                    handleResumeGeneration(
                                                        selectedPresentation
                                                    )
                                                }
                                                className="bg-primary hover:bg-primary/90"
                                            >
                                                <Play className="mr-1 h-4 w-4" />
                                                Resume Generation
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleStartFresh(
                                                        selectedPresentation
                                                    )
                                                }
                                            >
                                                <RefreshCw className="mr-1 h-4 w-4" />
                                                Start Fresh
                                            </Button>
                                        </>
                                    )}
                                {streaming.isGenerating && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => streaming.stopGeneration()}
                                        className="text-amber-600 hover:text-amber-700"
                                    >
                                        <Square className="mr-1 h-3 w-3 fill-current" />
                                        Stop & Save
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        selectedPresentation &&
                                        handleDownloadPptx(selectedPresentation)
                                    }
                                    disabled={
                                        streaming.isGenerating ||
                                        selectedPresentation.slides.length === 0
                                    }
                                >
                                    <Download className="mr-1 h-4 w-4" />
                                    Export PPTX
                                </Button>
                                <Button size="sm" onClick={handleEditorClose}>
                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                    {streaming.isGenerating
                                        ? "Save & Pause"
                                        : "Save & Close"}
                                </Button>
                            </div>
                        </div>

                        {/* Three-Panel Layout with Enhanced Components */}
                        <div className="flex h-[calc(100vh-3.5rem)]">
                            {/* Left Panel - Draggable Thumbnail Navigator (~20%) */}
                            <div className="w-[20%] overflow-y-auto border-r border-border bg-muted/30 p-3">
                                <DraggableSlides
                                    slides={selectedPresentation.slides}
                                    selectedIndex={selectedSlideIndex}
                                    brandDesign={brandDesign as BrandDesignType | null}
                                    generatingSlideNumber={
                                        streaming.isGenerating
                                            ? streaming.currentSlide
                                            : undefined
                                    }
                                    totalSlidesToGenerate={
                                        streaming.isGenerating
                                            ? streaming.totalSlides
                                            : undefined
                                    }
                                    onSlideSelect={setSelectedSlideIndex}
                                    onSlideReorder={handleSlideReorder}
                                    onSlideDuplicate={handleDuplicateSlide}
                                    onSlideDelete={handleDeleteSlide}
                                    onAddSlide={() => {
                                        toast({
                                            title: "Coming Soon",
                                            description:
                                                "Add slide functionality will be available soon.",
                                        });
                                    }}
                                />
                            </div>

                            {/* Center Panel - Premium Slide Preview (~55%) */}
                            <SlidePreview
                                slide={selectedPresentation.slides[selectedSlideIndex]}
                                slideIndex={selectedSlideIndex}
                                totalSlides={selectedPresentation.slides.length}
                                brandDesign={brandDesign as BrandDesignType | null}
                                isGenerating={streaming.isGenerating}
                                onPrevious={() =>
                                    setSelectedSlideIndex((prev) =>
                                        Math.max(0, prev - 1)
                                    )
                                }
                                onNext={() =>
                                    setSelectedSlideIndex((prev) =>
                                        Math.min(
                                            selectedPresentation.slides.length - 1,
                                            prev + 1
                                        )
                                    )
                                }
                                className="w-[55%]"
                            />

                            {/* Right Panel - AI Editor with Quick Actions & Voice Input (~25%) */}
                            <div className="w-[25%] overflow-y-auto border-l border-border bg-card p-4">
                                <SlideEditorPanel
                                    slide={
                                        selectedPresentation.slides[selectedSlideIndex]
                                    }
                                    presentationId={selectedPresentation.id}
                                    onSlideUpdate={handleSlideUpdate}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Friendly Error Dialog for Generation Failures (Issue #327) */}
                <GenerationErrorDialog
                    isOpen={showErrorDialog}
                    errorType={errorDialogType}
                    errorMessage={streaming.error || undefined}
                    onRetry={() => {
                        setShowErrorDialog(false);
                        handleGeneratePresentation();
                    }}
                    onClose={() => setShowErrorDialog(false)}
                />
            </div>
        </StepLayout>
    );
}
