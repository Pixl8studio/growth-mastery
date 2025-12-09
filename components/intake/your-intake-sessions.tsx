"use client";

import {
    Phone,
    Upload,
    FileText,
    Globe,
    Cloud,
    MessageSquare,
    Users,
    BookOpen,
    Package,
    Lightbulb,
    Target,
    ChevronRight,
    Check,
} from "lucide-react";
import type { BusinessProfile } from "@/types/business-profile";

interface IntakeSession {
    id: string;
    session_name?: string;
    created_at: string;
    intake_method: string;
    call_status: string;
}

interface YourIntakeSessionsProps {
    sessions: IntakeSession[];
    businessProfile?: BusinessProfile | null;
    onSessionClick?: (session: IntakeSession) => void;
    onSectionClick?: (sectionId: string) => void;
}

// Section configuration for dynamic rendering
const SECTION_CONFIG = [
    {
        id: "section1",
        title: "Customer",
        fullTitle: "Ideal Customer & Core Problem",
        icon: Users,
        colorClass: "text-blue-600",
        bgClass: "bg-blue-50",
        borderClass: "border-blue-200",
        hoverBorderClass: "hover:border-blue-300",
        summaryFields: ["ideal_customer", "transformation", "perceived_problem"],
    },
    {
        id: "section2",
        title: "Story",
        fullTitle: "Your Story & Signature Method",
        icon: BookOpen,
        colorClass: "text-purple-600",
        bgClass: "bg-purple-50",
        borderClass: "border-purple-200",
        hoverBorderClass: "hover:border-purple-300",
        summaryFields: ["struggle_story", "breakthrough_moment", "signature_method"],
    },
    {
        id: "section3",
        title: "Offer",
        fullTitle: "Your Offer & Proof",
        icon: Package,
        colorClass: "text-green-600",
        bgClass: "bg-green-50",
        borderClass: "border-green-200",
        hoverBorderClass: "hover:border-green-300",
        summaryFields: ["offer_name", "offer_type", "promise_outcome"],
    },
    {
        id: "section4",
        title: "Beliefs",
        fullTitle: "Teaching Content (Belief Shifts)",
        icon: Lightbulb,
        colorClass: "text-amber-600",
        bgClass: "bg-amber-50",
        borderClass: "border-amber-200",
        hoverBorderClass: "hover:border-amber-300",
        summaryFields: [
            "vehicle_belief_shift.new_model",
            "internal_belief_shift.limiting_belief",
            "external_belief_shift.external_obstacles",
        ],
    },
    {
        id: "section5",
        title: "CTA",
        fullTitle: "Call to Action & Objections",
        icon: Target,
        colorClass: "text-rose-600",
        bgClass: "bg-rose-50",
        borderClass: "border-rose-200",
        hoverBorderClass: "hover:border-rose-300",
        summaryFields: ["call_to_action", "incentive", "top_objections"],
    },
] as const;

