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
    Loader2,
    Image as ImageIcon,
    Type,
    Palette,
    X,
    LayoutGrid,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useIsMobile } from "@/lib/mobile-utils.client";
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
    status: "generating" | "completed" | "failed";
    deckStructureId: string;
    created_at: string;
    customization: PresentationCustomization;
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

    // Generation state - now using streaming hook (Issue #327)
    const streaming = useStreamingGeneration();
    const [showGenerationBanner, setShowGenerationBanner] = useState(false);
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

    // Check dependencies
    const hasBusinessProfile =
        businessProfile !== null &&
        (businessProfile.completion_status?.overall ?? 0) > 0;
    const hasBrandDesign = brandDesign !== null;
    const hasDeckStructure = deckStructures.length > 0;
    const canGenerate =
        hasBusinessProfile && hasBrandDesign && hasDeckStructure && selectedDeckId;

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

    // Handle generation with real-time streaming (Issue #327)
    const handleGeneratePresentation = useCallback(async () => {
        if (!canGenerate || !selectedDeck) return;

        setShowGenerationBanner(true);

        streaming.startGeneration({
            projectId,
            deckStructureId: selectedDeck.id,
            customization,
            onSlideGenerated: (slide, progress) => {
                logger.info(
                    { slideNumber: slide.slideNumber, progress },
                    "Slide generated in real-time"
                );
            },
            onComplete: (presentationId, slides) => {
                // Create presentation record for local state
                const newPresentation: Presentation = {
                    id: presentationId,
                    title: `${selectedDeck.title} - Generated`,
                    slides: slides as GeneratedSlide[],
                    status: "completed",
                    deckStructureId: selectedDeck.id,
                    created_at: new Date().toISOString(),
                    customization,
                };

                setPresentations((prev) => [newPresentation, ...prev]);

                toast({
                    title: "Presentation Generated",
                    description: `Successfully created ${slides.length} slides with real-time streaming.`,
                });

                logger.info(
                    { projectId, deckId: selectedDeck.id, slideCount: slides.length },
                    "Presentation generated with streaming"
                );
            },
            onError: (error, isTimeout) => {
                setShowGenerationBanner(false);

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
    }, [canGenerate, selectedDeck, customization, projectId, streaming]);

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
        (p) => p.status === "completed"
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

                {/* Generation Banner - Shows during streaming (Issue #327) */}
                {showGenerationBanner && (
                    <GenerationBanner
                        isGenerating={streaming.isGenerating}
                        progress={streaming.progress}
                        currentSlide={streaming.currentSlide}
                        totalSlides={streaming.totalSlides}
                        error={streaming.error}
                        onCancel={() => {
                            streaming.stopGeneration();
                            setShowGenerationBanner(false);
                        }}
                        onDismiss={() => setShowGenerationBanner(false)}
                    />
                )}

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

                                    {/* Generate Button */}
                                    <div className="flex justify-center pt-4">
                                        <Button
                                            onClick={handleGeneratePresentation}
                                            disabled={!canGenerate}
                                            size="lg"
                                            className="px-8"
                                        >
                                            <Sparkles className="mr-2 h-5 w-5" />
                                            Generate My Presentation
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
                                        {presentations.length} created
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
                                        {presentations.map((presentation) => (
                                            <div
                                                key={presentation.id}
                                                className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
                                            >
                                                <div>
                                                    <h4 className="font-semibold">
                                                        {presentation.title}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {presentation.slides.length}{" "}
                                                        slides •{" "}
                                                        {new Date(
                                                            presentation.created_at
                                                        ).toLocaleDateString()}
                                                    </p>
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
                                                            setSelectedSlideIndex(0);
                                                        }}
                                                    >
                                                        <Pencil className="mr-1 h-4 w-4" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleDownloadPptx(
                                                                presentation
                                                            )
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
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Live Streaming Slide Grid - Shows slides as they generate (Issue #327) */}
                {streaming.isGenerating && streaming.slides.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Slides Generated
                            </CardTitle>
                            <CardDescription>
                                Click on any completed slide to preview it
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-3 md:grid-cols-6 lg:grid-cols-8">
                                {streaming.slides.map((slide, index) => (
                                    <div
                                        key={index}
                                        className="aspect-[16/9] cursor-pointer rounded-lg border border-green-500 bg-white p-2 shadow-sm transition-transform hover:scale-105"
                                        onClick={() => {
                                            // Create a temporary presentation for preview
                                            const tempPresentation: Presentation = {
                                                id: streaming.presentationId || "temp",
                                                title: "Generating...",
                                                slides: streaming.slides as GeneratedSlide[],
                                                status: "generating",
                                                deckStructureId: selectedDeck?.id || "",
                                                created_at: new Date().toISOString(),
                                                customization,
                                            };
                                            setSelectedPresentation(tempPresentation);
                                            setSelectedSlideIndex(index);
                                            setIsEditorOpen(true);
                                        }}
                                    >
                                        <div className="flex h-full flex-col justify-between">
                                            <div className="truncate text-xs font-medium">
                                                {slide.title}
                                            </div>
                                            <CheckCircle2 className="h-4 w-4 self-end text-green-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Enhanced Three-Panel Editor (Issue #327) */}
                {isEditorOpen && selectedPresentation && (
                    <div className="fixed inset-0 z-50 bg-background">
                        {/* Editor Header */}
                        <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsEditorOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                <h2 className="font-semibold">
                                    {selectedPresentation.title}
                                </h2>
                                {selectedPresentation.status === "generating" && (
                                    <span className="text-sm text-primary animate-pulse">
                                        Generating...
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        selectedPresentation &&
                                        handleDownloadPptx(selectedPresentation)
                                    }
                                    disabled={
                                        selectedPresentation.status === "generating"
                                    }
                                >
                                    <Download className="mr-1 h-4 w-4" />
                                    Export PPTX
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setIsEditorOpen(false)}
                                >
                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                    Save & Close
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
