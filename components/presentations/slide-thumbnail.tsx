/**
 * SlideThumbnail Component
 * Premium styled mini-preview for presentation slides
 *
 * Related: GitHub Issue #327 - Live Thumbnail Renderer
 */

"use client";

import { memo } from "react";
import { Copy, Trash2, CheckCircle2, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlideData {
    slideNumber: number;
    title: string;
    content: string[];
    speakerNotes?: string;
    imagePrompt?: string;
    imageUrl?: string;
    layoutType:
        | "title"
        | "section"
        | "content_left"
        | "content_right"
        | "bullets"
        | "quote"
        | "statistics"
        | "comparison"
        | "process"
        | "cta";
    section?: string;
}

export interface BrandDesign {
    primary_color: string;
    secondary_color?: string | null;
    accent_color?: string | null;
    background_color: string;
    text_color: string;
    brand_name?: string | null;
}

interface SlideThumbnailProps {
    slide: SlideData;
    index: number;
    isSelected: boolean;
    isGenerating?: boolean;
    isCompleted?: boolean;
    brandDesign?: BrandDesign | null;
    showActions?: boolean;
    onClick?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    dragHandleProps?: Record<string, unknown>;
    className?: string;
}

// Layout type icons and styles
const LAYOUT_STYLES: Record<
    SlideData["layoutType"],
    { gradient: string; icon: string }
> = {
    title: { gradient: "from-amber-500/20 to-orange-500/20", icon: "T" },
    section: { gradient: "from-blue-500/20 to-indigo-500/20", icon: "S" },
    content_left: { gradient: "from-emerald-500/20 to-teal-500/20", icon: "L" },
    content_right: { gradient: "from-purple-500/20 to-pink-500/20", icon: "R" },
    bullets: { gradient: "from-sky-500/20 to-blue-500/20", icon: "B" },
    quote: { gradient: "from-rose-500/20 to-red-500/20", icon: "Q" },
    statistics: { gradient: "from-cyan-500/20 to-teal-500/20", icon: "#" },
    comparison: { gradient: "from-violet-500/20 to-purple-500/20", icon: "C" },
    process: { gradient: "from-lime-500/20 to-green-500/20", icon: "P" },
    cta: { gradient: "from-orange-500/20 to-red-500/20", icon: "!" },
};

export const SlideThumbnail = memo(function SlideThumbnail({
    slide,
    index,
    isSelected,
    isGenerating = false,
    isCompleted = false,
    brandDesign,
    showActions = true,
    onClick,
    onDuplicate,
    onDelete,
    dragHandleProps,
    className,
}: SlideThumbnailProps) {
    const layoutStyle = LAYOUT_STYLES[slide.layoutType] || LAYOUT_STYLES.bullets;

    // Get brand colors with fallbacks
    const bgColor = brandDesign?.background_color || "#ffffff";
    const textColor = brandDesign?.text_color || "#1f2937";
    const primaryColor = brandDesign?.primary_color || "#3b82f6";
    const accentColor = brandDesign?.accent_color || "#8b5cf6";

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

            {/* Slide Preview */}
            <div
                className={cn(
                    "relative aspect-[16/9] overflow-hidden rounded-lg border shadow-inner",
                    `bg-gradient-to-br ${layoutStyle.gradient}`
                )}
                style={{ backgroundColor: bgColor }}
            >
                {/* Mini slide content */}
                <div className="absolute inset-0 p-2">
                    {/* Title */}
                    <div
                        className="mb-1 truncate text-[7px] font-bold leading-tight"
                        style={{ color: primaryColor }}
                    >
                        {slide.title}
                    </div>

                    {/* Content preview */}
                    <div className="space-y-0.5">
                        {slide.content.slice(0, 3).map((point, idx) => (
                            <div key={idx} className="flex items-start gap-1">
                                <span
                                    className="mt-[2px] h-1 w-1 flex-shrink-0 rounded-full"
                                    style={{ backgroundColor: accentColor }}
                                />
                                <span
                                    className="line-clamp-1 text-[5px] leading-tight"
                                    style={{ color: textColor }}
                                >
                                    {point}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Image indicator */}
                    {slide.imageUrl && (
                        <div className="absolute bottom-1 right-1">
                            <ImageIcon className="h-2.5 w-2.5 text-muted-foreground/50" />
                        </div>
                    )}
                </div>

                {/* Layout type badge */}
                <div className="absolute bottom-1 left-1 rounded bg-black/20 px-1 py-0.5">
                    <span className="text-[6px] font-bold text-white/80">
                        {layoutStyle.icon}
                    </span>
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
