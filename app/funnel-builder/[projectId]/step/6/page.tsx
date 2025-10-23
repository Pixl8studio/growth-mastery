"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import {
    Sparkles,
    MessageSquare,
    Trash2,
    Download,
    Pencil,
    Check,
    X,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";

interface DeckStructure {
    id: string;
    title: string;
    slide_count: number;
    slides: unknown[];
    created_at: string;
}

interface TalkTrack {
    id: string;
    deck_structure_id: string;
    content: string;
    slide_timings: {
        totalDuration: number;
        slides: Array<{ slideNumber: number; duration: number }>;
    };
    total_duration: number;
    created_at: string;
}

interface DeckStructureForDisplay {
    id: string;
    title: string;
    slide_count: number;
}

export default function Step6Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [talkTracks, setTalkTracks] = useState<TalkTrack[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<TalkTrack | null>(null);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState("");
    const [isEditingTrack, setIsEditingTrack] = useState(false);
    const [editedContent, setEditedContent] = useState("");
    const [showSavedIndicator, setShowSavedIndicator] = useState(false);
    const [deckStructureMap, setDeckStructureMap] = useState<
        Map<string, DeckStructureForDisplay>
    >(new Map());

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
        const loadData = async () => {
            if (!projectId) return;
            try {
                const supabase = createClient();
                const [tracksResult, deckStructuresResult] = await Promise.all([
                    supabase
                        .from("talk_tracks")
                        .select("*")
                        .eq("funnel_project_id", projectId)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("deck_structures")
                        .select("*")
                        .eq("funnel_project_id", projectId)
                        .order("created_at", { ascending: false }),
                ]);

                if (tracksResult.data) setTalkTracks(tracksResult.data);
                if (deckStructuresResult.data) {
                    // Transform deck structures to match interface
                    const transformed = (deckStructuresResult.data || []).map(
                        (deck: any) => ({
                            id: deck.id,
                            title: deck.metadata?.title || "Untitled Deck",
                            slide_count: Array.isArray(deck.slides)
                                ? deck.slides.length
                                : deck.total_slides || 55,
                            slides: deck.slides || [],
                            created_at: deck.created_at,
                        })
                    );
                    setDeckStructures(transformed);

                    // Create a map for quick lookup
                    const map = new Map(
                        transformed.map((deck) => [
                            deck.id,
                            {
                                id: deck.id,
                                title: deck.title,
                                slide_count: deck.slide_count,
                            },
                        ])
                    );
                    setDeckStructureMap(map);

                    // Auto-select first deck if available and no selection made
                    if (transformed.length > 0 && !selectedDeckId) {
                        setSelectedDeckId(transformed[0].id);
                    }
                }
            } catch (error) {
                logger.error({ error }, "Failed to load data");
            }
        };
        loadData();
    }, [projectId]);

    const handleGenerate = async () => {
        if (!selectedDeckId) {
            alert("Please select a deck structure first");
            return;
        }

        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            setGenerationProgress(10);

            const response = await fetch("/api/generate/talk-track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    deckStructureId: selectedDeckId,
                }),
            });

            setGenerationProgress(90);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to generate talk track");
            }

            const result = await response.json();
            setTalkTracks((prev) => [result.talkTrack, ...prev]);
            setGenerationProgress(100);

            setTimeout(() => {
                setIsGenerating(false);
                setGenerationProgress(0);
            }, 1000);
        } catch (error) {
            logger.error({ error }, "Failed to generate talk track");
            setIsGenerating(false);
            setGenerationProgress(0);
            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to generate talk track. Please try again."
            );
        }
    };

    const handleDownload = (track: TalkTrack) => {
        const blob = new Blob([track.content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `talk-track-${new Date(track.created_at).toLocaleDateString()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDelete = async (trackId: string) => {
        if (!confirm("Delete this talk track?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("talk_tracks")
                .delete()
                .eq("id", trackId);

            if (!error) {
                setTalkTracks((prev) => prev.filter((t) => t.id !== trackId));
                if (selectedTrack?.id === trackId) {
                    setSelectedTrack(null);
                }
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete talk track");
        }
    };

    const handleEditTrack = () => {
        if (!selectedTrack) return;
        setIsEditingTrack(true);
        setEditedContent(selectedTrack.content);
    };

    const handleSaveTrack = async () => {
        if (!selectedTrack) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("talk_tracks")
                .update({ content: editedContent })
                .eq("id", selectedTrack.id);

            if (error) throw error;

            // Update local state
            setTalkTracks((prev) =>
                prev.map((track) =>
                    track.id === selectedTrack.id
                        ? { ...track, content: editedContent }
                        : track
                )
            );

            setSelectedTrack((prev) =>
                prev ? { ...prev, content: editedContent } : null
            );
            setIsEditingTrack(false);

            // Show saved indicator
            setShowSavedIndicator(true);
            setTimeout(() => setShowSavedIndicator(false), 2000);
        } catch (error) {
            logger.error({ error }, "Failed to save talk track");
            alert("Failed to save changes. Please try again.");
        }
    };

    const handleCancelEdit = () => {
        if (!selectedTrack) return;
        setEditedContent(selectedTrack.content);
        setIsEditingTrack(false);
    };

    const getDurationRange = (slideCount: number) => {
        const minMinutes = Math.round((slideCount * 15) / 60);
        const maxMinutes = Math.round((slideCount * 30) / 60);
        return `${minMinutes}-${maxMinutes} min`;
    };

    const hasCompletedTrack = talkTracks.length > 0;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={6}
            projectId={projectId}
            funnelName={project?.name}
            nextDisabled={!hasCompletedTrack}
            nextLabel={hasCompletedTrack ? "Upload Video" : "Generate Talk Track First"}
            stepTitle="Talk Track Script"
            stepDescription="AI generates a slide-by-slide presentation script (2-4 sentences per slide)"
        >
            <div className="space-y-8">
                {deckStructures.length === 0 && (
                    <DependencyWarning
                        message="You need to create a deck structure first to generate a talk track."
                        requiredStep={3}
                        requiredStepName="Deck Structure"
                        projectId={projectId}
                    />
                )}

                {!isGenerating ? (
                    <div className="rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 p-8">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                                <MessageSquare className="h-8 w-8 text-indigo-600" />
                            </div>
                            <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                                Generate Talk Track Script
                            </h2>
                            <p className="mx-auto max-w-lg text-gray-600">
                                AI will create a slide-by-slide script with 2-4
                                sentences per slide, perfect for your presentation
                                video.
                            </p>
                        </div>

                        {/* Deck Structure Selector */}
                        <div className="mx-auto mb-6 max-w-md">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Select Deck Structure
                            </label>
                            <select
                                value={selectedDeckId}
                                onChange={(e) => setSelectedDeckId(e.target.value)}
                                disabled={deckStructures.length === 0}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                            >
                                {deckStructures.length === 0 ? (
                                    <option value="">
                                        No deck structures available
                                    </option>
                                ) : (
                                    <>
                                        <option value="">
                                            Select a deck structure...
                                        </option>
                                        {deckStructures.map((deck) => (
                                            <option key={deck.id} value={deck.id}>
                                                {deck.title} ({deck.slide_count} slides)
                                            </option>
                                        ))}
                                    </>
                                )}
                            </select>

                            {deckStructures.length === 0 && (
                                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-600">
                                    💡 Complete Step 3 first to create deck structures
                                </p>
                            )}
                        </div>

                        <div className="text-center">
                            <button
                                onClick={handleGenerate}
                                disabled={
                                    !selectedDeckId || deckStructures.length === 0
                                }
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    selectedDeckId && deckStructures.length > 0
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                        : "cursor-not-allowed bg-gray-300 text-gray-500"
                                }`}
                            >
                                <Sparkles className="h-6 w-6" />
                                {deckStructures.length === 0
                                    ? "Create Deck Structure First"
                                    : !selectedDeckId
                                      ? "Select Deck Structure"
                                      : "Generate Talk Track"}
                            </button>

                            <div className="mt-4 space-y-1 text-sm text-gray-500">
                                <p>⚡ Generation time: ~30-60 seconds</p>
                                <p>🎤 2-4 sentences per slide</p>
                                <p>📊 Includes timing and delivery notes</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-6">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-indigo-100">
                                <Sparkles className="h-6 w-6 text-indigo-600" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-indigo-900">
                                Generating Talk Track
                            </h3>
                            <p className="text-indigo-700">
                                AI is creating your presentation script...
                            </p>
                        </div>

                        <div className="mx-auto max-w-md">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-indigo-700">
                                    Progress
                                </span>
                                <span className="text-sm text-indigo-600">
                                    {generationProgress}%
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-indigo-200">
                                <div
                                    className="h-3 rounded-full bg-indigo-600 transition-all duration-500 ease-out"
                                    style={{ width: `${generationProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Your Talk Tracks
                            </h3>
                            <span className="text-sm text-gray-500">
                                {talkTracks.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {talkTracks.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">
                                <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>
                                    No talk tracks yet. Generate your first one above!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {talkTracks.map((track) => (
                                    <div
                                        key={track.id}
                                        onClick={() => setSelectedTrack(track)}
                                        className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="mb-2 text-lg font-semibold text-gray-900">
                                                    Talk Track Script
                                                </h4>
                                                <div className="mb-2 flex items-center gap-4 text-sm text-gray-600">
                                                    {track.deck_structure_id &&
                                                    deckStructureMap.get(
                                                        track.deck_structure_id
                                                    ) ? (
                                                        <>
                                                            <span>
                                                                ⏱️{" "}
                                                                {getDurationRange(
                                                                    deckStructureMap.get(
                                                                        track.deck_structure_id
                                                                    )!.slide_count
                                                                )}{" "}
                                                                estimated
                                                            </span>
                                                            <span>
                                                                📄{" "}
                                                                {
                                                                    deckStructureMap.get(
                                                                        track.deck_structure_id
                                                                    )!.slide_count
                                                                }{" "}
                                                                slides
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>
                                                                ⏱️{" "}
                                                                {track.slide_timings
                                                                    ?.totalDuration ||
                                                                    0}{" "}
                                                                min
                                                            </span>
                                                            <span>
                                                                📄{" "}
                                                                {track.slide_timings
                                                                    ?.slides?.length ||
                                                                    0}{" "}
                                                                slides
                                                            </span>
                                                        </>
                                                    )}
                                                    <span>
                                                        📅{" "}
                                                        {new Date(
                                                            track.created_at
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownload(track);
                                                    }}
                                                    className="rounded p-2 text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(track.id);
                                                    }}
                                                    className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
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

            {/* Talk Track Viewer/Editor Modal */}
            {selectedTrack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-2xl">
                        <div className="flex-shrink-0 rounded-t-lg border-b border-gray-200 bg-gray-50 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Talk Track Script
                                    </h2>
                                    {selectedTrack.deck_structure_id &&
                                        deckStructureMap.get(
                                            selectedTrack.deck_structure_id
                                        ) && (
                                            <p className="mt-1 text-sm text-gray-600">
                                                {
                                                    deckStructureMap.get(
                                                        selectedTrack.deck_structure_id
                                                    )!.title
                                                }{" "}
                                                ({" "}
                                                {
                                                    deckStructureMap.get(
                                                        selectedTrack.deck_structure_id
                                                    )!.slide_count
                                                }{" "}
                                                slides, estimated{" "}
                                                {getDurationRange(
                                                    deckStructureMap.get(
                                                        selectedTrack.deck_structure_id
                                                    )!.slide_count
                                                )}
                                                )
                                            </p>
                                        )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {showSavedIndicator && (
                                        <span className="rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                                            ✓ Saved
                                        </span>
                                    )}
                                    {isEditingTrack ? (
                                        <>
                                            <button
                                                onClick={handleSaveTrack}
                                                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleEditTrack}
                                            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Edit
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            setSelectedTrack(null);
                                            setIsEditingTrack(false);
                                        }}
                                        className="text-2xl font-bold text-gray-400 hover:text-gray-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            {isEditingTrack ? (
                                <textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    className="h-full w-full resize-none border-none p-6 font-mono text-sm leading-relaxed text-gray-900 focus:ring-0"
                                    placeholder="Edit your talk track here..."
                                />
                            ) : (
                                <div className="h-full overflow-y-scroll p-6">
                                    <div className="prose max-w-none">
                                        <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                                            {selectedTrack.content}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </StepLayout>
    );
}
