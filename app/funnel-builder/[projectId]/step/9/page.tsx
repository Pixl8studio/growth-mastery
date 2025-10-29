"use client";

/**
 * Step 9: Registration Pages
 * Create and manage registration pages with visual editor integration
 */

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { FileText, PlusCircle, Eye, Pencil, Trash2, X } from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { generateRegistrationHTML } from "@/lib/generators/registration-page-generator";
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

export default function Step9RegistrationPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [registrationPages, setRegistrationPages] = useState<RegistrationPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        headline: "",
        deckStructureId: "",
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
            } catch (error) {
                logger.error({ error }, "Failed to load data");
            }
        };

        loadData();
    }, [projectId]);

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
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={9}
            projectId={projectId}
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
                        requiredStep={3}
                        requiredStepName="Deck Structure"
                        projectId={projectId}
                    />
                )}

                {/* Create New Page Button */}
                {!showCreateForm ? (
                    <div className="rounded-lg border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-8">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                <FileText className="h-8 w-8 text-green-600" />
                            </div>
                            <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                                Create Registration Page
                            </h2>
                            <p className="mx-auto max-w-lg text-gray-600">
                                Build a high-converting registration page that captures
                                leads using content from your deck structure.
                            </p>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={() => setShowCreateForm(true)}
                                disabled={!hasDeckStructure}
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    hasDeckStructure
                                        ? "bg-green-600 text-white hover:bg-green-700"
                                        : "cursor-not-allowed bg-gray-300 text-gray-500"
                                }`}
                            >
                                <PlusCircle className="h-6 w-6" />
                                {hasDeckStructure
                                    ? "Create New Registration Page"
                                    : "Complete Step 3 First"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Create Registration Page
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
                                    placeholder="e.g., Master AI Sales in 90 Minutes"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    {deckStructures.map((deck) => (
                                        <option key={deck.id} value={deck.id}>
                                            {deck.metadata?.title ||
                                                `Deck ${deck.total_slides} slides`}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-sm text-gray-500">
                                    Content will be pulled from this deck structure
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
                                    disabled={!formData.headline.trim() || isCreating}
                                    className={`rounded-lg px-6 py-2 font-semibold ${
                                        formData.headline.trim() && !isCreating
                                            ? "bg-green-600 text-white hover:bg-green-700"
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
                                        className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-green-300 hover:shadow-md"
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
                                                    {page.vanity_slug && (
                                                        <span>/{page.vanity_slug}</span>
                                                    )}
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
                                                        className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
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
                        💡 Registration Page Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-blue-800">
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
