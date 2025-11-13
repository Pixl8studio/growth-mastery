"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import GammaThemeSelector from "@/components/funnel/gamma-theme-selector";
import {
    Rocket,
    Presentation,
    Link as LinkIcon,
    Trash2,
    Eye,
    Pencil,
    Check,
    X,
    FileDown,
    FileText,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";

interface DeckStructure {
    id: string;
    title: string;
    slideCount: number;
    slides: unknown[];
    created_at: string;
}

interface GammaDeck {
    id: string;
    title: string;
    status: "generating" | "completed" | "failed";
    gamma_session_id?: string;
    deck_url?: string;
    deck_data?: Record<string, unknown>;
    settings: {
        theme: string;
        style: string;
        length: string;
    };
    created_at: string;
}

export default function Step4Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [selectedDeckId, setSelectedDeckId] = useState("");
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [gammaDecks, setGammaDecks] = useState<GammaDeck[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

    const [settings, setSettings] = useState({
        theme: "nebulae",
        style: "professional",
        length: "full",
    });

    const { toast } = useToast();

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
                    title: deck.title || "Untitled Deck",
                    slideCount: Array.isArray(deck.slides) ? deck.slides.length : 55,
                    slides: deck.slides || [],
                    created_at: deck.created_at,
                }));
                setDeckStructures(transformed);

                if (transformed.length > 0 && !selectedDeckId) {
                    setSelectedDeckId(transformed[0].id);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load deck structures");
            }
        };

        loadDeckStructures();
    }, [projectId, selectedDeckId]);

    useEffect(() => {
        const loadGammaDecks = async () => {
            if (!projectId) return;

            try {
                const supabase = createClient();
                const { data: gammaData, error: gammaError } = await supabase
                    .from("gamma_decks")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (gammaError) throw gammaError;
                setGammaDecks(gammaData || []);
            } catch (error) {
                logger.error({ error }, "Failed to load gamma decks");
            }
        };

        loadGammaDecks();
    }, [projectId]);

    const handleGenerateGammaDeck = async () => {
        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            setGenerationProgress(20);

            const response = await fetch("/api/generate/gamma-decks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    deckStructureId: selectedDeckId,
                    settings,
                }),
            });

            setGenerationProgress(80);

            if (!response.ok) {
                throw new Error("Failed to generate Gamma deck");
            }

            const result = await response.json();
            setGammaDecks((prev) => [result.gammaDeck, ...prev]);
            setGenerationProgress(100);

            setTimeout(() => {
                setIsGenerating(false);
                setGenerationProgress(0);
            }, 1000);
        } catch (error) {
            logger.error({ error }, "Failed to generate Gamma deck");
            setIsGenerating(false);
            setGenerationProgress(0);
            alert("Failed to generate Gamma deck. Please try again.");
        }
    };

    const handleDeleteDeck = async (deckId: string) => {
        if (!confirm("Delete this Gamma deck?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("gamma_decks")
                .delete()
                .eq("id", deckId);

            if (!error) {
                setGammaDecks((prev) => prev.filter((d) => d.id !== deckId));
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete Gamma deck");
        }
    };

    const handleExportPDF = async (deck: GammaDeck) => {
        try {
            logger.info({ deckId: deck.id }, "Opening deck for PDF export");

            if (!deck.deck_url) {
                toast({
                    title: "❌ Deck URL not available",
                    description: "This deck doesn't have a valid URL",
                    variant: "destructive",
                });
                return;
            }

            window.open(deck.deck_url, "_blank", "noopener,noreferrer");

            setTimeout(() => {
                toast({
                    title: "📄 Exporting to PDF",
                    description: (
                        <div className="space-y-2 text-sm">
                            <p className="font-medium">Deck opened in Gamma!</p>
                            <ol className="ml-4 list-decimal space-y-1">
                                <li>Click the 'Share' button (top right)</li>
                                <li>Select 'Export'</li>
                                <li>Choose 'PDF'</li>
                                <li>Your PDF will download automatically</li>
                            </ol>
                        </div>
                    ),
                    duration: 10000,
                });
            }, 1000);
        } catch (error) {
            logger.error(
                { error, deckId: deck.id },
                "Failed to open deck for PDF export"
            );
            toast({
                title: "❌ Export failed",
                description: "Failed to open deck. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleExportGoogleSlides = async (deck: GammaDeck) => {
        try {
            logger.info({ deckId: deck.id }, "Opening deck for Google Slides export");

            if (!deck.deck_url) {
                toast({
                    title: "❌ Deck URL not available",
                    description: "This deck doesn't have a valid URL",
                    variant: "destructive",
                });
                return;
            }

            window.open(deck.deck_url, "_blank", "noopener,noreferrer");

            setTimeout(() => {
                toast({
                    title: "📊 Exporting to Google Slides",
                    description: (
                        <div className="space-y-2 text-sm">
                            <p className="font-medium">Deck opened in Gamma!</p>
                            <ol className="ml-4 list-decimal space-y-1">
                                <li>Click the 'Share' button (top right)</li>
                                <li>Select 'Export'</li>
                                <li>Choose 'Google Slides'</li>
                                <li>The deck will open in your Google account</li>
                            </ol>
                        </div>
                    ),
                    duration: 10000,
                });
            }, 1000);
        } catch (error) {
            logger.error(
                { error, deckId: deck.id },
                "Failed to open deck for Google Slides export"
            );
            toast({
                title: "❌ Export failed",
                description: "Failed to open deck. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleEditSave = async (deckId: string) => {
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("gamma_decks")
                .update({ title: editingName.trim() })
                .eq("id", deckId);

            if (!error) {
                setGammaDecks((prev) =>
                    prev.map((d) =>
                        d.id === deckId ? { ...d, title: editingName.trim() } : d
                    )
                );
                setEditingId(null);
                setEditingName("");
            }
        } catch (error) {
            logger.error({ error }, "Failed to update deck name");
        }
    };

    const hasCompletedGammaDeck = gammaDecks.some((d) => d.status === "completed");

    const getGenerationSubstatus = (progress: number): string => {
        if (progress <= 30) return "Analyzing content structure...";
        if (progress <= 60) return "Generating slide designs...";
        if (progress <= 90) return "Adding visual elements...";
        return "Finalizing presentation...";
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
            currentStep={5}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            nextDisabled={!hasCompletedGammaDeck}
            nextLabel={
                hasCompletedGammaDeck ? "Create Enrollment Page" : "Generate Deck First"
            }
            stepTitle="Create Presentation"
            stepDescription="Generate beautiful slides with Gamma AI"
        >
            <div className="space-y-8">
                {/* Dependency Warning */}
                {deckStructures.length === 0 && (
                    <DependencyWarning
                        message="You need to create a deck structure first before generating Gamma slides."
                        requiredStep={4}
                        requiredStepName="Deck Structure"
                        projectId={projectId}
                    />
                )}

                {/* Generation Interface */}
                {!isGenerating ? (
                    <div className="rounded-lg border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-6">
                        <div className="mb-6 space-y-6">
                            <div className="mx-auto max-w-md">
                                <label className="mb-2 block text-sm font-medium text-foreground">
                                    Select Deck Structure
                                </label>
                                <select
                                    value={selectedDeckId}
                                    onChange={(e) => setSelectedDeckId(e.target.value)}
                                    disabled={deckStructures.length === 0}
                                    className="w-full rounded-lg border border-border px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-muted"
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
                                                    {deck.title} ({deck.slideCount}{" "}
                                                    slides)
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>

                                {deckStructures.length === 0 && (
                                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-600">
                                        💡 Complete Step 3 first to create deck
                                        structures
                                    </p>
                                )}
                            </div>

                            <div className="-mx-6 px-6 py-6 bg-card/50 rounded-lg">
                                <GammaThemeSelector
                                    selectedTheme={settings.theme}
                                    onThemeChange={(theme) =>
                                        setSettings({ ...settings, theme })
                                    }
                                />
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={handleGenerateGammaDeck}
                                disabled={!selectedDeckId}
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    selectedDeckId
                                        ? "bg-purple-600 text-white hover:bg-purple-700"
                                        : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                }`}
                            >
                                <Rocket className="h-6 w-6" />
                                {selectedDeckId
                                    ? "Generate Gamma Deck"
                                    : "Select Deck Structure First"}
                            </button>

                            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                                <p>⚡ Generation time: ~2-3 minutes</p>
                                <p>🎨 Creates professionally designed slides</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-purple-100">
                                <Rocket className="h-6 w-6 text-purple-600" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-purple-900">
                                Creating Your Presentation
                            </h3>
                            <p className="text-purple-700">
                                Generation time ≈ 2-3 minutes
                            </p>
                            <p className="mt-2 text-sm text-purple-600">
                                {getGenerationSubstatus(generationProgress)}
                            </p>
                        </div>

                        <div className="mx-auto max-w-md">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-purple-700">
                                    Progress
                                </span>
                                <span className="text-sm text-purple-600">
                                    {generationProgress}%
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-purple-200">
                                <div
                                    className="h-3 rounded-full bg-purple-600 transition-all duration-500 ease-out"
                                    style={{ width: `${generationProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Generated Gamma Decks */}
                <div className="rounded-lg border border-border bg-card shadow-soft">
                    <div className="border-b border-border p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-foreground">
                                Your Presentations
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {gammaDecks.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {gammaDecks.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <Presentation className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>
                                    No Gamma presentations yet. Generate your first one
                                    above!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {gammaDecks.map((deck) => (
                                    <div
                                        key={deck.id}
                                        onClick={(e) => {
                                            if (
                                                deck.deck_url &&
                                                !(e.target as HTMLElement).closest(
                                                    "button"
                                                ) &&
                                                !(e.target as HTMLElement).closest(
                                                    "input"
                                                ) &&
                                                !(e.target as HTMLElement).closest("a")
                                            ) {
                                                window.open(
                                                    deck.deck_url,
                                                    "_blank",
                                                    "noopener,noreferrer"
                                                );
                                            }
                                        }}
                                        className={`rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-purple-300 hover:shadow-md ${
                                            deck.deck_url ? "cursor-pointer" : ""
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="mb-2 flex items-center gap-3">
                                                    {editingId === deck.id ? (
                                                        <div className="flex flex-1 items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={editingName}
                                                                onChange={(e) =>
                                                                    setEditingName(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="flex-1 rounded border border-purple-300 px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                                onKeyDown={(e) => {
                                                                    if (
                                                                        e.key ===
                                                                        "Enter"
                                                                    )
                                                                        handleEditSave(
                                                                            deck.id
                                                                        );
                                                                    if (
                                                                        e.key ===
                                                                        "Escape"
                                                                    )
                                                                        setEditingId(
                                                                            null
                                                                        );
                                                                }}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() =>
                                                                    handleEditSave(
                                                                        deck.id
                                                                    )
                                                                }
                                                                className="rounded bg-purple-600 px-2 py-1 text-sm text-white hover:bg-purple-700"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setEditingId(null)
                                                                }
                                                                className="rounded bg-gray-300 px-2 py-1 text-sm text-foreground hover:bg-gray-400"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <h4 className="text-lg font-semibold text-foreground">
                                                                {deck.title}
                                                            </h4>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingId(
                                                                        deck.id
                                                                    );
                                                                    setEditingName(
                                                                        deck.title
                                                                    );
                                                                }}
                                                                className="rounded p-1 text-purple-600 hover:bg-purple-50"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                            deck.status === "completed"
                                                                ? "bg-green-100 text-green-800"
                                                                : deck.status ===
                                                                    "generating"
                                                                  ? "bg-yellow-100 text-yellow-800"
                                                                  : "bg-red-100 text-red-800"
                                                        }`}
                                                    >
                                                        {deck.status}
                                                    </span>
                                                    <span>
                                                        🎨 {deck.settings.theme}
                                                    </span>
                                                    <span>
                                                        📅{" "}
                                                        {new Date(
                                                            deck.created_at
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                {deck.deck_url && (
                                                    <a
                                                        href={deck.deck_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                                                    >
                                                        <LinkIcon className="h-4 w-4" />
                                                        Open in Gamma
                                                    </a>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {deck.deck_url && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExportPDF(deck);
                                                            }}
                                                            className="rounded p-2 text-primary hover:bg-primary/5"
                                                            title="Export to PDF"
                                                        >
                                                            <FileDown className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExportGoogleSlides(
                                                                    deck
                                                                );
                                                            }}
                                                            className="rounded p-2 text-green-600 hover:bg-green-50"
                                                            title="Export to Google Slides"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </button>
                                                        <a
                                                            href={deck.deck_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="rounded p-2 text-purple-600 hover:bg-purple-50"
                                                            title="Open in Gamma"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </a>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() =>
                                                        handleDeleteDeck(deck.id)
                                                    }
                                                    className="rounded p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                                    title="Delete deck"
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
        </StepLayout>
    );
}
