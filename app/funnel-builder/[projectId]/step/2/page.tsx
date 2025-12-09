"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { Sparkles, DollarSign, Trash2, Pencil, User } from "lucide-react";
import { OfferEditor } from "@/components/funnel/offer-editor";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";
import type { BusinessProfile } from "@/types/business-profile";

interface Offer {
    id: string;
    name: string;
    description: string | null;
    tagline?: string | null;
    price: number;
    currency: string;
    features: string[];
    bonuses: string[];
    guarantee?: string | null;
    // 7 P's Framework
    promise?: string;
    person?: string;
    process?: string;
    purpose?: string;
    pathway?: "book_call" | "direct_purchase";
    max_features?: number;
    max_bonuses?: number;
    created_at: string;
}

export default function Step2Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { toast } = useToast();
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
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(
        null
    );
    const [selectedSource, setSelectedSource] = useState<"transcript" | "profile" | "">(
        ""
    );
    const [alternatives, setAlternatives] = useState<any[]>([]);
    const [loadingAlternatives, setLoadingAlternatives] = useState(false);

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

                // Load business profile
                let loadedProfile: BusinessProfile | null = null;
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
                            loadedProfile = profileResult.profile;
                            setBusinessProfile(loadedProfile);
                        }
                    }
                } catch (profileError) {
                    // Non-critical - business profile loading is optional
                    logger.warn(
                        { error: profileError },
                        "Failed to load business profile"
                    );
                }

                // Auto-select first available source (prefer business profile if complete, then transcripts)
                if (!selectedSource) {
                    const hasCompleteProfile =
                        loadedProfile &&
                        (loadedProfile.completion_status?.overall ?? 0) >= 50;

                    if (hasCompleteProfile) {
                        setSelectedSource("profile");
                    } else if (transcriptData && transcriptData.length > 0) {
                        setSelectedSource("transcript");
                        setSelectedTranscript(transcriptData[0].id);
                    }
                }
            } catch (error) {
                logger.error({ error }, "Failed to load offers");
            }
        };

        loadOffers();
    }, [projectId, selectedTranscript, selectedSource]);

    const handleGenerateOffer = async () => {
        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            setGenerationProgress(30);

            // Build request body based on selected source
            const requestBody: {
                projectId: string;
                transcriptId?: string;
                businessProfileId?: string;
            } = {
                projectId,
            };

            if (selectedSource === "profile" && businessProfile) {
                requestBody.businessProfileId = businessProfile.id;
            } else if (selectedSource === "transcript" && selectedTranscript) {
                requestBody.transcriptId = selectedTranscript;
            }

            const response = await fetch("/api/generate/offer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            setGenerationProgress(80);

            if (!response.ok) {
                throw new Error("Failed to generate offer");
            }

            const result = await response.json();

            setOffers((prev) => [result.offer, ...prev]);
            setGenerationProgress(100);

            // Load alternatives for the newly created offer
            if (result.offer?.id) {
                loadAlternatives(result.offer.id);
            }

            setTimeout(() => {
                setIsGenerating(false);
                setGenerationProgress(0);
            }, 1000);
        } catch (error) {
            logger.error({ error }, "Failed to generate offer");
            setIsGenerating(false);
            setGenerationProgress(0);
            toast({
                variant: "destructive",
                title: "Something went wrong",
                description:
                    "Failed to generate offer. Please retry or contact support if the issue persists.",
            });
        }
    };

    const loadAlternatives = async (baseOfferId: string) => {
        setLoadingAlternatives(true);
        try {
            const response = await fetch("/api/generate/offer-alternatives", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ baseOfferId, projectId }),
            });

            if (response.ok) {
                const result = await response.json();
                setAlternatives(result.alternatives || []);
            }
        } catch (error) {
            logger.error({ error }, "Failed to load alternative offers");
        } finally {
            setLoadingAlternatives(false);
        }
    };

    const handleUseAlternative = async (alternative: any) => {
        try {
            const supabase = createClient();
            const { data: savedOffer, error } = await supabase
                .from("offers")
                .insert({
                    funnel_project_id: projectId,
                    user_id: project?.user_id,
                    name: alternative.name,
                    description:
                        alternative.tagline || alternative.keyDifference || null,
                    tagline: alternative.tagline,
                    price: alternative.price,
                    currency: alternative.currency || "USD",
                    features: alternative.features || [],
                    bonuses: alternative.bonuses || [],
                    guarantee: alternative.guarantee,
                    promise: alternative.promise,
                    person: alternative.person,
                    process: alternative.process,
                    purpose: alternative.purpose,
                    pathway: alternative.pathway,
                    max_features: 6,
                    max_bonuses: 5,
                })
                .select()
                .single();

            if (!error && savedOffer) {
                setOffers((prev) => [savedOffer, ...prev]);
                toast({
                    title: "Offer added successfully!",
                    description:
                        "You can select another variation or continue to the next step.",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to use alternative offer");
            toast({
                variant: "destructive",
                title: "Something went wrong",
                description:
                    "Failed to create offer. Please retry or contact support if the issue persists.",
            });
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
    const hasIntakeData =
        transcripts.length > 0 ||
        (businessProfile && (businessProfile.completion_status?.overall ?? 0) > 0);
    const canGenerateOffer =
        (selectedSource === "profile" && businessProfile) ||
        (selectedSource === "transcript" && selectedTranscript);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
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

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
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
            stepTitle="Define Offer"
            stepDescription="AI intelligently analyzes your intake to create optimized offers with the proven 7 P's framework"
        >
            <div className="space-y-8">
                {/* Dependency Warning */}
                {!hasIntakeData && (
                    <DependencyWarning
                        message="You need to complete your intake session first so AI can understand your business and create a compelling offer."
                        requiredStep={1}
                        requiredStepName="Intake"
                        projectId={projectId}
                    />
                )}

                {/* Generation Interface */}
                {!isGenerating ? (
                    <div className="rounded-lg border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-8">
                        <div className="mx-auto mb-6 max-w-md">
                            <label className="mb-2 block text-sm font-medium text-foreground">
                                Select Data Source
                            </label>
                            <p className="mb-4 text-sm text-muted-foreground">
                                AI intelligently analyzes your business context to
                                define your business offers to be used to build the rest
                                of your funnel and marketing launch.
                            </p>

                            {/* Source Selection */}
                            <div className="space-y-3">
                                {/* Business Profile Option */}
                                {businessProfile &&
                                    (businessProfile.completion_status?.overall ?? 0) >
                                        0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedSource("profile");
                                                setSelectedTranscript("");
                                            }}
                                            className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                                                selectedSource === "profile"
                                                    ? "border-green-500 bg-green-50 ring-2 ring-green-500"
                                                    : "border-border bg-card hover:border-green-300"
                                            }`}
                                        >
                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                                    selectedSource === "profile"
                                                        ? "bg-green-500 text-white"
                                                        : "bg-muted text-muted-foreground"
                                                }`}
                                            >
                                                <User className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-foreground">
                                                    Business Profile
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {
                                                        businessProfile
                                                            .completion_status?.overall
                                                    }
                                                    % complete -{" "}
                                                    {businessProfile.source === "wizard"
                                                        ? "Guided Wizard"
                                                        : businessProfile.source ===
                                                            "gpt_paste"
                                                          ? "GPT Import"
                                                          : "Voice Call"}
                                                </div>
                                            </div>
                                            {selectedSource === "profile" && (
                                                <div className="text-green-600">✓</div>
                                            )}
                                        </button>
                                    )}

                                {/* Transcript Options */}
                                {transcripts.length > 0 && (
                                    <div className="space-y-2">
                                        {businessProfile &&
                                            (businessProfile.completion_status
                                                ?.overall ?? 0) > 0 && (
                                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
                                                    Or select a legacy intake session
                                                </div>
                                            )}
                                        {transcripts.map((transcript: any) => (
                                            <button
                                                key={transcript.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSource("transcript");
                                                    setSelectedTranscript(
                                                        transcript.id
                                                    );
                                                }}
                                                className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                                                    selectedSource === "transcript" &&
                                                    selectedTranscript === transcript.id
                                                        ? "border-green-500 bg-green-50 ring-2 ring-green-500"
                                                        : "border-border bg-card hover:border-green-300"
                                                }`}
                                            >
                                                <div
                                                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                                        selectedSource ===
                                                            "transcript" &&
                                                        selectedTranscript ===
                                                            transcript.id
                                                            ? "bg-green-500 text-white"
                                                            : "bg-muted text-muted-foreground"
                                                    }`}
                                                >
                                                    <Sparkles className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-foreground">
                                                        {transcript.session_name ||
                                                            `${getMethodLabel(transcript.intake_method || "voice")}`}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {formatDate(
                                                            transcript.created_at
                                                        )}
                                                    </div>
                                                </div>
                                                {selectedSource === "transcript" &&
                                                    selectedTranscript ===
                                                        transcript.id && (
                                                        <div className="text-green-600">
                                                            ✓
                                                        </div>
                                                    )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* No data available */}
                                {!hasIntakeData && (
                                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-600">
                                        💡 Complete Step 1 first to create intake
                                        sessions
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={handleGenerateOffer}
                                disabled={!canGenerateOffer}
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    canGenerateOffer
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                        : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                }`}
                            >
                                <Sparkles className="h-6 w-6" />
                                {canGenerateOffer
                                    ? "Generate Offer"
                                    : "Select Data Source First"}
                            </button>

                            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
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

                {/* AI Suggested Offers - Alternative Variations */}
                {alternatives.length > 0 && (
                    <div className="rounded-lg border border-purple-100 bg-gradient-to-br from-purple-50 to-primary/5 p-6">
                        <div className="mb-6">
                            <h3 className="mb-2 text-xl font-semibold text-foreground">
                                🎯 AI Suggested Offer Variations
                            </h3>
                            <p className="text-muted-foreground">
                                Explore these strategic alternatives optimized for
                                different market positions
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {alternatives.map((alt: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="rounded-lg border border-purple-200 bg-card p-5 shadow-sm transition-all hover:shadow-md"
                                >
                                    <div className="mb-3">
                                        <div className="mb-1 inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                                            {alt.type === "value" && "💰 Value-Focused"}
                                            {alt.type === "premium" && "👑 Premium"}
                                            {alt.type === "scale" &&
                                                "📈 Scale-Optimized"}
                                        </div>
                                    </div>

                                    <h4 className="mb-2 text-lg font-semibold text-foreground">
                                        {alt.name}
                                    </h4>

                                    <div className="mb-3 text-2xl font-bold text-purple-600">
                                        ${alt.price}
                                    </div>

                                    <div className="mb-3 space-y-1 text-sm text-muted-foreground">
                                        <div>
                                            📦 {alt.features?.length || 0} features
                                        </div>
                                        <div>🎁 {alt.bonuses?.length || 0} bonuses</div>
                                        <div className="flex items-center gap-1">
                                            <span>
                                                {alt.pathway === "book_call"
                                                    ? "📞"
                                                    : "🛒"}
                                            </span>
                                            <span>
                                                {alt.pathway === "book_call"
                                                    ? "Book Call"
                                                    : "Direct Purchase"}
                                            </span>
                                        </div>
                                    </div>

                                    {alt.keyDifference && (
                                        <p className="mb-4 text-sm italic text-muted-foreground">
                                            "{alt.keyDifference}"
                                        </p>
                                    )}

                                    <button
                                        onClick={() => handleUseAlternative(alt)}
                                        className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                                    >
                                        Use This Offer
                                    </button>
                                </div>
                            ))}
                        </div>

                        {loadingAlternatives && (
                            <div className="py-8 text-center">
                                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
                                <p className="text-sm text-purple-600">
                                    Generating alternative offers...
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Generated Offers */}
                <div className="rounded-lg border border-border bg-card shadow-soft">
                    <div className="border-b border-border p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-foreground">
                                Your Offers
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {offers.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {offers.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <DollarSign className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>No offers yet. Generate your first one above!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {offers.map((offer) => (
                                    <div
                                        key={offer.id}
                                        onClick={() => setSelectedOffer(offer)}
                                        className="cursor-pointer rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-green-300 hover:shadow-md"
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
                                                                className="rounded bg-gray-300 px-2 py-1 text-sm text-foreground hover:bg-gray-400"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <h4
                                                                className="cursor-pointer text-lg font-semibold text-foreground hover:text-green-600"
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

                                                <div className="mb-2 text-muted-foreground">
                                                    {offer.description}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="text-2xl font-bold text-green-600">
                                                        ${offer.price}
                                                    </span>
                                                    <span>{offer.currency}</span>
                                                    <span>
                                                        📦 {offer.features?.length || 0}{" "}
                                                        features
                                                    </span>
                                                    <span>
                                                        🎁 {offer.bonuses?.length || 0}{" "}
                                                        bonuses
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteOffer(offer.id);
                                                }}
                                                className="rounded p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
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
                    <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-card shadow-2xl">
                        <div className="rounded-t-lg border-b border-border bg-muted/50 p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-foreground">
                                    {selectedOffer.name}
                                </h2>
                                <button
                                    onClick={() => setSelectedOffer(null)}
                                    className="text-2xl font-bold text-muted-foreground hover:text-muted-foreground"
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
