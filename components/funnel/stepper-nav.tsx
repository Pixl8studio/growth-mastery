"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Step {
    number: number;
    title: string;
    description: string;
    icon: string;
}

const STEPS: Step[] = [
    {
        number: 1,
        title: "AI Intake Call",
        description: "Voice conversation",
        icon: "📞",
    },
    { number: 2, title: "Craft Offer", description: "Pricing & features", icon: "💰" },
    { number: 3, title: "Deck Structure", description: "55-slide outline", icon: "📊" },
    { number: 4, title: "Gamma Decks", description: "Visual presentation", icon: "🎨" },
    { number: 5, title: "Enrollment Page", description: "AI sales copy", icon: "📝" },
    { number: 6, title: "Talk Track", description: "Video script", icon: "📖" },
    { number: 7, title: "Upload Video", description: "Pitch recording", icon: "🎥" },
    { number: 8, title: "Watch Page", description: "Video landing", icon: "▶️" },
    { number: 9, title: "Registration", description: "Lead capture", icon: "📋" },
    { number: 10, title: "Flow Setup", description: "Connect pages", icon: "🔗" },
    { number: 11, title: "AI Follow-Up", description: "Smart automation", icon: "✨" },
    { number: 12, title: "Analytics", description: "Track performance", icon: "📈" },
];

interface StepperNavProps {
    projectId: string;
    currentStep: number;
    className?: string;
}

export function StepperNav({ projectId, currentStep, className }: StepperNavProps) {
    const pathname = usePathname();

    return (
        <nav className={cn("space-y-2", className)}>
            {STEPS.map((step) => {
                const isActive = step.number === currentStep;
                const isCompleted = step.number < currentStep;
                const isFuture = step.number > currentStep;
                const href = `/funnel-builder/${projectId}/step/${step.number}`;
                const isCurrentPage = pathname === href;

                return (
                    <Link
                        key={step.number}
                        href={href}
                        className={cn(
                            "group flex items-center gap-4 rounded-lg border p-4 transition-all",
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
                        {/* Step Number/Icon */}
                        <div
                            className={cn(
                                "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl",
                                {
                                    "bg-blue-500 text-white": isCurrentPage,
                                    "bg-blue-100 text-blue-600":
                                        isActive && !isCurrentPage,
                                    "bg-green-100 text-green-600": isCompleted,
                                    "bg-gray-100 text-gray-500": isFuture,
                                }
                            )}
                        >
                            {isCompleted ? "✓" : step.icon}
                        </div>

                        {/* Step Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span
                                    className={cn(
                                        "text-xs font-medium uppercase tracking-wider",
                                        {
                                            "text-blue-600": isCurrentPage || isActive,
                                            "text-green-600": isCompleted && !isActive,
                                            "text-gray-500": isFuture,
                                            "text-gray-600":
                                                !isActive && !isCompleted && !isFuture,
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
                            <h3 className="mb-1 font-semibold text-gray-900">
                                {step.title}
                            </h3>
                            <p className="text-sm text-gray-600">{step.description}</p>
                        </div>

                        {/* Arrow for all steps */}
                        <div className="flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-1">
                            →
                        </div>
                    </Link>
                );
            })}
        </nav>
    );
}
