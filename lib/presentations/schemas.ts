/**
 * Zod Schemas for Presentation Slides
 * Provides runtime validation for JSONB slide data from the database
 *
 * Related: GitHub Issue #327 - Type Safety for Slide Arrays
 */

import { z } from "zod";

// Layout types enum for strict validation
export const SlideLayoutTypeSchema = z.enum([
    "title",
    "section",
    "content_left",
    "content_right",
    "bullets",
    "quote",
    "statistics",
    "comparison",
    "process",
    "cta",
]);

export type SlideLayoutType = z.infer<typeof SlideLayoutTypeSchema>;

// Complete slide schema matching the GeneratedSlide interface
export const SlideSchema = z.object({
    slideNumber: z.number().int().positive(),
    title: z.string(),
    content: z.array(z.string()),
    speakerNotes: z.string(),
    imagePrompt: z.string().optional(),
    imageUrl: z.string().optional(), // Can be undefined but not null to match GeneratedSlide interface
    layoutType: SlideLayoutTypeSchema,
    section: z.string(),
    imageGeneratedAt: z.string().optional(), // ISO datetime string
});

export type Slide = z.infer<typeof SlideSchema>;

// Array of slides with validation
export const SlidesArraySchema = z.array(SlideSchema);

/**
 * Safely parse slides from JSONB database column
 * Returns validated slides array or empty array on failure
 */
export function parseSlidesFromDB(rawSlides: unknown): Slide[] {
    // Handle null/undefined
    if (!rawSlides) {
        return [];
    }

    // Ensure it's an array
    if (!Array.isArray(rawSlides)) {
        return [];
    }

    // Validate each slide, keeping only valid ones
    const validSlides: Slide[] = [];

    for (const slide of rawSlides) {
        const result = SlideSchema.safeParse(slide);
        if (result.success) {
            validSlides.push(result.data);
        }
    }

    return validSlides;
}

/**
 * Strictly parse slides - throws on invalid data
 * Use when data integrity is critical
 */
export function parseSlidesStrict(rawSlides: unknown): Slide[] {
    if (!rawSlides || !Array.isArray(rawSlides)) {
        throw new Error("Slides must be a non-empty array");
    }

    return SlidesArraySchema.parse(rawSlides);
}

/**
 * Validate a single slide
 * Returns the validated slide or null if invalid
 */
export function validateSlide(slide: unknown): Slide | null {
    const result = SlideSchema.safeParse(slide);
    return result.success ? result.data : null;
}

/**
 * Get a slide by number from an array, with validation
 * Returns null if slide doesn't exist or is invalid
 */
export function getSlideByNumber(rawSlides: unknown, slideNumber: number): Slide | null {
    const slides = parseSlidesFromDB(rawSlides);
    const slide = slides.find((s) => s.slideNumber === slideNumber);
    return slide || null;
}

/**
 * Get a slide by index (0-based), with validation
 * Returns null if slide doesn't exist or is invalid
 */
export function getSlideByIndex(rawSlides: unknown, index: number): Slide | null {
    const slides = parseSlidesFromDB(rawSlides);
    if (index < 0 || index >= slides.length) {
        return null;
    }
    return slides[index] || null;
}
