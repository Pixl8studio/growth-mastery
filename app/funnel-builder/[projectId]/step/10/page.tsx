"use client";

/**
 * Step 10: Enrollment Pages
 * Create and manage enrollment/sales pages with AI-powered editor
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
    ArrowRight,
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

interface DeckStructure {
    id: string;
    slides: any[];
    metadata?: {
        title?: string;
    };
    total_slides: number;
    created_at: string;
}

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

interface EnrollmentPage {
    id: string;
    headline: string;
    subheadline: string;
    html_content: string;
    theme: any;
    is_published: boolean;
    offer_id: string | null;
    page_type: string;
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

// Unified page type for combined list
interface UnifiedEnrollmentPage {
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
    {
        id: "presentation",
        label: "Analyzing presentation structure",
        status: "pending",
    },
    { id: "brand", label: "Applying brand design", status: "pending" },
    { id: "hero", label: "Generating hero section", status: "pending" },
    { id: "value", label: "Building value proposition", status: "pending" },
    { id: "testimonials", label: "Creating testimonials", status: "pending" },
    { id: "finalize", label: "Finalizing page", status: "pending" },
];

const TEMPLATE_OPTIONS = [
    {
        value: "urgency-convert",
        label: "Urgency Convert",
        description:
            "High-energy sales page with countdown timers and scarcity messaging. Best for time-sensitive offers and launches.",
    },
    {
        value: "premium-elegant",
        label: "Premium Elegant",
        description:
            "Sophisticated design with refined styling. Ideal for high-ticket offers and luxury positioning.",
    },
    {
        value: "value-focused",
        label: "Value Focused",
        description:
            "Emphasizes benefits and ROI. Perfect for educational products and value-driven buyers.",
    },
] as const;

export default function Step5EnrollmentPage({
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
                feature: "Enrollment Page Editor",
                description:
                    "The enrollment page editor requires a desktop computer for designing and customizing sales pages with visual editing tools.",
                returnPath: `/funnel-builder/${projectId}`,
            });
            router.push(`/desktop-required?${params.toString()}`);
        }
    }, [isMobile, projectId, router]);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [enrollmentPages, setEnrollmentPages] = useState<EnrollmentPage[]>([]);
    const [aiEditorPages, setAiEditorPages] = useState<AIEditorPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [progressStages, setProgressStages] = useState<ProgressStage[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isMigrating, setIsMigrating] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        deckStructureId: "",
        offerId: "",
        templateType: "urgency-convert" as
            | "urgency-convert"
            | "premium-elegant"
            | "value-focused",
    });

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    // Simulate progress stages with realistic timing
    const simulateProgress = useCallback(async (): Promise<void> => {
        const stages = [...GENERATION_STAGES];
        setProgressStages(stages);

        // Timing for each stage (in ms) - total ~35-45 seconds
        const stageTiming = [
            1500, // Loading offer data
            2000, // Analyzing presentation structure
            2500, // Applying brand design
            12000, // Generating hero section (longest - AI generation)
            8000, // Building value proposition
            6000, // Creating testimonials
            3000, // Finalizing page
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

    // Handle Generate Enrollment Page
    const handleGenerate = async () => {
        if (!projectId || !formData.offerId || !formData.deckStructureId) return;

        setIsCreating(true);
        const startTime = Date.now();

        // Start progress simulation in parallel with API call
        const progressPromise = simulateProgress();

        try {
            logger.info(
                {
                    projectId,
                    pageType: "enrollment",
                    offerId: formData.offerId,
                    deckId: formData.deckStructureId,
                    templateStyle: formData.templateType,
                },
                "Creating enrollment page with AI editor"
            );

            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "enrollment",
                    offerId: formData.offerId,
                    deckId: formData.deckStructureId,
                    templateStyle: formData.templateType,
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

            logger.info({ pageId: data.pageId }, "Enrollment page created");

            // Add the new page to the list
            const newPage: AIEditorPage = {
                id: data.pageId,
                title: data.title || "Enrollment Page",
                page_type: "enrollment",
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
                title: "Enrollment page created!",
                description: "Opening the AI Editor in a new tab...",
            });

            // Open in new tab
            window.open(`/ai-editor/${data.pageId}`, "_blank");
        } catch (error: any) {
            logger.error({ error }, "Failed to create enrollment page");
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

    // Handle migration of legacy page to AI Editor
    const handleMigrateToAIEditor = async (legacyPage: EnrollmentPage) => {
        // Validate that the page has an associated offer
        if (!legacyPage.offer_id) {
            toast({
                variant: "destructive",
                title: "Cannot migrate",
                description:
                    "This page is not associated with an offer. Create a new page instead.",
            });
            return;
        }

        setIsMigrating(legacyPage.id);

        try {
            logger.info(
                { legacyPageId: legacyPage.id, offerId: legacyPage.offer_id },
                "Migrating legacy page to AI Editor"
            );

            // Create a new AI Editor page with the legacy content as a starting point
            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "enrollment",
                    offerId: legacyPage.offer_id,
                    customPrompt: `This is a migration from an existing enrollment page. Use this content as inspiration but create a modern, improved version:

Title: ${legacyPage.headline}
Subtitle: ${legacyPage.subheadline}

Please create an improved enrollment page that captures the same offer and messaging but with enhanced design and conversion optimization.`,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || "Failed to migrate page");
            }

            // Add the new page to the list
            const newPage: AIEditorPage = {
                id: data.pageId,
                title: data.title || legacyPage.headline,
                page_type: "enrollment",
                status: "draft",
                version: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setAiEditorPages((prev) => [newPage, ...prev]);

            toast({
                title: "Page migrated successfully!",
                description: "Opening the AI Editor to refine your new page...",
            });

            // Open in new tab
            window.open(`/ai-editor/${data.pageId}`, "_blank");
        } catch (error: any) {
            logger.error({ error }, "Failed to migrate page");
            toast({
                variant: "destructive",
                title: "Migration Failed",
                description:
                    error.message || "Could not migrate the page. Please try again.",
            });
        } finally {
            setIsMigrating(null);
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

                // Load deck structures
                const { data: deckData, error: deckError } = await supabase
                    .from("deck_structures")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (deckError) throw deckError;
                setDeckStructures(deckData || []);

                // Load offers
                const { data: offerData, error: offerError } = await supabase
                    .from("offers")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (offerError) throw offerError;
                setOffers(offerData || []);

                // Auto-select first deck and offer
                if (deckData && deckData.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        deckStructureId: deckData[0].id,
                    }));
                }
                if (offerData && offerData.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        offerId: offerData[0].id,
                    }));
                }

                // Load enrollment pages
                const { data: pagesData, error: pagesError } = await supabase
                    .from("enrollment_pages")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (pagesError) throw pagesError;
                setEnrollmentPages(pagesData || []);

                // Load AI Editor v2 pages
                const { data: aiPagesData, error: aiPagesError } = await supabase
                    .from("ai_editor_pages")
                    .select(
                        "id, title, page_type, status, version, created_at, updated_at"
                    )
                    .eq("funnel_project_id", projectId)
                    .eq("page_type", "enrollment")
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

    const handleEditLegacy = (pageId: string) => {
        const editorUrl = `/funnel-builder/${projectId}/pages/enrollment/${pageId}?edit=true`;
        window.open(editorUrl, "_blank");
    };

    const handleEditAIEditor = (pageId: string) => {
        window.open(`/ai-editor/${pageId}`, "_blank");
    };

    const handlePreviewLegacy = (pageId: string) => {
        const previewUrl = `/funnel-builder/${projectId}/pages/enrollment/${pageId}`;
        window.open(previewUrl, "_blank");
    };

    // Create unified pages list combining AI Editor and legacy pages
    const unifiedPages: UnifiedEnrollmentPage[] = [
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
        ...enrollmentPages.map((page) => ({
            id: page.id,
            title: page.headline,
            subtitle: page.subheadline,
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
        if (!confirm("Delete this enrollment page?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("enrollment_pages")
                .delete()
                .eq("id", pageId);

            if (error) throw error;

            setEnrollmentPages((prev) => prev.filter((p) => p.id !== pageId));
            logger.info({ pageId }, "Enrollment page deleted");

            toast({
                title: "Page Deleted",
                description: "Enrollment page has been removed",
            });
        } catch (error: any) {
            logger.error({ error }, "Failed to delete enrollment page");
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description:
                    error?.message || "Could not delete the page. Please try again.",
            });
        }
    };

    const handlePublishToggle = async (pageId: string, currentStatus: boolean) => {
        try {
            const supabase = createClient();
            const newStatus = !currentStatus;

            const { error } = await supabase
                .from("enrollment_pages")
                .update({ is_published: newStatus })
                .eq("id", pageId);

            if (error) throw error;

            setEnrollmentPages((prev) =>
                prev.map((p) =>
                    p.id === pageId ? { ...p, is_published: newStatus } : p
                )
            );

            logger.info(
                { pageId, isPublished: newStatus },
                "Enrollment page publish status updated"
            );

            toast({
                title: newStatus ? "Page Published" : "Page Unpublished",
                description: newStatus
                    ? "Your enrollment page is now live and visible to the public"
                    : "Your enrollment page is now in draft mode",
            });
        } catch (error: any) {
            logger.error({ error }, "Failed to update publish status");
            toast({
                variant: "destructive",
                title: "Update Failed",
                description:
                    error?.message ||
                    "Could not update publish status. Please try again.",
            });
        }
    };

    const hasDeckStructure = deckStructures.length > 0;
    const hasOffer = offers.length > 0;
    const hasEnrollmentPage = unifiedPages.length > 0;
    const canCreatePage = hasDeckStructure && hasOffer;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={10}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            nextDisabled={!hasEnrollmentPage}
            nextLabel={hasEnrollmentPage ? "Create Watch Page" : "Create Page First"}
            stepTitle="Enrollment Pages"
            stepDescription="Create high-converting sales pages with AI-powered design"
        >
            <div className="space-y-8">
                {/* Dependency Warnings */}
                {!hasDeckStructure && (
                    <DependencyWarning
                        message="You need to create a presentation structure first."
                        requiredStep={4}
                        requiredStepName="Presentation Structure"
                        projectId={projectId}
                    />
                )}
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
                                    ? "Generate Enrollment Page"
                                    : "Complete Prerequisites First"}
                            </button>

                            {canCreatePage && (
                                <p className="max-w-md text-sm text-muted-foreground">
                                    Create a professional, high-converting enrollment
                                    page tailored to your offer and brand in seconds
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-primary/5 p-8 shadow-soft">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-foreground">
                                    Generate Enrollment Page
                                </h3>
                                {!isCreating && (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        This typically takes 30-60 seconds
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
                                            Creating your enrollment page...
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            ~30-60 seconds
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
                                            Your offer details will be used to create
                                            compelling page content
                                        </p>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-foreground">
                                            Presentation Structure
                                        </label>
                                        <select
                                            value={formData.deckStructureId}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    deckStructureId: e.target.value,
                                                })
                                            }
                                            disabled={isCreating}
                                            className="w-full rounded-lg border border-border bg-card px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {deckStructures.map((deck) => (
                                                <option key={deck.id} value={deck.id}>
                                                    {deck.metadata?.title ||
                                                        `Presentation ${deck.total_slides} slides`}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Content and testimonials from your
                                            presentation
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
                                                        your offer positioning and
                                                        target audience
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
                                                !formData.deckStructureId ||
                                                isCreating
                                            }
                                            className={`flex items-center gap-2 rounded-lg px-6 py-2 font-semibold ${
                                                formData.offerId &&
                                                formData.deckStructureId &&
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
                                Your Enrollment Pages
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
                                    <FileText className="h-8 w-8 text-purple-600" />
                                </div>
                                <h4 className="mb-2 text-lg font-semibold text-foreground">
                                    No enrollment pages yet
                                </h4>
                                <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                                    Create your first enrollment page to start
                                    converting your audience into customers
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
                                        ? enrollmentPages.find((p) => p.id === page.id)
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
                                                            {/* Migration button for legacy pages */}
                                                            <button
                                                                onClick={() =>
                                                                    legacyPage &&
                                                                    handleMigrateToAIEditor(
                                                                        legacyPage
                                                                    )
                                                                }
                                                                disabled={
                                                                    isMigrating ===
                                                                    page.id
                                                                }
                                                                className="inline-flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50"
                                                            >
                                                                {isMigrating ===
                                                                page.id ? (
                                                                    <>
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                        Migrating...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ArrowRight className="h-4 w-4" />
                                                                        Migrate to AI
                                                                        Editor
                                                                    </>
                                                                )}
                                                            </button>
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
                        Enrollment Page Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-primary">
                        <li>
                            • Use the AI Editor to refine headlines, add testimonials,
                            and customize your page
                        </li>
                        <li>
                            • Choose a template style that matches your offer
                            positioning
                        </li>
                        <li>
                            • Your brand colors and presentation content are
                            automatically incorporated
                        </li>
                        <li>
                            • Publish your page when you&apos;re ready to start
                            enrolling customers
                        </li>
                    </ul>
                </div>
            </div>
        </StepLayout>
    );
}
