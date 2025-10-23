"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { Sparkles, ClipboardList, Trash2 } from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";

interface RegistrationPage {
    id: string;
    content: {
        headline?: string;
        subheadline?: string;
        bulletPoints?: string[];
        ctaText?: string;
    };
    created_at: string;
}

export default function Step9Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [registrationPages, setRegistrationPages] = useState<RegistrationPage[]>([]);
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
                const [pagesResult, deckResult] = await Promise.all([
                    supabase
                        .from("registration_pages")
                        .select("*")
                        .eq("funnel_project_id", projectId)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("deck_structures")
                        .select("id")
                        .eq("funnel_project_id", projectId),
                ]);

                if (pagesResult.data) setRegistrationPages(pagesResult.data);
                if (deckResult.data) setHasDeck(deckResult.data.length > 0);
            } catch (error) {
                logger.error({ error }, "Failed to load registration pages");
            }
        };
        loadPages();
    }, [projectId]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            setGenerationProgress(30);

            const response = await fetch("/api/generate/registration-copy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });

            setGenerationProgress(80);

            if (!response.ok) throw new Error("Failed to generate page");

            const result = await response.json();
            setRegistrationPages((prev) => [result.page, ...prev]);
            setGenerationProgress(100);

            setTimeout(() => {
                setIsGenerating(false);
                setGenerationProgress(0);
            }, 1000);
        } catch (error) {
            logger.error({ error }, "Failed to generate registration page");
            setIsGenerating(false);
            setGenerationProgress(0);
            alert("Failed to generate registration page. Please try again.");
        }
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
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete registration page");
        }
    };

    const hasCompletedPage = registrationPages.length > 0;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={9}
            projectId={projectId}
            funnelName={project?.name}
            nextDisabled={!hasCompletedPage}
            nextLabel={hasCompletedPage ? "Setup Flow" : "Generate Page First"}
            stepTitle="Registration Page Copy"
            stepDescription="AI generates lead capture copy for your registration page"
        >
            <div className="space-y-8">
                {!hasDeck && (
                    <DependencyWarning
                        message="You need to create a deck structure first to generate registration page copy."
                        requiredStep={3}
                        requiredStepName="Deck Structure"
                        projectId={projectId}
                    />
                )}

                {!isGenerating ? (
                    <div className="rounded-lg border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-8">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
                                <ClipboardList className="h-8 w-8 text-violet-600" />
                            </div>
                            <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                                Generate Registration Page Copy
                            </h2>
                            <p className="mx-auto max-w-lg text-gray-600">
                                AI will create persuasive copy for your lead capture
                                page to maximize webinar registrations.
                            </p>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={handleGenerate}
                                disabled={!hasDeck}
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    hasDeck
                                        ? "bg-violet-600 text-white hover:bg-violet-700"
                                        : "cursor-not-allowed bg-gray-300 text-gray-500"
                                }`}
                            >
                                <Sparkles className="h-6 w-6" />
                                {hasDeck
                                    ? "Generate Registration Copy"
                                    : "Create Deck Structure First"}
                            </button>

                            <div className="mt-4 space-y-1 text-sm text-gray-500">
                                <p>⚡ Generation time: ~15-20 seconds</p>
                                <p>📋 Creates compelling registration page copy</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-violet-200 bg-violet-50 p-6">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-violet-100">
                                <Sparkles className="h-6 w-6 text-violet-600" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-violet-900">
                                Generating Registration Page Copy
                            </h3>
                            <p className="text-violet-700">
                                AI is crafting lead capture copy...
                            </p>
                        </div>

                        <div className="mx-auto max-w-md">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-violet-700">
                                    Progress
                                </span>
                                <span className="text-sm text-violet-600">
                                    {generationProgress}%
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-violet-200">
                                <div
                                    className="h-3 rounded-full bg-violet-600 transition-all duration-500 ease-out"
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
                                Your Registration Pages
                            </h3>
                            <span className="text-sm text-gray-500">
                                {registrationPages.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {registrationPages.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">
                                <ClipboardList className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>
                                    No registration pages yet. Generate your first one
                                    above!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {registrationPages.map((page) => (
                                    <div
                                        key={page.id}
                                        className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-violet-300 hover:shadow-md"
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
                                                {page.content.bulletPoints && (
                                                    <div className="mb-2 text-sm text-gray-600">
                                                        {
                                                            page.content.bulletPoints
                                                                .length
                                                        }{" "}
                                                        bullet points
                                                    </div>
                                                )}
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
