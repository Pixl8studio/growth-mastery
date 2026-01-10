"use client";

/**
 * Step 12: Checkout Pages
 * Create Stripe-powered checkout pages for secure payment processing
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { useIsMobile } from "@/lib/mobile-utils.client";
import {
    FileText,
    PlusCircle,
    Eye,
    Pencil,
    Trash2,
    X,
    Loader2,
    HelpCircle,
    Sparkles,
    Check,
    Circle,
    CreditCard,
    AlertTriangle,
    ExternalLink,
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

interface CheckoutPage {
    id: string;
    headline: string;
    subheadline: string | null;
    is_published: boolean;
    offer_id: string | null;
    created_at: string;
    order_bump_config: any;
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

// Unified page type for combined list
interface UnifiedCheckoutPage {
    id: string;
    title: string;
    subtitle?: string;
    status: "draft" | "published";
    type: "ai-editor" | "legacy";
    created_at: string;
    version?: number;
    offer_id?: string | null;
}

// Progress stages for generation
interface ProgressStage {
    id: string;
    label: string;
    status: "pending" | "in_progress" | "completed";
}

const GENERATION_STAGES: ProgressStage[] = [
    { id: "offer", label: "Loading your offer data", status: "pending" },
    { id: "payment", label: "Configuring payment form", status: "pending" },
    { id: "brand", label: "Applying brand design", status: "pending" },
    { id: "summary", label: "Building order summary", status: "pending" },
    { id: "trust", label: "Adding trust elements", status: "pending" },
    { id: "finalize", label: "Finalizing checkout page", status: "pending" },
];

const TEMPLATE_OPTIONS = [
    {
        value: "trust-focused",
        label: "Trust Focused",
        description:
            "Prominent security badges, testimonials, and money-back guarantee. Ideal for first-time customers and higher-priced offers.",
    },
    {
        value: "streamlined-express",
        label: "Streamlined Express",
        description:
            "Minimal distractions with fast checkout flow. Perfect for impulse purchases and returning customers.",
    },
    {
        value: "value-reinforcement",
        label: "Value Reinforcement",
        description:
            "Shows offer recap, benefits summary, and value comparison. Best for considered purchases and premium offers.",
    },
] as const;

export default function Step12CheckoutPage({
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
                feature: "Checkout Page Editor",
                description:
                    "The checkout page editor requires a desktop computer for designing secure payment forms with Stripe integration.",
                returnPath: `/funnel-builder/${projectId}`,
            });
            router.push(`/desktop-required?${params.toString()}`);
        }
    }, [isMobile, projectId, router]);

    const [offers, setOffers] = useState<Offer[]>([]);
    const [checkoutPages, setCheckoutPages] = useState<CheckoutPage[]>([]);
    const [aiEditorPages, setAiEditorPages] = useState<AIEditorPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [progressStages, setProgressStages] = useState<ProgressStage[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);
    const [formData, setFormData] = useState({
        offerId: "",
        templateType: "trust-focused" as
            | "trust-focused"
            | "streamlined-express"
            | "value-reinforcement",
        orderBumpEnabled: false,
        orderBumpOfferId: "",
    });

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    // Simulate progress stages with realistic timing
    const simulateProgress = useCallback(async (): Promise<void> => {
        const stages = [...GENERATION_STAGES];
        setProgressStages(stages);

        // Timing for each stage (in ms) - total ~25-35 seconds
        const stageTiming = [
            1500, // Loading offer data
            3000, // Configuring payment form
            2500, // Applying brand design
            8000, // Building order summary
            6000, // Adding trust elements
            3000, // Finalizing checkout page
        ];

        for (let i = 0; i < stages.length; i++) {
            // Mark current stage as in_progress
            setProgressStages((prev) =>
                prev.map((s, idx) => ({
                    ...s,
                    status:
                        idx < i ? "completed" : idx === i ? "in_progress" : "pending",
                }))
            );

            await new Promise((resolve) => setTimeout(resolve, stageTiming[i]));
        }

        // Mark all as completed
        setProgressStages((prev) =>
            prev.map((s) => ({ ...s, status: "completed" as const }))
        );
    }, []);

    // Handle Generate Checkout Page
    const handleGenerate = async () => {
        if (!projectId || !formData.offerId) return;

        setIsCreating(true);
        const startTime = Date.now();

        // Start progress simulation in parallel with API call
        const progressPromise = simulateProgress();

        try {
            logger.info(
                {
                    projectId,
                    pageType: "checkout",
                    offerId: formData.offerId,
                    templateStyle: formData.templateType,
                    orderBumpEnabled: formData.orderBumpEnabled,
                },
                "Creating checkout page with AI editor"
            );

            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "checkout",
                    offerId: formData.offerId,
                    templateStyle: formData.templateType,
                    orderBumpConfig: formData.orderBumpEnabled
                        ? {
                              enabled: true,
                              offerId: formData.orderBumpOfferId,
                          }
                        : { enabled: false },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || "Failed to create page");
            }

            const elapsed = Date.now() - startTime;

            // If API completed quickly (under 15 seconds), fast-forward progress
            if (elapsed < 15000) {
                setProgressStages((prev) =>
                    prev.map((s) => ({ ...s, status: "completed" as const }))
                );
                // Small delay so user sees completion
                await new Promise((resolve) => setTimeout(resolve, 500));
            } else {
                // Otherwise wait for progress simulation to finish naturally
                await progressPromise;
            }

            logger.info({ pageId: data.pageId }, "Checkout page created");

            // Add the new page to the list
            const newPage: AIEditorPage = {
                id: data.pageId,
                title: data.title || "Checkout Page",
                page_type: "checkout",
                status: "draft",
                version: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setAiEditorPages((prev) => [newPage, ...prev]);

            // Reset form and close
            setShowCreateForm(false);
            setProgressStages([]);

            toast({
                title: "Checkout page created!",
                description: "Opening the AI Editor in a new tab...",
            });

            // Open in new tab
            window.open(`/ai-editor/${data.pageId}`, "_blank");
        } catch (error: any) {
            logger.error({ error }, "Failed to create checkout page");
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

                // Check Stripe connection
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    const { data: profile, error: profileError } = await supabase
                        .from("user_profiles")
                        .select("stripe_account_id, stripe_charges_enabled")
                        .eq("id", user.id)
                        .single();

                    if (!profileError && profile) {
                        setStripeConnected(
                            !!profile.stripe_account_id &&
                                profile.stripe_charges_enabled
                        );
                    } else {
                        setStripeConnected(false);
                    }
                }

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
                        orderBumpOfferId: offerData.length > 1 ? offerData[1].id : "",
                    }));
                }

                // Load checkout pages
                const { data: pagesData, error: pagesError } = await supabase
                    .from("checkout_pages")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (pagesError) {
                    logger.warn({ error: pagesError }, "Failed to load checkout pages");
                } else {
                    setCheckoutPages(pagesData || []);
                }

                // Load AI Editor v2 pages
                const { data: aiPagesData, error: aiPagesError } = await supabase
                    .from("ai_editor_pages")
                    .select(
                        "id, title, page_type, status, version, created_at, updated_at"
                    )
                    .eq("funnel_project_id", projectId)
                    .eq("page_type", "checkout")
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

    const handlePreviewLegacy = (pageId: string) => {
        const previewUrl = `/funnel-builder/${projectId}/pages/checkout/${pageId}`;
        window.open(previewUrl, "_blank");
    };

    // Create unified pages list combining AI Editor and legacy pages
    const unifiedPages: UnifiedCheckoutPage[] = [
        // AI Editor pages first (newer)
        ...aiEditorPages.map((page) => ({
            id: page.id,
            title: page.title,
            status: page.status,
            type: "ai-editor" as const,
            created_at: page.created_at,
            version: page.version,
        })),
        // Legacy pages with badge
        ...checkoutPages.map((page) => ({
            id: page.id,
            title: page.headline,
            subtitle: page.subheadline || undefined,
            status: (page.is_published ? "published" : "draft") as
                | "published"
                | "draft",
            type: "legacy" as const,
            created_at: page.created_at,
            offer_id: page.offer_id,
        })),
    ].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const handleDelete = async (pageId: string) => {
        if (!confirm("Delete this checkout page?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("checkout_pages")
                .delete()
                .eq("id", pageId);

            if (error) throw error;

            setCheckoutPages((prev) => prev.filter((p) => p.id !== pageId));
            logger.info({ pageId }, "Checkout page deleted");

            toast({
                title: "Page Deleted",
                description: "Checkout page has been removed",
            });
        } catch (error: any) {
            logger.error({ error }, "Failed to delete checkout page");
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description:
                    error?.message || "Could not delete the page. Please try again.",
            });
        }
    };

    const hasOffer = offers.length > 0;
    const hasCheckoutPage = unifiedPages.length > 0;
    const canCreatePage = hasOffer && stripeConnected === true;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={12}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            nextDisabled={!hasCheckoutPage}
            nextLabel={hasCheckoutPage ? "Create Upsell Pages" : "Create Page First"}
            stepTitle="Checkout Page"
            stepDescription="Create Stripe-powered checkout pages for secure payments"
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

                {/* Stripe Connection Warning */}
                {stripeConnected === false && (
                    <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-6 w-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="mb-2 text-lg font-semibold text-amber-900">
                                    Stripe Connection Required
                                </h3>
                                <p className="mb-4 text-sm text-amber-800">
                                    Checkout pages require Stripe to process payments.
                                    Connect your Stripe account to accept credit cards,
                                    Apple Pay, Google Pay, and other payment methods.
                                </p>
                                <Link
                                    href="/settings/payments"
                                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                                >
                                    <CreditCard className="h-4 w-4" />
                                    Connect Stripe Account
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Generate Button or Form */}
                {!showCreateForm ? (
                    <div className="rounded-lg border border-purple-100 bg-gradient-to-br from-purple-50 to-primary/5 p-8">
                        <div className="flex flex-col items-center gap-6 text-center">
                            {/* Animated Generate Button */}
                            <button
                                onClick={() => setShowCreateForm(true)}
                                disabled={!canCreatePage}
                                className={`group relative flex items-center gap-3 rounded-xl px-10 py-5 text-xl font-bold transition-all duration-300 ${
                                    canCreatePage
                                        ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02]"
                                        : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                }`}
                            >
                                {/* Glow effect */}
                                {canCreatePage && (
                                    <span className="absolute inset-0 -z-10 animate-pulse rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 opacity-50 blur-lg" />
                                )}
                                <Sparkles className="h-7 w-7" />
                                {canCreatePage
                                    ? "Generate Checkout Page"
                                    : stripeConnected === false
                                      ? "Connect Stripe First"
                                      : "Complete Prerequisites First"}
                            </button>

                            {canCreatePage && (
                                <p className="max-w-md text-sm text-muted-foreground">
                                    Create a secure, conversion-optimized checkout page
                                    with Stripe integration in seconds
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-primary/5 p-8 shadow-soft">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-foreground">
                                    Generate Checkout Page
                                </h3>
                                {!isCreating && (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        This typically takes 20-30 seconds
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
                                            Creating your checkout page...
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            ~20-30 seconds
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
                                            The product customers will purchase
                                        </p>
                                    </div>

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
                                                        your customer base and offer
                                                        price point
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

                                    {/* Order Bump Configuration */}
                                    {offers.length > 1 && (
                                        <div className="rounded-lg border border-border bg-card p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <div>
                                                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                                        Order Bump
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-muted-foreground" />
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-xs">
                                                                <p className="text-sm">
                                                                    Add a complementary
                                                                    offer to the
                                                                    checkout with a
                                                                    single checkbox
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </label>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Increase average order value by
                                                        20-30%
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={formData.orderBumpEnabled}
                                                    onCheckedChange={(checked) =>
                                                        setFormData({
                                                            ...formData,
                                                            orderBumpEnabled: checked,
                                                        })
                                                    }
                                                    disabled={isCreating}
                                                />
                                            </div>

                                            {formData.orderBumpEnabled && (
                                                <div className="mt-4">
                                                    <label className="mb-2 block text-sm font-medium text-foreground">
                                                        Bump Offer
                                                    </label>
                                                    <select
                                                        value={
                                                            formData.orderBumpOfferId
                                                        }
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                orderBumpOfferId:
                                                                    e.target.value,
                                                            })
                                                        }
                                                        disabled={isCreating}
                                                        className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {offers
                                                            .filter(
                                                                (o) =>
                                                                    o.id !==
                                                                    formData.offerId
                                                            )
                                                            .map((offer) => (
                                                                <option
                                                                    key={offer.id}
                                                                    value={offer.id}
                                                                >
                                                                    {offer.name} -{" "}
                                                                    {offer.currency}{" "}
                                                                    {offer.price.toLocaleString()}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}

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
                                            disabled={!formData.offerId || isCreating}
                                            className={`flex items-center gap-2 rounded-lg px-6 py-2 font-semibold ${
                                                formData.offerId && !isCreating
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
                )}

                {/* Unified Pages List */}
                <div className="rounded-lg border border-border bg-card shadow-soft">
                    <div className="border-b border-border p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-foreground">
                                Your Checkout Pages
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {unifiedPages.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {unifiedPages.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                                    <CreditCard className="h-8 w-8 text-purple-600" />
                                </div>
                                <h4 className="mb-2 text-lg font-semibold text-foreground">
                                    No checkout pages yet
                                </h4>
                                <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                                    Create your first checkout page to start accepting
                                    secure payments through Stripe
                                </p>
                                {canCreatePage && (
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
                                    >
                                        <Sparkles className="h-5 w-5" />
                                        Generate Your First Page
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {unifiedPages.map((page) => {
                                    const isLegacy = page.type === "legacy";
                                    const legacyPage = isLegacy
                                        ? checkoutPages.find((p) => p.id === page.id)
                                        : null;

                                    return (
                                        <div
                                            key={page.id}
                                            className="rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-purple-300 hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                                        <h4 className="text-lg font-semibold text-foreground">
                                                            {page.title}
                                                        </h4>
                                                        {isLegacy && (
                                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                                                Legacy
                                                            </span>
                                                        )}
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                                page.status ===
                                                                "published"
                                                                    ? "bg-green-100 text-green-800"
                                                                    : "bg-yellow-100 text-yellow-800"
                                                            }`}
                                                        >
                                                            {page.status === "published"
                                                                ? "Published"
                                                                : "Draft"}
                                                        </span>
                                                    </div>

                                                    {page.subtitle && (
                                                        <p className="mb-3 text-sm text-muted-foreground">
                                                            {page.subtitle}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <span>
                                                            Created{" "}
                                                            {new Date(
                                                                page.created_at
                                                            ).toLocaleDateString()}
                                                        </span>
                                                        {page.version && (
                                                            <span>
                                                                Version {page.version}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {isLegacy ? (
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() =>
                                                                        handlePreviewLegacy(
                                                                            page.id
                                                                        )
                                                                    }
                                                                    className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                    title="Preview"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            page.id
                                                                        )
                                                                    }
                                                                    className="rounded p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* AI Editor page actions */}
                                                            <button
                                                                onClick={() =>
                                                                    handleEditAIEditor(
                                                                        page.id
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                Edit Page
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Helper Info */}
                <div className="rounded-lg border border-primary/10 bg-primary/5 p-6">
                    <h4 className="mb-3 font-semibold text-primary">
                        Checkout Page Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-primary">
                        <li>
                            • Stripe handles all payment processing, security, and PCI
                            compliance for you
                        </li>
                        <li>
                            • Use trust-focused templates for first-time customers and
                            higher-priced offers
                        </li>
                        <li>
                            • Order bumps can increase your average order value by
                            20-30%
                        </li>
                        <li>
                            • All checkout pages are mobile-responsive and optimized for
                            conversion
                        </li>
                    </ul>
                </div>
            </div>
        </StepLayout>
    );
}
