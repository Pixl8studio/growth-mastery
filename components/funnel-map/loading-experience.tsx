"use client";

/**
 * Enhanced Loading Experience Component
 * Shows phased loading with cycling messages during AI draft generation
 *
 * Issue #407 - Priority 2: Enhanced Loading
 */

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Brain, Zap, Target, Rocket } from "lucide-react";
import { LOADING_MESSAGES } from "@/types/funnel-map";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface LoadingExperienceProps {
    isLoading: boolean;
    totalNodes: number;
    completedNodes?: number;
    className?: string;
}

const PHASE_ICONS = [Brain, Sparkles, Target, Zap, Rocket];

export function LoadingExperience({
    isLoading,
    totalNodes,
    completedNodes = 0,
    className,
}: LoadingExperienceProps) {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    // Cycle through messages every 2.5 seconds
    useEffect(() => {
        if (!isLoading) {
            setCurrentMessageIndex(0);
            setProgress(0);
            return;
        }

        const messageInterval = setInterval(() => {
            setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2500);

        return () => clearInterval(messageInterval);
    }, [isLoading]);

    // Animate progress bar
    useEffect(() => {
        if (!isLoading) return;

        // Calculate target progress based on completed nodes
        const nodeProgress = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;

        // Smooth progress animation
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                // Don't go past node progress
                const maxProgress = Math.min(nodeProgress + 10, 95);
                if (prev >= maxProgress) return prev;
                return Math.min(prev + 1, maxProgress);
            });
        }, 100);

        return () => clearInterval(progressInterval);
    }, [isLoading, completedNodes, totalNodes]);

    // Set to 100% when done
    useEffect(() => {
        if (!isLoading && completedNodes > 0 && completedNodes === totalNodes) {
            setProgress(100);
        }
    }, [isLoading, completedNodes, totalNodes]);

    if (!isLoading) return null;

    const CurrentIcon = PHASE_ICONS[currentMessageIndex % PHASE_ICONS.length];

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center p-8 text-center",
                className
            )}
        >
            {/* Animated icon */}
            <div className="relative mb-6">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <CurrentIcon className="h-8 w-8 text-primary animate-pulse" />
                </div>
            </div>

            {/* Main loading indicator */}
            <div className="flex items-center gap-2 mb-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-lg font-medium text-foreground">
                    Generating Your Funnel
                </span>
            </div>

            {/* Cycling message */}
            <p className="text-sm text-muted-foreground mb-6 h-5 transition-all duration-300">
                {LOADING_MESSAGES[currentMessageIndex]}
            </p>

            {/* Progress bar */}
            <div className="w-full max-w-xs mb-4">
                <Progress value={progress} className="h-2" />
            </div>

            {/* Node count */}
            <p className="text-xs text-muted-foreground">
                {completedNodes > 0 ? (
                    <>
                        Generated{" "}
                        <span className="font-medium text-foreground">
                            {completedNodes}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-foreground">
                            {totalNodes}
                        </span>{" "}
                        nodes
                    </>
                ) : (
                    <>
                        Preparing{" "}
                        <span className="font-medium text-foreground">
                            {totalNodes}
                        </span>{" "}
                        funnel nodes
                    </>
                )}
            </p>

            {/* Estimated time */}
            <p className="text-xs text-muted-foreground/70 mt-2">
                This usually takes 5-10 seconds
            </p>
        </div>
    );
}

/**
 * Compact loading indicator for inline use
 */
export function LoadingIndicator({
    message,
    className,
}: {
    message?: string;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{message || "Loading..."}</span>
        </div>
    );
}
