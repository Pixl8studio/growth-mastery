/**
 * SlidePreview Component
 * Premium WYSIWYG slide preview with 2025 design trends
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

interface SlidePreviewProps {
    slide: SlideData;
    slideIndex: number;
    totalSlides: number;
    brandDesign?: BrandDesign | null;
    onPrevious: () => void;
    onNext: () => void;
    className?: string;
}

// ============================================================================
// Dynamic Gradient Generation from Brand Colors
// ============================================================================

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
}

/**
 * Lighten a hex color by a percentage
 */
function lightenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const factor = percent / 100;
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));

    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const factor = 1 - percent / 100;
    const r = Math.round(rgb.r * factor);
    const g = Math.round(rgb.g * factor);
    const b = Math.round(rgb.b * factor);

    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Generate dynamic gradient CSS for a slide layout based on brand colors
 * Implements the 60-30-10 color rule from PRESENTATION_DESIGN_SYSTEM.md
 */
function generateBrandGradient(
    layoutType: SlideData["layoutType"],
    brandDesign: BrandDesign | null | undefined
): React.CSSProperties {
    if (!brandDesign?.primary_color) {
        // Fallback to premium defaults when no brand colors
        return {};
    }

    const primary = brandDesign.primary_color;
    const secondary = brandDesign.secondary_color || darkenColor(primary, 20);
    const accent = brandDesign.accent_color || lightenColor(primary, 30);
    const background = brandDesign.background_color || "#FFFFFF";

    switch (layoutType) {
        case "title":
            // Bold, immersive gradient for title slides
            return {
                background: `linear-gradient(135deg, ${darkenColor(primary, 30)} 0%, ${primary} 50%, ${darkenColor(primary, 20)} 100%)`,
            };

        case "section":
            // Section headers use primary with subtle secondary blend
            return {
                background: `linear-gradient(120deg, ${darkenColor(primary, 20)} 0%, ${primary} 60%, ${secondary} 100%)`,
            };

        case "cta":
            // High-energy gradient for call-to-action
            return {
                background: `linear-gradient(135deg, ${primary} 0%, ${accent} 50%, ${lightenColor(accent, 20)} 100%)`,
            };

        case "quote":
            // Warm, subtle gradient for testimonials
            return {
                background: `linear-gradient(180deg, ${lightenColor(primary, 92)} 0%, ${lightenColor(primary, 85)} 100%)`,
            };

        case "statistics":
            // Clean gradient that lets numbers pop
            return {
                background: `linear-gradient(180deg, ${lightenColor(primary, 95)} 0%, ${lightenColor(secondary, 90)} 100%)`,
            };

        case "comparison":
            // Neutral base for before/after contrast
            return {
                background: `linear-gradient(180deg, ${lightenColor(primary, 94)} 0%, ${lightenColor(accent, 92)} 100%)`,
            };

        case "process":
            // Progressive gradient suggesting forward movement
            return {
                background: `linear-gradient(90deg, ${lightenColor(primary, 93)} 0%, ${lightenColor(accent, 95)} 100%)`,
            };

        case "content_left":
        case "content_right":
        case "bullets":
        default:
            // Clean, professional background with subtle brand presence
            return {
                background: `linear-gradient(180deg, ${background} 0%, ${lightenColor(primary, 96)} 100%)`,
            };
    }
}

/**
 * Get text colors based on brand and layout
 */
function getBrandTextColors(
    layoutType: SlideData["layoutType"],
    brandDesign: BrandDesign | null | undefined
): { title: string; body: string } {
    const isDarkBg =
        layoutType === "title" ||
        layoutType === "section" ||
        layoutType === "cta";

    if (isDarkBg) {
        return { title: "#FFFFFF", body: "rgba(255, 255, 255, 0.85)" };
    }

    // For light backgrounds, use brand text color or dark defaults
    const textColor = brandDesign?.text_color || "#1a1a2e";
    return {
        title: textColor,
        body: brandDesign?.text_color
            ? lightenColor(textColor, 20)
            : "#4a4a5e",
    };
}

// Fallback gradients when no brand colors (now avoiding anti-pattern colors)
const FALLBACK_GRADIENTS: Record<SlideData["layoutType"], string> = {
    title: "from-slate-900 via-slate-800 to-slate-900",
    section: "from-slate-800 via-slate-700 to-slate-800",
    content_left: "from-slate-50 to-gray-100",
    content_right: "from-slate-50 to-gray-100",
    bullets: "from-white to-slate-50",
    quote: "from-amber-50 via-orange-50 to-amber-100",
    statistics: "from-slate-50 to-gray-100",
    comparison: "from-slate-50 to-gray-100",
    process: "from-emerald-50 to-teal-50",
    cta: "from-slate-800 via-slate-700 to-slate-900",
};

// Fallback text colors
const FALLBACK_TEXT_COLORS: Record<
    SlideData["layoutType"],
    { title: string; body: string }
> = {
    title: { title: "text-white", body: "text-white/80" },
    section: { title: "text-white", body: "text-white/70" },
    content_left: { title: "text-slate-900", body: "text-slate-700" },
    content_right: { title: "text-slate-900", body: "text-slate-700" },
    bullets: { title: "text-slate-900", body: "text-slate-700" },
    quote: { title: "text-amber-900", body: "text-amber-800" },
    statistics: { title: "text-slate-900", body: "text-slate-700" },
    comparison: { title: "text-slate-900", body: "text-slate-700" },
    process: { title: "text-emerald-900", body: "text-emerald-700" },
    cta: { title: "text-white", body: "text-white/90" },
};

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

    // Use dynamic brand gradients when available, fallback to premium defaults
    const dynamicGradientStyle = useMemo(
        () => generateBrandGradient(slide.layoutType, brandDesign),
        [slide.layoutType, brandDesign]
    );

    const hasBrandColors = Boolean(brandDesign?.primary_color);
    const fallbackGradient =
        FALLBACK_GRADIENTS[slide.layoutType] || FALLBACK_GRADIENTS.bullets;

    // Dynamic text colors based on brand
    const brandTextColors = useMemo(
        () => getBrandTextColors(slide.layoutType, brandDesign),
        [slide.layoutType, brandDesign]
    );

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
                                                !hasBrandColors && fallbackTextColors.body
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
