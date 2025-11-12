/**
 * Auto-Generation Modal
 * Shows progress and status for auto-generating all funnel content
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationProgress {
    step: number;
    stepName: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    error?: string;
}

interface AutoGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    mode: "generate" | "regenerate";
    hasExistingContent: boolean;
}

export function AutoGenerationModal({
    isOpen,
    onClose,
    onConfirm,
    mode,
    hasExistingContent,
}: AutoGenerationModalProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<GenerationProgress[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [completedCount, setCompletedCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);

    const handleConfirm = async () => {
        setIsGenerating(true);
        setIsComplete(false);
        setProgress([
            { step: 2, stepName: "Offer", status: "pending" },
            { step: 3, stepName: "Deck Structure", status: "pending" },
            { step: 5, stepName: "Enrollment Pages", status: "pending" },
            { step: 8, stepName: "Watch Pages", status: "pending" },
            { step: 9, stepName: "Registration Pages", status: "pending" },
            { step: 11, stepName: "AI Followup", status: "pending" },
        ]);

        try {
            await onConfirm();

            // Simulate progress updates (in real implementation, use polling or SSE)
            const steps = [
                { step: 2, stepName: "Offer", status: "in_progress" as const },
                { step: 3, stepName: "Deck Structure", status: "in_progress" as const },
                {
                    step: 5,
                    stepName: "Enrollment Pages",
                    status: "in_progress" as const,
                },
                { step: 8, stepName: "Watch Pages", status: "in_progress" as const },
                {
                    step: 9,
                    stepName: "Registration Pages",
                    status: "in_progress" as const,
                },
                { step: 11, stepName: "AI Followup", status: "in_progress" as const },
            ];

            for (let i = 0; i < steps.length; i++) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                setProgress((prev) =>
                    prev.map((p) =>
                        p.step === steps[i].step
                            ? { ...p, status: "completed" as const }
                            : p
                    )
                );
                setCompletedCount((prev) => prev + 1);
            }

            setIsComplete(true);
        } catch (_error) {
            setFailedCount((prev) => prev + 1);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClose = () => {
        if (!isGenerating) {
            setProgress([]);
            setIsComplete(false);
            setCompletedCount(0);
            setFailedCount(0);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {mode === "generate"
                            ? "Generate All Content"
                            : "Regenerate All Content"}
                    </DialogTitle>
                    <DialogDescription>
                        {!isGenerating && !isComplete && (
                            <>
                                {mode === "regenerate" && hasExistingContent && (
                                    <div className="mt-2 rounded-md bg-amber-50 p-3 border border-amber-200">
                                        <div className="flex gap-2">
                                            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-amber-800">
                                                <p className="font-medium mb-1">
                                                    This will overwrite existing content
                                                </p>
                                                <p>
                                                    All previously generated content
                                                    will be replaced with new versions
                                                    based on your intake data. This
                                                    action cannot be undone.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {mode === "generate" && (
                                    <div className="mt-2 text-sm">
                                        <p className="mb-2">
                                            This will automatically generate content
                                            for:
                                        </p>
                                        <ul className="space-y-1 text-muted-foreground">
                                            <li>• Step 2: Offer</li>
                                            <li>
                                                • Step 3: Deck Structure (55 slides)
                                            </li>
                                            <li>• Step 5: Enrollment Page</li>
                                            <li>• Step 8: Watch Page</li>
                                            <li>• Step 9: Registration Page</li>
                                            <li>• Step 11: AI Followup Sequence</li>
                                        </ul>
                                        <p className="mt-3 text-xs">
                                            This process takes 30-60 seconds. You can
                                            review and edit all content after
                                            generation.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {(isGenerating || isComplete) && (
                    <div className="space-y-3 py-4">
                        {progress.map((item) => (
                            <div
                                key={item.step}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border",
                                    item.status === "completed" &&
                                        "bg-green-50 border-green-200",
                                    item.status === "failed" &&
                                        "bg-red-50 border-red-200",
                                    item.status === "in_progress" &&
                                        "bg-blue-50 border-blue-200",
                                    item.status === "pending" &&
                                        "bg-gray-50 border-gray-200"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    {item.status === "pending" && (
                                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                                    )}
                                    {item.status === "in_progress" && (
                                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                    )}
                                    {item.status === "completed" && (
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    )}
                                    {item.status === "failed" && (
                                        <XCircle className="h-5 w-5 text-red-600" />
                                    )}
                                    <div>
                                        <p className="font-medium text-sm">
                                            Step {item.step}: {item.stepName}
                                        </p>
                                        {item.error && (
                                            <p className="text-xs text-red-600 mt-1">
                                                {item.error}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {item.status === "pending" && "Waiting..."}
                                    {item.status === "in_progress" && "Generating..."}
                                    {item.status === "completed" && "Done"}
                                    {item.status === "failed" && "Failed"}
                                </div>
                            </div>
                        ))}

                        {isComplete && (
                            <div className="mt-4 rounded-lg bg-primary/10 p-4 border border-primary/20">
                                <p className="font-medium text-primary">
                                    {failedCount === 0
                                        ? "🎉 All content generated successfully!"
                                        : `✅ Generated ${completedCount} of ${progress.length} steps`}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {failedCount === 0
                                        ? "You can now review and customize each step in your funnel."
                                        : `${failedCount} step(s) failed. You can retry or generate them individually.`}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {!isGenerating && !isComplete && (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleConfirm}>
                                {mode === "generate"
                                    ? "Generate All Content"
                                    : "Regenerate All Content"}
                            </Button>
                        </>
                    )}
                    {isGenerating && (
                        <div className="text-sm text-muted-foreground">
                            Generation in progress... Please wait.
                        </div>
                    )}
                    {isComplete && (
                        <Button onClick={handleClose}>
                            {failedCount === 0 ? "Done" : "Close"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
