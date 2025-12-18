/**
 * SlidePreview Component
 * Premium WYSIWYG slide preview with 2025 design trends
 * Uses shared SlideContentRenderer for consistency with SlideThumbnail
 *
 * Related: GitHub Issue #327 - Premium Layout and Styling System
 * Enhanced: Premium Slide Design improvements - Dynamic brand gradients
 */

"use client";

import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SlideContentRenderer } from "./slide-content-renderer";
import type { SlideData, BrandDesign } from "./slide-types";

interface SlidePreviewProps {
    slide: SlideData;
    slideIndex: number;
    totalSlides: number;
    brandDesign?: BrandDesign | null;
    onPrevious: () => void;
    onNext: () => void;
    className?: string;
}

export const SlidePreview = memo(function SlidePreview({
    slide,
    slideIndex,
    totalSlides,
    brandDesign,
    onPrevious,
    onNext,
    className,
}: SlidePreviewProps) {
    // Guard against undefined slide - can happen during initial load or empty presentations
    if (!slide) {
        return (
            <div className={cn("flex flex-col", className)}>
                <div className="flex items-center justify-between border-b bg-card px-4 py-2">
                    <span className="text-sm text-muted-foreground">
                        Loading slide...
                    </span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-muted/50 p-8">
                    <div className="relative aspect-[16/9] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse">
                        <div className="flex h-full items-center justify-center">
                            <span className="text-muted-foreground">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col", className)}>
            {/* Navigation */}
            <div className="flex items-center justify-between border-b bg-card px-4 py-2">
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={slideIndex === 0}
                    onClick={onPrevious}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                    Slide {slideIndex + 1} of {totalSlides}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={slideIndex === totalSlides - 1}
                    onClick={onNext}
                >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>

            {/* Slide Preview - Using shared renderer for consistency with thumbnails */}
            <div className="flex-1 flex items-center justify-center bg-muted/50 p-8 overflow-auto">
                <div className="w-full max-w-4xl">
                    <SlideContentRenderer
                        slide={slide}
                        slideIndex={slideIndex}
                        totalSlides={totalSlides}
                        brandDesign={brandDesign}
                        showImagePlaceholder={true}
                    />
                </div>
            </div>
        </div>
    );
});