export function YourIntakeSessions({
    sessions,
    businessProfile,
    onSessionClick,
    onSectionClick,
}: YourIntakeSessionsProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const getMethodIcon = (method: string) => {
        switch (method) {
            case "voice":
                return <Phone className="h-4 w-4" />;
            case "upload":
                return <Upload className="h-4 w-4" />;
            case "paste":
                return <FileText className="h-4 w-4" />;
            case "scrape":
                return <Globe className="h-4 w-4" />;
            case "google_drive":
                return <Cloud className="h-4 w-4" />;
            default:
                return <MessageSquare className="h-4 w-4" />;
        }
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case "voice":
                return "Voice Call";
            case "upload":
                return "Document Upload";
            case "paste":
                return "Pasted Content";
            case "scrape":
                return "Web Scraping";
            case "google_drive":
                return "Google Drive";
            case "wizard":
                return "Guided Wizard";
            case "gpt_paste":
                return "GPT Response";
            default:
                return "Unknown";
        }
    };

    // Get a value from the profile using dot notation (e.g., "vehicle_belief_shift.new_model")
    const getNestedValue = (
        obj: Record<string, unknown>,
        path: string
    ): string | null => {
        const keys = path.split(".");
        let current: unknown = obj;
        for (const key of keys) {
            if (current && typeof current === "object" && key in current) {
                current = (current as Record<string, unknown>)[key];
            } else {
                return null;
            }
        }
        if (typeof current === "string") {
            return current;
        }
        if (Array.isArray(current) && current.length > 0) {
            // For arrays like top_objections, return count info
            return `${current.length} item${current.length !== 1 ? "s" : ""}`;
        }
        return null;
    };

    // Get a summary preview for a section
    const getSectionSummary = (
        sectionConfig: (typeof SECTION_CONFIG)[number]
    ): string | null => {
        if (!businessProfile) return null;

        for (const field of sectionConfig.summaryFields) {
            const value = getNestedValue(
                businessProfile as unknown as Record<string, unknown>,
                field
            );
            if (value) {
                // Truncate long values
                return value.length > 80 ? `${value.slice(0, 80)}...` : value;
            }
        }
        return null;
    };

    // Get completion percentage for a section
    const getSectionCompletion = (sectionId: string): number => {
        if (!businessProfile?.completion_status) return 0;
        return (
            businessProfile.completion_status[
                sectionId as keyof typeof businessProfile.completion_status
            ] || 0
        );
    };

    // Check if business profile has any data
    const hasBusinessProfileData =
        businessProfile &&
        businessProfile.completion_status &&
        businessProfile.completion_status.overall > 0;

    // Check if there's no data at all
    const hasNoData = sessions.length === 0 && !hasBusinessProfileData;

    return (
        <div className="rounded-lg border border-border bg-card shadow-soft">
            <div className="border-b border-border p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-foreground">
                        Your Intake Sessions
                    </h3>
                    {hasBusinessProfileData && (
                        <span className="text-sm text-muted-foreground">
                            {businessProfile.completion_status.overall}% complete
                        </span>
                    )}
                </div>
                {hasBusinessProfileData && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        Click any section below to view and edit your business context
                    </p>
                )}
            </div>

            <div className="p-6">
                {hasNoData ? (
                    <div className="py-12 text-center text-muted-foreground">
                        <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>
                            No intake sessions yet. Complete one above to get started!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Business Profile Section Cards */}
                        {hasBusinessProfileData && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground">
                                    Business Profile Sections
                                </h4>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {SECTION_CONFIG.map((section) => {
                                        const completion = getSectionCompletion(
                                            section.id
                                        );
                                        const summary = getSectionSummary(section);
                                        const Icon = section.icon;
                                        const isComplete = completion === 100;

                                        return (
                                            <div
                                                key={section.id}
                                                onClick={() =>
                                                    onSectionClick?.(section.id)
                                                }
                                                className={`cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${section.borderClass} ${section.hoverBorderClass} ${
                                                    isComplete
                                                        ? section.bgClass
                                                        : "bg-card"
                                                }`}
                                            >
                                                <div className="mb-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`flex h-8 w-8 items-center justify-center rounded-full ${section.bgClass}`}
                                                        >
                                                            <Icon
                                                                className={`h-4 w-4 ${section.colorClass}`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-semibold text-foreground">
                                                                {section.title}
                                                            </h5>
                                                        </div>
                                                    </div>
                                                    {isComplete ? (
                                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                                                            <Check className="h-3 w-3 text-green-600" />
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            {completion}%
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Progress bar */}
                                                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            isComplete
                                                                ? "bg-green-500"
                                                                : "bg-primary"
                                                        }`}
                                                        style={{
                                                            width: `${completion}%`,
                                                        }}
                                                    />
                                                </div>

                                                {/* Summary preview */}
                                                {summary ? (
                                                    <p className="line-clamp-2 text-sm text-muted-foreground">
                                                        {summary}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm italic text-muted-foreground/60">
                                                        Not yet completed
                                                    </p>
                                                )}

                                                {/* View details link */}
                                                <div className="mt-3 flex items-center text-xs font-medium text-primary">
                                                    View details
                                                    <ChevronRight className="ml-1 h-3 w-3" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Intake Sessions List */}
                        {sessions.length > 0 && (
                            <div className="space-y-4">
                                {hasBusinessProfileData && (
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                        Session History
                                    </h4>
                                )}
                                <div className="space-y-3">
                                    {sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            onClick={() => onSessionClick?.(session)}
                                            className="cursor-pointer rounded-lg border border-border bg-muted/30 p-4 transition-all hover:border-green-300 hover:bg-muted/50 hover:shadow-sm"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                                                            session.call_status ===
                                                            "completed"
                                                                ? "bg-green-500"
                                                                : session.call_status ===
                                                                    "in_progress"
                                                                  ? "bg-primary/50"
                                                                  : "bg-red-500"
                                                        }`}
                                                    />
                                                    <span className="font-medium text-foreground">
                                                        {session.session_name ||
                                                            formatDate(
                                                                session.created_at
                                                            )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1.5">
                                                        {getMethodIcon(
                                                            session.intake_method ||
                                                                "voice"
                                                        )}
                                                        {getMethodLabel(
                                                            session.intake_method ||
                                                                "voice"
                                                        )}
                                                    </span>
                                                    <span className="text-xs">
                                                        {formatDate(session.created_at)}
                                                    </span>
                                                    <ChevronRight className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
