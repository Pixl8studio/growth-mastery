/**
 * Slide Content Constants
 * Centralized configuration for slide content limits and text scaling
 *
 * These constants ensure content fits within slide bounds without truncation
 * and maintain consistent behavior across generation, editing, and rendering.
 *
 * Related: GitHub Issue #327 - Premium Layout and Styling System
 */

import type { SlideLayoutType } from "./schemas";

/**
 * Content length limits by layout type
 *
 * titleMax: Maximum words in slide title
 * bulletMax: Maximum words per bullet point
 * maxBullets: Maximum number of bullet points for this layout
 *
 * These limits were determined through visual testing to ensure:
 * - Content fits without truncation at standard slide dimensions (960x540)
 * - Text remains readable at minimum font sizes (14px for body, 20px for titles)
 * - Layouts maintain proper visual hierarchy and whitespace
 */
export const SLIDE_CONTENT_LIMITS: Record<
    SlideLayoutType,
    { titleMax: number; bulletMax: number; maxBullets: number }
> = {
    // Title slide: Large title text, minimal content
    title: { titleMax: 10, bulletMax: 20, maxBullets: 1 },

    // Section header: Emphasis on title, subtitle only
    section: { titleMax: 8, bulletMax: 25, maxBullets: 1 },

    // Standard bullets: Primary content layout
    bullets: { titleMax: 12, bulletMax: 16, maxBullets: 5 },

    // Content left/right: Image takes 50% width, less text space
    content_left: { titleMax: 12, bulletMax: 14, maxBullets: 4 },
    content_right: { titleMax: 12, bulletMax: 14, maxBullets: 4 },

    // Quote: Single quote text, can be longer
    quote: { titleMax: 12, bulletMax: 30, maxBullets: 1 },

    // Statistics: Short stats with numbers
    statistics: { titleMax: 10, bulletMax: 12, maxBullets: 3 },

    // Comparison: Multiple short items side by side
    comparison: { titleMax: 10, bulletMax: 12, maxBullets: 6 },

    // Process: Step labels, very concise
    process: { titleMax: 10, bulletMax: 10, maxBullets: 4 },

    // CTA: Action-focused, punchy copy
    cta: { titleMax: 10, bulletMax: 20, maxBullets: 2 },
} as const;

/**
 * Text scaling configuration for dynamic font sizing
 *
 * When content exceeds AI generation limits (e.g., user manual edits),
 * text scales down progressively to maintain readability without truncation.
 *
 * Thresholds are based on visual testing at standard slide dimensions:
 * - mediumThreshold: Words before scaling to medium size
 * - smallThreshold: Words before scaling to minimum readable size
 *
 * Font sizes follow Tailwind's scale and meet WCAG AA readability:
 * - text-3xl (~30px): Base title size
 * - text-2xl (~24px): Medium title size
 * - text-xl (~20px): Minimum title size - WCAG AA compliant
 * - text-lg (~18px): Base body size
 * - text-base (~16px): Medium body size
 * - text-sm (~14px): Minimum body size - WCAG AA compliant
 * - text-xs (~12px): Compact layout minimum - use sparingly
 */
export const TEXT_SCALE_CONFIG = {
    /**
     * Title text scaling
     * Used for slide titles across all layouts
     */
    title: {
        baseSize: "text-3xl", // ~30px - optimal for titles up to 10 words
        mediumSize: "text-2xl", // ~24px - comfortable for 11-14 words
        smallSize: "text-xl", // ~20px - minimum readable, 15+ words
        mediumThreshold: 10, // words - matches SLIDE_CONTENT_LIMITS.bullets.titleMax
        smallThreshold: 14, // words - maximum before smallest size
    },

    /**
     * Standard bullet text scaling
     * Used for bullets, statistics, quotes layouts
     */
    bullet: {
        baseSize: "text-lg", // ~18px - optimal for bullets up to 12 words
        mediumSize: "text-base", // ~16px - comfortable for 13-18 words
        smallSize: "text-sm", // ~14px - minimum readable, 19+ words
        mediumThreshold: 12, // words - slightly below bulletMax for comfortable fit
        smallThreshold: 18, // words - maximum before smallest size
    },

    /**
     * Compact bullet text scaling
     * Used for layouts with less text space: content_left, content_right, comparison, process
     * These layouts have images or multiple columns reducing available text area
     */
    compactBullet: {
        baseSize: "text-base", // ~16px - optimal for compact bullets
        mediumSize: "text-sm", // ~14px - WCAG AA minimum
        smallSize: "text-xs", // ~12px - minimum for compact layouts only
        mediumThreshold: 10, // words - lower threshold due to space constraints
        smallThreshold: 14, // words - matches compact bulletMax limits
    },
} as const;

/**
 * Type definitions for external use
 */
export type TextScaleConfig =
    (typeof TEXT_SCALE_CONFIG)[keyof typeof TEXT_SCALE_CONFIG];
export type ContentLimits =
    (typeof SLIDE_CONTENT_LIMITS)[keyof typeof SLIDE_CONTENT_LIMITS];

/**
 * Helper to get content limits with fallback
 * Returns bullets layout limits as default for unknown layout types
 */
export function getContentLimits(layoutType: SlideLayoutType): ContentLimits {
    return SLIDE_CONTENT_LIMITS[layoutType] || SLIDE_CONTENT_LIMITS.bullets;
}

/**
 * Calculate word count for a text string
 * Splits on whitespace and filters empty strings
 */
export function countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Calculate appropriate text size class based on content length
 * Returns a Tailwind text size class that ensures content fits without truncation
 */
export function getScaledTextSize(text: string, config: TextScaleConfig): string {
    const wordCount = countWords(text);

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
 * Uses the longest bullet to determine the size for visual consistency
 */
export function getScaledBulletSize(
    bullets: string[],
    config: TextScaleConfig
): string {
    if (bullets.length === 0) return config.baseSize;

    const maxWordCount = Math.max(...bullets.map(countWords));

    if (maxWordCount <= config.mediumThreshold) {
        return config.baseSize;
    } else if (maxWordCount <= config.smallThreshold) {
        return config.mediumSize;
    } else {
        return config.smallSize;
    }
}

/**
 * Check if text exceeds the minimum readable size threshold
 * Useful for showing warnings about very long content
 */
export function isAtMinimumSize(text: string, config: TextScaleConfig): boolean {
    return countWords(text) > config.smallThreshold;
}

/**
 * Check if any bullet in a list exceeds the minimum readable size threshold
 */
export function hasMinimumSizeBullets(
    bullets: string[],
    config: TextScaleConfig
): boolean {
    return bullets.some((bullet) => countWords(bullet) > config.smallThreshold);
}
