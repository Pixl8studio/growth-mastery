"use client";

/**
 * Business Profile Summary Card
 * Displays a persistent summary of the business profile with clickable section tiles.
 * Clicking a section opens the BusinessProfileEditModal for direct editing.
 */

import {
    Users,
    BookOpen,
    Package,
    Lightbulb,
    Target,
    ChevronRight,
    Check,
    Edit2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { BusinessProfile } from "@/types/business-profile";
import type { LucideIcon } from "lucide-react";

interface SectionConfig {
    id: string;
    title: string;
    fullTitle: string;
    icon: LucideIcon;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    hoverBorderClass: string;
    summaryFields: string[];
}

// Section configuration for dynamic rendering
const SECTION_CONFIG: SectionConfig[] = [
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
];

export { SECTION_CONFIG };

interface BusinessProfileSummaryCardProps {
    businessProfile: BusinessProfile;
    onSectionClick: (sectionId: string) => void;
}

export function BusinessProfileSummaryCard({
    businessProfile,
    onSectionClick,
}: BusinessProfileSummaryCardProps) {
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
    const getSectionSummary = (sectionConfig: SectionConfig): string | null => {
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
        if (!businessProfile.completion_status) return 0;
        return (
            businessProfile.completion_status[
                sectionId as keyof typeof businessProfile.completion_status
            ] || 0
        );
    };

    const overallCompletion = businessProfile.completion_status?.overall ?? 0;

    return (
        <Card className="overflow-hidden border-border bg-card shadow-soft">
            {/* Header */}
            <div className="border-b border-border bg-gradient-to-r from-primary/5 to-primary/10 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                            <Edit2 className="h-5 w-5 text-primary" />
                            Business Profile Summary
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Click any section below to view and edit your business
                            context
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                            {overallCompletion}%
                        </div>
                        <div className="text-sm text-muted-foreground">complete</div>
                    </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="mt-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${overallCompletion}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Section Tiles Grid */}
            <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {SECTION_CONFIG.map((section) => {
                        const completion = getSectionCompletion(section.id);
                        const summary = getSectionSummary(section);
                        const Icon = section.icon;
                        const isComplete = completion === 100;

                        return (
                            <div
                                key={section.id}
                                onClick={() => onSectionClick(section.id)}
                                className={`cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${section.borderClass} ${section.hoverBorderClass} ${
                                    isComplete ? section.bgClass : "bg-card"
                                }`}
                            >
                                {/* Section Header */}
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
                                            isComplete ? "bg-green-500" : "bg-primary"
                                        }`}
                                        style={{ width: `${completion}%` }}
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
                                    View & Edit
                                    <ChevronRight className="ml-1 h-3 w-3" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}
