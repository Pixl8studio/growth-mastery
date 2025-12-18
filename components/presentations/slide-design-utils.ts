/**
 * Shared Slide Design Utilities
 * Provides consistent gradient and color generation for slide rendering
 *
 * Used by both SlideThumbnail and SlidePreview for visual consistency
 */

import type { SlideLayoutType, BrandDesign, WCAGLevel } from "./slide-types";

// ============================================================================
// Constants
// ============================================================================

/**
 * Semantic constants for color manipulation percentages
 * Based on PRESENTATION_DESIGN_SYSTEM.md 60-30-10 color rule
 */
export const COLOR_SHIFT = {
    /** Default darkening for secondary color derivation */
    SECONDARY_DARKEN: 20,
    /** Default lightening for accent color derivation */
    ACCENT_LIGHTEN: 30,
    /** Title slide: deep shadow for depth */
    TITLE_DEEP_DARKEN: 30,
    /** Title slide: mid-tone for gradient transition */
    TITLE_MID_DARKEN: 20,
    /** CTA accent highlight */
    CTA_ACCENT_LIGHTEN: 20,
    /** Quote: very light tint for warmth */
    QUOTE_VERY_LIGHT: 92,
    /** Quote: slightly less light for gradient end */
    QUOTE_LIGHT: 85,
    /** Statistics: ultra-light background */
    STATISTICS_ULTRA_LIGHT: 95,
    /** Statistics: secondary light tint */
    STATISTICS_SECONDARY_LIGHT: 90,
    /** Comparison: primary light tint */
    COMPARISON_PRIMARY_LIGHT: 94,
    /** Comparison: accent light tint */
    COMPARISON_ACCENT_LIGHT: 92,
    /** Process: primary tint for flow start */
    PROCESS_PRIMARY_LIGHT: 93,
    /** Process: accent tint for flow end */
    PROCESS_ACCENT_LIGHT: 95,
    /** Content slides: subtle brand presence */
    CONTENT_BRAND_TINT: 96,
    /** Body text lightening for softer appearance */
    BODY_TEXT_LIGHTEN: 20,
} as const;

/**
 * WCAG 2.1 minimum contrast ratios
 */
export const WCAG_CONTRAST_THRESHOLDS = {
    /** Normal text minimum (AA) */
    AA: 4.5,
    /** Enhanced contrast (AAA) */
    AAA: 7,
    /** Large text minimum (AA-large: 18pt+ or 14pt+ bold) */
    "AA-large": 3,
} as const;

// ============================================================================
// Color Manipulation Utilities
// ============================================================================

/**
 * Convert hex color to RGB values
 *
 * @example
 * hexToRgb('#ff5733') // { r: 255, g: 87, b: 51 }
 * hexToRgb('000000')  // { r: 0, g: 0, b: 0 }
 * hexToRgb('invalid') // null
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
 *
 * @example
 * lightenColor('#000000', 50) // 'rgb(128, 128, 128)'
 * lightenColor('#ff0000', 20) // 'rgb(255, 51, 51)'
 * lightenColor('invalid', 50) // 'invalid' (returns original)
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
 *
 * @example
 * darkenColor('#ffffff', 50) // 'rgb(128, 128, 128)'
 * darkenColor('#ff0000', 20) // 'rgb(204, 0, 0)'
 * darkenColor('invalid', 50) // 'invalid' (returns original)
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
// WCAG Accessibility Utilities
// ============================================================================

/**
 * Calculate relative luminance of a color per WCAG 2.1
 * @see https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */
