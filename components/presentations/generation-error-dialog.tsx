/**
 * GenerationErrorDialog Component
 * Friendly, branded error dialog for presentation generation failures
 *
 * Related: GitHub Issue #327 - Enhanced Presentation Generator
 */

"use client";

import { memo } from "react";
import { Brain, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GenerationErrorDialogProps {
    isOpen: boolean;
    errorType: "timeout" | "general";
    errorMessage?: string;
    onRetry: () => void;
    onClose: () => void;
}

export const GenerationErrorDialog = memo(function GenerationErrorDialog({
    isOpen,
    errorType,
    errorMessage,
    onRetry,
    onClose,
}: GenerationErrorDialogProps) {
    if (!isOpen) return null;

    const isTimeout = errorType === "timeout";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div
                className={cn(
                    "relative mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl",
                    "animate-in fade-in-0 zoom-in-95 duration-200"
                )}
            >
                {/* Close button */}
                <button
                    className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={onClose}
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="p-8 text-center">
                    {/* Animated brain icon */}
                    <div className="relative mx-auto mb-6 h-20 w-20">
                        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10">
                            <Brain className="h-10 w-10 text-primary" />
                        </div>
                        {/* Sparkle effects */}
                        <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-yellow-400" />
                        <div className="absolute -bottom-1 -left-1 h-2 w-2 animate-pulse rounded-full bg-pink-400 delay-150" />
                    </div>

                    {/* Title */}
                    <h2 className="mb-3 text-2xl font-bold text-foreground">
                        {isTimeout ? "Oops! AI Brain Fart" : "Something Went Wrong"}
                    </h2>

                    {/* Message */}
                    <p className="mb-6 text-muted-foreground">
                        {isTimeout ? (
                            <>
                                Our AI had a little brain fart while generating your
                                presentation. These things happen sometimes when
                                creating something amazing!
                            </>
                        ) : (
                            <>
                                {errorMessage ||
                                    "We encountered an unexpected issue while generating your presentation."}
                            </>
                        )}
                    </p>

                    {/* Apology */}
                    <p className="mb-8 text-sm text-muted-foreground/80">
                        We apologize for the inconvenience!
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Button
                            size="lg"
                            className="gap-2"
                            onClick={onRetry}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Retry Generation
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={onClose}
                        >
                            Maybe Later
                        </Button>
                    </div>
                </div>

                {/* Decorative gradient footer */}
                <div className="h-1 w-full bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
            </div>
        </div>
    );
});
