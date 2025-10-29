"use client";

/**
 * Step 5: Enrollment Pages
 * Create and manage enrollment/sales pages with visual editor integration
 */

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { ShoppingCart, PlusCircle, Eye, Pencil, Trash2, X } from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { generateEnrollmentHTML } from "@/lib/generators/enrollment-page-generator";

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

export default function Step5EnrollmentPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [enrollmentPages, setEnrollmentPages] = useState<EnrollmentPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        headline: "",
        deckStructureId: "",
        offerId: "",
        templateType: "urgency-convert" as
            | "urgency-convert"
            | "premium-elegant"
            | "value-focused",
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
            !formData.offerId
        ) {
            alert(
                "Please provide a headline, select a deck structure, and select an offer"
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

            // Get selected deck structure and offer
            const deckStructure = deckStructures.find(
                (d) => d.id === formData.deckStructureId
            );
            const offer = offers.find((o) => o.id === formData.offerId);

            if (!deckStructure || !offer) throw new Error("Deck or offer not found");

            // Get theme from project or use defaults
            const theme = project?.settings?.theme || {
                primary: "#2563eb",
                secondary: "#10b981",
                background: "#ffffff",
                text: "#1f2937",
            };

            // Generate HTML using the generator
            const htmlContent = generateEnrollmentHTML({
                projectId,
                offer,
                deckStructure,
                theme,
                templateType: formData.templateType,
            });

            // Create enrollment page
            const { data: newPage, error: createError } = await supabase
                .from("enrollment_pages")
                .insert({
                    funnel_project_id: projectId,
                    user_id: user.id,
                    offer_id: offer.id,
                    headline: formData.headline,
                    subheadline: offer.tagline || offer.description || "",
                    html_content: htmlContent,
                    theme,
                    is_published: false,
                    page_type: "direct_purchase",
                })
                .select()
                .single();

            if (createError) throw createError;

            // Add to list
            setEnrollmentPages((prev) => [newPage, ...prev]);

            // Reset form
            setFormData({
                headline: "",
                deckStructureId: deckStructures[0]?.id || "",
                offerId: offers[0]?.id || "",
                templateType: "urgency-convert",
            });
            setShowCreateForm(false);

            logger.info({ pageId: newPage.id }, "Enrollment page created");
        } catch (error) {
            logger.error({ error }, "Failed to create enrollment page");
            alert("Failed to create page. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleEdit = (pageId: string) => {
        const editorUrl = `/funnel-builder/${projectId}/pages/enrollment/${pageId}?edit=true`;
        window.open(editorUrl, "_blank");
    };

    const handlePreview = (pageId: string) => {
        const previewUrl = `/funnel-builder/${projectId}/pages/enrollment/${pageId}`;
        window.open(previewUrl, "_blank");
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
                logger.info({ pageId }, "Enrollment page deleted");
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete enrollment page");
        }
    };

    const hasDeckStructure = deckStructures.length > 0;
    const hasOffer = offers.length > 0;
    const hasEnrollmentPage = enrollmentPages.length > 0;
    const canCreatePage = hasDeckStructure && hasOffer;

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
            nextDisabled={!hasEnrollmentPage}
            nextLabel={hasEnrollmentPage ? "Create Talk Track" : "Create Page First"}
            stepTitle="Enrollment Pages"
            stepDescription="Create high-converting sales pages with visual editor"
        >
            <div className="space-y-8">
                {/* Dependency Warnings */}
                {!hasDeckStructure && (
                    <DependencyWarning
                        message="You need to create a presentation structure first."
                        requiredStep={3}
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

                {/* Create New Page Button */}
                {!showCreateForm ? (
                    <div className="rounded-lg border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-8">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                                <ShoppingCart className="h-8 w-8 text-purple-600" />
                            </div>
                            <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                                Create Enrollment Page
                            </h2>
                            <p className="mx-auto max-w-lg text-gray-600">
                                Build a high-converting sales page that transforms
                                viewers into customers using your offer and deck
                                content.
                            </p>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={() => setShowCreateForm(true)}
                                disabled={!canCreatePage}
                                className={`mx-auto flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                                    canCreatePage
                                        ? "bg-purple-600 text-white hover:bg-purple-700"
                                        : "cursor-not-allowed bg-gray-300 text-gray-500"
                                }`}
                            >
                                <PlusCircle className="h-6 w-6" />
                                {canCreatePage
                                    ? "Create New Enrollment Page"
                                    : "Complete Prerequisites First"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Create Enrollment Page
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
                                    placeholder="e.g., Enroll in AI Sales Mastery Program"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
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
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    {offers.map((offer) => (
                                        <option key={offer.id} value={offer.id}>
                                            {offer.name} - {offer.currency}{" "}
                                            {offer.price.toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
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
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    {deckStructures.map((deck) => (
                                        <option key={deck.id} value={deck.id}>
                                            {deck.metadata?.title ||
                                                `Presentation ${deck.total_slides} slides`}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-sm text-gray-500">
                                    Testimonials and content from this presentation
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Template Style
                                </label>
                                <select
                                    value={formData.templateType}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            templateType: e.target.value as any,
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="urgency-convert">
                                        Urgency Convert (High-pressure sales)
                                    </option>
                                    <option value="premium-elegant">
                                        Premium Elegant (High-ticket positioning)
                                    </option>
                                    <option value="value-focused">
                                        Value Focused (Education/coaching)
                                    </option>
                                </select>
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
                                        !formData.offerId ||
                                        isCreating
                                    }
                                    className={`rounded-lg px-6 py-2 font-semibold ${
                                        formData.headline.trim() &&
                                        formData.offerId &&
                                        !isCreating
                                            ? "bg-purple-600 text-white hover:bg-purple-700"
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
                                <ShoppingCart className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>
                                    No enrollment pages yet. Create your first one
                                    above!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {enrollmentPages.map((page) => (
                                    <div
                                        key={page.id}
                                        className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-purple-300 hover:shadow-md"
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
                                                    <span>Type: {page.page_type}</span>
                                                </div>
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
                                                    onClick={() => handleEdit(page.id)}
                                                    className="rounded p-2 text-purple-600 hover:bg-purple-50"
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
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Helper Info */}
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-6">
                    <h4 className="mb-3 font-semibold text-blue-900">
                        💡 Enrollment Page Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-blue-800">
                        <li>
                            • Use urgency and scarcity elements to drive immediate
                            action
                        </li>
                        <li>
                            • Customize pricing and value stack in the Visual Editor
                        </li>
                        <li>
                            • Add testimonials from your deck structure or create new
                            ones
                        </li>
                        <li>• Changes auto-save every 3 seconds</li>
                    </ul>
                </div>
            </div>
        </StepLayout>
    );
}
