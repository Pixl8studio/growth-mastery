"use client";

/**
 * Step 9: Registration Pages
 * Create and manage registration pages with visual editor integration
 */

import { useState, useEffect } from "react";
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
    Sparkles,
    Loader2,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { generateRegistrationHTML } from "@/lib/generators/registration-page-generator";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { Switch } from "@/components/ui/switch";
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

interface RegistrationPage {
    id: string;
    headline: string;
    subheadline: string;
    html_content: string;
    theme: any;
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

export default function Step9RegistrationPage({
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
    const [registrationPages, setRegistrationPages] = useState<RegistrationPage[]>([]);
    const [aiEditorPages, setAiEditorPages] = useState<AIEditorPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isCreatingV2, setIsCreatingV2] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        headline: "",
        deckStructureId: "",
    });

    // Handle Generate v2 (AI Editor) click
    const handleGenerateV2 = async () => {
        if (!projectId) return;

        setIsCreatingV2(true);
        try {
            logger.info(
                { projectId, pageType: "registration" },
                "Creating AI editor page"
            );

            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "registration",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || "Failed to create page");
            }

            logger.info({ pageId: data.pageId }, "AI editor page created");

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

            toast({
                title: "🎉 Page Created!",
                description: (
                    <div className="flex flex-col gap-2">
                        <p>Your v2 page has been generated successfully.</p>
                        <a
                            href={`/ai-editor/${data.pageId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-medium"
                        >
                            Open AI Editor →
                        </a>
                    </div>
                ),
            });
        } catch (error: any) {
            logger.error({ error }, "Failed to create AI editor page");
            toast({
                variant: "destructive",
                title: "Error",
                description:
                    error.message ||
                    "Failed to create AI editor page. Please try again.",
            });
        } finally {
            setIsCreatingV2(false);
        }
    };

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

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
                if (deckData && deckData.length > 0 && !formData.deckStructureId) {
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
    }, [projectId, formData.deckStructureId]);

    const handleCreate = async () => {
        if (!formData.headline.trim() || !formData.deckStructureId) {
            alert("Please provide a headline and select a deck structure");
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

            // Get selected deck structure
            const deckStructure = deckStructures.find(
                (d) => d.id === formData.deckStructureId
            );
            if (!deckStructure) throw new Error("Deck structure not found");

            // Fetch intake data (Step 1)
            const { data: intakeData } = await supabase
                .from("vapi_transcripts")
                .select("extracted_data, transcript_text")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            // Fetch offer data (Step 2)
            const { data: offerData } = await supabase
                .from("offers")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            // Get theme from project or use defaults
            const theme = project?.settings?.theme || {
                primary: "#2563eb",
                secondary: "#10b981",
                background: "#ffffff",
                text: "#1f2937",
            };

            // Generate HTML using the generator with all available data
            const htmlContent = generateRegistrationHTML({
                projectId,
                deckStructure,
                headline: formData.headline,
                theme,
                intakeData: intakeData?.extracted_data || null,
                offerData: offerData || null,
            });

            // Extract subheadline from deck
            const subheadline =
                deckStructure.metadata?.title || "Join this exclusive training";

            // Create registration page
            const { data: newPage, error: createError } = await supabase
                .from("registration_pages")
                .insert({
                    funnel_project_id: projectId,
                    user_id: user.id,
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
            setRegistrationPages((prev) => [newPage, ...prev]);

            // Reset form
            setFormData({
                headline: "",
                deckStructureId: deckStructures[0]?.id || "",
            });
            setShowCreateForm(false);

            logger.info({ pageId: newPage.id }, "Registration page created");
        } catch (error) {
            logger.error({ error }, "Failed to create registration page");
            alert("Failed to create page. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleEdit = (pageId: string) => {
        // Open editor in new tab
        const editorUrl = `/funnel-builder/${projectId}/pages/registration/${pageId}?edit=true`;
        window.open(editorUrl, "_blank");
    };

    const handlePreview = (pageId: string) => {
        // Open preview (without edit mode)
        const previewUrl = `/funnel-builder/${projectId}/pages/registration/${pageId}`;
        window.open(previewUrl, "_blank");
    };

    const handleTogglePublish = async (pageId: string, currentStatus: boolean) => {
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("registration_pages")
                .update({ is_published: !currentStatus })
                .eq("id", pageId);

            if (!error) {
                setRegistrationPages((prev) =>
                    prev.map((p) =>
                        p.id === pageId ? { ...p, is_published: !currentStatus } : p
                    )
                );
                logger.info(
                    { pageId, newStatus: !currentStatus },
                    "Registration page publish status updated"
                );
            }
        } catch (error) {
            logger.error({ error }, "Failed to update publish status");
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
                logger.info({ pageId }, "Registration page deleted");
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete registration page");
        }
    };

    const hasDeckStructure = deckStructures.length > 0;
    const hasRegistrationPage = registrationPages.length > 0;

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
            nextDisabled={!hasRegistrationPage}
            nextLabel={hasRegistrationPage ? "Setup Your Flow" : "Create Page First"}
            stepTitle="Registration Pages"
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

                {/* Create New Page Button */}
                {!showCreateForm ? (
                    <div className="rounded-lg border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-8">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <button
                                onClick={() => setShowCreateForm(true)}
                                disabled={!hasDeckStructure}
                                className={`flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    hasDeckStructure
                                        ? "bg-green-600 text-white hover:bg-green-700"
                                        : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                }`}
                            >
                                <PlusCircle className="h-6 w-6" />
                                {hasDeckStructure
                                    ? "Create New Registration Page"
                                    : "Complete Step 3 First"}
                            </button>

                            {/* Generate v2 - AI Editor */}
                            <button
                                onClick={handleGenerateV2}
                                disabled={!hasDeckStructure || isCreatingV2}
                                className={`flex items-center gap-2 rounded-lg border-2 px-6 py-3 font-medium transition-colors ${
                                    hasDeckStructure && !isCreatingV2
                                        ? "border-green-400 bg-white text-green-600 hover:bg-green-50"
                                        : "cursor-not-allowed border-gray-300 bg-gray-100 text-muted-foreground"
                                }`}
                            >
                                {isCreatingV2 ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-5 w-5" />
                                        Generate v2 (AI Chat Editor)
                                    </>
                                )}
                            </button>
                            <p className="text-sm text-muted-foreground">
                                Try our new AI-powered conversational editor
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-foreground">
                                Create Registration Page
                            </h3>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-foreground">
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
                                    placeholder="e.g., Master AI Sales in 90 Minutes"
                                    className="w-full rounded-lg border border-border px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-foreground">
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
                                    className="w-full rounded-lg border border-border px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    {deckStructures.map((deck) => (
                                        <option key={deck.id} value={deck.id}>
                                            {deck.metadata?.title ||
                                                `Deck ${deck.total_slides} slides`}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Content will be pulled from this deck structure
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="rounded-lg border border-border px-6 py-2 font-medium text-foreground hover:bg-muted/50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!formData.headline.trim() || isCreating}
                                    className={`rounded-lg px-6 py-2 font-semibold ${
                                        formData.headline.trim() && !isCreating
                                            ? "bg-green-600 text-white hover:bg-green-700"
                                            : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                    }`}
                                >
                                    {isCreating ? "Creating..." : "Create Page"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Existing Pages List */}
                <div className="rounded-lg border border-border bg-card shadow-soft">
                    <div className="border-b border-border p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-foreground">
                                Your Registration Pages
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {registrationPages.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {registrationPages.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>
                                    No registration pages yet. Create your first one
                                    above!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {registrationPages.map((page) => (
                                    <div
                                        key={page.id}
                                        className="rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-green-300 hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="mb-2 flex items-center gap-3">
                                                    <h4 className="text-lg font-semibold text-foreground">
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

                                                <p className="mb-3 text-sm text-muted-foreground">
                                                    {page.subheadline}
                                                </p>

                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span>
                                                        Created{" "}
                                                        {new Date(
                                                            page.created_at
                                                        ).toLocaleDateString()}
                                                    </span>
                                                    {page.vanity_slug && (
                                                        <span>/{page.vanity_slug}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">
                                                        {page.is_published
                                                            ? "Live"
                                                            : "Draft"}
                                                    </span>
                                                    <Switch
                                                        checked={page.is_published}
                                                        onCheckedChange={() =>
                                                            handleTogglePublish(
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
                                                        className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        title="Preview"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            handleEdit(page.id)
                                                        }
                                                        className="rounded p-2 text-green-600 hover:bg-green-50"
                                                        title="Edit with Visual Editor"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            handleDelete(page.id)
                                                        }
                                                        className="rounded p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
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

                {/* AI Editor v2 Pages List */}
                {aiEditorPages.length > 0 && (
                    <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-soft">
                        <div className="border-b border-green-200 p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="h-5 w-5 text-green-600" />
                                    <h3 className="text-xl font-semibold text-foreground">
                                        AI Editor Pages (v2)
                                    </h3>
                                </div>
                                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                                    {aiEditorPages.length} created
                                </span>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="space-y-4">
                                {aiEditorPages.map((page) => (
                                    <div
                                        key={page.id}
                                        className="rounded-lg border border-green-200 bg-white p-6 shadow-sm transition-all hover:border-green-400 hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="mb-2 flex items-center gap-3">
                                                    <h4 className="text-lg font-semibold text-foreground">
                                                        {page.title}
                                                    </h4>
                                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                                        v2
                                                    </span>
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                            page.status === "published"
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-yellow-100 text-yellow-800"
                                                        }`}
                                                    >
                                                        {page.status === "published"
                                                            ? "Published"
                                                            : "Draft"}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span>
                                                        Created{" "}
                                                        {new Date(
                                                            page.created_at
                                                        ).toLocaleDateString()}
                                                    </span>
                                                    <span>Version {page.version}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={`/ai-editor/${page.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    Edit in AI Editor
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

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
