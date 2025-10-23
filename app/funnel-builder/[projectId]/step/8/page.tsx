"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { Sparkles, PlayCircle, Trash2 } from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";

interface WatchPage {
    id: string;
    content: {
        headline?: string;
        subheadline?: string;
        watchPrompt?: string;
        ctaText?: string;
    };
    created_at: string;
}

export default function Step8Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [watchPages, setWatchPages] = useState<WatchPage[]>([]);
    const [hasVideo, setHasVideo] = useState(false);
    const [hasDeck, setHasDeck] = useState(false);

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
        const loadPages = async () => {
            if (!projectId) return;
            try {
                const supabase = createClient();
                const [pagesResult, videoResult, deckResult] = await Promise.all([
                    supabase
                        .from("watch_pages")
                        .select("*")
                        .eq("funnel_project_id", projectId)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("pitch_videos")
                        .select("id")
                        .eq("funnel_project_id", projectId),
                    supabase
                        .from("deck_structures")
                        .select("id")
                        .eq("funnel_project_id", projectId),
                ]);

                if (pagesResult.data) setWatchPages(pagesResult.data);
                if (videoResult.data) setHasVideo(videoResult.data.length > 0);
                if (deckResult.data) setHasDeck(deckResult.data.length > 0);
            } catch (error) {
                logger.error({ error }, "Failed to load watch pages");
            }
        };
        loadPages();
    }, [projectId]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            setGenerationProgress(30);

            const response = await fetch("/api/generate/watch-copy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });

            setGenerationProgress(80);

            if (!response.ok) throw new Error("Failed to generate page");

            const result = await response.json();
            setWatchPages((prev) => [result.page, ...prev]);
            setGenerationProgress(100);

            setTimeout(() => {
                setIsGenerating(false);
                setGenerationProgress(0);
            }, 1000);
        } catch (error) {
            logger.error({ error }, "Failed to generate watch page");
            setIsGenerating(false);
            setGenerationProgress(0);
            alert("Failed to generate watch page. Please try again.");
        }
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
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete watch page");
        }
    };

    const hasCompletedPage = watchPages.length > 0;

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
            nextDisabled={!hasCompletedPage}
            nextLabel={
                hasCompletedPage ? "Generate Registration" : "Generate Page First"
            }
            stepTitle="Watch Page Copy"
            stepDescription="AI generates engaging copy for your video watch page"
        >
            <div className="space-y-8">
                {(!hasVideo || !hasDeck) && (
                    <DependencyWarning
                        message={
                            !hasVideo
                                ? "You need to upload a video first."
                                : "You need to create a deck structure first."
                        }
                        requiredStep={!hasVideo ? 7 : 3}
                        requiredStepName={!hasVideo ? "Upload Video" : "Deck Structure"}
                        projectId={projectId}
                    />
                )}

                {!isGenerating ? (
                    <div className="rounded-lg border border-cyan-100 bg-gradient-to-br from-cyan-50 to-sky-50 p-8">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100">
                                <PlayCircle className="h-8 w-8 text-cyan-600" />
                            </div>
                            <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                                Generate Watch Page Copy
                            </h2>
                            <p className="mx-auto max-w-lg text-gray-600">
                                AI will create compelling copy for your video watch page
                                to maximize engagement and conversions.
                            </p>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={handleGenerate}
                                disabled={!hasVideo || !hasDeck}
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    hasVideo && hasDeck
                                        ? "bg-cyan-600 text-white hover:bg-cyan-700"
                                        : "cursor-not-allowed bg-gray-300 text-gray-500"
                                }`}
                            >
                                <Sparkles className="h-6 w-6" />
                                {hasVideo && hasDeck
                                    ? "Generate Watch Page"
                                    : "Complete Prerequisites First"}
                            </button>

                            <div className="mt-4 space-y-1 text-sm text-gray-500">
                                <p>⚡ Generation time: ~15-20 seconds</p>
                                <p>📺 Creates engaging video page copy</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-6">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-cyan-100">
                                <Sparkles className="h-6 w-6 text-cyan-600" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-cyan-900">
                                Generating Watch Page Copy
                            </h3>
                            <p className="text-cyan-700">
                                AI is crafting engaging copy...
                            </p>
                        </div>

                        <div className="mx-auto max-w-md">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-cyan-700">
                                    Progress
                                </span>
                                <span className="text-sm text-cyan-600">
                                    {generationProgress}%
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-cyan-200">
                                <div
                                    className="h-3 rounded-full bg-cyan-600 transition-all duration-500 ease-out"
                                    style={{ width: `${generationProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

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
                                <PlayCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>
                                    No watch pages yet. Generate your first one above!
                                </p>
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
                                                <h4 className="mb-2 text-lg font-semibold text-gray-900">
                                                    {page.content.headline ||
                                                        "Untitled Page"}
                                                </h4>
                                                <p className="mb-2 text-sm text-gray-600">
                                                    {page.content.subheadline ||
                                                        "No subheadline"}
                                                </p>
                                                <span className="text-xs text-gray-500">
                                                    Created{" "}
                                                    {new Date(
                                                        page.created_at
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => handleDelete(page.id)}
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
        </StepLayout>
    );
}
