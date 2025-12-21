/**
 * SlideThumbnail Component
 * Pixel-perfect miniature preview that exactly matches SlidePreview
 * Uses shared SlideContentRenderer with CSS transform scaling
 *
 * Related: GitHub Issue #327 - Live Thumbnail Renderer
 */

"use client";

import { memo } from "react";
import { Copy, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlideContentRenderer } from "./slide-content-renderer";
import type { SlideData, BrandDesign } from "./slide-types";

// Re-export types for backward compatibility
export type { SlideData, BrandDesign };
export type { SlideLayoutType } from "./slide-types";

interface SlideThumbnailProps {
    slide: SlideData;
    index: number;
    isSelected: boolean;
    isGenerating?: boolean;
    isCompleted?: boolean;
    brandDesign?: BrandDesign | null;
    showActions?: boolean;
    totalSlides?: number;
    onClick?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    dragHandleProps?: Record<string, unknown>;
    className?: string;
}

export const SlideThumbnail = memo(function SlideThumbnail({
    slide,
    index,
    isSelected,
    isGenerating = false,
    isCompleted = false,
    brandDesign,
    showActions = true,
    totalSlides = 1,
    onClick,
    onDuplicate,
    onDelete,
    dragHandleProps,
    className,
}: SlideThumbnailProps) {
    // Guard against undefined slide - can happen during streaming generation
    if (!slide) {
        return <SlideThumbnailSkeleton className={className} />;
    }

    // Thumbnail scale factor - renders at full size then scales down
    // This ensures pixel-perfect match with SlidePreview
    const THUMBNAIL_SCALE = 0.18; // 18% of original size
    const THUMBNAIL_WIDTH = 220; // Width of the thumbnail container in pixels

    return (
        <div
            className={cn(
                "group relative cursor-pointer rounded-xl border-2 p-2.5 transition-all duration-200",
                isSelected
                    ? "border-primary bg-white shadow-lg ring-2 ring-primary/20"
                    : "border-transparent bg-white hover:border-border hover:shadow-md",
                isGenerating && "animate-pulse",
                className
            )}
            onClick={onClick}
            {...dragHandleProps}
        >
            {/* Status Indicators */}
            {isGenerating && (
                <div className="absolute -right-1 -top-1 z-10">
                    <div className="rounded-full bg-primary p-1 shadow-lg">
                        <Loader2 className="h-3 w-3 animate-spin text-white" />
                    </div>
                </div>
            )}
            {isCompleted && !isGenerating && (
                <div className="absolute -right-1 -top-1 z-10">
                    <div className="rounded-full bg-green-500 p-1 shadow-lg">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                </div>
            )}

            {/* Scaled slide preview container */}
            <div
                className="relative overflow-hidden rounded-lg"
                style={{
                    width: `${THUMBNAIL_WIDTH}px`,
                    height: `${THUMBNAIL_WIDTH * (9 / 16)}px`, // 16:9 aspect ratio
                }}
            >
                {/* The actual slide rendered at full size, then scaled down */}
                <div
                    style={{
                        width: `${THUMBNAIL_WIDTH / THUMBNAIL_SCALE}px`,
                        height: `${(THUMBNAIL_WIDTH / THUMBNAIL_SCALE) * (9 / 16)}px`,
                        transform: `scale(${THUMBNAIL_SCALE})`,
                        transformOrigin: "top left",
                    }}
                >
                    <SlideContentRenderer
                        slide={slide}
                        slideIndex={index}
                        totalSlides={totalSlides}
                        brandDesign={brandDesign}
                        showImagePlaceholder={true}
                    />
                </div>
            </div>

            {/* Slide info and actions */}
            <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">
                    {index + 1}
                </span>

                {showActions && (
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                            className="rounded p-0.5 transition-colors hover:bg-muted"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDuplicate?.();
                            }}
                            title="Duplicate slide"
                        >
                            <Copy className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button
                            className="rounded p-0.5 transition-colors hover:bg-red-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.();
                            }}
                            title="Delete slide"
                        >
                            <Trash2 className="h-3 w-3 text-red-500" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

/**
 * SlideThumbnailSkeleton - Loading placeholder
 */
export function SlideThumbnailSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-xl border-2 border-transparent bg-white p-2.5",
                className
            )}
        >
            <div className="aspect-[16/9] rounded-lg bg-muted" />
            <div className="mt-1.5 flex items-center justify-between">
                <div className="h-3 w-4 rounded bg-muted" />
            </div>
        </div>
    );
}

/**
 * GeneratingSlotPlaceholder - Shows during streaming generation
 */
export function GeneratingSlotPlaceholder({
    slideNumber,
    className,
}: {
    slideNumber: number;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "rounded-xl border-2 border-primary/50 bg-primary/5 p-2.5",
                className
            )}
        >
            <div className="aspect-[16/9] rounded-lg border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="flex h-full flex-col items-center justify-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-[8px] font-medium text-primary/70">
                        Generating...
                    </span>
                </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] font-medium text-primary/50">
                    {slideNumber}
                </span>
            </div>
        </div>
    );
}