function getRelativeLuminance(hex: string): number {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors per WCAG 2.1
 *
 * @returns Contrast ratio from 1 (same color) to 21 (black/white)
 * @example
 * getContrastRatio('#000000', '#FFFFFF') // ~21 (max contrast)
 * getContrastRatio('#808080', '#808080') // ~1 (no contrast)
 */
export function getContrastRatio(foreground: string, background: string): number {
    const l1 = getRelativeLuminance(foreground);
    const l2 = getRelativeLuminance(background);

    // Return 1 for invalid colors (safe fallback)
    if (l1 === 0 && l2 === 0 && !hexToRgb(foreground)) return 1;

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG contrast requirements
 *
 * @param level - 'AA' (4.5:1), 'AAA' (7:1), or 'AA-large' (3:1 for large text)
 * @example
 * meetsWCAGContrast('#000000', '#FFFFFF', 'AA')  // true
 * meetsWCAGContrast('#808080', '#FFFFFF', 'AA')  // false
 * meetsWCAGContrast('#767676', '#FFFFFF', 'AA-large') // true
 */
export function meetsWCAGContrast(
    foreground: string,
    background: string,
    level: WCAGLevel = "AA"
): boolean {
    const ratio = getContrastRatio(foreground, background);
    return ratio >= WCAG_CONTRAST_THRESHOLDS[level];
}

// ============================================================================
// Brand Gradient Generation
// ============================================================================

/**
 * Generate dynamic gradient CSS for a slide layout based on brand colors
 * Implements the 60-30-10 color rule from PRESENTATION_DESIGN_SYSTEM.md
 *
 * @example
 * generateBrandGradient('title', brandDesign)
 * // { background: 'linear-gradient(135deg, rgb(45, 77, 180) 0%, #3B82F6 50%, ...)' }
 *
 * generateBrandGradient('title', null)
 * // {} (empty, use fallback gradients)
 */
export function generateBrandGradient(
    layoutType: SlideLayoutType,
    brandDesign: BrandDesign | null | undefined
): React.CSSProperties {
    if (!brandDesign?.primary_color) {
        // Fallback to premium defaults when no brand colors
        return {};
    }

    const primary = brandDesign.primary_color;
    const secondary =
        brandDesign.secondary_color ||
        darkenColor(primary, COLOR_SHIFT.SECONDARY_DARKEN);
    const accent =
        brandDesign.accent_color || lightenColor(primary, COLOR_SHIFT.ACCENT_LIGHTEN);
    const background = brandDesign.background_color || "#FFFFFF";

    switch (layoutType) {
        case "title":
            // Bold, immersive gradient for title slides
            return {
                background: `linear-gradient(135deg, ${darkenColor(primary, COLOR_SHIFT.TITLE_DEEP_DARKEN)} 0%, ${primary} 50%, ${darkenColor(primary, COLOR_SHIFT.TITLE_MID_DARKEN)} 100%)`,
            };

        case "section":
            // Section headers use primary with subtle secondary blend
            return {
                background: `linear-gradient(120deg, ${darkenColor(primary, COLOR_SHIFT.TITLE_MID_DARKEN)} 0%, ${primary} 60%, ${secondary} 100%)`,
            };

        case "cta":
            // High-energy gradient for call-to-action
            return {
                background: `linear-gradient(135deg, ${primary} 0%, ${accent} 50%, ${lightenColor(accent, COLOR_SHIFT.CTA_ACCENT_LIGHTEN)} 100%)`,
            };

        case "quote":
            // Warm, subtle gradient for testimonials
            return {
                background: `linear-gradient(180deg, ${lightenColor(primary, COLOR_SHIFT.QUOTE_VERY_LIGHT)} 0%, ${lightenColor(primary, COLOR_SHIFT.QUOTE_LIGHT)} 100%)`,
            };

        case "statistics":
            // Clean gradient that lets numbers pop
            return {
                background: `linear-gradient(180deg, ${lightenColor(primary, COLOR_SHIFT.STATISTICS_ULTRA_LIGHT)} 0%, ${lightenColor(secondary, COLOR_SHIFT.STATISTICS_SECONDARY_LIGHT)} 100%)`,
            };

        case "comparison":
            // Neutral base for before/after contrast
            return {
                background: `linear-gradient(180deg, ${lightenColor(primary, COLOR_SHIFT.COMPARISON_PRIMARY_LIGHT)} 0%, ${lightenColor(accent, COLOR_SHIFT.COMPARISON_ACCENT_LIGHT)} 100%)`,
            };

        case "process":
            // Progressive gradient suggesting forward movement
            return {
                background: `linear-gradient(90deg, ${lightenColor(primary, COLOR_SHIFT.PROCESS_PRIMARY_LIGHT)} 0%, ${lightenColor(accent, COLOR_SHIFT.PROCESS_ACCENT_LIGHT)} 100%)`,
            };

        case "content_left":
        case "content_right":
        case "bullets":
        default:
            // Clean, professional background with subtle brand presence
            return {
                background: `linear-gradient(180deg, ${background} 0%, ${lightenColor(primary, COLOR_SHIFT.CONTENT_BRAND_TINT)} 100%)`,
            };
    }
}

/**
 * Get text colors based on brand and layout type
 * Returns appropriate contrast colors for readability
 *
 * @example
 * getBrandTextColors('title', brandDesign)
 * // { title: '#FFFFFF', body: 'rgba(255, 255, 255, 0.85)' }
 *
 * getBrandTextColors('bullets', brandDesign)
 * // { title: '#1F2937', body: 'rgb(...)' }
 */
export function getBrandTextColors(
    layoutType: SlideLayoutType,
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
        body: brandDesign?.text_color
            ? lightenColor(textColor, COLOR_SHIFT.BODY_TEXT_LIGHTEN)
            : "#4a4a5e",
    };
}

// ============================================================================
// Fallback Styles (No Brand Colors)
// ============================================================================

// Fallback gradients when no brand colors (avoiding anti-pattern colors per PRESENTATION_DESIGN_SYSTEM.md)
export const FALLBACK_GRADIENTS: Record<SlideLayoutType, string> = {
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
    SlideLayoutType,
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
