"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { Sparkles, FileText, Trash2 } from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";

interface EnrollmentPage {
    id: string;
    content: {
        headline?: string;
        subheadline?: string;
        opening?: string;
        ctaText?: string;
    };
    created_at: string;
}

export default function Step5Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [enrollmentPages, setEnrollmentPages] = useState<EnrollmentPage[]>([]);
    const [selectedPage, setSelectedPage] = useState<EnrollmentPage | null>(null);
    const [hasOffer, setHasOffer] = useState(false);

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
                const [pagesResult, offerResult] = await Promise.all([
                    supabase
                        .from("enrollment_pages")
                        .select("*")
                        .eq("funnel_project_id", projectId)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("offers")
                        .select("id")
                        .eq("funnel_project_id", projectId),
                ]);

                if (pagesResult.data) setEnrollmentPages(pagesResult.data);
                if (offerResult.data) setHasOffer(offerResult.data.length > 0);
            } catch (error) {
                logger.error({ error }, "Failed to load enrollment pages");
            }
        };
        loadPages();
    }, [projectId]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            setGenerationProgress(30);

            const response = await fetch("/api/generate/enrollment-copy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });

            setGenerationProgress(80);

            if (!response.ok) throw new Error("Failed to generate page");

            const result = await response.json();
            setEnrollmentPages((prev) => [result.page, ...prev]);
            setGenerationProgress(100);

            setTimeout(() => {
                setIsGenerating(false);
                setGenerationProgress(0);
            }, 1000);
        } catch (error) {
            logger.error({ error }, "Failed to generate enrollment page");
            setIsGenerating(false);
            setGenerationProgress(0);
            alert("Failed to generate enrollment page. Please try again.");
        }
    };

    const handleDelete = async (pageId: string) => {
        if (!confirm("Delete this enrollment page?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("enrollment_pages")
                .delete()
                .eq("id", pageId);

            if (!error) {
                setEnrollmentPages((prev) => prev.filter((p) => p.id !== pageId));
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete enrollment page");
        }
    };

    const hasCompletedPage = enrollmentPages.length > 0;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={5}
            projectId={projectId}
            funnelName={project?.name}
            nextDisabled={!hasCompletedPage}
            nextLabel={hasCompletedPage ? "Generate Talk Track" : "Generate Page First"}
            stepTitle="Enrollment Page Copy"
            stepDescription="AI generates compelling sales copy for your enrollment page"
        >
            <div className="space-y-8">
                {!hasOffer && (
                    <DependencyWarning
                        message="You need to create an offer first to generate enrollment page copy."
                        requiredStep={2}
                        requiredStepName="Craft Offer"
                        projectId={projectId}
                    />
                )}

                {!isGenerating ? (
                    <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-8">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                                <Sparkles className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                                Generate Enrollment Page Copy
                            </h2>
                            <p className="mx-auto max-w-lg text-gray-600">
                                AI will create persuasive, conversion-optimized copy for
                                your enrollment page based on your offer and deck
                                structure.
                            </p>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={handleGenerate}
                                disabled={!hasOffer}
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    hasOffer
                                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                        : "cursor-not-allowed bg-gray-300 text-gray-500"
                                }`}
                            >
                                <Sparkles className="h-6 w-6" />
                                {hasOffer
                                    ? "Generate Enrollment Copy"
                                    : "Create Offer First"}
                            </button>

                            <div className="mt-4 space-y-1 text-sm text-gray-500">
                                <p>⚡ Generation time: ~15-20 seconds</p>
                                <p>
                                    ✍️ Creates headline, subheadline, and compelling
                                    copy
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-emerald-100">
                                <Sparkles className="h-6 w-6 text-emerald-600" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-emerald-900">
                                Generating Enrollment Page Copy
                            </h3>
                            <p className="text-emerald-700">
                                AI is crafting persuasive copy...
                            </p>
                        </div>

                        <div className="mx-auto max-w-md">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-emerald-700">
                                    Progress
                                </span>
                                <span className="text-sm text-emerald-600">
                                    {generationProgress}%
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-emerald-200">
                                <div
                                    className="h-3 rounded-full bg-emerald-600 transition-all duration-500 ease-out"
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
                                Your Enrollment Pages
                            </h3>
                            <span className="text-sm text-gray-500">
                                {enrollmentPages.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {enrollmentPages.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">
                                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>
                                    No enrollment pages yet. Generate your first one
                                    above!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {enrollmentPages.map((page) => (
                                    <div
                                        key={page.id}
                                        onClick={() => setSelectedPage(page)}
                                        className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(page.id);
                                                }}
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
