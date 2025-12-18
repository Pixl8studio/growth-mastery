/**
 * Shared Type Definitions for Presentation Components
 *
 * Centralized types to avoid circular dependencies between
 * slide-design-utils.ts, slide-thumbnail.tsx, and slide-preview.tsx
 */

/**
 * Available slide layout types
 * Each type has specific gradient and text color treatments
 */
export type SlideLayoutType =
    | "title"
    | "section"
    | "content_left"
    | "content_right"
    | "bullets"
    | "quote"
    | "statistics"
    | "comparison"
    | "process"
    | "cta";

/**
 * Slide data structure for presentation slides
 */
export interface SlideData {
    slideNumber: number;
    title: string;
    content: string[];
    speakerNotes?: string;
    imagePrompt?: string;
    imageUrl?: string;
    layoutType: SlideLayoutType;
    section?: string;
}

/**
 * Brand design colors from user's brand guidelines
 */
export interface BrandDesign {
    primary_color: string;
    secondary_color?: string | null;
    accent_color?: string | null;
    background_color: string;
    text_color: string;
    brand_name?: string | null;
}

/**
 * WCAG accessibility level for contrast checking
 */
export type WCAGLevel = "AA" | "AAA" | "AA-large";
