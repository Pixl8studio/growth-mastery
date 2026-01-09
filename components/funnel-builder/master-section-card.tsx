"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Check,
    ChevronDown,
    ChevronRight,
    Building2,
    Presentation,
    Layout,
    Users,
    BarChart3,
} from "lucide-react";
import type { MasterStepCompletion } from "@/app/funnel-builder/completion-types";
import {
    getMasterStepById,
    getFirstIncompleteSubStep,
} from "@/app/funnel-builder/master-steps-config";
import { ComingSoonBadge } from "@/components/ui/coming-soon-overlay";

// Marketing Content Engine (step 16) is coming soon
const COMING_SOON_STEPS = [16];

interface MasterSectionCardProps {
    masterStepId: number;
    completion: MasterStepCompletion;
    completedSubSteps: number[];
    projectId: string;
    subStepDetails: Array<{
        number: number;
        title: string;
        description: string;
    }>;
}

const ICON_MAP = {
    1: Building2,
    2: Presentation,
    3: Layout,
    4: Users,
    5: BarChart3,
};

/**
 * Step data for all 17 funnel steps
 * Organized by Master Step sections:
 * - Business Profile (1-3)
 * - Presentation Materials (4-6)
 * - Funnel Pages (7-14)
 * - Traffic Agents (15-17)
 */
const STEPS_DATA = [
    // Business Profile (Master Step 1)
    { number: 1, title: "Define Context", description: "Multiple input options" },
    { number: 2, title: "Funnel Map", description: "Plan your funnel" },
    { number: 3, title: "Brand Design", description: "Visual identity" },
    // Presentation Materials (Master Step 2)
    { number: 4, title: "Presentation Structure", description: "AI-generated outline" },
    { number: 5, title: "Create Presentation", description: "Generate slides" },
    { number: 6, title: "Upload Video", description: "Pitch recording" },
    // Funnel Pages (Master Step 3)
    { number: 7, title: "Registration Pages", description: "Lead capture" },
    { number: 8, title: "Confirmation Pages", description: "Calendar booking" },
    { number: 9, title: "Watch Pages", description: "Video landing" },
    { number: 10, title: "Enrollment Pages", description: "AI sales copy" },
    {
        number: 11,
        title: "Call Booking Pages",
        description: "Schedule discovery calls",
    },
    { number: 12, title: "Checkout Pages", description: "Payment processing" },
    { number: 13, title: "Upsell Pages", description: "One-time offers" },
    { number: 14, title: "Thank You Pages", description: "Purchase confirmation" },
    // Traffic Agents (Master Step 4)
    { number: 15, title: "AI Follow-Up Engine", description: "Smart automation" },
    { number: 16, title: "Marketing Content Engine", description: "Social content" },
    { number: 17, title: "Meta Ads Manager", description: "Paid advertising" },
];

export function MasterSectionCard({
    masterStepId,
    completion,
    completedSubSteps,
    projectId,
}: MasterSectionCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const masterStep = getMasterStepById(masterStepId);

    if (!masterStep) return null;

    const Icon = ICON_MAP[masterStepId as keyof typeof ICON_MAP] || Building2;
    const firstIncompleteStep = getFirstIncompleteSubStep(
        masterStep,
        completedSubSteps
    );
    const navigationHref = `/funnel-builder/${projectId}/step/${firstIncompleteStep}`;

    const subStepDetails = masterStep.subSteps
        .map((stepNum) => STEPS_DATA.find((s) => s.number === stepNum))
        .filter((step): step is NonNullable<typeof step> => step !== undefined);

    return (
        <Card
            className={cn("transition-all hover:shadow-lg border-2", {
                "border-green-500/50 bg-green-50/50": completion.isFullyComplete,
                "border-primary/50 bg-primary/5": completion.isPartiallyComplete,
                "border-border bg-card":
                    !completion.isFullyComplete && !completion.isPartiallyComplete,
            })}
        >
            <CardContent className="p-6">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                        {/* Icon */}
                        <div
                            className={cn(
                                "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg",
                                {
                                    "bg-green-500": completion.isFullyComplete,
                                    "bg-primary": completion.isPartiallyComplete,
                                    "bg-muted":
                                        !completion.isFullyComplete &&
                                        !completion.isPartiallyComplete,
                                }
                            )}
                        >
                            {completion.isFullyComplete ? (
                                <Check className="h-6 w-6 text-white" />
                            ) : (
                                <Icon
                                    className={cn("h-6 w-6", {
                                        "text-white": completion.isPartiallyComplete,
                                        "text-muted-foreground":
                                            !completion.isPartiallyComplete,
                                    })}
                                />
                            )}
                        </div>

                        {/* Title and Description */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-semibold text-foreground">
                                    {masterStep.title}
                                </h3>
                                <Badge
                                    variant={
                                        completion.isFullyComplete
                                            ? "default"
                                            : completion.isPartiallyComplete
                                              ? "secondary"
                                              : "outline"
                                    }
                                    className={cn({
                                        "bg-green-500": completion.isFullyComplete,
                                    })}
                                >
                                    {completion.isFullyComplete
                                        ? "Complete"
                                        : completion.isPartiallyComplete
                                          ? "In Progress"
                                          : "Not Started"}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                                {masterStep.description}
                            </p>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-foreground">
                                    {completion.completedCount}/{completion.totalCount}{" "}
                                    steps
                                </span>
                                <div className="h-2 flex-1 max-w-[200px] bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-300",
                                            {
                                                "bg-green-500":
                                                    completion.isFullyComplete,
                                                "bg-primary":
                                                    completion.isPartiallyComplete,
                                            }
                                        )}
                                        style={{ width: `${completion.percentage}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold text-primary">
                                    {completion.percentage}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    <Link href={navigationHref} className="flex-1">
                        <button className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90">
                            {completion.isFullyComplete
                                ? "Review Steps"
                                : completion.isPartiallyComplete
                                  ? "Continue"
                                  : "Get Started"}
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </button>
                    </Link>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                    >
                        {isExpanded ? "Hide" : "Show"} Details
                        <ChevronDown
                            className={cn("ml-2 h-4 w-4 transition-transform", {
                                "rotate-180": isExpanded,
                            })}
                        />
                    </button>
                </div>

                {/* Expandable Sub-Steps List */}
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                        {subStepDetails.map((step) => {
                            const isCompleted = completedSubSteps.includes(step.number);
                            const isComingSoon = COMING_SOON_STEPS.includes(
                                step.number
                            );
                            const stepHref = `/funnel-builder/${projectId}/step/${step.number}`;

                            const stepContent = (
                                <div className="flex items-start gap-3">
                                    {isCompleted ? (
                                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500 mt-0.5">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    ) : (
                                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground mt-0.5">
                                            {step.number}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="text-sm font-medium text-foreground">
                                                {step.title}
                                            </h4>
                                            {isComingSoon && (
                                                <ComingSoonBadge size="sm" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {step.description}
                                        </p>
                                    </div>
                                    {!isComingSoon && (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    )}
                                </div>
                            );

                            // Coming soon steps are not clickable
                            if (isComingSoon) {
                                return (
                                    <div
                                        key={step.number}
                                        className="block rounded-md border border-border bg-card/50 p-3 opacity-70 cursor-not-allowed"
                                    >
                                        {stepContent}
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={step.number}
                                    href={stepHref}
                                    className="block rounded-md border border-border bg-card p-3 transition-all hover:border-primary/50 hover:bg-primary/5"
                                >
                                    {stepContent}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
