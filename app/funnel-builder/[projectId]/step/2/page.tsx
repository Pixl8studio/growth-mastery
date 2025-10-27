"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { Sparkles, DollarSign, Trash2, Pencil } from "lucide-react";
import { OfferEditor } from "@/components/funnel/offer-editor";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";

interface Offer {
    id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    features: {
        features?: string[];
        bonuses?: string[];
        guarantee?: string;
    };
    created_at: string;
}

export default function Step2Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [transcripts, setTranscripts] = useState<any[]>([]);
    const [selectedTranscript, setSelectedTranscript] = useState("");

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
        const loadOffers = async () => {
            if (!projectId) return;

            try {
                const supabase = createClient();

                // Load offers
                const { data: offersData, error: offersError } = await supabase
                    .from("offers")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (offersError) throw offersError;
                setOffers(offersData || []);

                // Load transcripts
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
                logger.error({ error }, "Failed to load offers");
            }
        };

        loadOffers();
    }, [projectId, selectedTranscript]);

    const handleGenerateOffer = async () => {
        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            setGenerationProgress(30);

            const response = await fetch("/api/generate/offer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId, transcriptId: selectedTranscript }),
            });

            setGenerationProgress(80);

            if (!response.ok) {
                throw new Error("Failed to generate offer");
            }

            const result = await response.json();

            setOffers((prev) => [result.offer, ...prev]);
            setGenerationProgress(100);

            setTimeout(() => {
                setIsGenerating(false);
                setGenerationProgress(0);
            }, 1000);
        } catch (error) {
            logger.error({ error }, "Failed to generate offer");
            setIsGenerating(false);
            setGenerationProgress(0);
            alert("Failed to generate offer. Please try again.");
        }
    };

    const handleDeleteOffer = async (offerId: string) => {
        if (!confirm("Delete this offer?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase.from("offers").delete().eq("id", offerId);

            if (!error) {
                setOffers((prev) => prev.filter((o) => o.id !== offerId));
                if (selectedOffer?.id === offerId) {
                    setSelectedOffer(null);
                }
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete offer");
        }
    };

    const handleEditSave = async (offerId: string) => {
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("offers")
                .update({ name: editingName.trim() })
                .eq("id", offerId);

            if (!error) {
                setOffers((prev) =>
                    prev.map((o) =>
                        o.id === offerId ? { ...o, name: editingName.trim() } : o
                    )
                );
                setEditingId(null);
                setEditingName("");
            }
        } catch (error) {
            logger.error({ error }, "Failed to update offer name");
        }
    };

    const hasCompletedOffer = offers.length > 0;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={2}
            projectId={projectId}
            funnelName={project?.name}
            completedSteps={completedSteps}
            nextDisabled={!hasCompletedOffer}
            nextLabel={
                hasCompletedOffer ? "Generate Deck Structure" : "Generate Offer First"
            }
            stepTitle="Craft Your Offer"
            stepDescription="AI generates compelling pricing and irresistible features"
        >
            <div className="space-y-8">
                {/* Dependency Warning */}
                {transcripts.length === 0 && (
                    <DependencyWarning
                        message="You need to complete your AI intake call first so AI can understand your business and create a compelling offer."
                        requiredStep={1}
                        requiredStepName="AI Intake Call"
                        projectId={projectId}
                    />
                )}

                {/* Generation Interface */}
                {!isGenerating ? (
                    <div className="rounded-lg border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-8">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                <DollarSign className="h-8 w-8 text-green-600" />
                            </div>
                            <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                                Generate Your Offer
                            </h2>
                            <p className="mx-auto max-w-lg text-gray-600">
                                AI will analyze your intake call to create an
                                irresistible offer with optimal pricing, features,
                                bonuses, and guarantee.
                            </p>
                        </div>

                        <div className="mx-auto mb-6 max-w-md">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Select Intake Call Source
                            </label>
                            <select
                                value={selectedTranscript}
                                onChange={(e) => setSelectedTranscript(e.target.value)}
                                disabled={transcripts.length === 0}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                            >
                                {transcripts.length === 0 ? (
                                    <option value="">No intake calls available</option>
                                ) : (
                                    <>
                                        <option value="">
                                            Select an intake call...
                                        </option>
                                        {transcripts.map((transcript: any) => (
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

                        <div className="text-center">
                            <button
                                onClick={handleGenerateOffer}
                                disabled={!selectedTranscript}
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    selectedTranscript
                                        ? "bg-green-600 text-white hover:bg-green-700"
                                        : "cursor-not-allowed bg-gray-300 text-gray-500"
                                }`}
                            >
                                <Sparkles className="h-6 w-6" />
                                {selectedTranscript
                                    ? "Generate AI Offer"
                                    : "Select Call First"}
                            </button>

                            <div className="mt-4 space-y-1 text-sm text-gray-500">
                                <p>⚡ Generation time: ~20 seconds</p>
                                <p>💰 Creates pricing, features, and bonuses</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-green-100">
                                <Sparkles className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-green-900">
                                Generating Your Offer
                            </h3>
                            <p className="text-green-700">
                                AI is creating your pricing and features...
                            </p>
                        </div>

                        <div className="mx-auto max-w-md">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-green-700">
                                    Progress
                                </span>
                                <span className="text-sm text-green-600">
                                    {generationProgress}%
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-green-200">
                                <div
                                    className="h-3 rounded-full bg-green-600 transition-all duration-500 ease-out"
                                    style={{ width: `${generationProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Generated Offers */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Your Offers
                            </h3>
                            <span className="text-sm text-gray-500">
                                {offers.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {offers.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">
                                <DollarSign className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>No offers yet. Generate your first one above!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {offers.map((offer) => (
                                    <div
                                        key={offer.id}
                                        onClick={() => setSelectedOffer(offer)}
                                        className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-green-300 hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="mb-2 flex items-center gap-3">
                                                    {editingId === offer.id ? (
                                                        <div
                                                            className="flex flex-1 items-center gap-2"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            <input
                                                                type="text"
                                                                value={editingName}
                                                                onChange={(e) =>
                                                                    setEditingName(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="flex-1 rounded border border-green-300 px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                                                                onKeyDown={(e) => {
                                                                    if (
                                                                        e.key ===
                                                                        "Enter"
                                                                    )
                                                                        handleEditSave(
                                                                            offer.id
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
                                                                        offer.id
                                                                    )
                                                                }
                                                                className="rounded bg-green-600 px-2 py-1 text-sm text-white hover:bg-green-700"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setEditingId(null)
                                                                }
                                                                className="rounded bg-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-400"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <h4
                                                                className="cursor-pointer text-lg font-semibold text-gray-900 hover:text-green-600"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingId(
                                                                        offer.id
                                                                    );
                                                                    setEditingName(
                                                                        offer.name
                                                                    );
                                                                }}
                                                            >
                                                                {offer.name}
                                                            </h4>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingId(
                                                                        offer.id
                                                                    );
                                                                    setEditingName(
                                                                        offer.name
                                                                    );
                                                                }}
                                                                className="rounded p-1 text-green-600 hover:bg-green-50"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="mb-2 text-gray-600">
                                                    {offer.description}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span className="text-2xl font-bold text-green-600">
                                                        ${offer.price}
                                                    </span>
                                                    <span>{offer.currency}</span>
                                                    <span>
                                                        📦{" "}
                                                        {offer.features.features
                                                            ?.length || 0}{" "}
                                                        features
                                                    </span>
                                                    <span>
                                                        🎁{" "}
                                                        {offer.features.bonuses
                                                            ?.length || 0}{" "}
                                                        bonuses
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteOffer(offer.id);
                                                }}
                                                className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Offer Editor Modal */}
            {selectedOffer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-2xl">
                        <div className="rounded-t-lg border-b border-gray-200 bg-gray-50 p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {selectedOffer.name}
                                </h2>
                                <button
                                    onClick={() => setSelectedOffer(null)}
                                    className="text-2xl font-bold text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-scroll p-6">
                            <OfferEditor
                                initialOffer={selectedOffer}
                                onSave={async (updates) => {
                                    try {
                                        const supabase = createClient();
                                        const { error } = await supabase
                                            .from("offers")
                                            .update(updates)
                                            .eq("id", selectedOffer.id);

                                        if (!error) {
                                            // Reload offers
                                            const { data: offersData } = await supabase
                                                .from("offers")
                                                .select("*")
                                                .eq("funnel_project_id", projectId)
                                                .order("created_at", {
                                                    ascending: false,
                                                });

                                            if (offersData) {
                                                setOffers(offersData);
                                            }
                                            setSelectedOffer(null);
                                        }
                                    } catch (error) {
                                        logger.error({ error }, "Failed to save offer");
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
