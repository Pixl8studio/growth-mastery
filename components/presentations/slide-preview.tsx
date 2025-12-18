/**
 * SlidePreview Component
 * Premium WYSIWYG slide preview with 2025 design trends
 * Uses shared gradient utilities for consistency with SlideThumbnail
 *
 * Related: GitHub Issue #327 - Premium Layout and Styling System
 * Enhanced: Premium Slide Design improvements - Dynamic brand gradients
 */

"use client";

import { memo, useMemo } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SlideData, BrandDesign } from "./slide-thumbnail";
import {
    generateBrandGradient,
    getBrandTextColors,
    lightenColor,
    FALLBACK_GRADIENTS,
    FALLBACK_TEXT_COLORS,
} from "./slide-design-utils";

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
    // Hooks must be called before any conditional returns
    const hasBrandColors = Boolean(brandDesign?.primary_color);

    // Use dynamic brand gradients when available, fallback to premium defaults
    const dynamicGradientStyle = useMemo(
        () => (slide ? generateBrandGradient(slide.layoutType, brandDesign) : {}),
        [slide, brandDesign]
    );

    // Dynamic text colors based on brand
    const brandTextColors = useMemo(
        () =>
            slide
                ? getBrandTextColors(slide.layoutType, brandDesign)
                : { title: "#1a1a2e", body: "#4a4a5e" },
        [slide, brandDesign]
    );

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

    const fallbackGradient =
        FALLBACK_GRADIENTS[slide.layoutType] || FALLBACK_GRADIENTS.bullets;

    // Fallback text colors for when no brand is set
    const fallbackTextColors =
        FALLBACK_TEXT_COLORS[slide.layoutType] || FALLBACK_TEXT_COLORS.bullets;

    // Use brand colors when available
    const accentColor = brandDesign?.accent_color || brandDesign?.primary_color;

    // Helper to get inline style for text color (used when brand colors are set)
    const getTitleStyle = (): React.CSSProperties | undefined => {
        if (!hasBrandColors) return undefined;
        return { color: brandTextColors.title };
    };

    const getBodyStyle = (): React.CSSProperties | undefined => {
        if (!hasBrandColors) return undefined;
        return { color: brandTextColors.body };
    };

    const renderSlideContent = () => {
        switch (slide.layoutType) {
            case "title":
                return (
                    <div className="flex h-full flex-col items-center justify-center text-center p-12">
                        {/* Signature move: colored left border accent */}
                        {hasBrandColors && (
                            <div
                                className="absolute left-0 top-1/4 bottom-1/4 w-1.5 rounded-r-full"
                                style={{ backgroundColor: accentColor }}
                            />
                        )}
                        <h1
                            className={cn(
                                "text-5xl font-bold leading-tight mb-6",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h1>
                        {slide.content[0] && (
                            <p
                                className={cn(
                                    "text-xl max-w-2xl",
                                    !hasBrandColors && fallbackTextColors.body
                                )}
                                style={getBodyStyle()}
                            >
                                {slide.content[0]}
                            </p>
                        )}
                        {brandDesign?.brand_name && (
                            <div
                                className="absolute bottom-8 text-sm opacity-60"
                                style={getBodyStyle()}
                            >
                                {brandDesign.brand_name}
                            </div>
                        )}
                    </div>
                );

            case "section":
                return (
                    <div className="flex h-full flex-col items-center justify-center text-center p-12">
                        <div
                            className="mb-4 h-1 w-24 rounded-full"
                            style={{ backgroundColor: accentColor || "#fff" }}
                        />
                        <h2
                            className={cn(
                                "text-4xl font-bold",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        {slide.content[0] && (
                            <p
                                className={cn(
                                    "mt-4 text-lg max-w-xl",
                                    !hasBrandColors && fallbackTextColors.body
                                )}
                                style={getBodyStyle()}
                            >
                                {slide.content[0]}
                            </p>
                        )}
                    </div>
                );

            case "quote":
                return (
                    <div className="flex h-full flex-col items-center justify-center p-12">
                        {/* Signature move: large stylized quote mark */}
                        <div className="relative max-w-3xl text-center">
                            <div
                                className="absolute -left-8 -top-8 text-8xl opacity-20 font-serif"
                                style={{ color: accentColor }}
                            >
                                "
                            </div>
                            <blockquote
                                className={cn(
                                    "text-2xl italic leading-relaxed",
                                    !hasBrandColors && fallbackTextColors.title
                                )}
                                style={getTitleStyle()}
                            >
                                {slide.content[0] || slide.title}
                            </blockquote>
                            {slide.content[1] && (
                                <p
                                    className={cn(
                                        "mt-6 text-lg font-medium",
                                        !hasBrandColors && fallbackTextColors.body
                                    )}
                                    style={getBodyStyle()}
                                >
                                    — {slide.content[1]}
                                </p>
                            )}
                        </div>
                    </div>
                );

            case "statistics":
                return (
                    <div className="flex h-full flex-col p-12">
                        {/* Signature move: colored left border */}
                        {hasBrandColors && (
                            <div
                                className="absolute left-0 top-12 bottom-12 w-1.5 rounded-r-full"
                                style={{ backgroundColor: accentColor }}
                            />
                        )}
                        <h2
                            className={cn(
                                "text-3xl font-bold mb-8",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        <div className="grid grid-cols-3 gap-8 flex-1 items-center">
                            {slide.content.slice(0, 3).map((stat, idx) => (
                                <div key={idx} className="text-center">
                                    {/* Signature move: large stylized numbers */}
                                    <div
                                        className="text-5xl font-bold mb-2"
                                        style={{ color: accentColor }}
                                    >
                                        {stat.match(/\d+%?/)?.[0] || idx + 1}
                                    </div>
                                    <p
                                        className={cn(
                                            "text-sm",
                                            !hasBrandColors && fallbackTextColors.body
                                        )}
                                        style={getBodyStyle()}
                                    >
                                        {stat.replace(/\d+%?\s*/, "")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case "comparison":
                return (
                    <div className="flex h-full flex-col p-12">
                        <h2
                            className={cn(
                                "text-3xl font-bold mb-8 text-center",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        <div className="grid grid-cols-2 gap-8 flex-1">
                            {/* Before card with subtle brand accent */}
                            <div
                                className="rounded-2xl p-6 shadow-sm"
                                style={{
                                    backgroundColor: hasBrandColors
                                        ? lightenColor(
                                              brandDesign?.primary_color || "#fff",
                                              95
                                          )
                                        : "rgba(255,255,255,0.5)",
                                }}
                            >
                                <h3 className="text-lg font-semibold mb-4">Before</h3>
                                <ul className="space-y-2">
                                    {slide.content
                                        .slice(0, Math.ceil(slide.content.length / 2))
                                        .map((point, idx) => (
                                            <li
                                                key={idx}
                                                className={cn(
                                                    "text-sm",
                                                    !hasBrandColors &&
                                                        fallbackTextColors.body
                                                )}
                                                style={getBodyStyle()}
                                            >
                                                • {point}
                                            </li>
                                        ))}
                                </ul>
                            </div>
                            {/* After card with brand accent border */}
                            <div
                                className="rounded-2xl p-6 shadow-sm border-l-4"
                                style={{
                                    backgroundColor: hasBrandColors
                                        ? lightenColor(
                                              brandDesign?.accent_color ||
                                                  brandDesign?.primary_color ||
                                                  "#fff",
                                              93
                                          )
                                        : "rgba(255,255,255,0.5)",
                                    borderColor: accentColor || "transparent",
                                }}
                            >
                                <h3 className="text-lg font-semibold mb-4">After</h3>
                                <ul className="space-y-2">
                                    {slide.content
                                        .slice(Math.ceil(slide.content.length / 2))
                                        .map((point, idx) => (
                                            <li
                                                key={idx}
                                                className={cn(
                                                    "text-sm",
                                                    !hasBrandColors &&
                                                        fallbackTextColors.body
                                                )}
                                                style={getBodyStyle()}
                                            >
                                                • {point}
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                );

            case "process":
                return (
                    <div className="flex h-full flex-col p-12">
                        <h2
                            className={cn(
                                "text-3xl font-bold mb-8",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        <div className="flex-1 flex items-center">
                            <div className="grid grid-cols-4 gap-4 w-full">
                                {slide.content.slice(0, 4).map((step, idx) => (
                                    <div key={idx} className="text-center">
                                        {/* Signature move: large numbered circles */}
                                        <div
                                            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-white text-xl font-bold shadow-lg"
                                            style={{ backgroundColor: accentColor }}
                                        >
                                            {idx + 1}
                                        </div>
                                        <p
                                            className={cn(
                                                "text-sm",
                                                !hasBrandColors &&
                                                    fallbackTextColors.body
                                            )}
                                            style={getBodyStyle()}
                                        >
                                            {step}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case "cta":
                return (
                    <div className="flex h-full flex-col items-center justify-center text-center p-12">
                        <h2
                            className={cn(
                                "text-4xl font-bold mb-6",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        {slide.content[0] && (
                            <p
                                className={cn(
                                    "text-xl mb-8 max-w-2xl",
                                    !hasBrandColors && fallbackTextColors.body
                                )}
                                style={getBodyStyle()}
                            >
                                {slide.content[0]}
                            </p>
                        )}
                        {/* Premium CTA button with brand accent */}
                        <div
                            className="rounded-full px-10 py-5 text-lg font-semibold shadow-xl transition-transform hover:scale-105"
                            style={{
                                backgroundColor: hasBrandColors ? "#fff" : "#fff",
                                color: accentColor || "#1a1a2e",
                            }}
                        >
                            {slide.content[1] || "Get Started Now"}
                        </div>
                    </div>
                );

            case "content_left":
            case "content_right":
            case "bullets":
            default:
                return (
                    <div className="flex h-full flex-col p-12">
                        {/* Signature move: colored left border */}
                        {hasBrandColors && (
                            <div
                                className="absolute left-0 top-12 bottom-12 w-1.5 rounded-r-full"
                                style={{ backgroundColor: accentColor }}
                            />
                        )}
                        <h2
                            className={cn(
                                "text-3xl font-bold mb-6",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        <div
                            className={cn(
                                "flex-1 grid gap-8",
                                slide.imageUrl &&
                                    slide.layoutType === "content_left" &&
                                    "grid-cols-2",
                                slide.imageUrl &&
                                    slide.layoutType === "content_right" &&
                                    "grid-cols-2"
                            )}
                        >
                            {slide.layoutType === "content_right" && slide.imageUrl && (
                                <div className="rounded-2xl overflow-hidden bg-muted/30 shadow-lg">
                                    <img
                                        src={slide.imageUrl}
                                        alt={slide.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <ul className="space-y-4">
                                {slide.content.map((point, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-start gap-3 text-lg"
                                    >
                                        {/* Premium bullet point with brand accent */}
                                        <span
                                            className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full shadow-sm"
                                            style={{ backgroundColor: accentColor }}
                                        />
                                        <span
                                            className={
                                                !hasBrandColors
                                                    ? fallbackTextColors.body
                                                    : undefined
                                            }
                                            style={getBodyStyle()}
                                        >
                                            {point}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {slide.layoutType === "content_left" && slide.imageUrl && (
                                <div className="rounded-2xl overflow-hidden bg-muted/30 shadow-lg">
                                    <img
                                        src={slide.imageUrl}
                                        alt={slide.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );
        }
    };

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

            {/* Slide Preview */}
            <div className="flex-1 flex items-center justify-center bg-muted/50 p-8 overflow-auto">
                <div
                    className={cn(
                        "relative aspect-[16/9] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden",
                        // Only use fallback Tailwind gradients when no brand colors
                        !hasBrandColors && `bg-gradient-to-br ${fallbackGradient}`
                    )}
                    style={
                        // Use dynamic brand gradients when available
                        hasBrandColors ? dynamicGradientStyle : undefined
                    }
                >
                    {/* Premium decorative elements with brand-aware glow */}
                    {(slide.layoutType === "title" || slide.layoutType === "cta") && (
                        <>
                            <div
                                className="absolute -top-32 -right-32 h-64 w-64 rounded-full blur-3xl"
                                style={{
                                    backgroundColor: hasBrandColors
                                        ? lightenColor(
                                              brandDesign?.accent_color ||
                                                  brandDesign?.primary_color ||
                                                  "#fff",
                                              50
                                          )
                                        : "rgba(255,255,255,0.05)",
                                    opacity: hasBrandColors ? 0.3 : 1,
                                }}
                            />
                            <div
                                className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full blur-3xl"
                                style={{
                                    backgroundColor: hasBrandColors
                                        ? lightenColor(
                                              brandDesign?.primary_color || "#fff",
                                              40
                                          )
                                        : "rgba(255,255,255,0.05)",
                                    opacity: hasBrandColors ? 0.25 : 1,
                                }}
                            />
                        </>
                    )}

                    {/* Section divider gradient for section slides */}
                    {slide.layoutType === "section" && hasBrandColors && (
                        <div
                            className="absolute bottom-0 left-0 right-0 h-1"
                            style={{
                                background: `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`,
                            }}
                        />
                    )}

                    {/* Slide content */}
                    <div className="relative h-full">{renderSlideContent()}</div>

                    {/* Premium footer with brand colors */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs opacity-50">
                        <span style={getBodyStyle()}>
                            {brandDesign?.brand_name || ""}
                        </span>
                        <span style={getBodyStyle()}>
                            {slideIndex + 1} / {totalSlides}
                        </span>
                    </div>

                    {/* Image indicator when no image but has prompt */}
                    {slide.imagePrompt && !slide.imageUrl && (
                        <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-black/20 px-2 py-1 text-xs text-white/70">
                            <ImageIcon className="h-3 w-3" />
                            Image ready to generate
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
