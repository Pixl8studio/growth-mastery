/**
 * SlidePreview Component
 * Premium WYSIWYG slide preview with 2025 design trends
 *
 * Related: GitHub Issue #327 - Premium Layout and Styling System
 */

"use client";

import { memo } from "react";
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

// Premium gradient backgrounds based on layout type
const LAYOUT_GRADIENTS: Record<SlideData["layoutType"], string> = {
    title: "from-slate-900 via-slate-800 to-slate-900",
    section: "from-indigo-900 via-indigo-800 to-purple-900",
    content_left: "from-slate-50 to-gray-100",
    content_right: "from-slate-50 to-gray-100",
    bullets: "from-white to-slate-50",
    quote: "from-amber-50 via-orange-50 to-rose-50",
    statistics: "from-cyan-50 to-blue-50",
    comparison: "from-violet-50 to-purple-50",
    process: "from-emerald-50 to-teal-50",
    cta: "from-orange-500 via-red-500 to-pink-500",
};

// Text colors based on background
const LAYOUT_TEXT_COLORS: Record<
    SlideData["layoutType"],
    { title: string; body: string }
> = {
    title: { title: "text-white", body: "text-white/80" },
    section: { title: "text-white", body: "text-white/70" },
    content_left: { title: "text-slate-900", body: "text-slate-700" },
    content_right: { title: "text-slate-900", body: "text-slate-700" },
    bullets: { title: "text-slate-900", body: "text-slate-700" },
    quote: { title: "text-amber-900", body: "text-amber-800" },
    statistics: { title: "text-cyan-900", body: "text-cyan-700" },
    comparison: { title: "text-violet-900", body: "text-violet-700" },
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

    const layoutGradient =
        LAYOUT_GRADIENTS[slide.layoutType] || LAYOUT_GRADIENTS.bullets;
    const textColors =
        LAYOUT_TEXT_COLORS[slide.layoutType] || LAYOUT_TEXT_COLORS.bullets;

    // Use brand colors when available
    const titleColor = brandDesign?.primary_color;
    const accentColor = brandDesign?.accent_color || brandDesign?.primary_color;
    const bgColor = brandDesign?.background_color;

    const renderSlideContent = () => {
        switch (slide.layoutType) {
            case "title":
                return (
                    <div className="flex h-full flex-col items-center justify-center text-center p-12">
                        <h1
                            className={cn(
                                "text-5xl font-bold leading-tight mb-6",
                                textColors.title
                            )}
                            style={
                                titleColor && slide.layoutType !== "title"
                                    ? { color: titleColor }
                                    : undefined
                            }
                        >
                            {slide.title}
                        </h1>
                        {slide.content[0] && (
                            <p className={cn("text-xl max-w-2xl", textColors.body)}>
                                {slide.content[0]}
                            </p>
                        )}
                        {brandDesign?.brand_name && (
                            <div className="absolute bottom-8 text-sm opacity-60">
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
                        <h2 className={cn("text-4xl font-bold", textColors.title)}>
                            {slide.title}
                        </h2>
                        {slide.content[0] && (
                            <p className={cn("mt-4 text-lg max-w-xl", textColors.body)}>
                                {slide.content[0]}
                            </p>
                        )}
                    </div>
                );

            case "quote":
                return (
                    <div className="flex h-full flex-col items-center justify-center p-12">
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
                                    textColors.title
                                )}
                            >
                                {slide.content[0] || slide.title}
                            </blockquote>
                            {slide.content[1] && (
                                <p
                                    className={cn(
                                        "mt-6 text-lg font-medium",
                                        textColors.body
                                    )}
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
                        <h2
                            className={cn("text-3xl font-bold mb-8", textColors.title)}
                            style={{ color: titleColor }}
                        >
                            {slide.title}
                        </h2>
                        <div className="grid grid-cols-3 gap-8 flex-1 items-center">
                            {slide.content.slice(0, 3).map((stat, idx) => (
                                <div key={idx} className="text-center">
                                    <div
                                        className="text-5xl font-bold mb-2"
                                        style={{ color: accentColor }}
                                    >
                                        {stat.match(/\d+%?/)?.[0] || idx + 1}
                                    </div>
                                    <p className={cn("text-sm", textColors.body)}>
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
                                textColors.title
                            )}
                            style={{ color: titleColor }}
                        >
                            {slide.title}
                        </h2>
                        <div className="grid grid-cols-2 gap-8 flex-1">
                            <div className="rounded-2xl bg-white/50 p-6 shadow-sm">
                                <h3 className="text-lg font-semibold mb-4">Before</h3>
                                <ul className="space-y-2">
                                    {slide.content
                                        .slice(0, Math.ceil(slide.content.length / 2))
                                        .map((point, idx) => (
                                            <li
                                                key={idx}
                                                className={cn(
                                                    "text-sm",
                                                    textColors.body
                                                )}
                                            >
                                                • {point}
                                            </li>
                                        ))}
                                </ul>
                            </div>
                            <div className="rounded-2xl bg-white/50 p-6 shadow-sm">
                                <h3 className="text-lg font-semibold mb-4">After</h3>
                                <ul className="space-y-2">
                                    {slide.content
                                        .slice(Math.ceil(slide.content.length / 2))
                                        .map((point, idx) => (
                                            <li
                                                key={idx}
                                                className={cn(
                                                    "text-sm",
                                                    textColors.body
                                                )}
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
                            className={cn("text-3xl font-bold mb-8", textColors.title)}
                            style={{ color: titleColor }}
                        >
                            {slide.title}
                        </h2>
                        <div className="flex-1 flex items-center">
                            <div className="grid grid-cols-4 gap-4 w-full">
                                {slide.content.slice(0, 4).map((step, idx) => (
                                    <div key={idx} className="text-center">
                                        <div
                                            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-white text-xl font-bold"
                                            style={{ backgroundColor: accentColor }}
                                        >
                                            {idx + 1}
                                        </div>
                                        <p className={cn("text-sm", textColors.body)}>
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
                        <h2 className={cn("text-4xl font-bold mb-6", textColors.title)}>
                            {slide.title}
                        </h2>
                        {slide.content[0] && (
                            <p
                                className={cn(
                                    "text-xl mb-8 max-w-2xl",
                                    textColors.body
                                )}
                            >
                                {slide.content[0]}
                            </p>
                        )}
                        <div className="rounded-full bg-white px-8 py-4 text-lg font-semibold shadow-lg">
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
                        <h2
                            className={cn("text-3xl font-bold mb-6", textColors.title)}
                            style={{ color: titleColor }}
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
                                <div className="rounded-2xl overflow-hidden bg-muted/30">
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
                                        <span
                                            className="mt-2 h-2 w-2 flex-shrink-0 rounded-full"
                                            style={{ backgroundColor: accentColor }}
                                        />
                                        <span className={textColors.body}>{point}</span>
                                    </li>
                                ))}
                            </ul>
                            {slide.layoutType === "content_left" && slide.imageUrl && (
                                <div className="rounded-2xl overflow-hidden bg-muted/30">
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
                        !bgColor && `bg-gradient-to-br ${layoutGradient}`
                    )}
                    style={
                        bgColor &&
                        slide.layoutType !== "title" &&
                        slide.layoutType !== "section" &&
                        slide.layoutType !== "cta"
                            ? { backgroundColor: bgColor }
                            : undefined
                    }
                >
                    {/* Decorative elements */}
                    {(slide.layoutType === "title" || slide.layoutType === "cta") && (
                        <>
                            <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
                            <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
                        </>
                    )}

                    {/* Slide content */}
                    <div className="relative h-full">{renderSlideContent()}</div>

                    {/* Footer */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs opacity-50">
                        <span
                            style={{
                                color:
                                    textColors.body === "text-white/80" ||
                                    textColors.body === "text-white/70" ||
                                    textColors.body === "text-white/90"
                                        ? "#fff"
                                        : undefined,
                            }}
                        >
                            {brandDesign?.brand_name || ""}
                        </span>
                        <span
                            style={{
                                color:
                                    textColors.body === "text-white/80" ||
                                    textColors.body === "text-white/70" ||
                                    textColors.body === "text-white/90"
                                        ? "#fff"
                                        : undefined,
                            }}
                        >
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
