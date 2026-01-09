/**
 * Horizontal Progress Component
 *
 * Compact horizontal view of funnel steps with checkmarks and progress indicators.
 * Takes up minimal space while providing clear visual progress tracking.
 */

"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
    number: number;
    title: string;
    shortTitle: string;
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
    { number: 1, title: "Define Context", shortTitle: "Context" },
    { number: 2, title: "Funnel Map", shortTitle: "Map" },
    { number: 3, title: "Brand Design", shortTitle: "Brand" },
    // Presentation Materials (Master Step 2)
    { number: 4, title: "Presentation Structure", shortTitle: "Structure" },
    { number: 5, title: "Create Presentation", shortTitle: "Slides" },
    { number: 6, title: "Upload Video", shortTitle: "Video" },
    // Funnel Pages (Master Step 3)
    { number: 7, title: "Registration Pages", shortTitle: "Register" },
    { number: 8, title: "Confirmation Pages", shortTitle: "Confirm" },
    { number: 9, title: "Watch Pages", shortTitle: "Watch" },
    { number: 10, title: "Enrollment Pages", shortTitle: "Enroll" },
    { number: 11, title: "Call Booking Pages", shortTitle: "Booking" },
    { number: 12, title: "Checkout Pages", shortTitle: "Checkout" },
    { number: 13, title: "Upsell Pages", shortTitle: "Upsell" },
    { number: 14, title: "Thank You Pages", shortTitle: "Thanks" },
    // Traffic Agents (Master Step 4)
    { number: 15, title: "AI Follow-Up Engine", shortTitle: "Follow-Up" },
    { number: 16, title: "Marketing Content Engine", shortTitle: "Content" },
    { number: 17, title: "Meta Ads Manager", shortTitle: "Ads" },
];

interface HorizontalProgressProps {
    projectId: string;
    currentStep: number;
    completedSteps: number[];
    className?: string;
}

export function HorizontalProgress({
    projectId,
    currentStep,
    completedSteps,
    className,
}: HorizontalProgressProps) {
    const completionPercentage = Math.round(
        (completedSteps.length / STEPS.length) * 100
    );

    return (
        <div className={cn("space-y-4", className)}>
            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Funnel Progress</span>
                    <span className="font-bold text-primary">
                        {completionPercentage}%
                    </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-500"
                        style={{ width: `${completionPercentage}%` }}
                    />
                </div>
            </div>

            {/* Horizontal Steps */}
            <div className="relative">
                {/* Connection Line */}
                <div className="absolute left-0 right-0 top-6 h-0.5 bg-gray-200" />

                {/* Steps Grid */}
                <div className="relative flex justify-between gap-2">
                    {STEPS.map((step) => {
                        const isCompleted = completedSteps.includes(step.number);
                        const isActive = step.number === currentStep;
                        const href = `/funnel-builder/${projectId}/step/${step.number}`;

                        return (
                            <Link
                                key={step.number}
                                href={href}
                                className="group flex flex-col items-center"
                                title={step.title}
                            >
                                {/* Step Circle */}
                                <div
                                    className={cn(
                                        "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all",
                                        {
                                            // Completed
                                            "border-green-500 bg-green-500 shadow-md":
                                                isCompleted,
                                            // Active (current step)
                                            "border-primary bg-primary/50 shadow-lg ring-4 ring-primary/10":
                                                isActive,
                                            // Future/Incomplete
                                            "border-border bg-card hover:border-primary/40 hover:bg-primary/5":
                                                !isCompleted && !isActive,
                                        }
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="h-6 w-6 text-white" />
                                    ) : (
                                        <span
                                            className={cn("text-sm font-bold", {
                                                "text-white": isActive,
                                                "text-muted-foreground group-hover:text-primary":
                                                    !isActive,
                                            })}
                                        >
                                            {step.number}
                                        </span>
                                    )}
                                </div>

                                {/* Step Label */}
                                <div className="mt-2 text-center">
                                    <div
                                        className={cn(
                                            "text-xs font-medium leading-tight",
                                            {
                                                "text-green-700": isCompleted,
                                                "text-primary": isActive,
                                                "text-muted-foreground group-hover:text-primary":
                                                    !isCompleted && !isActive,
                                            }
                                        )}
                                    >
                                        {step.shortTitle}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Step Count Summary */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span>{completedSteps.length} completed</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-primary bg-primary/50" />
                    <span>1 active</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-border bg-card" />
                    <span>{STEPS.length - completedSteps.length - 1} remaining</span>
                </div>
            </div>
        </div>
    );
}
