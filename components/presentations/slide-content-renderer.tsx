/**
 * SlideContentRenderer Component
 * Shared rendering logic for slide content - used by both SlidePreview and SlideThumbnail
 * This ensures thumbnails are pixel-perfect scaled-down versions of the preview
 *
 * Related: GitHub Issue #327 - Premium Layout and Styling System
 */

"use client";

import { memo, useMemo } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlideData, BrandDesign } from "./slide-types";
import {
    generateBrandGradient,
    getBrandTextColors,
    lightenColor,
    FALLBACK_GRADIENTS,
    FALLBACK_TEXT_COLORS,
} from "./slide-design-utils";

interface SlideContentRendererProps {
    slide: SlideData;
    slideIndex: number;
    totalSlides: number;
    brandDesign?: BrandDesign | null;
    /** Scale factor for thumbnails (e.g., 0.2 for 20% size) */
    scale?: number;
    /** Whether to show the image placeholder */
    showImagePlaceholder?: boolean;
    className?: string;
}

export const SlideContentRenderer = memo(function SlideContentRenderer({
    slide,
    slideIndex,
    totalSlides,
    brandDesign,
    scale = 1,
    showImagePlaceholder = true,
    className,
}: SlideContentRendererProps) {
    const hasBrandColors = Boolean(brandDesign?.primary_color);

    const dynamicGradientStyle = useMemo(
        () => generateBrandGradient(slide.layoutType, brandDesign),
        [slide.layoutType, brandDesign]
    );

    const brandTextColors = useMemo(
        () => getBrandTextColors(slide.layoutType, brandDesign),
        [slide.layoutType, brandDesign]
    );

    const fallbackGradient =
        FALLBACK_GRADIENTS[slide.layoutType] || FALLBACK_GRADIENTS.bullets;
    const fallbackTextColors =
        FALLBACK_TEXT_COLORS[slide.layoutType] || FALLBACK_TEXT_COLORS.bullets;
    const accentColor = brandDesign?.accent_color || brandDesign?.primary_color;

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
                    <div className="flex h-full flex-col items-center justify-center text-center p-12 overflow-hidden">
                        {hasBrandColors && (
                            <div
                                className="absolute left-0 top-1/4 bottom-1/4 w-1.5 rounded-r-full"
                                style={{ backgroundColor: accentColor }}
                            />
                        )}
                        <h1
                            className={cn(
                                "text-5xl font-bold leading-tight mb-6 line-clamp-3",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h1>
                        {slide.content[0] && (
                            <p
                                className={cn(
                                    "text-xl max-w-2xl line-clamp-3",
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
                    <div className="flex h-full flex-col items-center justify-center text-center p-12 overflow-hidden">
                        <div
                            className="mb-4 h-1 w-24 rounded-full flex-shrink-0"
                            style={{ backgroundColor: accentColor || "#fff" }}
                        />
                        <h2
                            className={cn(
                                "text-4xl font-bold line-clamp-2",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        {slide.content[0] && (
                            <p
                                className={cn(
                                    "mt-4 text-lg max-w-xl line-clamp-3",
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
                    <div className="flex h-full flex-col items-center justify-center p-12 overflow-hidden">
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
                            {/* Attribution line removed - quote stands alone */}
                        </div>
                    </div>
                );

            case "statistics":
                return (
                    <div className="flex h-full flex-col p-12 overflow-hidden">
                        {hasBrandColors && (
                            <div
                                className="absolute left-0 top-12 bottom-12 w-1.5 rounded-r-full"
                                style={{ backgroundColor: accentColor }}
                            />
                        )}
                        <h2
                            className={cn(
                                "text-3xl font-bold mb-8 line-clamp-2 flex-shrink-0",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        <div className="grid grid-cols-3 gap-8 flex-1 items-center min-h-0">
                            {slide.content.slice(0, 3).map((stat, idx) => (
                                <div key={idx} className="text-center overflow-hidden">
                                    <div
                                        className="text-5xl font-bold mb-2"
                                        style={{ color: accentColor }}
                                    >
                                        {stat.match(/\d+%?/)?.[0] || idx + 1}
                                    </div>
                                    <p
                                        className={cn(
                                            "text-sm line-clamp-2",
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
                    <div className="flex h-full flex-col p-12 overflow-hidden">
                        <h2
                            className={cn(
                                "text-3xl font-bold mb-8 text-center line-clamp-2 flex-shrink-0",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        <div className="grid grid-cols-2 gap-8 flex-1 min-h-0">
                            <div
                                className="rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col"
                                style={{
                                    backgroundColor: hasBrandColors
                                        ? lightenColor(
                                              brandDesign?.primary_color || "#fff",
                                              95
                                          )
                                        : "rgba(255,255,255,0.5)",
                                }}
                            >
                                <h3 className="text-lg font-semibold mb-4 flex-shrink-0">
                                    Before
                                </h3>
                                <ul className="space-y-2 overflow-hidden">
                                    {slide.content
                                        .slice(
                                            0,
                                            Math.min(
                                                3,
                                                Math.ceil(slide.content.length / 2)
                                            )
                                        )
                                        .map((point, idx) => (
                                            <li
                                                key={idx}
                                                className={cn(
                                                    "text-sm line-clamp-2",
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
                            <div
                                className="rounded-2xl p-6 shadow-sm border-l-4 overflow-hidden flex flex-col"
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
                                <h3 className="text-lg font-semibold mb-4 flex-shrink-0">
                                    After
                                </h3>
                                <ul className="space-y-2 overflow-hidden">
                                    {slide.content
                                        .slice(
                                            Math.ceil(slide.content.length / 2),
                                            Math.ceil(slide.content.length / 2) + 3
                                        )
                                        .map((point, idx) => (
                                            <li
                                                key={idx}
                                                className={cn(
                                                    "text-sm line-clamp-2",
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
                    <div className="flex h-full flex-col p-12 overflow-hidden">
                        <h2
                            className={cn(
                                "text-3xl font-bold mb-8 line-clamp-2 flex-shrink-0",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        <div className="flex-1 flex items-center min-h-0">
                            <div className="grid grid-cols-4 gap-4 w-full">
                                {slide.content.slice(0, 4).map((step, idx) => (
                                    <div
                                        key={idx}
                                        className="text-center overflow-hidden"
                                    >
                                        <div
                                            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-white text-xl font-bold shadow-lg flex-shrink-0"
                                            style={{ backgroundColor: accentColor }}
                                        >
                                            {idx + 1}
                                        </div>
                                        <p
                                            className={cn(
                                                "text-sm line-clamp-3",
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
                    <div className="flex h-full flex-col items-center justify-center text-center p-12 overflow-hidden">
                        <h2
                            className={cn(
                                "text-4xl font-bold mb-6 line-clamp-2",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        {slide.content[0] && (
                            <p
                                className={cn(
                                    "text-xl mb-8 max-w-2xl line-clamp-3",
                                    !hasBrandColors && fallbackTextColors.body
                                )}
                                style={getBodyStyle()}
                            >
                                {slide.content[0]}
                            </p>
                        )}
                        <div
                            className="rounded-full px-10 py-5 text-lg font-semibold shadow-xl flex-shrink-0"
                            style={{
                                backgroundColor: "#fff",
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
                // Determine if we should show image area based on layout
                const showImageArea =
                    (slide.layoutType === "content_left" ||
                        slide.layoutType === "content_right") &&
                    showImagePlaceholder;
                const hasImage = !!slide.imageUrl;
                const isContentLeft = slide.layoutType === "content_left";
                const isContentRight = slide.layoutType === "content_right";

                // Limit bullet points to prevent overflow - max 5 points for readability
                const maxBulletPoints = showImageArea ? 4 : 5;
                const displayedContent = slide.content.slice(0, maxBulletPoints);

                return (
                    <div className="flex h-full flex-col p-12 overflow-hidden">
                        {hasBrandColors && (
                            <div
                                className="absolute left-0 top-12 bottom-12 w-1.5 rounded-r-full"
                                style={{ backgroundColor: accentColor }}
                            />
                        )}
                        <h2
                            className={cn(
                                "text-3xl font-bold mb-6 line-clamp-2",
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        <div
                            className={cn(
                                "flex-1 grid gap-8 min-h-0 overflow-hidden",
                                showImageArea && "grid-cols-2"
                            )}
                        >
                            {/* Image on left for content_right */}
                            {isContentRight && (hasImage || showImageArea) && (
                                <div className="rounded-2xl overflow-hidden bg-muted/30 shadow-lg flex items-center justify-center min-h-0">
                                    {hasImage ? (
                                        <img
                                            src={slide.imageUrl}
                                            alt={slide.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/50 p-4">
                                            <ImageIcon className="h-8 w-8" />
                                            <span className="text-xs text-center">
                                                Image ready to generate
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Bullet content with overflow handling */}
                            <ul className="space-y-3 overflow-hidden">
                                {displayedContent.map((point, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-start gap-3 text-lg"
                                    >
                                        <span
                                            className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full shadow-sm"
                                            style={{ backgroundColor: accentColor }}
                                        />
                                        <span
                                            className={cn(
                                                !hasBrandColors &&
                                                    fallbackTextColors.body
                                            )}
                                            style={getBodyStyle()}
                                        >
                                            {point}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* Image on right for content_left */}
                            {isContentLeft && (hasImage || showImageArea) && (
                                <div className="rounded-2xl overflow-hidden bg-muted/30 shadow-lg flex items-center justify-center min-h-0">
                                    {hasImage ? (
                                        <img
                                            src={slide.imageUrl}
                                            alt={slide.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/50 p-4">
                                            <ImageIcon className="h-8 w-8" />
                                            <span className="text-xs text-center">
                                                Image ready to generate
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div
            className={cn(
                "relative aspect-[16/9] w-full rounded-2xl shadow-2xl overflow-hidden",
                !hasBrandColors && `bg-gradient-to-br ${fallbackGradient}`,
                className
            )}
            style={hasBrandColors ? dynamicGradientStyle : undefined}
        >
            {/* Decorative elements for title/cta slides */}
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
                                ? lightenColor(brandDesign?.primary_color || "#fff", 40)
                                : "rgba(255,255,255,0.05)",
                            opacity: hasBrandColors ? 0.25 : 1,
                        }}
                    />
                </>
            )}

            {/* Section divider for section slides */}
            {slide.layoutType === "section" && hasBrandColors && (
                <div
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{
                        background: `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`,
                    }}
                />
            )}

            {/* Main content */}
            <div className="relative h-full">{renderSlideContent()}</div>

            {/* Footer */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs opacity-50">
                <span style={getBodyStyle()}>{brandDesign?.brand_name || ""}</span>
                <span style={getBodyStyle()}>
                    {slideIndex + 1} / {totalSlides}
                </span>
            </div>

            {/* Image indicator when no image but has prompt (only for bullets layout) */}
            {slide.layoutType === "bullets" &&
                slide.imagePrompt &&
                !slide.imageUrl &&
                showImagePlaceholder && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-black/20 px-2 py-1 text-xs text-white/70">
                        <ImageIcon className="h-3 w-3" />
                        Image ready to generate
                    </div>
                )}
        </div>
    );
});
