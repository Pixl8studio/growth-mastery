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
    /** Whether presentation is currently generating */
    isGenerating?: boolean;
}

export const SlidePreview = memo(function SlidePreview({
    slide,
    slideIndex,
    totalSlides,
    brandDesign,
    onPrevious,
    onNext,
    className,
    isGenerating,
}: SlidePreviewProps) {
    // Guard against undefined slide - can happen during initial load or empty presentations
    // Show branded generation placeholder when generating
    if (!slide) {
        return (
            <div className={cn("flex flex-col", className)}>
                <div className="flex items-center justify-between border-b bg-card px-4 py-2">
                    <span className="text-sm text-muted-foreground">
                        {isGenerating
                            ? "Generating your presentation..."
                            : "Loading slide..."}
                    </span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-muted/50 p-8">
                    <div
                        className="relative aspect-[16/9] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden"
                        style={{
                            background: brandDesign?.primary_color
                                ? `linear-gradient(135deg, ${brandDesign.primary_color} 0%, ${brandDesign.secondary_color || brandDesign.primary_color}90 100%)`
                                : "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                        }}
                    >
                        {isGenerating ? (
                            <div className="flex h-full flex-col items-center justify-center p-12 text-center">
                                {/* Animated rings */}
                                <div className="relative mb-8">
                                    <div
                                        className="h-20 w-20 rounded-full border-4 border-t-transparent animate-spin"
                                        style={{
                                            borderColor:
                                                brandDesign?.accent_color || "#4ade80",
                                            borderTopColor: "transparent",
                                        }}
                                    />
                                    <div
                                        className="absolute inset-2 h-16 w-16 rounded-full border-4 border-b-transparent animate-spin"
                                        style={{
                                            borderColor: brandDesign?.accent_color
                                                ? `${brandDesign.accent_color}80`
                                                : "#4ade8080",
                                            borderBottomColor: "transparent",
                                            animationDirection: "reverse",
                                            animationDuration: "1.5s",
                                        }}
                                    />
                                </div>

                                {/* Title */}
                                <h2
                                    className="mb-4 text-3xl font-bold"
                                    style={{
                                        color: brandDesign?.text_color || "#ffffff",
                                    }}
                                >
                                    Creating Your Presentation
                                </h2>

                                {/* Description */}
                                <p
                                    className="mb-6 max-w-md text-lg opacity-90"
                                    style={{
                                        color: brandDesign?.text_color || "#ffffff",
                                    }}
                                >
                                    Our AI is crafting each slide with care, generating
                                    custom images and compelling content tailored to
                                    your brand.
                                </p>

                                {/* Time estimate */}
                                <div
                                    className="mb-4 rounded-full px-6 py-2 text-sm font-medium"
                                    style={{
                                        backgroundColor:
                                            brandDesign?.accent_color || "#4ade80",
                                        color: "#1a1a2e",
                                    }}
                                >
                                    This typically takes 12-18 minutes
                                </div>

                                {/* Warning */}
                                <p
                                    className="text-sm opacity-70"
                                    style={{
                                        color: brandDesign?.text_color || "#ffffff",
                                    }}
                                >
                                    Please do not close this window during generation
                                </p>

                                {/* Brand name */}
                                {brandDesign?.brand_name && (
                                    <div
                                        className="absolute bottom-8 text-sm opacity-50"
                                        style={{
                                            color: brandDesign?.text_color || "#ffffff",
                                        }}
                                    >
                                        {brandDesign.brand_name}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center animate-pulse">
                                <span className="text-white/70">Loading...</span>
                            </div>
                        )}
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
