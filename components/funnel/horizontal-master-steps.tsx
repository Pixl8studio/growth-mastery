/**
 * Horizontal Master Steps Component
 *
 * Elegant horizontal navigation showing all 5 master funnel sections.
 * Optimized for desktop with expandable sub-step details.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
    MASTER_STEPS,
} from "@/app/funnel-builder/master-steps-config";
import { ComingSoonBadge } from "@/components/ui/coming-soon-overlay";

// Traffic Agent steps (12, 13) are coming soon
const COMING_SOON_STEPS = [12, 13];

interface HorizontalMasterStepsProps {
    projectId: string;
    masterStepCompletions: MasterStepCompletion[];
    completedSubSteps: number[];
}

const ICON_MAP = {
    1: Building2,
    2: Presentation,
    3: Layout,
    4: Users,
    5: BarChart3,
};

const STEPS_DATA = [
    { number: 1, title: "Intake", description: "Multiple input options" },
    { number: 2, title: "Funnel Map", description: "Plan your funnel" },
    { number: 3, title: "Brand Design", description: "Visual identity" },
    { number: 4, title: "Presentation Structure", description: "AI-generated outline" },
    { number: 5, title: "Create Presentation", description: "Generate Slides" },
    { number: 6, title: "Upload Video", description: "Pitch recording" },
    { number: 7, title: "Enrollment Page", description: "AI sales copy" },
    { number: 8, title: "Watch Page", description: "Video landing" },
    { number: 9, title: "Registration", description: "Lead capture" },
    { number: 10, title: "Flow Setup", description: "Connect pages" },
    { number: 11, title: "AI Follow-Up", description: "Smart automation" },
    { number: 12, title: "Marketing Content", description: "Social content engine" },
    { number: 13, title: "Ads Manager", description: "Meta/Instagram ads" },
];

export function HorizontalMasterSteps({
    projectId,
    masterStepCompletions,
    completedSubSteps,
}: HorizontalMasterStepsProps) {
    const [expandedStep, setExpandedStep] = useState<number | null>(null);

    const toggleExpanded = (stepId: number) => {
        setExpandedStep(expandedStep === stepId ? null : stepId);
    };

    return (
        <div className="space-y-4">
            {/* Horizontal Master Steps Card */}
            <Card>
                <CardContent className="pt-6">
                    {/* Horizontal Master Steps Row */}
                    <div className="flex items-start justify-between gap-4">
                        {MASTER_STEPS.map((masterStep, index) => {
                            const completion = masterStepCompletions.find(
                                (c) => c.masterStepId === masterStep.id
                            );
                            if (!completion) return null;

                            const Icon =
                                ICON_MAP[masterStep.id as keyof typeof ICON_MAP] ||
                                Building2;
                            const isExpanded = expandedStep === masterStep.id;
                            const isLastStep = index === MASTER_STEPS.length - 1;

                            return (
                                <div
                                    key={masterStep.id}
                                    className="flex items-start flex-1"
                                >
                                    {/* Master Step Button */}
                                    <div className="flex flex-col items-center flex-1">
                                        <button
                                            onClick={() =>
                                                toggleExpanded(masterStep.id)
                                            }
                                            className={cn(
                                                "group relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover:bg-muted/50 w-full",
                                                {
                                                    "bg-primary/5": isExpanded,
                                                }
                                            )}
                                        >
                                            {/* Icon Circle */}
                                            <div
                                                className={cn(
                                                    "relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full transition-all",
                                                    {
                                                        "bg-green-500 shadow-lg":
                                                            completion.isFullyComplete,
                                                        "bg-primary shadow-md":
                                                            completion.isPartiallyComplete,
                                                        "bg-muted border-2 border-border":
                                                            !completion.isFullyComplete &&
                                                            !completion.isPartiallyComplete,
                                                    }
                                                )}
                                            >
                                                {completion.isFullyComplete ? (
                                                    <Check className="h-8 w-8 text-white" />
                                                ) : completion.isPartiallyComplete ? (
                                                    <div className="flex flex-col items-center">
                                                        <Icon className="h-6 w-6 text-white" />
                                                        <span className="text-[10px] font-bold text-white mt-0.5">
                                                            {completion.completedCount}/
                                                            {completion.totalCount}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Icon className="h-7 w-7 text-muted-foreground" />
                                                )}

                                                {/* Percentage Badge */}
                                                {completion.percentage > 0 && (
                                                    <div
                                                        className={cn(
                                                            "absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                                                            {
                                                                "bg-green-600 text-white":
                                                                    completion.isFullyComplete,
                                                                "bg-primary text-white":
                                                                    completion.isPartiallyComplete,
                                                            }
                                                        )}
                                                    >
                                                        {completion.percentage}%
                                                    </div>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <div className="text-center">
                                                <h3 className="text-sm font-semibold text-foreground leading-tight mb-1">
                                                    {masterStep.title}
                                                </h3>
                                                <p className="text-xs text-muted-foreground leading-tight">
                                                    {completion.completedCount}/
                                                    {completion.totalCount} complete
                                                </p>
                                            </div>

                                            {/* Expand Indicator */}
                                            <ChevronDown
                                                className={cn(
                                                    "h-4 w-4 text-muted-foreground transition-transform",
                                                    {
                                                        "rotate-180": isExpanded,
                                                    }
                                                )}
                                            />
                                        </button>
                                    </div>

                                    {/* Connecting Line (not shown after last step) */}
                                    {!isLastStep && (
                                        <div className="flex items-center pt-8 px-2">
                                            <div className="h-0.5 w-full bg-border" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Expanded Sub-Steps Panel */}
            {expandedStep !== null && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    {(() => {
                        const masterStep = getMasterStepById(expandedStep);
                        if (!masterStep) return null;

                        const subStepDetails = masterStep.subSteps
                            .map((stepNum) =>
                                STEPS_DATA.find((s) => s.number === stepNum)
                            )
                            .filter(
                                (step): step is NonNullable<typeof step> =>
                                    step !== undefined
                            );

                        return (
                            <div className="rounded-lg border-2 border-primary/20 bg-card p-6 shadow-lg">
                                <div className="mb-4 flex items-center justify-between">
                                    <h4 className="text-lg font-semibold text-foreground">
                                        {masterStep.title} - Steps
                                    </h4>
                                    <button
                                        onClick={() => setExpandedStep(null)}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Collapse
                                    </button>
                                </div>

                                {/* Sub-Steps Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {subStepDetails.map((step) => {
                                        const isCompleted = completedSubSteps.includes(
                                            step.number
                                        );
                                        const isComingSoon = COMING_SOON_STEPS.includes(
                                            step.number
                                        );
                                        const stepHref = `/funnel-builder/${projectId}/step/${step.number}`;

                                        const cardContent = (
                                            <div className="flex items-start gap-3">
                                                {/* Step Number/Check */}
                                                {isCompleted ? (
                                                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
                                                        <Check className="h-4 w-4 text-white" />
                                                    </div>
                                                ) : (
                                                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                                        {step.number}
                                                    </div>
                                                )}

                                                {/* Step Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h5 className="text-sm font-medium text-foreground leading-tight">
                                                            {step.title}
                                                        </h5>
                                                        {isComingSoon ? (
                                                            <ComingSoonBadge size="sm" />
                                                        ) : (
                                                            <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground leading-snug">
                                                        {step.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );

                                        // Coming soon steps are not clickable
                                        if (isComingSoon) {
                                            return (
                                                <div
                                                    key={step.number}
                                                    className="block rounded-md border border-border bg-card/50 p-4 opacity-70 cursor-not-allowed"
                                                >
                                                    {cardContent}
                                                </div>
                                            );
                                        }

                                        return (
                                            <Link
                                                key={step.number}
                                                href={stepHref}
                                                className="block rounded-md border border-border bg-card p-4 transition-all hover:border-primary hover:bg-primary/5 hover:shadow-md"
                                            >
                                                {cardContent}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
