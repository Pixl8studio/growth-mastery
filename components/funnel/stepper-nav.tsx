"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Check, ChevronRight } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    MASTER_STEPS,
    getMasterStepForSubStep,
    calculateMasterStepCompletion,
} from "@/app/funnel-builder/master-steps-config";

interface Step {
    number: number;
    title: string;
    description: string;
}

const STEPS: Step[] = [
    {
        number: 1,
        title: "Intake",
        description: "Multiple input options",
    },
    { number: 2, title: "Define Offer", description: "7 P's framework" },
    { number: 3, title: "Brand Design", description: "Visual identity" },
    { number: 4, title: "Presentation Structure", description: "AI-generated outline" },
    { number: 5, title: "Create Presentation", description: "Gamma AI slides" },
    { number: 6, title: "Enrollment Page", description: "AI sales copy" },
    { number: 7, title: "Talk Track", description: "Video script" },
    { number: 8, title: "Upload Video", description: "Pitch recording" },
    { number: 9, title: "Watch Page", description: "Video landing" },
    { number: 10, title: "Registration", description: "Lead capture" },
    { number: 11, title: "Flow Setup", description: "Connect pages" },
    { number: 12, title: "AI Follow-Up", description: "Smart automation" },
    { number: 13, title: "Marketing Content", description: "Social content engine" },
    { number: 14, title: "Ads Manager", description: "Meta/Instagram ads" },
    { number: 15, title: "Analytics", description: "Track performance" },
];

interface StepperNavProps {
    projectId: string;
    currentStep: number;
    completedSteps?: number[]; // Array of step numbers that have generated content
    className?: string;
}

export function StepperNav({
    projectId,
    currentStep,
    completedSteps = [],
    className,
}: StepperNavProps) {
    const pathname = usePathname();

    // Determine which master step should be expanded by default (current step's master)
    const currentMasterStep = getMasterStepForSubStep(currentStep);
    const defaultExpandedValue = currentMasterStep
        ? `master-${currentMasterStep.id}`
        : undefined;

    // Calculate overall completion
    const totalSteps = 15;
    const completionPercentage = Math.round((completedSteps.length / totalSteps) * 100);

    return (
        <nav className={cn("space-y-2", className)}>
            {/* Completion Percentage */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                        Overall Progress
                    </span>
                    <span className="text-sm font-bold text-primary">
                        {completionPercentage}%
                    </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                    />
                </div>
            </div>

            {/* Master Steps Accordion */}
            <Accordion
                type="multiple"
                defaultValue={defaultExpandedValue ? [defaultExpandedValue] : []}
                className="space-y-2"
            >
                {MASTER_STEPS.map((masterStep) => {
                    const completion = calculateMasterStepCompletion(
                        masterStep,
                        completedSteps
                    );
                    const isCurrentMaster = currentMasterStep?.id === masterStep.id;

                    return (
                        <AccordionItem
                            key={masterStep.id}
                            value={`master-${masterStep.id}`}
                            className={cn("border rounded-lg transition-all", {
                                "border-primary bg-primary/5": isCurrentMaster,
                                "border-border bg-card": !isCurrentMaster,
                            })}
                        >
                            <AccordionTrigger
                                className={cn(
                                    "px-4 py-3 hover:no-underline transition-colors",
                                    {
                                        "hover:bg-primary/10": isCurrentMaster,
                                        "hover:bg-muted/50": !isCurrentMaster,
                                    }
                                )}
                            >
                                <div className="flex items-center justify-between w-full pr-2">
                                    <div className="flex items-center gap-3">
                                        {/* Completion Indicator */}
                                        {completion.isFullyComplete ? (
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
                                                <Check className="h-5 w-5 text-white" />
                                            </div>
                                        ) : completion.isPartiallyComplete ? (
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 border-2 border-primary">
                                                <span className="text-xs font-bold text-primary">
                                                    {completion.completedCount}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted border-2 border-border">
                                                <span className="text-xs font-bold text-muted-foreground">
                                                    {masterStep.id}
                                                </span>
                                            </div>
                                        )}

                                        {/* Master Step Info */}
                                        <div className="text-left">
                                            <h3 className="text-sm font-semibold text-foreground leading-none mb-1">
                                                {masterStep.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {completion.completedCount}/
                                                {completion.totalCount} complete
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Badge */}
                                    {completion.percentage > 0 && (
                                        <span
                                            className={cn(
                                                "text-xs font-medium px-2 py-1 rounded-full",
                                                {
                                                    "bg-green-100 text-green-700":
                                                        completion.isFullyComplete,
                                                    "bg-primary/20 text-primary":
                                                        completion.isPartiallyComplete,
                                                }
                                            )}
                                        >
                                            {completion.percentage}%
                                        </span>
                                    )}
                                </div>
                            </AccordionTrigger>

                            <AccordionContent className="px-4 pb-3 pt-0">
                                <div className="space-y-2 pl-2">
                                    {masterStep.subSteps.map((stepNumber) => {
                                        const step = STEPS.find(
                                            (s) => s.number === stepNumber
                                        );
                                        if (!step) return null;

                                        const isActive = step.number === currentStep;
                                        const isCompleted = completedSteps.includes(
                                            step.number
                                        );
                                        const href = `/funnel-builder/${projectId}/step/${step.number}`;
                                        const isCurrentPage = pathname === href;

                                        return (
                                            <Link
                                                key={step.number}
                                                href={href}
                                                className={cn(
                                                    "block rounded-md border px-3 py-3 transition-all",
                                                    {
                                                        // Current page
                                                        "border-primary bg-primary/10 shadow-sm":
                                                            isCurrentPage,
                                                        // Active step (not on page)
                                                        "border-primary/30 bg-card hover:border-primary/40 hover:bg-primary/5":
                                                            isActive && !isCurrentPage,
                                                        // Completed or future steps
                                                        "border-border bg-card hover:border-border hover:bg-muted/50":
                                                            !isActive,
                                                    }
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                                        {/* Step Number/Check */}
                                                        {isCompleted ? (
                                                            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500 mt-0.5">
                                                                <Check className="h-3 w-3 text-white" />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className={cn(
                                                                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium mt-0.5",
                                                                    {
                                                                        "bg-primary text-white":
                                                                            isCurrentPage,
                                                                        "bg-muted text-muted-foreground":
                                                                            !isCurrentPage,
                                                                    }
                                                                )}
                                                            >
                                                                {step.number}
                                                            </div>
                                                        )}

                                                        {/* Step Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                <h4
                                                                    className={cn(
                                                                        "text-xs font-medium leading-none truncate",
                                                                        {
                                                                            "text-foreground":
                                                                                isCurrentPage ||
                                                                                isActive,
                                                                            "text-foreground/80":
                                                                                !isActive &&
                                                                                !isCompleted,
                                                                        }
                                                                    )}
                                                                >
                                                                    {step.title}
                                                                </h4>
                                                                {isCurrentPage && (
                                                                    <span className="text-xs font-medium text-primary flex-shrink-0">
                                                                        •
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground leading-snug">
                                                                {step.description}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Arrow for current step */}
                                                    {isCurrentPage && (
                                                        <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </nav>
    );
}
