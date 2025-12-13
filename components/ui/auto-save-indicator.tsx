"use client";

/**
 * Auto-Save Indicator Component
 * Persistent, always-visible indicator showing the current save status.
 * Features:
 * - Clear visual states: idle, saving, saved, error
 * - Timestamp display showing last save time
 * - Smooth animations between states
 * - Compact and full display modes
 * - Accessible with proper ARIA attributes
 */

import { useState, useEffect, useCallback } from "react";
import { Cloud, Check, AlertCircle, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

interface AutoSaveIndicatorProps {
    /** Current save status */
    status: SaveStatus;
    /** Last saved timestamp */
    lastSaved?: Date | null;
    /** Error message when status is "error" */
    errorMessage?: string | null;
    /** Display mode: compact (icon only) or full (icon + text) */
    mode?: "compact" | "full";
    /** Additional className for styling */
    className?: string;
    /** Duration in ms before "saved" state returns to "idle" (0 = never) */
    savedDisplayDuration?: number;
    /** Show timestamp when status is "saved" or "idle" with lastSaved */
    showTimestamp?: boolean;
    /** Whether to persist visibility even when idle */
    persistWhenIdle?: boolean;
}

/**
 * Format a date as a relative or absolute time string
 */
function formatLastSaved(date: Date): string {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 10) return "just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function AutoSaveIndicator({
    status,
    lastSaved,
    errorMessage,
    mode = "full",
    className,
    savedDisplayDuration = 3000,
    showTimestamp = true,
    persistWhenIdle = true,
}: AutoSaveIndicatorProps) {
    const [displayStatus, setDisplayStatus] = useState<SaveStatus>(status);
    const [formattedTime, setFormattedTime] = useState<string>("");

    // Update display status with optional auto-return to idle
    useEffect(() => {
        setDisplayStatus(status);

        // If saved and duration is set, return to idle after duration
        if (status === "saved" && savedDisplayDuration > 0) {
            const timer = setTimeout(() => {
                setDisplayStatus("idle");
            }, savedDisplayDuration);
            return () => clearTimeout(timer);
        }
    }, [status, savedDisplayDuration]);

    // Update timestamp display
    useEffect(() => {
        if (!lastSaved) {
            setFormattedTime("");
            return;
        }

        // Update immediately
        setFormattedTime(formatLastSaved(lastSaved));

        // Update every 10 seconds for relative time updates
        const interval = setInterval(() => {
            setFormattedTime(formatLastSaved(lastSaved));
        }, 10000);

        return () => clearInterval(interval);
    }, [lastSaved]);

    // Don't render if idle and not persisting
    if (displayStatus === "idle" && !persistWhenIdle && !lastSaved) {
        return null;
    }

    const isCompact = mode === "compact";

    return (
        <div
            className={cn(
                "flex items-center gap-2 text-sm transition-all duration-300",
                className
            )}
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
            {displayStatus === "saving" && (
                <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    {!isCompact && (
                        <span className="text-blue-600 font-medium">Saving...</span>
                    )}
                </>
            )}

            {displayStatus === "saved" && (
                <>
                    <Check className="h-4 w-4 text-green-500" />
                    {!isCompact && (
                        <span className="text-green-600 font-medium">
                            Saved{showTimestamp && formattedTime ? ` ${formattedTime}` : ""}
                        </span>
                    )}
                </>
            )}

            {displayStatus === "error" && (
                <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    {!isCompact && (
                        <span className="text-destructive font-medium">
                            {errorMessage || "Save failed"}
                        </span>
                    )}
                </>
            )}

            {displayStatus === "offline" && (
                <>
                    <CloudOff className="h-4 w-4 text-muted-foreground" />
                    {!isCompact && (
                        <span className="text-muted-foreground">Offline</span>
                    )}
                </>
            )}

            {displayStatus === "idle" && persistWhenIdle && lastSaved && (
                <>
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    {!isCompact && showTimestamp && formattedTime && (
                        <span className="text-muted-foreground">
                            Last saved {formattedTime}
                        </span>
                    )}
                </>
            )}

            {displayStatus === "idle" && persistWhenIdle && !lastSaved && (
                <>
                    <Cloud className="h-4 w-4 text-muted-foreground opacity-50" />
                    {!isCompact && (
                        <span className="text-muted-foreground opacity-50">
                            Not saved yet
                        </span>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * Hook for managing auto-save state
 * Provides save status management and timestamp tracking
 */
export function useAutoSave(options?: { savedDisplayDuration?: number }) {
    const { savedDisplayDuration = 3000 } = options || {};
    const [status, setStatus] = useState<SaveStatus>("idle");
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const setSaving = useCallback(() => {
        setStatus("saving");
        setError(null);
    }, []);

    const setSaved = useCallback(() => {
        setStatus("saved");
        setLastSaved(new Date());
        setError(null);

        // Auto-return to idle after duration
        if (savedDisplayDuration > 0) {
            setTimeout(() => {
                setStatus("idle");
            }, savedDisplayDuration);
        }
    }, [savedDisplayDuration]);

    const setFailed = useCallback((message?: string) => {
        setStatus("error");
        setError(message || "Failed to save");
    }, []);

    const setIdle = useCallback(() => {
        setStatus("idle");
    }, []);

    const setOffline = useCallback(() => {
        setStatus("offline");
    }, []);

    return {
        status,
        lastSaved,
        error,
        setSaving,
        setSaved,
        setFailed,
        setIdle,
        setOffline,
    };
}

/**
 * Floating auto-save indicator for use in headers or fixed positions
 */
export function FloatingAutoSaveIndicator({
    status,
    lastSaved,
    errorMessage,
    className,
    position = "top-right",
}: AutoSaveIndicatorProps & {
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}) {
    const positionClasses = {
        "top-right": "top-4 right-4",
        "top-left": "top-4 left-4",
        "bottom-right": "bottom-4 right-4",
        "bottom-left": "bottom-4 left-4",
    };

    // Only show when actively saving or recently saved/errored
    if (status === "idle") return null;

    return (
        <div
            className={cn(
                "fixed z-50 rounded-lg bg-background/95 backdrop-blur-sm border shadow-lg px-3 py-2",
                "animate-in fade-in-0 slide-in-from-top-2 duration-300",
                positionClasses[position],
                className
            )}
        >
            <AutoSaveIndicator
                status={status}
                lastSaved={lastSaved}
                errorMessage={errorMessage}
                mode="full"
                showTimestamp={true}
                persistWhenIdle={false}
            />
        </div>
    );
}
