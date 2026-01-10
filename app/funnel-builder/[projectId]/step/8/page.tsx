"use client";

/**
 * Step 8: Confirmation Pages
 * Create and manage registration confirmation pages with AI-powered editor
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
    Info,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";
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

interface ConfirmationPage {
    id: string;
    headline: string;
    subheadline: string | null;
    content_sections: any;
    event_config: any;
    is_published: boolean;
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
interface UnifiedConfirmationPage {
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
    { id: "event", label: "Loading event configuration", status: "pending" },
    {
        id: "presentation",
        label: "Analyzing presentation content",
        status: "pending",
    },
    { id: "brand", label: "Applying brand design", status: "pending" },
    { id: "hero", label: "Generating confirmation message", status: "pending" },
    { id: "calendar", label: "Building calendar integration", status: "pending" },
    { id: "preparation", label: "Creating preparation checklist", status: "pending" },
    { id: "finalize", label: "Finalizing page", status: "pending" },
];

const TEMPLATE_OPTIONS = [
    {
        value: "excitement-builder",
        label: "Excitement Builder",
        description:
            "High energy with countdown timer and prep checklist. Perfect for building anticipation before your live event.",
    },
    {
        value: "professional-prep",
        label: "Professional Prep",
        description:
            "Clean layout with calendar integration prominent. Ideal for professional events and business audiences.",
    },
    {
        value: "community-welcome",
        label: "Community Welcome",
        description:
            "Warm tone focusing on what to expect and community connection. Great for creating belonging before the event.",
    },
] as const;

export default function Step8ConfirmationPage({
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
                feature: "Confirmation Page Editor",
                description:
                    "The confirmation page editor requires a desktop computer for designing and customizing pages with visual editing tools.",
                returnPath: `/funnel-builder/${projectId}`,
            });
            router.push(`/desktop-required?${params.toString()}`);
        }
    }, [isMobile, projectId, router]);

    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [confirmationPages, setConfirmationPages] = useState<ConfirmationPage[]>([]);
    const [aiEditorPages, setAiEditorPages] = useState<AIEditorPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [progressStages, setProgressStages] = useState<ProgressStage[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isMigrating, setIsMigrating] = useState<string | null>(null);
    const [accessType, setAccessType] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        deckStructureId: "",
        templateType: "excitement-builder" as
            | "excitement-builder"
            | "professional-prep"
            | "community-welcome",
    });

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    // Simulate progress stages with realistic timing
    const simulateProgress = useCallback(async (): Promise<void> => {
        const stages = [...GENERATION_STAGES];
        setProgressStages(stages);

        // Timing for each stage (in ms) - total ~25-35 seconds
        const stageTiming = [
            1500, // Loading event configuration
            2000, // Analyzing presentation content
            2500, // Applying brand design
            8000, // Generating confirmation message (longest)
            5000, // Building calendar integration
            4000, // Creating preparation checklist
            2000, // Finalizing page
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

    // Handle Generate Confirmation Page
    const handleGenerate = async () => {
        if (!projectId || !formData.deckStructureId) return;

        setIsCreating(true);
        const startTime = Date.now();

        // Start progress simulation in parallel with API call
        const progressPromise = simulateProgress();

        try {
            logger.info(
                {
                    projectId,
                    pageType: "confirmation",
                    deckId: formData.deckStructureId,
                    templateStyle: formData.templateType,
                },
                "Creating confirmation page with AI editor"
            );

            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "confirmation",
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

            logger.info({ pageId: data.pageId }, "Confirmation page created");

            // Add the new page to the list
            const newPage: AIEditorPage = {
                id: data.pageId,
                title: data.title || "Confirmation Page",
                page_type: "confirmation",
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
                title: "Confirmation page created!",
                description: "Opening the AI Editor in a new tab...",
            });

            // Open in new tab
            window.open(`/ai-editor/${data.pageId}`, "_blank");
        } catch (error: any) {
            logger.error({ error }, "Failed to create confirmation page");
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
    const handleMigrateToAIEditor = async (legacyPage: ConfirmationPage) => {
        setIsMigrating(legacyPage.id);

        try {
            logger.info(
                { legacyPageId: legacyPage.id },
                "Migrating legacy confirmation page to AI Editor"
            );

            // Create a new AI Editor page with the legacy content as a starting point
            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "confirmation",
                    customPrompt: `This is a migration from an existing confirmation page. Use this content as inspiration but create a modern, improved version:

Title: ${legacyPage.headline}
Subtitle: ${legacyPage.subheadline || ""}

Please create an improved confirmation page that captures the same messaging but with enhanced design and engagement optimization.`,
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
                page_type: "confirmation",
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
                    .select("*, intake_data")
                    .eq("id", projectId)
                    .single();

                if (projectError) throw projectError;
                setProject(projectData);

                // Extract access type from intake data
                if (projectData?.intake_data) {
                    const intakeData = projectData.intake_data as any;
                    setAccessType(intakeData.access_type || null);
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

                // Load deck structures
                const { data: deckData, error: deckError } = await supabase
                    .from("deck_structures")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (deckError) throw deckError;
                setDeckStructures(deckData || []);

                // Auto-select first deck
                if (deckData && deckData.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        deckStructureId: deckData[0].id,
                    }));
                }

                // Load confirmation pages
                const { data: pagesData, error: pagesError } = await supabase
                    .from("confirmation_pages")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (pagesError) throw pagesError;
                setConfirmationPages(pagesData || []);

                // Load AI Editor v2 pages
                const { data: aiPagesData, error: aiPagesError } = await supabase
                    .from("ai_editor_pages")
                    .select(
                        "id, title, page_type, status, version, created_at, updated_at"
                    )
                    .eq("funnel_project_id", projectId)
                    .eq("page_type", "confirmation")
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
        const previewUrl = `/funnel-builder/${projectId}/pages/confirmation/${pageId}`;
        window.open(previewUrl, "_blank");
    };

    // Create unified pages list combining AI Editor and legacy pages
    const unifiedPages: UnifiedConfirmationPage[] = [
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
        ...confirmationPages.map((page) => ({
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
        if (!confirm("Delete this confirmation page?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("confirmation_pages")
                .delete()
                .eq("id", pageId);

            if (error) throw error;

            setConfirmationPages((prev) => prev.filter((p) => p.id !== pageId));
            logger.info({ pageId }, "Confirmation page deleted");

            toast({
                title: "Page Deleted",
                description: "Confirmation page has been removed",
            });
        } catch (error: any) {
            logger.error({ error }, "Failed to delete confirmation page");
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description:
                    error?.message || "Could not delete the page. Please try again.",
            });
        }
    };

    const hasDeckStructure = deckStructures.length > 0;
    const hasConfirmationPage = unifiedPages.length > 0;
    const canCreatePage = hasDeckStructure;
    const isImmediateAccess = accessType === "immediate";

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={8}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            nextDisabled={false}
            nextLabel="Continue"
            stepTitle="Confirmation Page"
            stepDescription="Create engaging confirmation pages for event registrations"
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

                {/* Immediate Access Info Banner */}
                {isImmediateAccess && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <Info className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h4 className="mb-2 font-semibold text-blue-900">
                                    Confirmation Page Not Required
                                </h4>
                                <p className="mb-3 text-sm text-blue-800">
                                    Your masterclass is configured for{" "}
                                    <strong>immediate access</strong>. When users
                                    register, they'll go directly to the watch page
                                    instead of a confirmation page.
                                </p>
                                <p className="text-sm text-blue-800">
                                    You can still create a confirmation page if you'd
                                    like to add one for future live or scheduled events,
                                    but it won't be used in your current funnel flow.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Generate Button or Form */}
                {!showCreateForm ? (
                    <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50 to-primary/5 p-8">
                        <div className="flex flex-col items-center gap-6 text-center">
                            {/* Animated Generate Button */}
                            <button
                                onClick={() => setShowCreateForm(true)}
                                disabled={!canCreatePage}
                                className={`group relative flex items-center gap-3 rounded-xl px-10 py-5 text-xl font-bold transition-all duration-300 ${
                                    canCreatePage
                                        ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02]"
                                        : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                }`}
                            >
                                {/* Glow effect */}
                                {canCreatePage && (
                                    <span className="absolute inset-0 -z-10 animate-pulse rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 opacity-50 blur-lg" />
                                )}
                                <Sparkles className="h-7 w-7" />
                                {canCreatePage
                                    ? "Generate Confirmation Page"
                                    : "Complete Prerequisites First"}
                            </button>

                            {canCreatePage && (
                                <p className="max-w-md text-sm text-muted-foreground">
                                    Create a beautiful confirmation page that builds
                                    anticipation and ensures attendees show up to your
                                    live event
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-primary/5 p-8 shadow-soft">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-foreground">
                                    Generate Confirmation Page
                                </h3>
                                {!isCreating && (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        This typically takes 25-40 seconds
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
                                <div className="rounded-lg border border-emerald-200 bg-white p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-sm font-medium text-emerald-900">
                                            Creating your confirmation page...
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            ~25-40 seconds
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mb-6 h-2 overflow-hidden rounded-full bg-emerald-100">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-green-600 transition-all duration-500"
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
                                                        ? "bg-emerald-50"
                                                        : ""
                                                }`}
                                            >
                                                {stage.status === "completed" ? (
                                                    <Check className="h-5 w-5 text-green-600" />
                                                ) : stage.status === "in_progress" ? (
                                                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-gray-300" />
                                                )}
                                                <span
                                                    className={`text-sm ${
                                                        stage.status === "completed"
                                                            ? "text-green-700"
                                                            : stage.status ===
                                                                "in_progress"
                                                              ? "font-medium text-emerald-900"
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
                                            className="w-full rounded-lg border border-border bg-card px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {deckStructures.map((deck) => (
                                                <option key={deck.id} value={deck.id}>
                                                    {deck.metadata?.title ||
                                                        `Presentation ${deck.total_slides} slides`}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Content from your presentation will be used
                                            for preparation checklist
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
                                                        the tone and urgency of your
                                                        event
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </label>
                                        <div className="space-y-3">
                                            {TEMPLATE_OPTIONS.map((template) => (
                                                <div key={template.value}>
                                                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-emerald-300 hover:bg-emerald-50">
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
                                                            className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
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
                                                !formData.deckStructureId || isCreating
                                            }
                                            className={`flex items-center gap-2 rounded-lg px-6 py-2 font-semibold ${
                                                formData.deckStructureId && !isCreating
                                                    ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:opacity-90"
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
                                Your Confirmation Pages
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {unifiedPages.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {unifiedPages.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                                    <FileText className="h-8 w-8 text-emerald-600" />
                                </div>
                                <h4 className="mb-2 text-lg font-semibold text-foreground">
                                    No confirmation pages yet
                                </h4>
                                <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                                    Create your first confirmation page to build
                                    excitement and ensure attendees show up to your
                                    event
                                </p>
                                {canCreatePage && (
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
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
                                        ? confirmationPages.find(
                                              (p) => p.id === page.id
                                          )
                                        : null;

                                    return (
                                        <div
                                            key={page.id}
                                            className="rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
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
                                                                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
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
                                                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
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
                        Confirmation Page Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-primary">
                        <li>
                            • Confirmation pages are shown after registration for live
                            or scheduled events
                        </li>
                        <li>
                            • Add calendar integration to help attendees save the event
                            date
                        </li>
                        <li>
                            • Use preparation checklists to build anticipation and
                            ensure they show up ready
                        </li>
                        <li>
                            • Customize countdown timers and reminders to reduce
                            no-shows
                        </li>
                    </ul>
                </div>
            </div>
        </StepLayout>
    );
}
