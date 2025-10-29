"use client";

/**
 * Step 8: Watch Pages
 * Create and manage watch pages with visual editor integration
 */

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { Video, PlusCircle, Eye, Pencil, Trash2, X } from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { generateWatchPageHTML } from "@/lib/generators/watch-page-generator";
import { Switch } from "@/components/ui/switch";

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

export default function Step8WatchPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [pitchVideos, setPitchVideos] = useState<PitchVideo[]>([]);
    const [watchPages, setWatchPages] = useState<WatchPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        headline: "",
        deckStructureId: "",
        videoId: "",
    });

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

                // Auto-select first deck and video
                if (deckData && deckData.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        deckStructureId: deckData[0].id,
                    }));
                }
                if (videoData && videoData.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        videoId: videoData[0].id,
                    }));
                }

                // Load watch pages
                const { data: pagesData, error: pagesError } = await supabase
                    .from("watch_pages")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                if (pagesError) throw pagesError;
                setWatchPages(pagesData || []);
            } catch (error) {
                logger.error({ error }, "Failed to load data");
            }
        };

        loadData();
    }, [projectId]);

    const handleCreate = async () => {
        if (
            !formData.headline.trim() ||
            !formData.deckStructureId ||
            !formData.videoId
        ) {
            alert(
                "Please provide a headline, select a deck structure, and select a video"
            );
            return;
        }

        setIsCreating(true);

        try {
            const supabase = createClient();

            // Get current user
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Get selected deck structure and video
            const deckStructure = deckStructures.find(
                (d) => d.id === formData.deckStructureId
            );
            const video = pitchVideos.find((v) => v.id === formData.videoId);

            if (!deckStructure || !video) throw new Error("Deck or video not found");

            // Get theme from project or use defaults
            const theme = project?.settings?.theme || {
                primary: "#2563eb",
                secondary: "#10b981",
                background: "#ffffff",
                text: "#1f2937",
            };

            // Generate HTML using the generator
            const htmlContent = generateWatchPageHTML({
                projectId,
                deckStructure,
                videoUrl: video.video_url,
                headline: formData.headline,
                theme,
            });

            // Extract subheadline from deck
            const subheadline =
                deckStructure.metadata?.title || "Watch this exclusive training";

            // Create watch page
            const { data: newPage, error: createError } = await supabase
                .from("watch_pages")
                .insert({
                    funnel_project_id: projectId,
                    user_id: user.id,
                    pitch_video_id: video.id,
                    headline: formData.headline,
                    subheadline,
                    html_content: htmlContent,
                    theme,
                    is_published: false,
                })
                .select()
                .single();

            if (createError) throw createError;

            // Add to list
            setWatchPages((prev) => [newPage, ...prev]);

            // Reset form
            setFormData({
                headline: "",
                deckStructureId: deckStructures[0]?.id || "",
                videoId: pitchVideos[0]?.id || "",
            });
            setShowCreateForm(false);

            logger.info({ pageId: newPage.id }, "Watch page created");
        } catch (error) {
            logger.error({ error }, "Failed to create watch page");
            alert("Failed to create page. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleEdit = (pageId: string) => {
        const editorUrl = `/funnel-builder/${projectId}/pages/watch/${pageId}?edit=true`;
        window.open(editorUrl, "_blank");
    };

    const handlePreview = (pageId: string) => {
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

    const handlePublishToggle = async (pageId: string, currentStatus: boolean) => {
        try {
            const supabase = createClient();
            const newStatus = !currentStatus;

            const { error } = await supabase
                .from("watch_pages")
                .update({ is_published: newStatus })
                .eq("id", pageId);

            if (error) throw error;

            setWatchPages((prev) =>
                prev.map((p) =>
                    p.id === pageId ? { ...p, is_published: newStatus } : p
                )
            );

            logger.info(
                { pageId, isPublished: newStatus },
                "Watch page publish status updated"
            );

            alert(
                newStatus
                    ? "Page published successfully!"
                    : "Page unpublished successfully!"
            );
        } catch (error) {
            logger.error({ error }, "Failed to update publish status");
            alert("Failed to update publish status. Please try again.");
        }
    };

    const hasDeckStructure = deckStructures.length > 0;
    const hasPitchVideo = pitchVideos.length > 0;
    const hasWatchPage = watchPages.length > 0;
    const canCreatePage = hasDeckStructure && hasPitchVideo;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={8}
            projectId={projectId}
            funnelName={project?.name}
            nextDisabled={!hasWatchPage}
            nextLabel={hasWatchPage ? "Create Registration Page" : "Create Page First"}
            stepTitle="Watch Pages"
            stepDescription="Create engaging video watch pages with visual editor"
        >
            <div className="space-y-8">
                {/* Dependency Warnings */}
                {!hasDeckStructure && (
                    <DependencyWarning
                        message="You need to create a deck structure first."
                        requiredStep={3}
                        requiredStepName="Deck Structure"
                        projectId={projectId}
                    />
                )}
                {!hasPitchVideo && (
                    <DependencyWarning
                        message="You need to upload a pitch video first."
                        requiredStep={7}
                        requiredStepName="Upload Video"
                        projectId={projectId}
                    />
                )}

                {/* Create New Page Button */}
                {!showCreateForm ? (
                    <div className="rounded-lg border border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50 p-8">
                        <div className="text-center">
                            <button
                                onClick={() => setShowCreateForm(true)}
                                disabled={!canCreatePage}
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    canCreatePage
                                        ? "bg-cyan-600 text-white hover:bg-cyan-700"
                                        : "cursor-not-allowed bg-gray-300 text-gray-500"
                                }`}
                            >
                                <PlusCircle className="h-6 w-6" />
                                {canCreatePage
                                    ? "Create New Watch Page"
                                    : "Complete Prerequisites First"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Create Watch Page
                            </h3>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Page Headline
                                </label>
                                <input
                                    type="text"
                                    value={formData.headline}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            headline: e.target.value,
                                        })
                                    }
                                    placeholder="e.g., Watch: AI Sales Masterclass"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Deck Structure
                                </label>
                                <select
                                    value={formData.deckStructureId}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            deckStructureId: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    {deckStructures.map((deck) => (
                                        <option key={deck.id} value={deck.id}>
                                            {deck.metadata?.title ||
                                                `Deck ${deck.total_slides} slides`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Pitch Video
                                </label>
                                <select
                                    value={formData.videoId}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            videoId: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    {pitchVideos.map((video) => (
                                        <option key={video.id} value={video.id}>
                                            Video from{" "}
                                            {new Date(
                                                video.created_at
                                            ).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-sm text-gray-500">
                                    This video will be embedded in the page
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={
                                        !formData.headline.trim() ||
                                        !formData.videoId ||
                                        isCreating
                                    }
                                    className={`rounded-lg px-6 py-2 font-semibold ${
                                        formData.headline.trim() &&
                                        formData.videoId &&
                                        !isCreating
                                            ? "bg-cyan-600 text-white hover:bg-cyan-700"
                                            : "cursor-not-allowed bg-gray-300 text-gray-500"
                                    }`}
                                >
                                    {isCreating ? "Creating..." : "Create Page"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Existing Pages List */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Your Watch Pages
                            </h3>
                            <span className="text-sm text-gray-500">
                                {watchPages.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {watchPages.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">
                                <Video className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>No watch pages yet. Create your first one above!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {watchPages.map((page) => (
                                    <div
                                        key={page.id}
                                        className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-cyan-300 hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="mb-2 flex items-center gap-3">
                                                    <h4 className="text-lg font-semibold text-gray-900">
                                                        {page.headline}
                                                    </h4>
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                            page.is_published
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-yellow-100 text-yellow-800"
                                                        }`}
                                                    >
                                                        {page.is_published
                                                            ? "Published"
                                                            : "Draft"}
                                                    </span>
                                                </div>

                                                <p className="mb-3 text-sm text-gray-600">
                                                    {page.subheadline}
                                                </p>

                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span>
                                                        Created{" "}
                                                        {new Date(
                                                            page.created_at
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-600">
                                                        {page.is_published
                                                            ? "Live"
                                                            : "Draft"}
                                                    </span>
                                                    <Switch
                                                        checked={page.is_published}
                                                        onCheckedChange={() =>
                                                            handlePublishToggle(
                                                                page.id,
                                                                page.is_published
                                                            )
                                                        }
                                                    />
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            handlePreview(page.id)
                                                        }
                                                        className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                                        title="Preview"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            handleEdit(page.id)
                                                        }
                                                        className="rounded p-2 text-cyan-600 hover:bg-cyan-50"
                                                        title="Edit with Visual Editor"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            handleDelete(page.id)
                                                        }
                                                        className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Helper Info */}
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-6">
                    <h4 className="mb-3 font-semibold text-blue-900">
                        💡 Watch Page Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-blue-800">
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
