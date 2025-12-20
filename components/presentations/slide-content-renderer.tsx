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

// Content length thresholds for dynamic text scaling
// These ensure content fits without truncation while maintaining readability
const TEXT_SCALE_CONFIG = {
    title: {
        baseSize: "text-3xl", // ~30px
        mediumSize: "text-2xl", // ~24px
        smallSize: "text-xl", // ~20px
        mediumThreshold: 10, // words
        smallThreshold: 14, // words
    },
    bullet: {
        baseSize: "text-lg", // ~18px
        mediumSize: "text-base", // ~16px
        smallSize: "text-sm", // ~14px - minimum readable size
        mediumThreshold: 12, // words per bullet
        smallThreshold: 18, // words per bullet
    },
    // For layouts with less space (content_left, content_right, comparison)
    compactBullet: {
        baseSize: "text-base", // ~16px
        mediumSize: "text-sm", // ~14px
        smallSize: "text-xs", // ~12px - minimum for compact layouts
        mediumThreshold: 10,
        smallThreshold: 14,
    },
};

/**
 * Calculate appropriate text size class based on content length
 * Returns a Tailwind text size class that ensures content fits without truncation
 */
function getScaledTextSize(
    text: string,
    config: (typeof TEXT_SCALE_CONFIG)["title" | "bullet" | "compactBullet"]
): string {
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    if (wordCount <= config.mediumThreshold) {
        return config.baseSize;
    } else if (wordCount <= config.smallThreshold) {
        return config.mediumSize;
    } else {
        return config.smallSize;
    }
}

/**
 * Calculate text size for a list of bullet points
 * Uses the longest bullet to determine the size for consistency
 */
