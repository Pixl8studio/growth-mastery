"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

interface GenerationProgressItem {
    step: number;
    stepName: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    error?: string;
    completedAt?: string;
}

interface GenerationProgressTrackerProps {
    projectId: string;
}

export function GenerationProgressTracker({
    projectId,
}: GenerationProgressTrackerProps) {
    const pathname = usePathname();
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<GenerationProgressItem[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Poll for generation status
    const pollGenerationStatus = async () => {
        if (!projectId) return;

        try {
            const response = await fetch(
                `/api/generate/generation-status?projectId=${projectId}`
            );

            if (!response.ok) {
                return;
            }

            const data = await response.json();

            setIsGenerating(data.isGenerating);
            setProgress(data.progress || []);

            // Show the tracker if generation is in progress
            if (data.isGenerating) {
                setIsVisible(true);
            }

            // If generation just completed, keep visible for a bit then hide
            if (!data.isGenerating && isVisible) {
                setTimeout(() => {
                    setIsVisible(false);
                    setIsExpanded(false);
                }, 5000); // Hide after 5 seconds
            }
        } catch (error) {
            logger.error({ error }, "Error polling generation status in tracker");
        }
    };

    // Start polling when component mounts
    useEffect(() => {
        if (!projectId) return;

        // Check initial status
        pollGenerationStatus();

        // Start polling every 3 seconds
        pollingIntervalRef.current = setInterval(pollGenerationStatus, 3000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // Don't show on intake step (step 1)
    const isIntakePage = pathname?.includes("/step/1");

    if (!isVisible || isIntakePage || progress.length === 0) {
        return null;
    }

    const completedCount = progress.filter((p) => p.status === "completed").length;
    const totalCount = progress.length;
    const currentStep = progress.find((p) => p.status === "in_progress");

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80">
            <div className="overflow-hidden rounded-lg border-2 border-primary/20 bg-card shadow-2xl">
                {/* Header - Always visible */}
                <div
                    className="flex cursor-pointer items-center justify-between bg-gradient-to-r from-primary/10 to-purple-500/10 p-4"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center space-x-3">
                        {isGenerating ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                            <div className="h-5 w-5 rounded-full bg-green-500" />
                        )}
                        <div>
                            <p className="font-semibold text-foreground">
                                {isGenerating
                                    ? "Generating Content"
                                    : "Generation Complete"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {completedCount} of {totalCount} steps
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsVisible(false);
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="px-4 py-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
                            style={{
                                width: `${(completedCount / totalCount) * 100}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="max-h-96 overflow-y-auto p-4 pt-2">
                        <div className="space-y-2">
                            {progress.map((item) => (
                                <div
                                    key={item.step}
                                    className={cn(
                                        "flex items-center space-x-2 rounded-lg border p-2 text-sm",
                                        item.status === "in_progress" &&
                                            "border-primary/50 bg-primary/5",
                                        item.status === "completed" &&
                                            "border-green-500/20 bg-green-500/5",
                                        item.status === "failed" &&
                                            "border-red-500/20 bg-red-500/5",
                                        item.status === "pending" && "border-border"
                                    )}
                                >
                                    <div className="flex-1">
                                        <span className="font-medium">
                                            {item.step === 0
                                                ? item.stepName
                                                : `Step ${item.step}: ${item.stepName}`}
                                        </span>
                                    </div>
                                    <div>
                                        {item.status === "completed" && (
                                            <span className="text-green-500">✓</span>
                                        )}
                                        {item.status === "in_progress" && (
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        )}
                                        {item.status === "failed" && (
                                            <span className="text-red-500">✗</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {currentStep && (
                            <p className="mt-3 text-xs text-muted-foreground">
                                Currently generating: {currentStep.stepName}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
