"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { DeckStructureEditor } from "@/components/funnel/deck-structure-editor";
import { Sparkles, FileText, Trash2, Pencil, Download, Copy } from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useIsMobile } from "@/lib/mobile-utils";

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

interface VapiTranscript {
    id: string;
    transcript_text: string;
    created_at: string;
}

export default function Step3Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const router = useRouter();
    const isMobile = useIsMobile("lg"); // Check if below large breakpoint
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [selectedTranscript, setSelectedTranscript] = useState("");
    const [transcripts, setTranscripts] = useState<VapiTranscript[]>([]);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [selectedDeck, setSelectedDeck] = useState<DeckStructure | null>(null);
    const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
    const [editingDeckName, setEditingDeckName] = useState("");

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
    const [slideCount, setSlideCount] = useState<"5" | "55">("55");
    const [presentationType, setPresentationType] = useState<
        "webinar" | "vsl" | "sales_page"
    >("webinar");

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

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
        const loadTranscripts = async () => {
            if (!projectId) return;

            try {
                const supabase = createClient();
                const { data: transcriptData, error: transcriptError } = await supabase
                    .from("vapi_transcripts")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (transcriptError) throw transcriptError;
                setTranscripts(transcriptData || []);

                if (
                    transcriptData &&
                    transcriptData.length > 0 &&
                    !selectedTranscript
                ) {
                    setSelectedTranscript(transcriptData[0].id);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load transcripts");
            }
        };

        loadTranscripts();
    }, [projectId, selectedTranscript]);

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
                        : deck.total_slides || 55,
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
        if (!selectedTranscript) {
            alert("Please select an intake call first");
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

            const response = await fetch("/api/generate/deck-structure", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    transcriptId: selectedTranscript,
                    slideCount,
                    presentationType,
                }),
            });

            clearInterval(progressInterval);
            setGenerationProgress(100);

            if (!response.ok) {
                throw new Error("Failed to generate deck structure");
            }

            const result = await response.json();
            const newDeck: DeckStructure = {
                id: result.deckStructure.id,
                title: result.deckStructure.title || "Presentation Structure",
                slideCount: result.deckStructure.slides?.length || 55,
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
            logger.error({ error }, "Failed to generate deck structure");
            setIsGenerating(false);
            setGenerationProgress(0);
            alert("Failed to generate deck structure. Please try again.");
        }
    };

    const handleViewDeck = (deck: DeckStructure) => {
        setSelectedDeck(deck);
    };

    const handleDownloadDeck = (deck: DeckStructure) => {
        const content = JSON.stringify(deck.slides, null, 2);
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${deck.title.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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

            const { data: newDeck, error } = await supabase
                .from("deck_structures")
                .insert({
                    funnel_project_id: projectId,
                    user_id: user.id,
                    template_type: deck.template_type,
                    total_slides: deck.slideCount,
                    slides: deck.slides,
                    sections: deck.sections || {},
                    metadata: duplicatedMetadata,
                    presentation_type: deck.presentation_type || "webinar",
                })
                .select()
                .single();

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
                        : d.total_slides || 55,
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

            logger.info({ deckId: newDeck.id }, "Presentation structure duplicated");
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

            // Get the current deck to update metadata
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

    const hasCompletedDeck = deckStructures.some((d) => d.status === "completed");

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={3}
            projectId={projectId}
            funnelName={project?.name}
            completedSteps={completedSteps}
            nextDisabled={!hasCompletedDeck}
            nextLabel={
                hasCompletedDeck ? "Create Gamma Deck" : "Generate Structure First"
            }
            stepTitle="Presentation Structure"
            stepDescription="AI generates your presentation outline"
        >
            <div className="space-y-8">
                {/* Dependency Warning */}
                {transcripts.length === 0 && (
                    <DependencyWarning
                        message="You need to complete your AI intake call first to generate a presentation structure."
                        requiredStep={1}
                        requiredStepName="AI Intake Call"
                        projectId={projectId}
                    />
                )}

                {/* Generation Interface */}
                {!isGenerating ? (
                    <div className="rounded-lg border border-brand-100 bg-gradient-to-br from-brand-50 to-primary/5 p-8">
                        <div className="mx-auto mb-6 max-w-md space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-foreground">
                                    Presentation Type
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setPresentationType("webinar")}
                                        className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                                            presentationType === "webinar"
                                                ? "border-brand-500 bg-brand-50 text-brand-900"
                                                : "border-border bg-card text-foreground hover:border-gray-400"
                                        }`}
                                    >
                                        <div className="font-semibold">Webinar</div>
                                        <div className="text-xs text-muted-foreground">
                                            Full 55-slide framework
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setPresentationType("vsl")}
                                        className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                                            presentationType === "vsl"
                                                ? "border-brand-500 bg-brand-50 text-brand-900"
                                                : "border-border bg-card text-foreground hover:border-gray-400"
                                        }`}
                                    >
                                        <div className="font-semibold">VSL</div>
                                        <div className="text-xs text-muted-foreground">
                                            5-10 slide short script
                                        </div>
                                    </button>
                                    <button
                                        onClick={() =>
                                            setPresentationType("sales_page")
                                        }
                                        className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                                            presentationType === "sales_page"
                                                ? "border-brand-500 bg-brand-50 text-brand-900"
                                                : "border-border bg-card text-foreground hover:border-gray-400"
                                        }`}
                                    >
                                        <div className="font-semibold">Sales Page</div>
                                        <div className="text-xs text-muted-foreground">
                                            Pitch video script
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-foreground">
                                    Select Intake Call Source
                                </label>
                                <select
                                    value={selectedTranscript}
                                    onChange={(e) =>
                                        setSelectedTranscript(e.target.value)
                                    }
                                    disabled={transcripts.length === 0}
                                    className="w-full rounded-lg border border-border px-4 py-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-muted"
                                >
                                    {transcripts.length === 0 ? (
                                        <option value="">
                                            No intake calls available
                                        </option>
                                    ) : (
                                        <>
                                            <option value="">
                                                Select an intake call...
                                            </option>
                                            {transcripts.map((transcript) => (
                                                <option
                                                    key={transcript.id}
                                                    value={transcript.id}
                                                >
                                                    Call from{" "}
                                                    {new Date(
                                                        transcript.created_at
                                                    ).toLocaleDateString()}
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>

                                {transcripts.length === 0 && (
                                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-600">
                                        💡 Complete Step 1 first to record intake calls
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-foreground">
                                    Deck Size
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setSlideCount("5")}
                                        className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                                            slideCount === "5"
                                                ? "border-brand-500 bg-brand-50 text-brand-900"
                                                : "border-border bg-card text-foreground hover:border-gray-400"
                                        }`}
                                    >
                                        <div className="font-semibold">5 Slides</div>
                                        <div className="text-xs text-muted-foreground">
                                            Test Mode (~30s)
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setSlideCount("55")}
                                        className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                                            slideCount === "55"
                                                ? "border-brand-500 bg-brand-50 text-brand-900"
                                                : "border-border bg-card text-foreground hover:border-gray-400"
                                        }`}
                                    >
                                        <div className="font-semibold">55 Slides</div>
                                        <div className="text-xs text-muted-foreground">
                                            Full Deck (~3-5 min)
                                        </div>
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {slideCount === "5"
                                        ? "🚀 Quick test with first 5 slides from the framework"
                                        : "📊 Complete Magnetic Masterclass Framework (recommended)"}
                                </p>
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={handleGenerateDeck}
                                disabled={!selectedTranscript}
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    selectedTranscript
                                        ? "bg-brand-500 text-white hover:bg-brand-600"
                                        : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                }`}
                            >
                                <Sparkles className="h-6 w-6" />
                                {!selectedTranscript
                                    ? "Select Call First"
                                    : "Generate Deck Structure"}
                            </button>

                            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                                <p>
                                    ⚡ Generation time:{" "}
                                    {slideCount === "5"
                                        ? "~30 seconds"
                                        : "~3-5 minutes"}
                                </p>
                                <p>
                                    📊 Creates {slideCount} slides using{" "}
                                    {presentationType === "webinar"
                                        ? "Magnetic Masterclass Framework"
                                        : presentationType === "vsl"
                                          ? "VSL Framework"
                                          : "Sales Page Pitch Framework"}
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
                                AI is analyzing your intake call and creating your
                                structure
                            </p>
                        </div>

                        <div className="mx-auto mb-4 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            ⚠ Please do not close this page while your outline is
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
                                <p>
                                    No presentation structures yet. Generate your first
                                    one above!
                                </p>
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
                                                        📊 {deck.slideCount} slides
                                                    </span>
                                                    <span>
                                                        📅{" "}
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
                                                    title="Download JSON"
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
                                    ×
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
                                                            : deck.total_slides || 55,
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