function getScaledBulletSize(
    bullets: string[],
    config: (typeof TEXT_SCALE_CONFIG)["bullet" | "compactBullet"]
): string {
    if (bullets.length === 0) return config.baseSize;

    const maxWordCount = Math.max(
        ...bullets.map((b) => b.split(/\s+/).filter(Boolean).length)
    );

    if (maxWordCount <= config.mediumThreshold) {
        return config.baseSize;
    } else if (maxWordCount <= config.smallThreshold) {
        return config.mediumSize;
    } else {
        return config.smallSize;
    }
}

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
            case "title": {
                // Dynamic sizing for title slide - larger base sizes
                const titleWords = slide.title.split(/\s+/).filter(Boolean).length;
                const titleSize =
                    titleWords <= 8
                        ? "text-5xl"
                        : titleWords <= 12
                          ? "text-4xl"
                          : "text-3xl";
                const subtitleSize =
                    slide.content[0] &&
                    slide.content[0].split(/\s+/).filter(Boolean).length > 15
                        ? "text-lg"
                        : "text-xl";

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
                                "font-bold leading-tight mb-6",
                                titleSize,
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h1>
                        {slide.content[0] && (
                            <p
                                className={cn(
                                    "max-w-2xl",
                                    subtitleSize,
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
            }

            case "section": {
                const sectionTitleWords = slide.title
                    .split(/\s+/)
                    .filter(Boolean).length;
                const sectionTitleSize =
                    sectionTitleWords <= 6
                        ? "text-4xl"
                        : sectionTitleWords <= 10
                          ? "text-3xl"
                          : "text-2xl";
                const sectionSubtitleSize =
                    slide.content[0] &&
                    slide.content[0].split(/\s+/).filter(Boolean).length > 20
                        ? "text-base"
                        : "text-lg";

                return (
                    <div className="flex h-full flex-col items-center justify-center text-center p-12 overflow-hidden">
                        <div
                            className="mb-4 h-1 w-24 rounded-full flex-shrink-0"
                            style={{ backgroundColor: accentColor || "#fff" }}
                        />
                        <h2
                            className={cn(
                                "font-bold",
                                sectionTitleSize,
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        {slide.content[0] && (
                            <p
                                className={cn(
                                    "mt-4 max-w-xl",
                                    sectionSubtitleSize,
                                    !hasBrandColors && fallbackTextColors.body
                                )}
                                style={getBodyStyle()}
                            >
                                {slide.content[0]}
                            </p>
                        )}
                    </div>
                );
            }

            case "quote": {
                const quoteText = slide.content[0] || slide.title;
                const quoteWords = quoteText.split(/\s+/).filter(Boolean).length;
                const quoteSize =
                    quoteWords <= 20
                        ? "text-2xl"
                        : quoteWords <= 35
                          ? "text-xl"
                          : "text-lg";

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
                                    "italic leading-relaxed",
                                    quoteSize,
                                    !hasBrandColors && fallbackTextColors.title
                                )}
                                style={getTitleStyle()}
                            >
                                {quoteText}
                            </blockquote>
                            {/* Attribution line removed - quote stands alone */}
                        </div>
                    </div>
                );
            }

            case "statistics": {
                const statsTitleSize = getScaledTextSize(
                    slide.title,
                    TEXT_SCALE_CONFIG.title
                );
                // Calculate stat description size based on longest description
                const statDescriptions = slide.content
                    .slice(0, 3)
                    .map((s) => s.replace(/\d+%?\s*/, ""));
                const statDescSize = getScaledBulletSize(
                    statDescriptions,
                    TEXT_SCALE_CONFIG.compactBullet
                );

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
                                "font-bold mb-8 flex-shrink-0",
                                statsTitleSize,
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
                                            statDescSize,
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
            }

            case "comparison": {
                const compTitleSize = getScaledTextSize(
                    slide.title,
                    TEXT_SCALE_CONFIG.title
                );
                const compBulletSize = getScaledBulletSize(
                    slide.content,
                    TEXT_SCALE_CONFIG.compactBullet
                );

                return (
                    <div className="flex h-full flex-col p-12 overflow-hidden">
                        <h2
                            className={cn(
                                "font-bold mb-8 text-center flex-shrink-0",
                                compTitleSize,
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
                                <ul className="space-y-2 overflow-y-auto">
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
                                                    compBulletSize,
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
                                <ul className="space-y-2 overflow-y-auto">
                                    {slide.content
                                        .slice(
                                            Math.ceil(slide.content.length / 2),
                                            Math.ceil(slide.content.length / 2) + 3
                                        )
                                        .map((point, idx) => (
                                            <li
                                                key={idx}
                                                className={cn(
                                                    compBulletSize,
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
            }

            case "process": {
                const procTitleSize = getScaledTextSize(
                    slide.title,
                    TEXT_SCALE_CONFIG.title
                );
                const procStepSize = getScaledBulletSize(
                    slide.content.slice(0, 4),
                    TEXT_SCALE_CONFIG.compactBullet
                );

                return (
                    <div className="flex h-full flex-col p-12 overflow-hidden">
                        <h2
                            className={cn(
                                "font-bold mb-8 flex-shrink-0",
                                procTitleSize,
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
                                                procStepSize,
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
            }

            case "cta": {
                const ctaTitleWords = slide.title.split(/\s+/).filter(Boolean).length;
                const ctaTitleSize =
                    ctaTitleWords <= 8
                        ? "text-4xl"
                        : ctaTitleWords <= 12
                          ? "text-3xl"
                          : "text-2xl";
                const ctaSubtitleSize =
                    slide.content[0] &&
                    slide.content[0].split(/\s+/).filter(Boolean).length > 15
                        ? "text-lg"
                        : "text-xl";

                return (
                    <div className="flex h-full flex-col items-center justify-center text-center p-12 overflow-hidden">
                        <h2
                            className={cn(
                                "font-bold mb-6",
                                ctaTitleSize,
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        {slide.content[0] && (
                            <p
                                className={cn(
                                    "mb-8 max-w-2xl",
                                    ctaSubtitleSize,
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
            }

            case "content_left":
            case "content_right":
            case "bullets":
            default: {
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

                // Calculate dynamic text sizes based on content length
                const titleTextSize = getScaledTextSize(
                    slide.title,
                    TEXT_SCALE_CONFIG.title
                );
                const bulletConfig = showImageArea
                    ? TEXT_SCALE_CONFIG.compactBullet
                    : TEXT_SCALE_CONFIG.bullet;
                const bulletTextSize = getScaledBulletSize(
                    displayedContent,
                    bulletConfig
                );

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
                                "font-bold mb-5 flex-shrink-0",
                                titleTextSize,
                                !hasBrandColors && fallbackTextColors.title
                            )}
                            style={getTitleStyle()}
                        >
                            {slide.title}
                        </h2>
                        <div
                            className={cn(
                                "flex-1 grid gap-6 min-h-0",
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

                            {/* Bullet content with dynamic text scaling */}
                            <ul className="flex flex-col space-y-2 min-h-0 overflow-y-auto">
                                {displayedContent.map((point, idx) => (
                                    <li
                                        key={idx}
                                        className={cn(
                                            "flex items-start gap-3 min-h-0",
                                            bulletTextSize
                                        )}
                                    >
                                        <span
                                            className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full shadow-sm"
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
