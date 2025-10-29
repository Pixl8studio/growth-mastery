"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

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
    { number: 3, title: "Presentation Structure", description: "AI-generated outline" },
    { number: 4, title: "Create Presentation", description: "Gamma AI slides" },
    { number: 5, title: "Enrollment Page", description: "AI sales copy" },
    { number: 6, title: "Talk Track", description: "Video script" },
    { number: 7, title: "Upload Video", description: "Pitch recording" },
    { number: 8, title: "Watch Page", description: "Video landing" },
    { number: 9, title: "Registration", description: "Lead capture" },
    { number: 10, title: "Flow Setup", description: "Connect pages" },
    { number: 11, title: "AI Follow-Up", description: "Smart automation" },
    { number: 12, title: "Analytics", description: "Track performance" },
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
    const completionPercentage = Math.round((completedSteps.length / 12) * 100);

    return (
        <nav className={cn("space-y-2", className)}>
            {/* Completion Percentage */}
            <div className="mb-4 text-right">
                <span className="text-sm font-medium text-gray-600">
                    {completionPercentage}% Complete
                </span>
            </div>

            {STEPS.map((step) => {
                const isActive = step.number === currentStep;
                const isCompleted = completedSteps.includes(step.number);
                const isFuture = !isCompleted && step.number !== currentStep;
                const href = `/funnel-builder/${projectId}/step/${step.number}`;
                const isCurrentPage = pathname === href;

                return (
                    <Link
                        key={step.number}
                        href={href}
                        className={cn(
                            "group block rounded-lg border px-4 py-5 transition-all",
                            {
                                // Current page
                                "border-blue-500 bg-blue-50 shadow-sm": isCurrentPage,
                                // Active step (not on page)
                                "border-blue-300 bg-white hover:border-blue-400 hover:bg-blue-50":
                                    isActive && !isCurrentPage,
                                // Completed or future steps (all clickable!)
                                "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50":
                                    isCompleted || isFuture,
                            }
                        )}
                    >
                        {/* Step Info */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={cn(
                                            "text-xs font-medium uppercase tracking-wider",
                                            {
                                                "text-blue-600":
                                                    isCurrentPage || isActive,
                                                "text-green-600":
                                                    isCompleted && !isActive,
                                                "text-gray-500": isFuture,
                                                "text-gray-600":
                                                    !isActive &&
                                                    !isCompleted &&
                                                    !isFuture,
                                            }
                                        )}
                                    >
                                        Step {step.number}
                                    </span>
                                    {isCurrentPage && (
                                        <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
                                            Current
                                        </span>
                                    )}
                                    {isCompleted && !isCurrentPage && (
                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                            Complete
                                        </span>
                                    )}
                                </div>
                                {isCompleted && (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                                        <Check className="h-4 w-4 text-white" />
                                    </div>
                                )}
                            </div>
                            <h3 className="text-base font-semibold leading-snug text-gray-900">
                                {step.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-gray-600">
                                {step.description}
                            </p>
                        </div>
                    </Link>
                );
            })}
        </nav>
    );
}
