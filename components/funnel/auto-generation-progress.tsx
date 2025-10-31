"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, XCircle, Loader2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GenerationProgressItem {
    step: number;
    stepName: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    error?: string;
    completedAt?: string;
}

interface AutoGenerationProgressProps {
    projectId: string;
    progress: GenerationProgressItem[];
    isGenerating: boolean;
    currentStep: number | null;
    onClose?: () => void;
}

export function AutoGenerationProgress({
    projectId,
    progress,
    isGenerating,
    currentStep,
    onClose,
}: AutoGenerationProgressProps) {
    const router = useRouter();

    const handleNavigateToStep = (stepNumber: number) => {
        router.push(`/funnel-builder/${projectId}/step/${stepNumber}`);
    };

    const getStatusIcon = (item: GenerationProgressItem) => {
        switch (item.status) {
            case "completed":
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case "in_progress":
                return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
            case "failed":
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Circle className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const completedCount = progress.filter((p) => p.status === "completed").length;
    const totalCount = progress.length;
    const progressPercentage = (completedCount / totalCount) * 100;

    return (
        <Card className="sticky top-4 z-10 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 p-6 shadow-lg">
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        {isGenerating
                            ? "🎨 Generating Content..."
                            : "✨ Generation Complete"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {isGenerating
                            ? `Progress: ${completedCount} of ${totalCount} steps`
                            : `Generated ${completedCount} steps successfully`}
                    </p>
                </div>
                {!isGenerating && onClose && (
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        ✕
                    </Button>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>

            {/* Progress Items */}
            <div className="space-y-3">
                {progress.map((item) => {
                    const isClickable = item.status === "completed" && item.step !== 0;
                    const isCurrentStep = item.step === currentStep;

                    return (
                        <div
                            key={item.step}
                            className={cn(
                                "group flex items-center justify-between rounded-lg border p-3 transition-all",
                                isCurrentStep &&
                                    "border-primary/50 bg-primary/5 ring-2 ring-primary/20",
                                !isCurrentStep && "border-border bg-card",
                                isClickable && "cursor-pointer hover:border-primary/30"
                            )}
                            onClick={() => {
                                if (isClickable) {
                                    handleNavigateToStep(item.step);
                                }
                            }}
                        >
                            <div className="flex items-center space-x-3">
                                {getStatusIcon(item)}
                                <div>
                                    <p
                                        className={cn(
                                            "font-medium",
                                            item.status === "completed" &&
                                                "text-foreground",
                                            item.status === "in_progress" &&
                                                "text-primary",
                                            item.status === "failed" && "text-red-500",
                                            item.status === "pending" &&
                                                "text-muted-foreground"
                                        )}
                                    >
                                        {item.step === 0
                                            ? item.stepName
                                            : `Step ${item.step}: ${item.stepName}`}
                                    </p>
                                    {item.error && (
                                        <p className="text-xs text-red-500">
                                            {item.error}
                                        </p>
                                    )}
                                    {item.status === "in_progress" && (
                                        <p className="text-xs text-primary">
                                            Generating now...
                                        </p>
                                    )}
                                </div>
                            </div>

                            {isClickable && (
                                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Background Processing Notice */}
            {isGenerating && (
                <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        💡 Generation continues in the background. You can navigate to
                        other pages while we work!
                    </p>
                </div>
            )}
        </Card>
    );
}
