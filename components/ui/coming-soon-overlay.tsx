/**
 * Coming Soon Overlay Component
 *
 * Displays a visual "Coming Soon" indicator over features that are not yet ready.
 * Prevents user interaction while keeping the content visible.
 */

"use client";

import { cn } from "@/lib/utils";
import { Clock, Sparkles } from "lucide-react";

interface ComingSoonOverlayProps {
    /** The feature name to display */
    featureName: string;
    /** Optional description text */
    description?: string;
    /** Children content to render beneath the overlay */
    children: React.ReactNode;
    /** Optional className for the wrapper */
    className?: string;
    /** Whether to show a full-page overlay (default) or inline badge */
    variant?: "overlay" | "inline";
}

export function ComingSoonOverlay({
    featureName,
    description = "This feature is currently in development and will be available soon.",
    children,
    className,
    variant = "overlay",
}: ComingSoonOverlayProps) {
    if (variant === "inline") {
        return (
            <div className={cn("relative", className)}>
                {children}
                <div className="absolute -top-2 -right-2 z-10">
                    <ComingSoonBadge size="sm" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn("relative", className)}>
            {/* Content rendered but non-interactive */}
            <div className="pointer-events-none select-none opacity-50 blur-[1px]">
                {children}
            </div>

            {/* Overlay with Coming Soon message */}
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                <div className="mx-4 max-w-md rounded-xl border-2 border-primary/30 bg-card p-8 text-center shadow-xl">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20">
                        <Clock className="h-8 w-8 text-primary" />
                    </div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 px-4 py-1.5 text-sm font-semibold text-primary">
                        <Sparkles className="h-4 w-4" />
                        Coming Soon
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-foreground">
                        {featureName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
        </div>
    );
}

/**
 * Standalone Coming Soon Badge for use in lists, cards, etc.
 */
interface ComingSoonBadgeProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function ComingSoonBadge({ size = "md", className }: ComingSoonBadgeProps) {
    const sizeClasses = {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
    };

    const iconSize = {
        sm: "h-3 w-3",
        md: "h-3.5 w-3.5",
        lg: "h-4 w-4",
    };

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white shadow-sm",
                sizeClasses[size],
                className
            )}
        >
            <Clock className={iconSize[size]} />
            Coming Soon
        </span>
    );
}
