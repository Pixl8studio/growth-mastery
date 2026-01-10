"use client";

/**
 * Step 7: Registration Pages
 * Create and manage registration pages with visual editor integration
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
    Sparkles,
    Loader2,
    ArrowRight,
    X,
    HelpCircle,
    Check,
    Circle,
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

interface DeckSlide {
    id: string;
    title?: string;
    content?: string;
    type?: string;
}

interface DeckStructure {
    id: string;
    slides: DeckSlide[];
    metadata?: {
        title?: string;
    };
    total_slides: number;
    created_at: string;
}

interface PageTheme {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    backgroundColor?: string;
}

interface RegistrationPage {
    id: string;
    headline: string;
    subheadline: string;
    html_content: string;
    theme: PageTheme | null;
    is_published: boolean;
    vanity_slug: string | null;
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
interface UnifiedRegistrationPage {
    id: string;
    title: string;
    subtitle?: string;
    status: "draft" | "published";
    type: "ai-editor" | "legacy";
    created_at: string;
    version?: number;
    vanity_slug?: string | null;
}

// Progress stages for generation
interface ProgressStage {
    id: string;
    label: string;
    status: "pending" | "in_progress" | "completed";
}

interface FunnelProject {
    id: string;
    name: string;
    user_id: string;
    created_at: string;
    updated_at?: string;
}

const GENERATION_STAGES: ProgressStage[] = [
    { id: "context", label: "Loading business context", status: "pending" },
    {
        id: "presentation",
        label: "Analyzing presentation content",
        status: "pending",
    },
    { id: "brand", label: "Applying brand design", status: "pending" },
    { id: "headline", label: "Generating compelling headline", status: "pending" },
    { id: "benefits", label: "Creating benefit sections", status: "pending" },
    { id: "form", label: "Building registration form", status: "pending" },
    { id: "finalize", label: "Finalizing page", status: "pending" },
];

type TemplateType = "high-conversion" | "minimal-clean" | "story-driven";

const TEMPLATE_OPTIONS: readonly {
    value: TemplateType;
    label: string;
    description: string;
}[] = [
    {
        value: "high-conversion",
        label: "High Conversion",
        description:
            "Urgency-focused with countdown timer and scarcity elements. Perfect for maximizing registrations with compelling CTAs.",
    },
    {
        value: "minimal-clean",
        label: "Minimal & Clean",
        description:
            "Simple, distraction-free layout focusing on core value proposition. Ideal for professional or B2B audiences.",
    },
    {
        value: "story-driven",
        label: "Story Driven",
        description:
            "Narrative approach highlighting transformation and social proof. Great for building emotional connection.",
    },
] as const;

export default function Step9RegistrationPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const router = useRouter();
    const isMobile = useIsMobile("lg");
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<FunnelProject | null>(null);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [registrationPages, setRegistrationPages] = useState<RegistrationPage[]>([]);
    const [aiEditorPages, setAiEditorPages] = useState<AIEditorPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isMigrating, setIsMigrating] = useState<string | null>(null);
    const [progressStages, setProgressStages] = useState<ProgressStage[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState<{
        deckStructureId: string;
        templateType: TemplateType;
    }>({
        deckStructureId: "",
        templateType: "high-conversion",
    });

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    // Simulate progress stages with realistic timing
    const simulateProgress = useCallback(async (): Promise<void> => {
        const stages = [...GENERATION_STAGES];
        setProgressStages(stages);

        // Timing for each stage (in ms) - total ~25-35 seconds
        const stageTiming = [
            1500, // Loading business context
            2000, // Analyzing presentation content
            2500, // Applying brand design
            8000, // Generating compelling headline (longest)
            5000, // Creating benefit sections
            4000, // Building registration form
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

    // Handle Generate Registration Page (AI Editor)
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
                    pageType: "registration",
                    deckId: formData.deckStructureId,
                    templateStyle: formData.templateType,
                },
                "Creating registration page with AI editor"
            );

            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "registration",
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

            logger.info({ pageId: data.pageId }, "Registration page created");

            // Add the new page to the list immediately
            const newPage: AIEditorPage = {
                id: data.pageId,
                title: data.title || "Registration Page",
                page_type: "registration",
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
                title: "Registration page created!",
                description: "Opening the AI Editor in a new tab...",
            });

            // Open in new tab
            window.open(`/ai-editor/${data.pageId}`, "_blank");
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to create page. Please try again.";
            logger.error({ error }, "Failed to create registration page");
            setProgressStages([]);
            toast({
                variant: "destructive",
                title: "Error",
                description: errorMessage,
            });
        } finally {
            setIsCreating(false);
        }
    };

    // Handle migration of legacy page to AI Editor
    const handleMigrateToAIEditor = async (legacyPage: RegistrationPage) => {
        setIsMigrating(legacyPage.id);

        try {
            logger.info(
                { legacyPageId: legacyPage.id },
                "Migrating legacy registration page to AI Editor"
            );

            // Create a new AI Editor page with the legacy content as a starting point
            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "registration",
                    customPrompt: `This is a migration from an existing registration page. Use this content as inspiration but create a modern, improved version:

Title: ${legacyPage.headline}
Subtitle: ${legacyPage.subheadline}

Please create an improved registration page that captures the same messaging but with enhanced design and conversion optimization.`,
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
                page_type: "registration",
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
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Could not migrate the page. Please try again.";
            logger.error({ error }, "Failed to migrate page");
            toast({
                variant: "destructive",
                title: "Migration Failed",
                description: errorMessage,
            });
        } finally {
            setIsMigrating(null);
        }
    };

    // Redirect mobile users to desktop-required page
    useEffect(() => {
        if (isMobile && projectId) {
            const params = new URLSearchParams({
                feature: "Registration Page Editor",
                description:
                    "The registration page editor requires a desktop computer for creating and customizing registration pages with visual editing tools.",
                returnPath: `/funnel-builder/${projectId}`,
            });
            router.push(`/desktop-required?${params.toString()}`);
        }
    }, [isMobile, projectId, router]);

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

                // Auto-select first deck
                if (deckData && deckData.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        deckStructureId: deckData[0].id,
                    }));
                }

                // Load registration pages
                const { data: pagesData, error: pagesError } = await supabase
                    .from("registration_pages")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (pagesError) throw pagesError;
                setRegistrationPages(pagesData || []);

                // Load AI Editor v2 pages
                const { data: aiPagesData, error: aiPagesError } = await supabase
                    .from("ai_editor_pages")
                    .select(
                        "id, title, page_type, status, version, created_at, updated_at"
                    )
                    .eq("funnel_project_id", projectId)
                    .eq("page_type", "registration")
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
        const previewUrl = `/funnel-builder/${projectId}/pages/registration/${pageId}`;
        window.open(previewUrl, "_blank");
    };

    const handleDelete = async (pageId: string) => {
        if (!confirm("Delete this registration page?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("registration_pages")
                .delete()
                .eq("id", pageId);

            if (!error) {
                setRegistrationPages((prev) => prev.filter((p) => p.id !== pageId));
                logger.info({ pageId }, "Registration page deleted");
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete registration page");
        }
    };

    // Create unified pages list combining AI Editor and legacy pages
    const unifiedPages: UnifiedRegistrationPage[] = [
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
        ...registrationPages.map((page) => ({
            id: page.id,
            title: page.headline,
            subtitle: page.subheadline,
            status: (page.is_published ? "published" : "draft") as
                | "published"
                | "draft",
            type: "legacy" as const,
            created_at: page.created_at,
            vanity_slug: page.vanity_slug,
        })),
    ].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const hasDeckStructure = deckStructures.length > 0;
    const hasRegistrationPage = unifiedPages.length > 0;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={7}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            nextDisabled={!hasRegistrationPage}
            nextLabel={hasRegistrationPage ? "Setup Your Flow" : "Create Page First"}
            stepTitle="Registration Page"
            stepDescription="Create high-converting registration pages with visual editor"
        >
            <div className="space-y-8">
                {/* Dependency Warning */}
                {!hasDeckStructure && (
                    <DependencyWarning
                        message="You need to create a deck structure first before generating registration pages."
                        requiredStep={4}
                        requiredStepName="Deck Structure"
                        projectId={projectId}
                    />
                )}

                {/* Generate Button or Form */}
                {!showCreateForm ? (
                    <div className="rounded-lg border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-8">
                        <div className="flex flex-col items-center gap-6 text-center">
                            {/* Animated Generate Button */}
                            <button
                                onClick={() => setShowCreateForm(true)}
                                disabled={!hasDeckStructure}
                                className={`group relative flex items-center gap-3 rounded-xl px-10 py-5 text-xl font-bold transition-all duration-300 ${
                                    hasDeckStructure
                                        ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:scale-[1.02]"
                                        : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                }`}
                            >
                                {/* Glow effect */}
                                {hasDeckStructure && (
                                    <span className="absolute inset-0 -z-10 animate-pulse rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 opacity-50 blur-lg" />
                                )}
                                <Sparkles className="h-7 w-7" />
                                {hasDeckStructure
                                    ? "Generate Registration Page"
                                    : "Complete Prerequisites First"}
                            </button>

                            {hasDeckStructure && (
                                <p className="max-w-md text-sm text-muted-foreground">
                                    Create a high-converting registration page that
                                    captures leads and builds excitement for your
                                    masterclass
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-8 shadow-soft">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-foreground">
                                    Generate Registration Page
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
                                <div className="rounded-lg border border-green-200 bg-white p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-sm font-medium text-green-900">
                                            Creating your registration page...
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            ~25-40 seconds
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mb-6 h-2 overflow-hidden rounded-full bg-green-100">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-green-600 to-emerald-600 transition-all duration-500"
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
                                                        ? "bg-green-50"
                                                        : ""
                                                }`}
                                            >
                                                {stage.status === "completed" ? (
                                                    <Check className="h-5 w-5 text-green-600" />
                                                ) : stage.status === "in_progress" ? (
                                                    <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-gray-300" />
                                                )}
                                                <span
                                                    className={`text-sm ${
                                                        stage.status === "completed"
                                                            ? "text-green-700"
                                                            : stage.status ===
                                                                "in_progress"
                                                              ? "font-medium text-green-900"
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
                                            className="w-full rounded-lg border border-border bg-card px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                                            to generate compelling copy
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
                                                        the tone and style of your
                                                        masterclass
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </label>
                                        <div className="space-y-3">
                                            {TEMPLATE_OPTIONS.map((template) => (
                                                <div key={template.value}>
                                                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-green-300 hover:bg-green-50">
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
                                                                        .value as TemplateType,
                                                                })
                                                            }
                                                            disabled={isCreating}
                                                            className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500"
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
                                                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:opacity-90"
                                                    : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                            }`}
                                        >
                                            <Sparkles className="h-5 w-5" />
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
                                Your Registration Pages
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {unifiedPages.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {unifiedPages.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                    <FileText className="h-8 w-8 text-green-600" />
                                </div>
                                <h4 className="mb-2 text-lg font-semibold text-foreground">
                                    No registration pages yet
                                </h4>
                                <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                                    Create your first registration page to start
                                    capturing leads
                                </p>
                                {hasDeckStructure && (
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-all hover:bg-green-700"
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
                                        ? registrationPages.find(
                                              (p) => p.id === page.id
                                          )
                                        : null;

                                    return (
                                        <div
                                            key={page.id}
                                            className="rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-green-300 hover:shadow-md"
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
                                                        {page.vanity_slug && (
                                                            <span>
                                                                /{page.vanity_slug}
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
                                                                className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
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
                                                                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
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
                        💡 Registration Page Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-primary">
                        <li>
                            • Use the Visual Editor to customize all content, colors,
                            and layout
                        </li>
                        <li>• Add/remove sections using the component library</li>
                        <li>
                            • Content is automatically pulled from your deck structure
                        </li>
                        <li>• Changes auto-save every 3 seconds</li>
                    </ul>
                </div>
            </div>
        </StepLayout>
    );
}
