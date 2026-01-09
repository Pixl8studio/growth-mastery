"use client";

/**
 * Step 14: Thank You Pages
 * Create dynamic post-purchase confirmation pages with conditional content blocks
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { useIsMobile } from "@/lib/mobile-utils.client";
import {
    FileText,
    Eye,
    Pencil,
    Trash2,
    X,
    Loader2,
    HelpCircle,
    Sparkles,
    Check,
    Circle,
    Heart,
    Users,
    Share2,
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
    offer_type: string;
    features: any;
    created_at: string;
}

interface ThankYouPage {
    id: string;
    headline: string;
    subheadline: string | null;
    is_published: boolean;
    created_at: string;
    content_blocks: any;
    show_order_summary: boolean;
    social_sharing_config: any;
    community_config: any;
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
interface UnifiedThankYouPage {
    id: string;
    title: string;
    subtitle?: string;
    status: "draft" | "published";
    type: "ai-editor" | "legacy";
    created_at: string;
    version?: number;
}

// Progress stages for generation
interface ProgressStage {
    id: string;
    label: string;
    status: "pending" | "in_progress" | "completed";
}

const GENERATION_STAGES: ProgressStage[] = [
    { id: "purchase", label: "Loading your purchase data", status: "pending" },
    { id: "access", label: "Preparing access content", status: "pending" },
    { id: "brand", label: "Applying brand design", status: "pending" },
    { id: "welcome", label: "Creating welcome message", status: "pending" },
    { id: "steps", label: "Setting up next steps", status: "pending" },
    { id: "finalize", label: "Finalizing thank you page", status: "pending" },
];

const TEMPLATE_OPTIONS = [
    {
        value: "celebration-access",
        label: "Celebration Access",
        description:
            "Celebration tone with immediate access focus. Perfect for digital products and instant gratification.",
    },
    {
        value: "welcome-community",
        label: "Welcome Community",
        description:
            "Community-focused with belonging emphasis. Ideal for membership programs and group offerings.",
    },
    {
        value: "action-steps",
        label: "Action Steps",
        description:
            "Clear next steps with implementation focus. Best for courses and transformation programs.",
    },
] as const;

const COMMUNITY_PLATFORMS = [
    { value: "", label: "None" },
    { value: "facebook", label: "Facebook Group" },
    { value: "discord", label: "Discord" },
    { value: "slack", label: "Slack" },
    { value: "circle", label: "Circle" },
] as const;

export default function Step14ThankYouPage({
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
                feature: "Thank You Page Editor",
                description:
                    "The thank you page editor requires a desktop computer for configuring dynamic content blocks and access instructions.",
                returnPath: `/funnel-builder/${projectId}`,
            });
            router.push(`/desktop-required?${params.toString()}`);
        }
    }, [isMobile, projectId, router]);

    const [offers, setOffers] = useState<Offer[]>([]);
    const [thankYouPages, setThankYouPages] = useState<ThankYouPage[]>([]);
    const [aiEditorPages, setAiEditorPages] = useState<AIEditorPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [progressStages, setProgressStages] = useState<ProgressStage[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        templateType: "celebration-access" as
            | "celebration-access"
            | "welcome-community"
            | "action-steps",
        showOrderSummary: true,
        enableSocialSharing: false,
        communityPlatform: "",
        contentBlocks: {
            coreOffer: {
                enabled: true,
                accessInstructions: "",
            },
            orderBump: {
                enabled: false,
                accessInstructions: "",
            },
            upsell1: {
                enabled: false,
                accessInstructions: "",
            },
            upsell2: {
                enabled: false,
                accessInstructions: "",
            },
        },
    });

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    // Simulate progress stages with realistic timing
    const simulateProgress = useCallback(async (): Promise<void> => {
        const stages = [...GENERATION_STAGES];
        setProgressStages(stages);

        // Timing for each stage (in ms) - total ~20-30 seconds
        const stageTiming = [
            1500, // Loading purchase data
            3000, // Preparing access content
            2500, // Applying brand design
            6000, // Creating welcome message
            5000, // Setting up next steps
            3000, // Finalizing thank you page
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

    // Handle Generate Thank You Page
    const handleGenerate = async () => {
        if (!projectId) return;

        setIsCreating(true);
        const startTime = Date.now();

        // Start progress simulation in parallel with API call
        const progressPromise = simulateProgress();

        try {
            logger.info(
                {
                    projectId,
                    pageType: "thank_you",
                    templateStyle: formData.templateType,
                    showOrderSummary: formData.showOrderSummary,
                    enableSocialSharing: formData.enableSocialSharing,
                },
                "Creating thank you page with AI editor"
            );

            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "thank_you",
                    templateStyle: formData.templateType,
                    showOrderSummary: formData.showOrderSummary,
                    socialSharingConfig: {
                        enabled: formData.enableSocialSharing,
                    },
                    communityConfig: {
                        enabled: !!formData.communityPlatform,
                        platform: formData.communityPlatform,
                    },
                    contentBlocks: {
                        core_offer: {
                            enabled: formData.contentBlocks.coreOffer.enabled,
                            access_instructions:
                                formData.contentBlocks.coreOffer.accessInstructions ||
                                null,
                        },
                        order_bump: {
                            enabled: formData.contentBlocks.orderBump.enabled,
                            access_instructions:
                                formData.contentBlocks.orderBump.accessInstructions ||
                                null,
                        },
                        upsell_1: {
                            enabled: formData.contentBlocks.upsell1.enabled,
                            access_instructions:
                                formData.contentBlocks.upsell1.accessInstructions ||
                                null,
                        },
                        upsell_2: {
                            enabled: formData.contentBlocks.upsell2.enabled,
                            access_instructions:
                                formData.contentBlocks.upsell2.accessInstructions ||
                                null,
                        },
                    },
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

            logger.info({ pageId: data.pageId }, "Thank you page created");

            // Add the new page to the list
            const newPage: AIEditorPage = {
                id: data.pageId,
                title: data.title || "Thank You Page",
                page_type: "thank_you",
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
                title: "Thank you page created!",
                description: "Opening the AI Editor in a new tab...",
            });

            // Open in new tab
            window.open(`/ai-editor/${data.pageId}`, "_blank");
        } catch (error: any) {
            logger.error({ error }, "Failed to create thank you page");
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

                // Load offers
                const { data: offerData, error: offerError } = await supabase
                    .from("offers")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (offerError) throw offerError;
                setOffers(offerData || []);

                // Check which offer types exist
                const hasOrderBump = offerData?.some(
                    (o) => o.offer_type === "order_bump"
                );
                const hasUpsell1 = offerData?.some((o) => o.offer_type === "upsell_1");
                const hasUpsell2 = offerData?.some((o) => o.offer_type === "upsell_2");

                // Update content blocks based on available offers
                setFormData((prev) => ({
                    ...prev,
                    contentBlocks: {
                        ...prev.contentBlocks,
                        orderBump: {
                            ...prev.contentBlocks.orderBump,
                            enabled: hasOrderBump,
                        },
                        upsell1: {
                            ...prev.contentBlocks.upsell1,
                            enabled: hasUpsell1,
                        },
                        upsell2: {
                            ...prev.contentBlocks.upsell2,
                            enabled: hasUpsell2,
                        },
                    },
                }));

                // Load thank you pages
                const { data: pagesData, error: pagesError } = await supabase
                    .from("thank_you_pages")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (pagesError) {
                    logger.warn(
                        { error: pagesError },
                        "Failed to load thank you pages"
                    );
                } else {
                    setThankYouPages(pagesData || []);
                }

                // Load AI Editor v2 pages
                const { data: aiPagesData, error: aiPagesError } = await supabase
                    .from("ai_editor_pages")
                    .select(
                        "id, title, page_type, status, version, created_at, updated_at"
                    )
                    .eq("funnel_project_id", projectId)
                    .eq("page_type", "thank_you")
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
        const previewUrl = `/funnel-builder/${projectId}/pages/thank-you/${pageId}`;
        window.open(previewUrl, "_blank");
    };

    // Create unified pages list combining AI Editor and legacy pages
    const unifiedPages: UnifiedThankYouPage[] = [
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
        ...thankYouPages.map((page) => ({
            id: page.id,
            title: page.headline,
            subtitle: page.subheadline || undefined,
            status: (page.is_published ? "published" : "draft") as
                | "published"
                | "draft",
            type: "legacy" as const,
            created_at: page.created_at,
        })),
    ].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const handleDelete = async (pageId: string) => {
        if (!confirm("Delete this thank you page?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("thank_you_pages")
                .delete()
                .eq("id", pageId);

            if (error) throw error;

            setThankYouPages((prev) => prev.filter((p) => p.id !== pageId));
            logger.info({ pageId }, "Thank you page deleted");

            toast({
                title: "Page Deleted",
                description: "Thank you page has been removed",
            });
        } catch (error: any) {
            logger.error({ error }, "Failed to delete thank you page");
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description:
                    error?.message || "Could not delete the page. Please try again.",
            });
        }
    };

    const hasOffer = offers.length > 0;
    const hasThankYouPage = unifiedPages.length > 0;
    const canCreatePage = hasOffer;

    // Get offers by type for content blocks
    const coreOffer = offers.find((o) => o.offer_type === "core" || !o.offer_type);
    const orderBumpOffer = offers.find((o) => o.offer_type === "order_bump");
    const upsell1Offer = offers.find((o) => o.offer_type === "upsell_1");
    const upsell2Offer = offers.find((o) => o.offer_type === "upsell_2");

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={14}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            nextDisabled={!hasThankYouPage}
            nextLabel={hasThankYouPage ? "Continue" : "Create Page First"}
            stepTitle="Thank You Pages"
            stepDescription="Create dynamic purchase confirmation pages with personalized content"
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
                                    ? "Generate Thank You Page"
                                    : "Complete Prerequisites First"}
                            </button>

                            {canCreatePage && (
                                <p className="max-w-md text-sm text-muted-foreground">
                                    Create a personalized purchase confirmation page
                                    that adapts to what each customer bought
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-primary/5 p-8 shadow-soft">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-foreground">
                                    Generate Thank You Page
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
                                            Creating your thank you page...
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
                                <div className="space-y-6">
                                    {/* Template Style */}
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
                                                        your product type and customer
                                                        journey
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

                                    {/* Page Configuration */}
                                    <div className="rounded-lg border border-border bg-card p-4">
                                        <h4 className="mb-4 font-semibold text-foreground">
                                            Page Configuration
                                        </h4>
                                        <div className="space-y-4">
                                            {/* Show Order Summary */}
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-sm font-medium text-foreground">
                                                        Show Order Summary
                                                    </label>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Display what the customer
                                                        purchased
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={formData.showOrderSummary}
                                                    onCheckedChange={(checked) =>
                                                        setFormData({
                                                            ...formData,
                                                            showOrderSummary: checked,
                                                        })
                                                    }
                                                    disabled={isCreating}
                                                />
                                            </div>

                                            {/* Enable Social Sharing */}
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                                        <Share2 className="h-4 w-4" />
                                                        Enable Social Sharing
                                                    </label>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Let customers share their
                                                        purchase
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={
                                                        formData.enableSocialSharing
                                                    }
                                                    onCheckedChange={(checked) =>
                                                        setFormData({
                                                            ...formData,
                                                            enableSocialSharing:
                                                                checked,
                                                        })
                                                    }
                                                    disabled={isCreating}
                                                />
                                            </div>

                                            {/* Community Platform */}
                                            <div>
                                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                                                    <Users className="h-4 w-4" />
                                                    Community Platform
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs">
                                                            <p className="text-sm">
                                                                Invite customers to join
                                                                your community
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </label>
                                                <select
                                                    value={formData.communityPlatform}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            communityPlatform:
                                                                e.target.value,
                                                        })
                                                    }
                                                    disabled={isCreating}
                                                    className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {COMMUNITY_PLATFORMS.map(
                                                        (platform) => (
                                                            <option
                                                                key={platform.value}
                                                                value={platform.value}
                                                            >
                                                                {platform.label}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Blocks */}
                                    <div className="rounded-lg border border-border bg-card p-4">
                                        <h4 className="mb-4 font-semibold text-foreground">
                                            Access Instructions
                                        </h4>
                                        <p className="mb-4 text-sm text-muted-foreground">
                                            Configure what content shows based on what
                                            each customer purchased. Leave blank to use
                                            AI-generated instructions.
                                        </p>
                                        <div className="space-y-4">
                                            {/* Core Offer */}
                                            {coreOffer && (
                                                <div>
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <label className="text-sm font-medium text-foreground">
                                                            {coreOffer.name} (Core
                                                            Offer)
                                                        </label>
                                                        <Switch
                                                            checked={
                                                                formData.contentBlocks
                                                                    .coreOffer.enabled
                                                            }
                                                            onCheckedChange={(
                                                                checked
                                                            ) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    contentBlocks: {
                                                                        ...formData.contentBlocks,
                                                                        coreOffer: {
                                                                            ...formData
                                                                                .contentBlocks
                                                                                .coreOffer,
                                                                            enabled:
                                                                                checked,
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                            disabled={isCreating}
                                                        />
                                                    </div>
                                                    {formData.contentBlocks.coreOffer
                                                        .enabled && (
                                                        <textarea
                                                            value={
                                                                formData.contentBlocks
                                                                    .coreOffer
                                                                    .accessInstructions
                                                            }
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    contentBlocks: {
                                                                        ...formData.contentBlocks,
                                                                        coreOffer: {
                                                                            ...formData
                                                                                .contentBlocks
                                                                                .coreOffer,
                                                                            accessInstructions:
                                                                                e.target
                                                                                    .value,
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                            disabled={isCreating}
                                                            placeholder="Optional: Enter custom access instructions for the core offer..."
                                                            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                            rows={3}
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {/* Order Bump */}
                                            {orderBumpOffer && (
                                                <div>
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <label className="text-sm font-medium text-foreground">
                                                            {orderBumpOffer.name} (Order
                                                            Bump)
                                                        </label>
                                                        <Switch
                                                            checked={
                                                                formData.contentBlocks
                                                                    .orderBump.enabled
                                                            }
                                                            onCheckedChange={(
                                                                checked
                                                            ) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    contentBlocks: {
                                                                        ...formData.contentBlocks,
                                                                        orderBump: {
                                                                            ...formData
                                                                                .contentBlocks
                                                                                .orderBump,
                                                                            enabled:
                                                                                checked,
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                            disabled={isCreating}
                                                        />
                                                    </div>
                                                    {formData.contentBlocks.orderBump
                                                        .enabled && (
                                                        <textarea
                                                            value={
                                                                formData.contentBlocks
                                                                    .orderBump
                                                                    .accessInstructions
                                                            }
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    contentBlocks: {
                                                                        ...formData.contentBlocks,
                                                                        orderBump: {
                                                                            ...formData
                                                                                .contentBlocks
                                                                                .orderBump,
                                                                            accessInstructions:
                                                                                e.target
                                                                                    .value,
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                            disabled={isCreating}
                                                            placeholder="Optional: Enter custom access instructions for the order bump..."
                                                            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                            rows={3}
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {/* Upsell 1 */}
                                            {upsell1Offer && (
                                                <div>
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <label className="text-sm font-medium text-foreground">
                                                            {upsell1Offer.name} (Upsell
                                                            1)
                                                        </label>
                                                        <Switch
                                                            checked={
                                                                formData.contentBlocks
                                                                    .upsell1.enabled
                                                            }
                                                            onCheckedChange={(
                                                                checked
                                                            ) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    contentBlocks: {
                                                                        ...formData.contentBlocks,
                                                                        upsell1: {
                                                                            ...formData
                                                                                .contentBlocks
                                                                                .upsell1,
                                                                            enabled:
                                                                                checked,
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                            disabled={isCreating}
                                                        />
                                                    </div>
                                                    {formData.contentBlocks.upsell1
                                                        .enabled && (
                                                        <textarea
                                                            value={
                                                                formData.contentBlocks
                                                                    .upsell1
                                                                    .accessInstructions
                                                            }
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    contentBlocks: {
                                                                        ...formData.contentBlocks,
                                                                        upsell1: {
                                                                            ...formData
                                                                                .contentBlocks
                                                                                .upsell1,
                                                                            accessInstructions:
                                                                                e.target
                                                                                    .value,
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                            disabled={isCreating}
                                                            placeholder="Optional: Enter custom access instructions for upsell 1..."
                                                            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                            rows={3}
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {/* Upsell 2 */}
                                            {upsell2Offer && (
                                                <div>
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <label className="text-sm font-medium text-foreground">
                                                            {upsell2Offer.name} (Upsell
                                                            2)
                                                        </label>
                                                        <Switch
                                                            checked={
                                                                formData.contentBlocks
                                                                    .upsell2.enabled
                                                            }
                                                            onCheckedChange={(
                                                                checked
                                                            ) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    contentBlocks: {
                                                                        ...formData.contentBlocks,
                                                                        upsell2: {
                                                                            ...formData
                                                                                .contentBlocks
                                                                                .upsell2,
                                                                            enabled:
                                                                                checked,
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                            disabled={isCreating}
                                                        />
                                                    </div>
                                                    {formData.contentBlocks.upsell2
                                                        .enabled && (
                                                        <textarea
                                                            value={
                                                                formData.contentBlocks
                                                                    .upsell2
                                                                    .accessInstructions
                                                            }
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    contentBlocks: {
                                                                        ...formData.contentBlocks,
                                                                        upsell2: {
                                                                            ...formData
                                                                                .contentBlocks
                                                                                .upsell2,
                                                                            accessInstructions:
                                                                                e.target
                                                                                    .value,
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                            disabled={isCreating}
                                                            placeholder="Optional: Enter custom access instructions for upsell 2..."
                                                            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                            rows={3}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Preview Info */}
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
                                            <Heart className="h-4 w-4" />
                                            Dynamic Content Preview
                                        </h4>
                                        <p className="mb-3 text-sm text-blue-800">
                                            Your thank you page will automatically show
                                            different content based on what each
                                            customer purchased:
                                        </p>
                                        <ul className="space-y-1 text-sm text-blue-800">
                                            <li>
                                                • Core offer only → Shows core access
                                                instructions
                                            </li>
                                            {orderBumpOffer && (
                                                <li>
                                                    • Core + Order Bump → Shows both
                                                    sections
                                                </li>
                                            )}
                                            {upsell1Offer && (
                                                <li>
                                                    • Core + Upsell 1 → Shows core and
                                                    upsell 1
                                                </li>
                                            )}
                                            {upsell2Offer && (
                                                <li>
                                                    • Core + All Upsells → Shows all
                                                    enabled sections
                                                </li>
                                            )}
                                        </ul>
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
                                            disabled={isCreating}
                                            className={`flex items-center gap-2 rounded-lg px-6 py-2 font-semibold ${
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
                )}

                {/* Unified Pages List */}
                <div className="rounded-lg border border-border bg-card shadow-soft">
                    <div className="border-b border-border p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-foreground">
                                Your Thank You Pages
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
                                    <Heart className="h-8 w-8 text-purple-600" />
                                </div>
                                <h4 className="mb-2 text-lg font-semibold text-foreground">
                                    No thank you pages yet
                                </h4>
                                <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                                    Create your first thank you page to delight
                                    customers after purchase with personalized content
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
                                        ? thankYouPages.find((p) => p.id === page.id)
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
                        Thank You Page Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-primary">
                        <li>
                            • Content blocks automatically show/hide based on what each
                            customer purchased
                        </li>
                        <li>
                            • Use community invites to increase engagement and reduce
                            refunds
                        </li>
                        <li>
                            • Social sharing can drive referral traffic and
                            word-of-mouth marketing
                        </li>
                        <li>
                            • Clear access instructions reduce support requests and
                            improve satisfaction
                        </li>
                    </ul>
                </div>
            </div>
        </StepLayout>
    );
}
