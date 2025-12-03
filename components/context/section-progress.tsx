"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { SectionId, CompletionStatus } from "@/types/business-profile";
import { SECTION_DEFINITIONS } from "@/types/business-profile";

interface SectionProgressProps {
    currentSection: SectionId;
    completionStatus: CompletionStatus;
    onSectionClick?: (sectionId: SectionId) => void;
}

const SECTION_ORDER: SectionId[] = [
    "section1",
    "section2",
    "section3",
    "section4",
    "section5",
];

// Short, descriptive labels for the progress indicator
const SECTION_SHORT_LABELS: Record<SectionId, string> = {
    section1: "Customer",
    section2: "Story",
    section3: "Offer",
    section4: "Beliefs",
    section5: "CTA",
};

export function SectionProgress({
    currentSection,
    completionStatus,
    onSectionClick,
}: SectionProgressProps) {
    const currentIndex = SECTION_ORDER.indexOf(currentSection);

    return (
        <div className="mb-8">
            {/* Progress Bar */}
            <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                    Overall Progress
                </span>
                <span className="text-sm font-semibold text-primary">
                    {completionStatus.overall}%
                </span>
            </div>
            <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${completionStatus.overall}%` }}
                />
            </div>

            {/* Section Steps */}
            <div className="flex items-center justify-between">
                {SECTION_ORDER.map((sectionId, index) => {
                    const section = SECTION_DEFINITIONS[sectionId];
                    const completion =
                        completionStatus[sectionId as keyof CompletionStatus] || 0;
                    const isComplete = completion === 100;
                    const isCurrent = sectionId === currentSection;
                    const isPast = index < currentIndex;
                    const isClickable =
                        onSectionClick && (isPast || isComplete || isCurrent);

                    return (
                        <div key={sectionId} className="flex flex-1 items-center">
                            {/* Step Circle */}
                            <div
                                className={cn(
                                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
                                    {
                                        "border-primary bg-primary text-primary-foreground":
                                            isCurrent,
                                        "border-green-500 bg-green-500 text-white":
                                            isComplete,
                                        "border-muted-foreground/30 bg-muted text-muted-foreground":
                                            !isCurrent && !isComplete,
                                        "cursor-pointer hover:scale-105": isClickable,
                                    }
                                )}
                                onClick={() =>
                                    isClickable && onSectionClick?.(sectionId)
                                }
                                title={section.title}
                            >
                                {isComplete ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <span className="text-sm font-semibold">
                                        {index + 1}
                                    </span>
                                )}
                            </div>

                            {/* Connector Line */}
                            {index < SECTION_ORDER.length - 1 && (
                                <div
                                    className={cn("mx-2 h-0.5 flex-1 transition-all", {
                                        "bg-primary":
                                            isPast || (isCurrent && isComplete),
                                        "bg-green-500":
                                            completionStatus[
                                                SECTION_ORDER[
                                                    index + 1
                                                ] as keyof CompletionStatus
                                            ] > 0,
                                        "bg-muted": !isPast && !isCurrent,
                                    })}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Section Labels */}
            <div className="mt-2 flex justify-between">
                {SECTION_ORDER.map((sectionId) => {
                    const section = SECTION_DEFINITIONS[sectionId];
                    const isCurrent = sectionId === currentSection;

                    return (
                        <div key={sectionId} className="flex-1 px-1 text-center">
                            <p
                                className={cn("text-xs", {
                                    "font-semibold text-primary": isCurrent,
                                    "text-muted-foreground": !isCurrent,
                                })}
                                title={section.title}
                            >
                                {SECTION_SHORT_LABELS[sectionId]}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
