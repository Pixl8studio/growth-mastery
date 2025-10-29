"use client";

/**
 * Step 5: Enrollment Pages
 * Create and manage enrollment/sales pages with visual editor integration
 */

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import {
    ShoppingCart,
    PlusCircle,
    Eye,
    Pencil,
    Trash2,
    X,
    Loader2,
    HelpCircle,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { generateEnrollmentHTML } from "@/lib/generators/enrollment-page-generator";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Switch } from "@/components/ui/switch";
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

const TEMPLATE_OPTIONS = [
    {
        value: "urgency-convert",
        label: "Urgency Convert",
        description:
            "High-energy sales page with countdown timers and scarcity messaging. Best for time-sensitive offers and launches.",
    },
    {
        value: "premium-elegant",
        label: "Premium Elegant",
        description:
            "Sophisticated design with refined styling. Ideal for high-ticket offers and luxury positioning.",
    },
    {
        value: "value-focused",
        label: "Value Focused",
        description:
            "Emphasizes benefits and ROI. Perfect for educational products and value-driven buyers.",
    },
] as const;

export default function Step5EnrollmentPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [enrollmentPages, setEnrollmentPages] = useState<EnrollmentPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [creationProgress, setCreationProgress] = useState("");
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
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
        if (!formData.deckStructureId || !formData.offerId) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please select both a deck structure and an offer",
            });
            return;
        }

        setIsCreating(true);
        setCreationProgress("Initializing...");

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

            if (!deckStructure || !offer) {
                throw new Error("Deck or offer not found");
            }

            // Log creation attempt to funnel_flows
            await supabase.from("funnel_flows").insert({
                funnel_project_id: projectId,
                user_id: user.id,
                step_number: 5,
                action: "create_enrollment_page_attempt",
                metadata: {
                    offer_id: offer.id,
                    deck_structure_id: deckStructure.id,
                    template_type: formData.templateType,
                },
            });

            // Auto-generate headline and subheadline from offer
            const autoHeadline = offer.name;
            const autoSubheadline =
                offer.tagline ||
                offer.description ||
                "Transform your business with our proven system";

            // Get theme from project or use defaults
            const theme = project?.settings?.theme || {
                primary: "#2563eb",
                secondary: "#10b981",
                background: "#ffffff",
                text: "#1f2937",
            };

            setCreationProgress("Generating page content...");

            // Generate HTML using the generator
            const htmlContent = generateEnrollmentHTML({
                projectId,
                offer,
                deckStructure,
                theme,
                templateType: formData.templateType,
            });

            setCreationProgress("Saving to database...");

            // Create enrollment page
            const { data: newPage, error: createError } = await supabase
                .from("enrollment_pages")
                .insert({
                    funnel_project_id: projectId,
                    user_id: user.id,
                    offer_id: offer.id,
                    headline: autoHeadline,
                    subheadline: autoSubheadline,
                    html_content: htmlContent,
                    theme,
                    is_published: false,
                    page_type: "direct_purchase",
                })
                .select()
                .single();

            if (createError) throw createError;

            // Log success to funnel_flows
            await supabase.from("funnel_flows").insert({
                funnel_project_id: projectId,
                user_id: user.id,
                step_number: 5,
                action: "create_enrollment_page_success",
                metadata: {
                    page_id: newPage.id,
                    offer_id: offer.id,
                },
            });

            setCreationProgress("Complete!");

            // Add to list
            setEnrollmentPages((prev) => [newPage, ...prev]);

            // Reset form
            setFormData({
                deckStructureId: deckStructures[0]?.id || "",
                offerId: offers[0]?.id || "",
                templateType: "urgency-convert",
            });
            setShowCreateForm(false);

            logger.info({ pageId: newPage.id }, "✅ Enrollment page created");

            // Show success toast with action
            toast({
                title: "Success! 🎉",
                description: "Enrollment page created successfully",
                action: (
                    <ToastAction
                        altText="Preview page"
                        onClick={() => handlePreview(newPage.id)}
                    >
                        Preview
                    </ToastAction>
                ),
            });
        } catch (error: any) {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            // Log error details
            logger.error(
                {
                    error,
                    errorMessage: error?.message,
                    errorCode: error?.code,
                    errorDetails: error?.details,
                    errorHint: error?.hint,
                    formData,
                    projectId,
                },
                "❌ Failed to create enrollment page"
            );

            // Log failure to funnel_flows
            if (user) {
                await supabase.from("funnel_flows").insert({
                    funnel_project_id: projectId,
                    user_id: user.id,
                    step_number: 5,
                    action: "create_enrollment_page_error",
                    metadata: {
                        error_message: error?.message,
                        error_code: error?.code,
                        error_details: error?.details,
                    },
                });
            }

            // Show error toast
            toast({
                variant: "destructive",
                title: "Failed to create page",
                description:
                    error?.message ||
                    "An error occurred. Please try again or contact support.",
            });
        } finally {
            setIsCreating(false);
            setCreationProgress("");
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

            if (error) throw error;

            setEnrollmentPages((prev) => prev.filter((p) => p.id !== pageId));
            logger.info({ pageId }, "Enrollment page deleted");

            toast({
                title: "Page Deleted",
                description: "Enrollment page has been removed",
            });
        } catch (error: any) {
            logger.error({ error }, "Failed to delete enrollment page");
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description:
                    error?.message || "Could not delete the page. Please try again.",
            });
        }
    };

    const handlePublishToggle = async (pageId: string, currentStatus: boolean) => {
        try {
            const supabase = createClient();
            const newStatus = !currentStatus;

            const { error } = await supabase
                .from("enrollment_pages")
                .update({ is_published: newStatus })
                .eq("id", pageId);

            if (error) throw error;

            setEnrollmentPages((prev) =>
                prev.map((p) =>
                    p.id === pageId ? { ...p, is_published: newStatus } : p
                )
            );

            logger.info(
                { pageId, isPublished: newStatus },
                "Enrollment page publish status updated"
            );

            toast({
                title: newStatus ? "Page Published" : "Page Unpublished",
                description: newStatus
                    ? "Your enrollment page is now live and visible to the public"
                    : "Your enrollment page is now in draft mode",
            });
        } catch (error: any) {
            logger.error({ error }, "Failed to update publish status");
            toast({
                variant: "destructive",
                title: "Update Failed",
                description:
                    error?.message ||
                    "Could not update publish status. Please try again.",
            });
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
                    <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-8 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Create Enrollment Page
                            </h3>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                disabled={isCreating}
                                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <TooltipProvider>
                            <div className="space-y-4">
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
                                        disabled={isCreating}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {offers.map((offer) => (
                                            <option key={offer.id} value={offer.id}>
                                                {offer.name} - {offer.currency}{" "}
                                                {offer.price.toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Page headline will be automatically generated
                                        from offer name
                                    </p>
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
                                        disabled={isCreating}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {deckStructures.map((deck) => (
                                            <option key={deck.id} value={deck.id}>
                                                {deck.metadata?.title ||
                                                    `Presentation ${deck.total_slides} slides`}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-sm text-gray-500">
                                        AI-generated testimonials from presentation
                                        content
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                                        Template Style
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                <p className="text-sm">
                                                    Choose a template that matches your
                                                    offer positioning and target
                                                    audience
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </label>
                                    <div className="space-y-3">
                                        {TEMPLATE_OPTIONS.map((template) => (
                                            <div key={template.value}>
                                                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-purple-300 hover:bg-purple-50">
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
                                                                templateType: e.target
                                                                    .value as any,
                                                            })
                                                        }
                                                        disabled={isCreating}
                                                        className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">
                                                            {template.label}
                                                        </div>
                                                        <p className="mt-1 text-sm text-gray-600">
                                                            {template.description}
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {creationProgress && (
                                    <div className="rounded-lg bg-purple-100 p-4">
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                                            <span className="text-sm font-medium text-purple-900">
                                                {creationProgress}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => setShowCreateForm(false)}
                                        disabled={isCreating}
                                        className="rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={
                                            !formData.offerId ||
                                            !formData.deckStructureId ||
                                            isCreating
                                        }
                                        className={`flex items-center gap-2 rounded-lg px-6 py-2 font-semibold ${
                                            formData.offerId &&
                                            formData.deckStructureId &&
                                            !isCreating
                                                ? "bg-purple-600 text-white hover:bg-purple-700"
                                                : "cursor-not-allowed bg-gray-300 text-gray-500"
                                        }`}
                                    >
                                        {isCreating && (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        )}
                                        {isCreating
                                            ? creationProgress || "Creating..."
                                            : "Create Enrollment Page"}
                                    </button>
                                </div>
                            </div>
                        </TooltipProvider>
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
