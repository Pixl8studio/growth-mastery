"use client";

/**
 * Step 9: Watch Pages
 * Create and manage watch pages with visual editor integration
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { useIsMobile } from "@/lib/mobile-utils.client";
import {
    Video,
    Eye,
    Pencil,
    Trash2,
    Sparkles,
    Loader2,
    ArrowRight,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";

interface DeckStructure {
    id: string;
    slides: any[];
    metadata?: {
        title?: string;
    };
    total_slides: number;
    created_at: string;
}

interface PitchVideo {
    id: string;
    video_url: string;
    thumbnail_url: string | null;
    video_duration: number;
    created_at: string;
}

interface WatchPage {
    id: string;
    headline: string;
    subheadline: string;
    html_content: string;
    theme: any;
    is_published: boolean;
    pitch_video_id: string | null;
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
interface UnifiedWatchPage {
    id: string;
    title: string;
    subtitle?: string;
    status: "draft" | "published";
    type: "ai-editor" | "legacy";
    created_at: string;
    version?: number;
    pitch_video_id?: string | null;
}

export default function Step8WatchPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const router = useRouter();
    const isMobile = useIsMobile("lg");
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [pitchVideos, setPitchVideos] = useState<PitchVideo[]>([]);
    const [watchPages, setWatchPages] = useState<WatchPage[]>([]);
    const [aiEditorPages, setAiEditorPages] = useState<AIEditorPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isMigrating, setIsMigrating] = useState<string | null>(null);

    // Handle Generate Watch Page (AI Editor)
    const handleGenerate = async () => {
        if (!projectId) return;

        setIsCreating(true);
        try {
            logger.info(
                { projectId, pageType: "watch" },
                "Creating watch page with AI editor"
            );

            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "watch",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || "Failed to create page");
            }

            logger.info({ pageId: data.pageId }, "Watch page created");

            // Add the new page to the list immediately
            const newPage: AIEditorPage = {
                id: data.pageId,
                title: data.title || "Watch Page",
                page_type: "watch",
                status: "draft",
                version: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setAiEditorPages((prev) => [newPage, ...prev]);

            toast({
                title: "Watch page created!",
                description: "Opening the AI Editor in a new tab...",
            });

            // Open in new tab
            window.open(`/ai-editor/${data.pageId}`, "_blank");
        } catch (error: any) {
            logger.error({ error }, "Failed to create watch page");
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
    const handleMigrateToAIEditor = async (legacyPage: WatchPage) => {
        setIsMigrating(legacyPage.id);

        try {
            logger.info(
                { legacyPageId: legacyPage.id },
                "Migrating legacy watch page to AI Editor"
            );

            // Create a new AI Editor page with the legacy content as a starting point
            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "watch",
                    customPrompt: `This is a migration from an existing watch page. Use this content as inspiration but create a modern, improved version:

Title: ${legacyPage.headline}
Subtitle: ${legacyPage.subheadline}

Please create an improved watch page that captures the same messaging but with enhanced design and engagement optimization.`,
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
                page_type: "watch",
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

    // Redirect mobile users to desktop-required page
    useEffect(() => {
        if (isMobile && projectId) {
            const params = new URLSearchParams({
                feature: "Watch Page Editor",
                description:
                    "The watch page editor requires a desktop computer for creating and customizing video watch pages with visual editing tools.",
                returnPath: `/funnel-builder/${projectId}`,
            });
            router.push(`/desktop-required?${params.toString()}`);
        }
    }, [isMobile, projectId, router]);

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

                // Load pitch videos
                const { data: videoData, error: videoError } = await supabase
                    .from("pitch_videos")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (videoError) throw videoError;
                setPitchVideos(videoData || []);

                // Load watch pages
                const { data: pagesData, error: pagesError } = await supabase
                    .from("watch_pages")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (pagesError) throw pagesError;
                setWatchPages(pagesData || []);

                // Load AI Editor v2 pages
                const { data: aiPagesData, error: aiPagesError } = await supabase
                    .from("ai_editor_pages")
                    .select(
                        "id, title, page_type, status, version, created_at, updated_at"
                    )
                    .eq("funnel_project_id", projectId)
                    .eq("page_type", "watch")
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
        const previewUrl = `/funnel-builder/${projectId}/pages/watch/${pageId}`;
        window.open(previewUrl, "_blank");
    };

    const handleDelete = async (pageId: string) => {
        if (!confirm("Delete this watch page?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("watch_pages")
                .delete()
                .eq("id", pageId);

            if (!error) {
                setWatchPages((prev) => prev.filter((p) => p.id !== pageId));
                logger.info({ pageId }, "Watch page deleted");
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete watch page");
        }
    };

    // Create unified pages list combining AI Editor and legacy pages
    const unifiedPages: UnifiedWatchPage[] = [
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
        ...watchPages.map((page) => ({
            id: page.id,
            title: page.headline,
            subtitle: page.subheadline,
            status: (page.is_published ? "published" : "draft") as
                | "published"
                | "draft",
            type: "legacy" as const,
            created_at: page.created_at,
            pitch_video_id: page.pitch_video_id,
        })),
    ].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const hasDeckStructure = deckStructures.length > 0;
    const hasPitchVideo = pitchVideos.length > 0;
    const hasWatchPage = unifiedPages.length > 0;
    const canCreatePage = hasDeckStructure && hasPitchVideo;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={9}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            nextDisabled={!hasWatchPage}
            nextLabel={hasWatchPage ? "Create Registration Page" : "Create Page First"}
            stepTitle="Watch Page"
            stepDescription="Create engaging video watch pages with visual editor"
        >
            <div className="space-y-8">
                {/* Dependency Warnings */}
                {!hasDeckStructure && (
                    <DependencyWarning
                        message="You need to create a deck structure first."
                        requiredStep={4}
                        requiredStepName="Deck Structure"
                        projectId={projectId}
                    />
                )}
                {!hasPitchVideo && (
                    <DependencyWarning
                        message="You need to upload a pitch video first."
                        requiredStep={6}
                        requiredStepName="Pitch Video"
                        projectId={projectId}
                    />
                )}

                {/* Generate Button */}
                <div className="rounded-lg border border-cyan-100 bg-gradient-to-br from-cyan-50 to-primary/5 p-8">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <button
                            onClick={handleGenerate}
                            disabled={!canCreatePage || isCreating}
                            className={`flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                canCreatePage && !isCreating
                                    ? "bg-cyan-600 text-white hover:bg-cyan-700"
                                    : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                            }`}
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-6 w-6" />
                                    {canCreatePage
                                        ? "Generate Watch Page"
                                        : "Complete Prerequisites First"}
                                </>
                            )}
                        </button>

                        {canCreatePage && (
                            <p className="text-sm text-muted-foreground">
                                AI-powered page editor
                            </p>
                        )}
                    </div>
                </div>

                {/* Unified Pages List */}
                <div className="rounded-lg border border-border bg-card shadow-soft">
                    <div className="border-b border-border p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-foreground">
                                Your Watch Pages
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {unifiedPages.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {unifiedPages.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100">
                                    <Video className="h-8 w-8 text-cyan-600" />
                                </div>
                                <h4 className="mb-2 text-lg font-semibold text-foreground">
                                    No watch pages yet
                                </h4>
                                <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                                    Create your first watch page to engage your audience
                                    with video content
                                </p>
                                {canCreatePage && (
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isCreating}
                                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition-all hover:bg-cyan-700"
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
                                        ? watchPages.find((p) => p.id === page.id)
                                        : null;

                                    return (
                                        <div
                                            key={page.id}
                                            className="rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-cyan-300 hover:shadow-md"
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
                                                                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-100 disabled:opacity-50"
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
                                                                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
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
                        💡 Watch Page Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-primary">
                        <li>• The video block is protected and can't be deleted</li>
                        <li>
                            • Use the Visual Editor to customize surrounding content
                        </li>
                        <li>• Add engagement elements like progress bars and CTAs</li>
                        <li>• Changes auto-save every 3 seconds</li>
                    </ul>
                </div>
            </div>
        </StepLayout>
    );
}
