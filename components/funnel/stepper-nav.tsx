/**
 * Stepper Nav Component
 * Visual step indicator for funnel builder
 */

"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { FUNNEL_CONFIG } from "@/lib/config";

interface StepperNavProps {
    projectId: string;
    currentStep: number;
    completedSteps?: number[];
}

export function StepperNav({
    projectId,
    currentStep,
    completedSteps = [],
}: StepperNavProps) {
    return (
        <nav aria-label="Progress">
            <ol className="space-y-4 md:flex md:space-x-8 md:space-y-0">
                {FUNNEL_CONFIG.stepNames.map((stepName, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = completedSteps.includes(stepNumber);
                    const isCurrent = stepNumber === currentStep;
                    const isClickable = true; // All steps are clickable (unlocked)

                    return (
                        <li key={stepNumber} className="md:flex-1">
                            {isClickable ? (
                                <Link
                                    href={`/funnel-builder/${projectId}/step/${stepNumber}`}
                                    className={cn(
                                        "group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4",
                                        {
                                            "border-blue-600": isCurrent,
                                            "border-green-600":
                                                isCompleted && !isCurrent,
                                            "border-gray-200 hover:border-gray-300":
                                                !isCurrent && !isCompleted,
                                        }
                                    )}
                                >
                                    <span
                                        className={cn("text-sm font-medium", {
                                            "text-blue-600": isCurrent,
                                            "text-green-600": isCompleted && !isCurrent,
                                            "text-gray-500 group-hover:text-gray-700":
                                                !isCurrent && !isCompleted,
                                        })}
                                    >
                                        <span className="flex items-center">
                                            {isCompleted ? (
                                                <Check className="mr-2 h-5 w-5" />
                                            ) : (
                                                <span className="mr-2">
                                                    Step {stepNumber}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {stepName}
                                    </span>
                                </Link>
                            ) : (
                                <div
                                    className={cn(
                                        "flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4",
                                        {
                                            "border-blue-600": isCurrent,
                                            "border-green-600":
                                                isCompleted && !isCurrent,
                                            "border-gray-200":
                                                !isCurrent && !isCompleted,
                                        }
                                    )}
                                >
                                    <span
                                        className={cn("text-sm font-medium", {
                                            "text-blue-600": isCurrent,
                                            "text-green-600": isCompleted && !isCurrent,
                                            "text-gray-500": !isCurrent && !isCompleted,
                                        })}
                                    >
                                        <span className="flex items-center">
                                            {isCompleted ? (
                                                <Check className="mr-2 h-5 w-5" />
                                            ) : (
                                                <span className="mr-2">
                                                    Step {stepNumber}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {stepName}
                                    </span>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
