/**
 * Shared Slide Design Utilities
 * Provides consistent gradient and color generation for slide rendering
 *
 * Used by both SlideThumbnail and SlidePreview for visual consistency
 */

import type { SlideData, BrandDesign } from "./slide-thumbnail";

// ============================================================================
// Color Manipulation Utilities
// ============================================================================

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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
export function lightenColor(hex: string, percent: number): string {
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
export function darkenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const factor = 1 - percent / 100;
    const r = Math.round(rgb.r * factor);
    const g = Math.round(rgb.g * factor);
    const b = Math.round(rgb.b * factor);

    return `rgb(${r}, ${g}, ${b})`;
}

// ============================================================================
// Brand Gradient Generation
// ============================================================================

/**
 * Generate dynamic gradient CSS for a slide layout based on brand colors
 * Implements the 60-30-10 color rule from PRESENTATION_DESIGN_SYSTEM.md
 */
export function generateBrandGradient(
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
 * Get text colors based on brand and layout type
 */
export function getBrandTextColors(
    layoutType: SlideData["layoutType"],
    brandDesign: BrandDesign | null | undefined
): { title: string; body: string } {
    const isDarkBg =
        layoutType === "title" || layoutType === "section" || layoutType === "cta";

    if (isDarkBg) {
        return { title: "#FFFFFF", body: "rgba(255, 255, 255, 0.85)" };
    }

    // For light backgrounds, use brand text color or dark defaults
    const textColor = brandDesign?.text_color || "#1a1a2e";
    return {
        title: textColor,
        body: brandDesign?.text_color ? lightenColor(textColor, 20) : "#4a4a5e",
    };
}

// ============================================================================
// Fallback Styles (No Brand Colors)
// ============================================================================

// Fallback gradients when no brand colors (avoiding anti-pattern colors per PRESENTATION_DESIGN_SYSTEM.md)
export const FALLBACK_GRADIENTS: Record<SlideData["layoutType"], string> = {
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

// Fallback text colors (Tailwind classes)
export const FALLBACK_TEXT_COLORS: Record<
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
