/**
 * GenerationBanner Component
 * In-editor streaming generation progress banner
 *
 * Related: GitHub Issue #327 - In-Editor Generation Banner
 */

"use client";

import { memo } from "react";
import { Sparkles, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GenerationBannerProps {
    isGenerating: boolean;
    progress: number;
    currentSlide: number;
    totalSlides: number;
    error?: string | null;
    onCancel?: () => void;
    onDismiss?: () => void;
    className?: string;
}

export const GenerationBanner = memo(function GenerationBanner({
    isGenerating,
    progress,
    currentSlide,
    totalSlides,
    error,
    onCancel,
    onDismiss,
    className,
}: GenerationBannerProps) {
    if (!isGenerating && !error && progress < 100) {
        return null;
    }

    // Error state
    if (error) {
        return (
            <div
                className={cn(
                    "rounded-xl border border-red-200 bg-red-50 p-4",
                    className
                )}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="rounded-full bg-red-100 p-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-red-800">
                                Generation Failed
                            </h3>
                            <p className="mt-1 text-sm text-red-600">{error}</p>
                        </div>
                    </div>
                    {onDismiss && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-100 hover:text-red-700"
                            onClick={onDismiss}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // Completed state
    if (!isGenerating && progress >= 100) {
        return (
            <div
                className={cn(
                    "rounded-xl border border-green-200 bg-green-50 p-4",
                    className
                )}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-green-100 p-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-green-800">
                                Generation Complete!
                            </h3>
                            <p className="text-sm text-green-600">
                                {totalSlides} slides created successfully
                            </p>
                        </div>
                    </div>
                    {onDismiss && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:bg-green-100 hover:text-green-700"
                            onClick={onDismiss}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // Generating state
    return (
        <div
            className={cn(
                "overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-purple-500/5",
                className
            )}
        >
            {/* Animated progress bar */}
            <div className="h-1 w-full bg-primary/10">
                <div
                    className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {/* Animated sparkle icon */}
                        <div className="relative">
                            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                            <div className="relative rounded-full bg-primary/10 p-2">
                                <Sparkles className="h-5 w-5 animate-pulse text-primary" />
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-foreground">
                                Generating Your Presentation
                            </h3>
                            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                <span>
                                    Slide {currentSlide} of {totalSlides}
                                </span>
                                <span className="text-primary font-medium">
                                    {progress}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Slide count badges */}
                        <div className="hidden sm:flex items-center gap-1">
                            {Array.from({ length: Math.min(totalSlides, 10) }).map(
                                (_, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "h-2 w-2 rounded-full transition-colors duration-300",
                                            idx < currentSlide
                                                ? "bg-green-500"
                                                : idx === currentSlide - 1
                                                  ? "bg-primary animate-pulse"
                                                  : "bg-muted"
                                        )}
                                    />
                                )
                            )}
                            {totalSlides > 10 && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                    +{totalSlides - 10}
                                </span>
                            )}
                        </div>

                        {onCancel && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                </div>

                {/* Current slide hint */}
                <p className="mt-3 text-xs text-muted-foreground">
                    AI is creating slide content, speaker notes, and image prompts. You
                    can start editing slides as they appear.
                </p>
            </div>
        </div>
    );
});
