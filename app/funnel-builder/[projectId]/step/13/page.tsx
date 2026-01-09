"use client";

/**
 * Step 13: Upsell Pages
 * Create post-purchase upsell offers with one-click charging
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { useIsMobile } from "@/lib/mobile-utils.client";
import {
    FileText,
    Sparkles,
    Eye,
    Pencil,
    Trash2,
    X,
    Loader2,
    HelpCircle,
    Check,
    Circle,
    DollarSign,
    Zap,
    TrendingUp,
    Shield,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface Offer {
    id: string;
    name: string;
    tagline: string | null;
    description: string | null;
    price: number;
    currency: string;
    features: any;
    created_at: string;
}

interface UpsellPage {
    id: string;
    headline: string;
    subheadline: string | null;
    upsell_number: number;
    price_cents: number;
    is_downsell: boolean;
    is_published: boolean;
    offer_id: string | null;
    created_at: string;
}

interface AIEditorPage {
    id: string;
    title: string;
    page_type: string;
    status: "draft" | "published";
    version: number;
    created_at: string;
    updated_at: string;
}

// Progress stages for generation
interface ProgressStage {
    id: string;
    label: string;
    status: "pending" | "in_progress" | "completed";
}

const GENERATION_STAGES: ProgressStage[] = [
    { id: "offer", label: "Loading your upsell offer", status: "pending" },
    {
        id: "context",
        label: "Analyzing purchase context",
        status: "pending",
    },
    { id: "brand", label: "Applying brand design", status: "pending" },
    { id: "presentation", label: "Creating offer presentation", status: "pending" },
    { id: "urgency", label: "Adding urgency elements", status: "pending" },
    { id: "finalize", label: "Finalizing upsell page", status: "pending" },
];

const TEMPLATE_OPTIONS = [
    {
        value: "one-time-opportunity",
        label: "One-Time Opportunity",
        description:
            "Exclusive, now-or-never messaging with strong urgency. Best for time-sensitive premium offers.",
    },
    {
        value: "value-stack",
        label: "Value Stack",
        description:
            "Shows everything they get for the price with clear ROI. Perfect for bundle upsells and comprehensive packages.",
    },
    {
        value: "speed-and-results",
        label: "Speed & Results",
        description:
            "Focus on accelerating outcomes and faster results. Ideal for done-for-you services and implementation support.",
    },
] as const;

export default function Step13UpsellPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const router = useRouter();
    const isMobile = useIsMobile("lg");
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);

    // Redirect mobile users to desktop-required page
    useEffect(() => {
        if (isMobile && projectId) {
            const params = new URLSearchParams({
                feature: "Upsell Page Editor",
                description:
                    "The upsell page editor requires a desktop computer for designing and customizing post-purchase offers with visual editing tools.",
                returnPath: `/funnel-builder/${projectId}`,
            });
            router.push(`/desktop-required?${params.toString()}`);
        }
    }, [isMobile, projectId, router]);

    const [offers, setOffers] = useState<Offer[]>([]);
    const [upsellPages, setUpsellPages] = useState<UpsellPage[]>([]);
    const [aiEditorPages, setAiEditorPages] = useState<AIEditorPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [progressStages, setProgressStages] = useState<ProgressStage[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedUpsellNumber, setSelectedUpsellNumber] = useState<1 | 2>(1);
    const [stripeConnected, setStripeConnected] = useState(false);
    const [formData, setFormData] = useState({
        upsellNumber: 1 as 1 | 2,
        offerId: "",
        templateType: "one-time-opportunity" as
            | "one-time-opportunity"
            | "value-stack"
            | "speed-and-results",
        priceDollars: "",
        isDownsell: false,
    });

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    // Simulate progress stages with realistic timing
    const simulateProgress = useCallback(async (): Promise<void> => {
        const stages = [...GENERATION_STAGES];
        setProgressStages(stages);

        // Timing for each stage (in ms) - total ~25-35 seconds
        const stageTiming = [
            1500, // Loading upsell offer
            2000, // Analyzing purchase context
            2500, // Applying brand design
            10000, // Creating offer presentation (longest - AI generation)
            6000, // Adding urgency elements
            3000, // Finalizing upsell page
        ];

        for (let i = 0; i < stages.length; i++) {
            // Mark current stage as in_progress
            setProgressStages((prev: ProgressStage[]) =>
                prev.map((s: ProgressStage, idx: number) => ({
                    ...s,
                    status:
                        idx < i ? "completed" : idx === i ? "in_progress" : "pending",
                }))
            );

            await new Promise((resolve) => setTimeout(resolve, stageTiming[i]));
        }

        // Mark all as completed
        setProgressStages((prev: ProgressStage[]) =>
            prev.map((s: ProgressStage) => ({ ...s, status: "completed" as const }))
        );
    }, []);

    // Handle Generate Upsell Page
    const handleGenerate = async () => {
        if (!projectId || !formData.offerId || !formData.priceDollars) return;

        setIsCreating(true);
        const startTime = Date.now();

        // Start progress simulation in parallel with API call
        const progressPromise = simulateProgress();

        try {
            const priceCents = Math.round(parseFloat(formData.priceDollars) * 100);

            logger.info(
                {
                    projectId,
                    pageType: "upsell",
                    offerId: formData.offerId,
                    upsellNumber: formData.upsellNumber,
                    templateStyle: formData.templateType,
                    priceCents,
                    isDownsell: formData.isDownsell,
                },
                "Creating upsell page with AI editor"
            );

            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "upsell",
                    offerId: formData.offerId,
                    templateStyle: formData.templateType,
                    upsellNumber: formData.upsellNumber,
                    priceCents,
                    isDownsell: formData.isDownsell,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || "Failed to create page");
            }

            const elapsed = Date.now() - startTime;

            // If API completed quickly (under 15 seconds), fast-forward progress
            if (elapsed < 15000) {
                setProgressStages((prev: ProgressStage[]) =>
                    prev.map((s: ProgressStage) => ({ ...s, status: "completed" as const }))
                );
                // Small delay so user sees completion
                await new Promise((resolve) => setTimeout(resolve, 500));
            } else {
                // Otherwise wait for progress simulation to finish naturally
                await progressPromise;
            }

            logger.info({ pageId: data.pageId }, "Upsell page created");

            // Add the new page to the list
            const newPage: AIEditorPage = {
                id: data.pageId,
                title: data.title || `Upsell ${formData.upsellNumber} Page`,
                page_type: "upsell",
                status: "draft",
                version: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setAiEditorPages((prev: AIEditorPage[]) => [newPage, ...prev]);

            // Reset form and close
            setShowCreateForm(false);
            setProgressStages([]);

            toast({
                title: "Upsell page created!",
                description: "Opening the AI Editor in a new tab...",
            });

            // Open in new tab
            window.open(`/ai-editor/${data.pageId}`, "_blank");
        } catch (error: any) {
            logger.error({ error }, "Failed to create upsell page");
            setProgressStages([]);
            toast({
                variant: "destructive",
                title: "Error",
                description:
                    error.message || "Failed to create page. Please try again.",
            });
        } finally {
            setIsCreating(false);
        }
    };

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

                // Check Stripe connection
                const { data: userData } = await supabase.auth.getUser();
                if (userData.user) {
                    const { data: stripeData } = await supabase
                        .from("stripe_connections")
                        .select("stripe_account_id")
                        .eq("user_id", userData.user.id)
                        .single();

                    setStripeConnected(!!stripeData?.stripe_account_id);
                }
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

                // Load offers
                const { data: offerData, error: offerError } = await supabase
                    .from("offers")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (offerError) throw offerError;
                setOffers(offerData || []);

                // Auto-select first offer
                if (offerData && offerData.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        offerId: offerData[0].id,
                    }));
                }

                // Load legacy upsell pages (if any exist)
                const { data: pagesData, error: pagesError } = await supabase
                    .from("upsell_pages")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("upsell_number", { ascending: true });

                if (pagesError && pagesError.code !== "42P01") {
                    // Ignore if table doesn't exist yet
                    throw pagesError;
                }
                setUpsellPages(pagesData || []);

                // Load AI Editor v2 pages
                const { data: aiPagesData, error: aiPagesError } = await supabase
                    .from("ai_editor_pages")
                    .select(
                        "id, title, page_type, status, version, created_at, updated_at"
                    )
                    .eq("funnel_project_id", projectId)
                    .eq("page_type", "upsell")
                    .order("created_at", { ascending: false });

                if (aiPagesError) {
                    logger.warn(
                        { error: aiPagesError },
                        "Failed to load AI editor pages"
                    );
                } else {
                    setAiEditorPages(aiPagesData || []);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load data");
            }
        };

        loadData();
    }, [projectId]);

    const handleEditAIEditor = (pageId: string) => {
        window.open(`/ai-editor/${pageId}`, "_blank");
    };

    const handleDelete = async (pageId: string) => {
        if (!confirm("Delete this upsell page?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("upsell_pages")
                .delete()
                .eq("id", pageId);

            if (error) throw error;

            setUpsellPages((prev: UpsellPage[]) => prev.filter((p: UpsellPage) => p.id !== pageId));
            logger.info({ pageId }, "Upsell page deleted");

            toast({
                title: "Page Deleted",
                description: "Upsell page has been removed",
            });
        } catch (error: any) {
            logger.error({ error }, "Failed to delete upsell page");
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description:
                    error?.message || "Could not delete the page. Please try again.",
            });
        }
    };

    const hasOffer = offers.length > 0;
    const hasUpsellPage = aiEditorPages.length > 0;
    const canCreatePage = hasOffer && stripeConnected;

    // Get upsell pages by number
    const upsell1Page = aiEditorPages.find((p: AIEditorPage) =>
        p.title.toLowerCase().includes("upsell 1")
    );
    const upsell2Page = aiEditorPages.find((p: AIEditorPage) =>
        p.title.toLowerCase().includes("upsell 2")
    );

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={13}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            nextDisabled={false}
            stepTitle="Upsell Pages"
            stepDescription="Increase revenue with one-click post-purchase offers"
        >
            <div className="space-y-8">
                {/* Dependency Warnings */}
                {!hasOffer && (
                    <DependencyWarning
                        message="You need to create an offer first."
                        requiredStep={2}
                        requiredStepName="Define Offer"
                        projectId={projectId}
                    />
                )}
                {!stripeConnected && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
                        <div className="flex items-start gap-3">
                            <Shield className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-amber-900 mb-1">
                                    Stripe Connection Required
                                </h3>
                                <p className="text-sm text-amber-800 mb-3">
                                    Upsell pages require Stripe to process one-click
                                    charges. Connect your Stripe account to enable this
                                    feature.
                                </p>
                                <button
                                    onClick={() =>
                                        router.push(
                                            `/funnel-builder/${projectId}/step/10`
                                        )
                                    }
                                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                                >
                                    Connect Stripe
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* One-Click Upsell Explanation */}
                <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-purple-50 p-6">
                    <div className="flex items-start gap-4">
                        <div className="rounded-full bg-primary/10 p-3">
                            <Zap className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                How One-Click Upsells Work
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                After a customer completes their initial purchase, they
                                see your upsell offer. Because we already have their
                                payment information from the checkout, they can accept
                                with just one click—no need to re-enter card details.
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg bg-card p-4 border border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                        <span className="font-medium text-sm">
                                            Higher Conversion
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        One-click acceptance removes friction and can
                                        increase upsell take rates by 20-40%
                                    </p>
                                </div>
                                <div className="rounded-lg bg-card p-4 border border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="h-4 w-4 text-purple-600" />
                                        <span className="font-medium text-sm">
                                            Instant Revenue
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Customer clicks "Yes" and their card is charged
                                        automatically—no checkout flow needed
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upsell Slots */}
                <div className="rounded-lg border border-border bg-card shadow-soft">
                    <div className="border-b border-border p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-foreground">
                                Your Upsell Sequence
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                Up to 2 upsell offers
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Create up to two sequential upsell offers. Customers see
                            Upsell 1 first, then optionally Upsell 2.
                        </p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Upsell 1 Slot */}
                        <div className="rounded-lg border-2 border-dashed border-border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                                            1
                                        </span>
                                        Upsell 1
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Shown immediately after checkout
                                    </p>
                                </div>
                            </div>

                            {upsell1Page ? (
                                <div className="rounded-lg border border-border bg-card p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h5 className="font-semibold text-foreground">
                                                    {upsell1Page.title}
                                                </h5>
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                        upsell1Page.status ===
                                                        "published"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-yellow-100 text-yellow-800"
                                                    }`}
                                                >
                                                    {upsell1Page.status === "published"
                                                        ? "Published"
                                                        : "Draft"}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Created{" "}
                                                {new Date(
                                                    upsell1Page.created_at
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                handleEditAIEditor(upsell1Page.id)
                                            }
                                            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Edit Page
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setSelectedUpsellNumber(1);
                                        setFormData((prev) => ({
                                            ...prev,
                                            upsellNumber: 1,
                                            isDownsell: false,
                                        }));
                                        setShowCreateForm(true);
                                    }}
                                    disabled={!canCreatePage}
                                    className={`w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                                        canCreatePage
                                            ? "border-purple-300 hover:border-purple-400 hover:bg-purple-50/50"
                                            : "cursor-not-allowed border-gray-200 bg-gray-50"
                                    }`}
                                >
                                    <Sparkles className="mx-auto h-8 w-8 text-purple-600 mb-3" />
                                    <p className="font-semibold text-foreground">
                                        {canCreatePage
                                            ? "Generate Upsell 1"
                                            : "Complete Prerequisites"}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {canCreatePage
                                            ? "Create your first upsell offer"
                                            : "Connect Stripe and create an offer first"}
                                    </p>
                                </button>
                            )}
                        </div>

                        {/* Upsell 2 Slot */}
                        <div className="rounded-lg border-2 border-dashed border-border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                                            2
                                        </span>
                                        Upsell 2
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Shown after Upsell 1 (optional downsell)
                                    </p>
                                </div>
                            </div>

                            {upsell2Page ? (
                                <div className="rounded-lg border border-border bg-card p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h5 className="font-semibold text-foreground">
                                                    {upsell2Page.title}
                                                </h5>
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                        upsell2Page.status ===
                                                        "published"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-yellow-100 text-yellow-800"
                                                    }`}
                                                >
                                                    {upsell2Page.status === "published"
                                                        ? "Published"
                                                        : "Draft"}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Created{" "}
                                                {new Date(
                                                    upsell2Page.created_at
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                handleEditAIEditor(upsell2Page.id)
                                            }
                                            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Edit Page
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setSelectedUpsellNumber(2);
                                        setFormData((prev) => ({
                                            ...prev,
                                            upsellNumber: 2,
                                        }));
                                        setShowCreateForm(true);
                                    }}
                                    disabled={!canCreatePage}
                                    className={`w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                                        canCreatePage
                                            ? "border-purple-300 hover:border-purple-400 hover:bg-purple-50/50"
                                            : "cursor-not-allowed border-gray-200 bg-gray-50"
                                    }`}
                                >
                                    <Sparkles className="mx-auto h-8 w-8 text-purple-600 mb-3" />
                                    <p className="font-semibold text-foreground">
                                        {canCreatePage
                                            ? "Generate Upsell 2"
                                            : "Complete Prerequisites"}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {canCreatePage
                                            ? "Create your second upsell offer"
                                            : "Connect Stripe and create an offer first"}
                                    </p>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Create Form Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-2xl rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-primary/5 p-8 shadow-2xl">
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground">
                                        Generate Upsell {formData.upsellNumber} Page
                                    </h3>
                                    {!isCreating && (
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            This typically takes 25-35 seconds
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setProgressStages([]);
                                    }}
                                    disabled={isCreating}
                                    className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Progress Stages UI */}
                            {isCreating && progressStages.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="rounded-lg border border-purple-200 bg-white p-6">
                                        <div className="mb-4 flex items-center justify-between">
                                            <span className="text-sm font-medium text-purple-900">
                                                Creating your upsell page...
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                ~25-35 seconds
                                            </span>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="mb-6 h-2 overflow-hidden rounded-full bg-purple-100">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 transition-all duration-500"
                                                style={{
                                                    width: `${(progressStages.filter((s) => s.status === "completed").length / progressStages.length) * 100}%`,
                                                }}
                                            />
                                        </div>

                                        {/* Stage list */}
                                        <div className="space-y-3">
                                            {progressStages.map((stage) => (
                                                <div
                                                    key={stage.id}
                                                    className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
                                                        stage.status === "in_progress"
                                                            ? "bg-purple-50"
                                                            : ""
                                                    }`}
                                                >
                                                    {stage.status === "completed" ? (
                                                        <Check className="h-5 w-5 text-green-600" />
                                                    ) : stage.status === "in_progress" ? (
                                                        <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                                                    ) : (
                                                        <Circle className="h-5 w-5 text-gray-300" />
                                                    )}
                                                    <span
                                                        className={`text-sm ${
                                                            stage.status === "completed"
                                                                ? "text-green-700"
                                                                : stage.status ===
                                                                    "in_progress"
                                                                  ? "font-medium text-purple-900"
                                                                  : "text-muted-foreground"
                                                        }`}
                                                    >
                                                        {stage.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <TooltipProvider>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-foreground">
                                                Offer
                                            </label>
                                            <select
                                                value={formData.offerId}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        offerId: e.target.value,
                                                    })
                                                }
                                                disabled={isCreating}
                                                className="w-full rounded-lg border border-border bg-card px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {offers.map((offer) => (
                                                    <option key={offer.id} value={offer.id}>
                                                        {offer.name} - {offer.currency}{" "}
                                                        {offer.price.toLocaleString()}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                The offer you want to upsell
                                            </p>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-foreground">
                                                Upsell Price (USD)
                                            </label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={formData.priceDollars}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            priceDollars: e.target.value,
                                                        })
                                                    }
                                                    disabled={isCreating}
                                                    placeholder="97.00"
                                                    className="w-full rounded-lg border border-border bg-card px-4 py-3 pl-10 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </div>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                The price for this upsell offer
                                            </p>
                                        </div>

                                        {formData.upsellNumber === 2 && (
                                            <div className="rounded-lg border border-border bg-card p-4">
                                                <div className="flex items-start gap-3">
                                                    <Switch
                                                        id="downsell"
                                                        checked={formData.isDownsell}
                                                        onCheckedChange={(checked) =>
                                                            setFormData({
                                                                ...formData,
                                                                isDownsell: checked,
                                                            })
                                                        }
                                                        disabled={isCreating}
                                                    />
                                                    <div className="flex-1">
                                                        <label
                                                            htmlFor="downsell"
                                                            className="cursor-pointer text-sm font-medium text-foreground"
                                                        >
                                                            Make this a downsell
                                                        </label>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            Only show this offer if the
                                                            customer declines Upsell 1
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                                                Template Style
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-xs">
                                                        <p className="text-sm">
                                                            Choose a template that matches
                                                            your upsell offer type and
                                                            messaging strategy
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </label>
                                            <div className="space-y-3">
                                                {TEMPLATE_OPTIONS.map((template) => (
                                                    <div key={template.value}>
                                                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-purple-300 hover:bg-purple-50">
                                                            <input
                                                                type="radio"
                                                                name="templateType"
                                                                value={template.value}
                                                                checked={
                                                                    formData.templateType ===
                                                                    template.value
                                                                }
                                                                onChange={(e) =>
                                                                    setFormData({
                                                                        ...formData,
                                                                        templateType: e
                                                                            .target
                                                                            .value as any,
                                                                    })
                                                                }
                                                                disabled={isCreating}
                                                                className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500"
                                                            />
                                                            <div className="flex-1">
                                                                <div className="font-medium text-foreground">
                                                                    {template.label}
                                                                </div>
                                                                <p className="mt-1 text-sm text-muted-foreground">
                                                                    {template.description}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                onClick={() => setShowCreateForm(false)}
                                                disabled={isCreating}
                                                className="rounded-lg border border-border bg-card px-6 py-2 font-medium text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleGenerate}
                                                disabled={
                                                    !formData.offerId ||
                                                    !formData.priceDollars ||
                                                    isCreating
                                                }
                                                className={`flex items-center gap-2 rounded-lg px-6 py-2 font-semibold ${
                                                    formData.offerId &&
                                                    formData.priceDollars &&
                                                    !isCreating
                                                        ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:opacity-90"
                                                        : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                                }`}
                                            >
                                                <Sparkles className="h-4 w-4" />
                                                Generate Page
                                            </button>
                                        </div>
                                    </div>
                                </TooltipProvider>
                            )}
                        </div>
                    </div>
                )}

                {/* Helper Info */}
                <div className="rounded-lg border border-primary/10 bg-primary/5 p-6">
                    <h4 className="mb-3 font-semibold text-primary">
                        Upsell Page Best Practices
                    </h4>
                    <ul className="space-y-2 text-sm text-primary">
                        <li>
                            • Keep upsell offers relevant and complementary to the main
                            purchase
                        </li>
                        <li>
                            • Price Upsell 1 at a premium value point, Upsell 2 as a
                            lower-priced alternative (downsell)
                        </li>
                        <li>
                            • Use strong urgency messaging—this is a one-time opportunity
                        </li>
                        <li>
                            • Focus on how the upsell accelerates results or adds
                            significant value
                        </li>
                        <li>
                            • Industry average upsell take rates: 20-35% for Upsell 1,
                            15-25% for Upsell 2
                        </li>
                    </ul>
                </div>
            </div>
        </StepLayout>
    );
}
