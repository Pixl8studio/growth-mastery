"use client";

import * as React from "react";
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
    TOTAL_FUNNEL_STEPS,
} from "@/app/funnel-builder/master-steps-config";

interface Step {
    number: number;
    title: string;
    description: string;
}

/**
 * Step data for all 17 funnel steps
 * Organized by Master Step sections:
 * - Business Profile (1-3)
 * - Presentation Materials (4-6)
 * - Funnel Pages (7-14)
 * - Traffic Agents (15-17)
 */
const STEPS: Step[] = [
    // Business Profile (Master Step 1)
    { number: 1, title: "Define Context", description: "Business profile setup" },
    { number: 2, title: "Funnel Map", description: "Plan your funnel" },
    { number: 3, title: "Brand Design", description: "Visual identity" },
    // Presentation Materials (Master Step 2)
    { number: 4, title: "Presentation Structure", description: "AI-generated outline" },
    { number: 5, title: "Create Presentation", description: "Generate slides" },
    { number: 6, title: "Upload Video", description: "Pitch recording" },
    // Funnel Pages (Master Step 3)
    { number: 7, title: "Registration Page", description: "Lead capture" },
    { number: 8, title: "Confirmation Page", description: "Calendar booking" },
    { number: 9, title: "Watch Page", description: "Video landing" },
    { number: 10, title: "Enrollment Page", description: "AI sales copy" },
    { number: 11, title: "Call Booking Page", description: "Schedule discovery calls" },
    { number: 12, title: "Checkout Page", description: "Payment processing" },
    { number: 13, title: "Upsell Page", description: "One-time offers" },
    { number: 14, title: "Thank You Page", description: "Purchase confirmation" },
    // Traffic Agents (Master Step 4)
    { number: 15, title: "AI Follow-Up Engine", description: "Smart automation" },
    { number: 16, title: "Marketing Content Engine", description: "Social content" },
    { number: 17, title: "Meta Ads Manager", description: "Paid advertising" },
];

interface StepperNavProps {
    projectId: string;
    currentStep: number;
    completedSteps?: number[]; // Array of step numbers that have generated content
    className?: string;
    expandedMasterStep?: number | null; // Master step ID to force expand
    onMasterStepExpanded?: () => void; // Callback when force expansion is handled
}

export function StepperNav({
    projectId,
    currentStep,
    completedSteps = [],
    className,
    expandedMasterStep = null,
    onMasterStepExpanded,
}: StepperNavProps) {
    const pathname = usePathname();

    // Determine which master step should be expanded by default (current step's master)
    const currentMasterStep = getMasterStepForSubStep(currentStep);
    const defaultExpandedValue = currentMasterStep
        ? `master-${currentMasterStep.id}`
        : undefined;

    // Handle forced expansion from collapsed sidebar
    const [accordionValue, setAccordionValue] = React.useState<string[]>(
        defaultExpandedValue ? [defaultExpandedValue] : []
    );

    // When expandedMasterStep changes, collapse all others and expand only the clicked one
    React.useEffect(() => {
        if (expandedMasterStep !== null) {
            const masterStepValue = `master-${expandedMasterStep}`;
            // Replace accordion value with only the clicked section
            setAccordionValue([masterStepValue]);
            // Notify parent that expansion has been handled
            if (onMasterStepExpanded) {
                onMasterStepExpanded();
            }
        }
    }, [expandedMasterStep, onMasterStepExpanded]);

    // Calculate overall completion
    const completionPercentage = Math.round(
        (completedSteps.length / TOTAL_FUNNEL_STEPS) * 100
    );

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
                value={accordionValue}
                onValueChange={setAccordionValue}
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
                                    "px-3 py-3 hover:no-underline transition-colors",
                                    {
                                        "hover:bg-primary/10": isCurrentMaster,
                                        "hover:bg-muted/50": !isCurrentMaster,
                                    }
                                )}
                            >
                                <div className="flex items-center justify-between w-full pr-1 gap-2">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
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
                                        <div className="text-left flex-1 min-w-0 max-w-[180px]">
                                            <h3 className="text-sm font-semibold text-foreground leading-tight mb-1 line-clamp-2">
                                                {masterStep.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                                                {completion.completedCount}/
                                                {completion.totalCount} complete
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Badge */}
                                    {completion.percentage > 0 && (
                                        <span
                                            className={cn(
                                                "text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0",
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

                            <AccordionContent className="px-3 pb-3 pt-0">
                                <div className="space-y-1.5 pl-1">
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
                                                    "block rounded-md border px-2.5 py-2.5 transition-all",
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
                                                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                                        {/* Step Completion Indicator */}
                                                        {isCompleted ? (
                                                            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500 mt-0.5">
                                                                <Check className="h-3 w-3 text-white" />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className={cn(
                                                                    "h-5 w-5 flex-shrink-0 rounded-full border-2 mt-0.5",
                                                                    {
                                                                        "border-primary bg-primary/10":
                                                                            isCurrentPage,
                                                                        "border-muted-foreground/30 bg-transparent":
                                                                            !isCurrentPage,
                                                                    }
                                                                )}
                                                            />
                                                        )}

                                                        {/* Step Info */}
                                                        <div className="flex-1 min-w-0 max-w-[180px]">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <h4
                                                                    className={cn(
                                                                        "text-xs font-medium leading-tight line-clamp-2",
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
                                                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
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
