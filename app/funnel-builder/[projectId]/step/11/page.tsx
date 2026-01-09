"use client";

/**
 * Step 11: Call Booking Pages
 * Create and manage call booking pages with native scheduling
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { useIsMobile } from "@/lib/mobile-utils.client";
import {
    Calendar,
    PlusCircle,
    Eye,
    Pencil,
    Trash2,
    X,
    Loader2,
    HelpCircle,
    Sparkles,
    Check,
    Circle,
    Clock,
    Info,
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

interface DeckStructure {
    id: string;
    slides: any[];
    metadata?: {
        title?: string;
    };
    total_slides: number;
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

interface ProgressStage {
    id: string;
    label: string;
    status: "pending" | "in_progress" | "completed";
}

const GENERATION_STAGES: ProgressStage[] = [
    { id: "business", label: "Loading your business data", status: "pending" },
    { id: "offer", label: "Analyzing your offer", status: "pending" },
    { id: "brand", label: "Applying brand design", status: "pending" },
    { id: "booking", label: "Creating booking interface", status: "pending" },
    { id: "calendar", label: "Setting up calendar integration", status: "pending" },
    { id: "finalize", label: "Finalizing call booking page", status: "pending" },
];

const TEMPLATE_OPTIONS = [
    {
        value: "discovery-call",
        label: "Discovery Call",
        description:
            "Discovery-focused approach. Perfect for learning about prospects and building rapport.",
    },
    {
        value: "strategy-session",
        label: "Strategy Session",
        description:
            "Value-packed strategy session positioning. Ideal for consultants and coaches delivering upfront value.",
    },
    {
        value: "consultation",
        label: "Professional Consultation",
        description:
            "Professional consulting approach. Best for high-ticket services and expertise-based offers.",
    },
] as const;

const CALL_DURATIONS = [
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 45, label: "45 minutes" },
    { value: 60, label: "60 minutes" },
] as const;

const WEEKDAYS = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
] as const;

export default function Step11CallBookingPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const router = useRouter();
    const isMobile = useIsMobile("lg");
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);

    // Redirect mobile users to desktop-required page
    useEffect(() => {
        if (isMobile && projectId) {
            const params = new URLSearchParams({
                feature: "Call Booking Page Editor",
                description:
                    "The call booking page editor requires a desktop computer for designing and customizing booking pages with visual editing tools.",
                returnPath: `/funnel-builder/${projectId}`,
            });
            router.push(`/desktop-required?${params.toString()}`);
        }
    }, [isMobile, projectId, router]);

    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [callBookingPages, setCallBookingPages] = useState<AIEditorPage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [progressStages, setProgressStages] = useState<ProgressStage[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const [formData, setFormData] = useState({
        deckStructureId: "",
        templateType: "discovery-call" as
            | "discovery-call"
            | "strategy-session"
            | "consultation",
        callDuration: 30,
        daysAvailable: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        advanceBookingDays: 14,
        minimumNoticeHours: 24,
    });

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    // Simulate progress stages with realistic timing
    const simulateProgress = useCallback(async (): Promise<void> => {
        const stages = [...GENERATION_STAGES];
        setProgressStages(stages);

        // Timing for each stage (in ms) - total ~30-40 seconds
        const stageTiming = [
            1500, // Loading business data
            2000, // Analyzing offer
            2500, // Applying brand design
            10000, // Creating booking interface (longest - AI generation)
            8000, // Setting up calendar integration
            3000, // Finalizing page
        ];

        for (let i = 0; i < stages.length; i++) {
            // Mark current stage as in_progress
            setProgressStages((prev: ProgressStage[]) =>
                prev.map((s: ProgressStage, idx: number) => ({
                    ...s,
                    status:
                        idx < i ? "completed" : idx === i ? "in_progress" : "pending",
                }))
            );

            await new Promise((resolve) => setTimeout(resolve, stageTiming[i]));
        }

        // Mark all as completed
        setProgressStages((prev: ProgressStage[]) =>
            prev.map((s: ProgressStage) => ({ ...s, status: "completed" as const }))
        );
    }, []);

    // Handle Generate Call Booking Page
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
                    pageType: "call_booking",
                    deckId: formData.deckStructureId,
                    templateStyle: formData.templateType,
                    callDuration: formData.callDuration,
                },
                "Creating call booking page with AI editor"
            );

            const response = await fetch("/api/ai-editor/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    pageType: "call_booking",
                    deckId: formData.deckStructureId,
                    templateStyle: formData.templateType,
                    callDuration: formData.callDuration,
                    availability: {
                        daysAvailable: formData.daysAvailable,
                        advanceBookingDays: formData.advanceBookingDays,
                        minimumNoticeHours: formData.minimumNoticeHours,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || "Failed to create page");
            }

            const elapsed = Date.now() - startTime;

            // If API completed quickly (under 15 seconds), fast-forward progress
            if (elapsed < 15000) {
                setProgressStages((prev: ProgressStage[]) =>
                    prev.map((s: ProgressStage) => ({
                        ...s,
                        status: "completed" as const,
                    }))
                );
                // Small delay so user sees completion
                await new Promise((resolve) => setTimeout(resolve, 500));
            } else {
                // Otherwise wait for progress simulation to finish naturally
                await progressPromise;
            }

            logger.info({ pageId: data.pageId }, "Call booking page created");

            // Add the new page to the list
            const newPage: AIEditorPage = {
                id: data.pageId,
                title: data.title || "Call Booking Page",
                page_type: "call_booking",
                status: "draft",
                version: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setCallBookingPages((prev: AIEditorPage[]) => [newPage, ...prev]);

            // Reset form and close
            setShowCreateForm(false);
            setProgressStages([]);

            toast({
                title: "Call booking page created!",
                description: "Opening the AI Editor in a new tab...",
            });

            // Open in new tab
            window.open(`/ai-editor/${data.pageId}`, "_blank");
        } catch (error: any) {
            logger.error({ error }, "Failed to create call booking page");
            setProgressStages([]);
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
                    setFormData((prev: typeof formData) => ({
                        ...prev,
                        deckStructureId: deckData[0].id,
                    }));
                }

                // Load call booking pages from AI Editor
                const { data: pagesData, error: pagesError } = await supabase
                    .from("ai_editor_pages")
                    .select(
                        "id, title, page_type, status, version, created_at, updated_at"
                    )
                    .eq("funnel_project_id", projectId)
                    .eq("page_type", "call_booking")
                    .order("created_at", { ascending: false });

                if (pagesError) {
                    logger.warn(
                        { error: pagesError },
                        "Failed to load call booking pages"
                    );
                } else {
                    setCallBookingPages(pagesData || []);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load data");
            }
        };

        loadData();
    }, [projectId]);

    const handleEditPage = (pageId: string) => {
        window.open(`/ai-editor/${pageId}`, "_blank");
    };

    const handleToggleDayAvailable = (day: string) => {
        setFormData((prev: typeof formData) => {
            const isCurrentlySelected = prev.daysAvailable.includes(day);
            if (isCurrentlySelected) {
                // Don't allow removing all days
                if (prev.daysAvailable.length === 1) {
                    toast({
                        variant: "destructive",
                        title: "At least one day required",
                        description:
                            "You must have at least one day available for bookings.",
                    });
                    return prev;
                }
                return {
                    ...prev,
                    daysAvailable: prev.daysAvailable.filter((d: string) => d !== day),
                };
            } else {
                return {
                    ...prev,
                    daysAvailable: [...prev.daysAvailable, day],
                };
            }
        });
    };

    const hasDeckStructure = deckStructures.length > 0;
    const hasCallBookingPage = callBookingPages.length > 0;
    const canCreatePage = hasDeckStructure;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={11}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            nextDisabled={!hasCallBookingPage}
            nextLabel={
                hasCallBookingPage ? "Continue to Checkout Pages" : "Create Page First"
            }
            stepTitle="Call Booking Pages"
            stepDescription="Create a professional call booking page with native scheduling"
        >
            <div className="space-y-8">
                {/* Dependency Warning */}
                {!hasDeckStructure && (
                    <DependencyWarning
                        message="You need to create a presentation structure first."
                        requiredStep={4}
                        requiredStepName="Presentation Structure"
                        projectId={projectId}
                    />
                )}

                {/* Generate Button or Form */}
                {!showCreateForm ? (
                    <div className="rounded-lg border border-purple-100 bg-gradient-to-br from-purple-50 to-primary/5 p-8">
                        <div className="flex flex-col items-center gap-6 text-center">
                            {/* Animated Generate Button */}
                            <button
                                onClick={() => setShowCreateForm(true)}
                                disabled={!canCreatePage}
                                className={`group relative flex items-center gap-3 rounded-xl px-10 py-5 text-xl font-bold transition-all duration-300 ${
                                    canCreatePage
                                        ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02]"
                                        : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                }`}
                            >
                                {/* Glow effect */}
                                {canCreatePage && (
                                    <span className="absolute inset-0 -z-10 animate-pulse rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 opacity-50 blur-lg" />
                                )}
                                <Sparkles className="h-7 w-7" />
                                {canCreatePage
                                    ? "Generate Call Booking Page"
                                    : "Complete Prerequisites First"}
                            </button>

                            {canCreatePage && (
                                <p className="max-w-md text-sm text-muted-foreground">
                                    Create a professional call booking page with
                                    calendar integration for scheduling discovery calls
                                    and strategy sessions
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-primary/5 p-8 shadow-soft">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-foreground">
                                    Generate Call Booking Page
                                </h3>
                                {!isCreating && (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        This typically takes 30-45 seconds
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
                                <div className="rounded-lg border border-purple-200 bg-white p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-sm font-medium text-purple-900">
                                            Creating your call booking page...
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            ~30-45 seconds
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mb-6 h-2 overflow-hidden rounded-full bg-purple-100">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 transition-all duration-500"
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
                                                        ? "bg-purple-50"
                                                        : ""
                                                }`}
                                            >
                                                {stage.status === "completed" ? (
                                                    <Check className="h-5 w-5 text-green-600" />
                                                ) : stage.status === "in_progress" ? (
                                                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-gray-300" />
                                                )}
                                                <span
                                                    className={`text-sm ${
                                                        stage.status === "completed"
                                                            ? "text-green-700"
                                                            : stage.status ===
                                                                "in_progress"
                                                              ? "font-medium text-purple-900"
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
                                <div className="space-y-6">
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
                                            className="w-full rounded-lg border border-border bg-card px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {deckStructures.map((deck) => (
                                                <option key={deck.id} value={deck.id}>
                                                    {deck.metadata?.title ||
                                                        `Presentation ${deck.total_slides} slides`}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Your business and offer details for the
                                            booking page
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
                                                        your call objective and
                                                        positioning
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </label>
                                        <div className="space-y-3">
                                            {TEMPLATE_OPTIONS.map((template) => (
                                                <div key={template.value}>
                                                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-purple-300 hover:bg-purple-50">
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
                                                                        .value as any,
                                                                })
                                                            }
                                                            disabled={isCreating}
                                                            className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500"
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

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-foreground">
                                            Call Duration
                                        </label>
                                        <select
                                            value={formData.callDuration}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    callDuration: parseInt(
                                                        e.target.value
                                                    ),
                                                })
                                            }
                                            disabled={isCreating}
                                            className="w-full rounded-lg border border-border bg-card px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {CALL_DURATIONS.map((duration) => (
                                                <option
                                                    key={duration.value}
                                                    value={duration.value}
                                                >
                                                    {duration.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-foreground">
                                            Days Available
                                        </label>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                            {WEEKDAYS.map((day) => (
                                                <label
                                                    key={day.value}
                                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                                                        formData.daysAvailable.includes(
                                                            day.value
                                                        )
                                                            ? "border-purple-500 bg-purple-50"
                                                            : "border-border bg-card hover:border-purple-300"
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.daysAvailable.includes(
                                                            day.value
                                                        )}
                                                        onChange={() =>
                                                            handleToggleDayAvailable(
                                                                day.value
                                                            )
                                                        }
                                                        disabled={isCreating}
                                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                                    />
                                                    <span className="text-sm font-medium">
                                                        {day.label}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-foreground">
                                                Advance Booking Days
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={90}
                                                value={formData.advanceBookingDays}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        advanceBookingDays: parseInt(
                                                            e.target.value
                                                        ),
                                                    })
                                                }
                                                disabled={isCreating}
                                                className="w-full rounded-lg border border-border bg-card px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                How far in advance can prospects book?
                                            </p>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-foreground">
                                                Minimum Notice (hours)
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={168}
                                                value={formData.minimumNoticeHours}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        minimumNoticeHours: parseInt(
                                                            e.target.value
                                                        ),
                                                    })
                                                }
                                                disabled={isCreating}
                                                className="w-full rounded-lg border border-border bg-card px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Minimum time before a call can be booked
                                            </p>
                                        </div>
                                    </div>

                                    {/* Calendar Integration Info */}
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                                        <div className="flex items-start gap-4">
                                            <Info className="h-6 w-6 text-blue-600 flex-shrink-0" />
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-blue-900 mb-2">
                                                    Calendar Integration
                                                </h4>
                                                <p className="text-sm text-blue-800 mb-3">
                                                    Your call booking page will include
                                                    a native scheduling interface based
                                                    on your availability settings above.
                                                </p>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Clock className="h-4 w-4 text-blue-600" />
                                                        <span className="text-blue-900">
                                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 mr-2">
                                                                Coming Soon
                                                            </span>
                                                            Google Calendar Sync
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Calendar className="h-4 w-4 text-blue-600" />
                                                        <span className="text-blue-900">
                                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 mr-2">
                                                                Coming Soon
                                                            </span>
                                                            Zoom/Meet Auto-Link Creation
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-blue-700 mt-3">
                                                    For now, you'll manage bookings
                                                    manually through the dashboard.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Availability Preview */}
                                    <div>
                                        <label className="mb-3 block text-sm font-medium text-foreground">
                                            Availability Preview
                                        </label>
                                        <div className="rounded-lg border border-border bg-card p-4">
                                            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                <span>
                                                    {formData.callDuration} minute calls
                                                    available on:
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-7 gap-2">
                                                {WEEKDAYS.map((day) => (
                                                    <div
                                                        key={day.value}
                                                        className={`rounded p-2 text-center text-xs font-medium ${
                                                            formData.daysAvailable.includes(
                                                                day.value
                                                            )
                                                                ? "bg-purple-100 text-purple-900"
                                                                : "bg-gray-100 text-gray-400"
                                                        }`}
                                                    >
                                                        {day.label.slice(0, 3)}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 text-xs text-muted-foreground">
                                                Bookings allowed{" "}
                                                {formData.advanceBookingDays} days in
                                                advance with{" "}
                                                {formData.minimumNoticeHours} hour
                                                minimum notice
                                            </div>
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
                                                    ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:opacity-90"
                                                    : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                            }`}
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Generate Page
                                        </button>
                                    </div>
                                </div>
                            </TooltipProvider>
                        )}
                    </div>
                )}

                {/* Call Booking Pages List */}
                <div className="rounded-lg border border-border bg-card shadow-soft">
                    <div className="border-b border-border p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-foreground">
                                Your Call Booking Pages
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {callBookingPages.length} created
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {callBookingPages.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                                    <Calendar className="h-8 w-8 text-purple-600" />
                                </div>
                                <h4 className="mb-2 text-lg font-semibold text-foreground">
                                    No call booking pages yet
                                </h4>
                                <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                                    Create your first call booking page to start
                                    scheduling discovery calls and strategy sessions
                                </p>
                                {canCreatePage && (
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
                                    >
                                        <Sparkles className="h-5 w-5" />
                                        Generate Your First Page
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {callBookingPages.map((page) => (
                                    <div
                                        key={page.id}
                                        className="rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-purple-300 hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                    <h4 className="text-lg font-semibold text-foreground">
                                                        {page.title}
                                                    </h4>
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
                                                    {page.version && (
                                                        <span>
                                                            Version {page.version}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() =>
                                                        handleEditPage(page.id)
                                                    }
                                                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    Edit Page
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
                <div className="rounded-lg border border-primary/10 bg-primary/5 p-6">
                    <h4 className="mb-3 font-semibold text-primary">
                        Call Booking Page Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-primary">
                        <li>
                            • Use the AI Editor to customize your call booking page and
                            add qualification questions
                        </li>
                        <li>
                            • Discovery calls work best at 15-30 minutes, strategy
                            sessions at 45-60 minutes
                        </li>
                        <li>
                            • Set realistic availability to avoid last-minute bookings
                            that disrupt your schedule
                        </li>
                        <li>
                            • Your brand colors and business details are automatically
                            incorporated
                        </li>
                    </ul>
                </div>
            </div>
        </StepLayout>
    );
}
