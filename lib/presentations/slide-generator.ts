/**
 * AI Slide Generator
 * Uses Anthropic Claude to generate slide content based on deck structure and customization
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import * as Sentry from "@sentry/nextjs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { AIGenerationError, RateLimitError } from "@/lib/errors";
import { env } from "@/lib/env";
import { AI_CONFIG } from "@/lib/config";
import { recoverJSON } from "@/lib/ai/json-recovery";

import type { SlideData } from "./pptx-generator";

// ============================================================================
// Zod Schemas for Type Safety
// ============================================================================

export const DeckStructureSlideSchema = z.object({
    slideNumber: z.number().int().positive(),
    title: z.string(),
    description: z.string(),
    section: z.string(),
});

export const DeckStructureSchema = z.object({
    id: z.string(),
    title: z.string(),
    slideCount: z.number().int().positive(),
    slides: z.array(DeckStructureSlideSchema),
});

export const BusinessProfileSchema = z.object({
    business_name: z.string().optional(),
    target_audience: z.string().optional(),
    main_offer: z.string().optional(),
    unique_mechanism: z.string().optional(),
    brand_voice: z.string().optional(),
});

export const BrandDesignSchema = z.object({
    brand_name: z.string().optional(),
    primary_color: z.string().optional(),
    secondary_color: z.string().optional(),
    accent_color: z.string().optional(),
    background_color: z.string().optional(),
    text_color: z.string().optional(),
});

export const PresentationCustomizationSchema = z.object({
    textDensity: z.enum(["minimal", "balanced", "detailed"]),
    visualStyle: z.enum(["professional", "creative", "minimal", "bold"]),
    emphasisPreference: z.enum(["text", "visuals", "balanced"]),
    animationLevel: z.enum(["none", "subtle", "moderate", "dynamic"]),
    imageStyle: z.enum(["photography", "illustration", "abstract", "icons"]),
});

// Export Zod-inferred types for consistency
export type DeckStructureSlide = z.infer<typeof DeckStructureSlideSchema>;
export type DeckStructure = z.infer<typeof DeckStructureSchema>;
export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;
export type BrandDesign = z.infer<typeof BrandDesignSchema>;
export type PresentationCustomization = z.infer<typeof PresentationCustomizationSchema>;

export interface GenerateSlideOptions {
    deckSlide: DeckStructureSlide;
    customization: PresentationCustomization;
    businessProfile?: BusinessProfile;
    brandDesign?: BrandDesign;
    previousSlides?: SlideData[];
}

export interface GeneratePresentationOptions {
    deckStructure: DeckStructure;
    customization: PresentationCustomization;
    businessProfile?: BusinessProfile;
    brandDesign?: BrandDesign;
    onSlideGenerated?: (slide: SlideData, progress: number) => void;
    /** Timeout in milliseconds for the entire presentation generation (default: 5 minutes) */
    timeoutMs?: number;
}

// ============================================================================
// Anthropic Client with Validation
// ============================================================================

// Validate API key at startup
function validateAnthropicApiKey(): void {
    if (!env.ANTHROPIC_API_KEY) {
        throw new Error(
            "ANTHROPIC_API_KEY environment variable is required for slide generation"
        );
    }
}

// Lazy initialization to allow startup validation
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
    if (!anthropicClient) {
        validateAnthropicApiKey();
        anthropicClient = new Anthropic({
            apiKey: env.ANTHROPIC_API_KEY,
        });
    }
    return anthropicClient;
}

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    operationName?: string;
}

async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = MAX_RETRIES,
        initialDelayMs = INITIAL_RETRY_DELAY_MS,
        operationName = "operation",
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Parse Anthropic-specific errors with full details
            const { retryable, errorType, originalMessage, statusCode } =
                parseAnthropicError(error);

            if (!retryable || attempt === maxRetries) {
                logger.error(
                    {
                        error,
                        attempt,
                        maxRetries,
                        operationName,
                        errorType,
                        originalMessage,
                        statusCode,
                    },
                    `${operationName} failed after ${attempt + 1} attempts: ${originalMessage}`
                );
                throw error;
            }

            const delay = initialDelayMs * Math.pow(2, attempt);
            logger.warn(
                {
                    errorMessage: originalMessage,
                    attempt,
                    delay,
                    operationName,
                    errorType,
                    statusCode,
                },
                `${operationName} failed, retrying in ${delay}ms: ${originalMessage}`
            );

            Sentry.addBreadcrumb({
                category: "anthropic.retry",
                message: `Retrying ${operationName} (attempt ${attempt + 1}/${maxRetries}): ${originalMessage}`,
                level: "warning",
                data: { delay, errorType, originalMessage, statusCode },
            });

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error("Unknown error in retry logic");
}

// ============================================================================
// Anthropic Error Handling
// ============================================================================

type AnthropicErrorType =
    | "rate_limit"
    | "token_limit"
    | "invalid_request"
    | "api_error"
    | "timeout"
    | "unknown";

interface ParsedAnthropicError {
    retryable: boolean;
    errorType: AnthropicErrorType;
    message: string;
    /** Original error message from Anthropic SDK for debugging */
    originalMessage: string;
    /** HTTP status code if available */
    statusCode?: number;
}

/**
 * Parse Anthropic SDK errors to extract useful information
 * Preserves original error message for debugging while categorizing error type
 *
 * @see https://docs.claude.com/en/api/errors
 */
function parseAnthropicError(error: unknown): ParsedAnthropicError {
    if (!(error instanceof Error)) {
        const errorString = String(error);
        return {
            retryable: false,
            errorType: "unknown",
            message: errorString,
            originalMessage: errorString,
        };
    }

    // Preserve the original error message for debugging
    const originalMessage = error.message;
    const messageLower = originalMessage.toLowerCase();

    // Extract status code from Anthropic APIError if available
    // The SDK sets 'status' property on APIError subclasses
    const statusCode =
        "status" in error && typeof error.status === "number"
            ? error.status
            : undefined;

    // Rate limit errors (retryable)
    if (
        statusCode === 429 ||
        messageLower.includes("rate limit") ||
        messageLower.includes("429") ||
        messageLower.includes("too many requests")
    ) {
        return {
            retryable: true,
            errorType: "rate_limit",
            message: `Rate limit exceeded: ${originalMessage}`,
            originalMessage,
            statusCode,
        };
    }

    // Token limit errors (not retryable - need different approach)
    if (
        messageLower.includes("maximum context length") ||
        messageLower.includes("token limit") ||
        messageLower.includes("max_tokens")
    ) {
        return {
            retryable: false,
            errorType: "token_limit",
            message: `Token limit exceeded: ${originalMessage}`,
            originalMessage,
            statusCode,
        };
    }

    // Invalid request errors (not retryable)
    // Important: Preserve the original message to help debug the actual issue
    if (
        statusCode === 400 ||
        messageLower.includes("invalid") ||
        messageLower.includes("400") ||
        messageLower.includes("bad request")
    ) {
        return {
            retryable: false,
            errorType: "invalid_request",
            message: `Invalid request: ${originalMessage}`,
            originalMessage,
            statusCode,
        };
    }

    // Timeout errors (retryable)
    if (
        messageLower.includes("timeout") ||
        messageLower.includes("timed out") ||
        messageLower.includes("ETIMEDOUT".toLowerCase())
    ) {
        return {
            retryable: true,
            errorType: "timeout",
            message: `Request timed out: ${originalMessage}`,
            originalMessage,
            statusCode,
        };
    }

    // Server errors (retryable)
    if (
        statusCode === 500 ||
        statusCode === 502 ||
        statusCode === 503 ||
        statusCode === 529 ||
        messageLower.includes("500") ||
        messageLower.includes("502") ||
        messageLower.includes("503") ||
        messageLower.includes("internal server error") ||
        messageLower.includes("overloaded")
    ) {
        return {
            retryable: true,
            errorType: "api_error",
            message: `API error: ${originalMessage}`,
            originalMessage,
            statusCode,
        };
    }

    // Default to retryable for unknown errors, preserve original message
    return {
        retryable: true,
        errorType: "unknown",
        message: originalMessage,
        originalMessage,
        statusCode,
    };
}

// Map layout types based on slide content and position
function determineLayoutType(
    slide: DeckStructureSlide,
    index: number,
    total: number
): SlideData["layoutType"] {
    const title = slide.title.toLowerCase();
    const section = slide.section?.toLowerCase() || "";

    // First slide is title
    if (index === 0) return "title";

    // Last slide is usually CTA
    if (index === total - 1) return "cta";

    // Section headers
    if (title.includes("section") || title.includes("part") || title === section) {
        return "section";
    }

    // Quote slides
    if (title.includes("quote") || title.includes("testimonial")) {
        return "quote";
    }

    // Statistics slides
    if (
        title.includes("statistic") ||
        title.includes("number") ||
        title.includes("data")
    ) {
        return "statistics";
    }

    // Comparison slides
    if (
        title.includes("vs") ||
        title.includes("comparison") ||
        title.includes("before") ||
        title.includes("after")
    ) {
        return "comparison";
    }

    // Process slides
    if (
        title.includes("step") ||
        title.includes("process") ||
        title.includes("how to")
    ) {
        return "process";
    }

    // Default to bullets for content
    return "bullets";
}

// Get bullet point count based on text density
function getBulletCount(textDensity: "minimal" | "balanced" | "detailed"): {
    min: number;
    max: number;
} {
    switch (textDensity) {
        case "minimal":
            return { min: 2, max: 3 };
        case "balanced":
            return { min: 3, max: 5 };
        case "detailed":
            return { min: 5, max: 7 };
    }
}

/**
 * Generate content for a single slide using AI
 */
export async function generateSlideContent(
    options: GenerateSlideOptions
): Promise<SlideData> {
    const {
        deckSlide,
        customization,
        businessProfile,
        brandDesign: _brandDesign,
    } = options;

    const bulletCount = getBulletCount(customization.textDensity);

    const businessContext = businessProfile
        ? `
Business Context:
- Business Name: ${businessProfile.business_name || "Not specified"}
- Target Audience: ${businessProfile.target_audience || "Not specified"}
- Main Offer: ${businessProfile.main_offer || "Not specified"}
- Unique Mechanism: ${businessProfile.unique_mechanism || "Not specified"}
- Brand Voice: ${businessProfile.brand_voice || "Professional and engaging"}
`
        : "";

    const styleGuidance = `
Style Guidelines (Per PRESENTATION_DESIGN_SYSTEM.md):
- Text Density: ${customization.textDensity} (${bulletCount.min}-${bulletCount.max} bullet points per slide)
- Visual Style: ${customization.visualStyle}
- Emphasis: ${customization.emphasisPreference === "text" ? "Focus on clear, impactful text" : customization.emphasisPreference === "visuals" ? "Keep text minimal, suggest strong visuals" : "Balance text and visual elements"}

DESIGN PRINCIPLES - Follow these strictly:
1. Each slide communicates ONE clear idea (readable in 3 seconds)
2. Maximum 5 bullet points per list, maximum 12 words per bullet
3. Create emotional impact, not just convey information
4. Titles should be concise and impactful (6-10 words max)
5. Speaker notes provide the "why" and context, not just repeat content
`;

    const imageStyleGuidance = `
Image Style: ${customization.imageStyle}
Create image prompts that are:
- Specific about style (${customization.imageStyle === "photography" ? "professional photography, high quality" : customization.imageStyle === "illustration" ? "modern digital illustration, clean lines" : customization.imageStyle === "abstract" ? "abstract geometric shapes, modern design" : "clean iconography, flat design"})
- Aligned with brand colors if provided
- Conceptual/metaphorical rather than literal
- Avoiding cliches (no handshakes, people pointing at screens, generic business imagery)
- Suitable for a 16:9 slide format
`;

    const prompt = `Generate compelling slide content for a presentation slide.

${businessContext}
${styleGuidance}
${imageStyleGuidance}

Slide Information:
- Title: ${deckSlide.title}
- Description/Purpose: ${deckSlide.description}
- Section: ${deckSlide.section}

Generate the following for this slide:
1. A refined title (concise, impactful, 6-10 words max)
2. ${bulletCount.min}-${bulletCount.max} bullet points (max 12 words each, action-oriented)
3. Speaker notes (2-3 sentences of what the presenter should say, explaining the "why")
4. An image prompt describing a relevant visual for AI image generation

ANTI-PATTERNS TO AVOID:
- Generic corporate jargon
- Starting every bullet with the same word
- Vague or abstract statements without specifics
- Overly long sentences

Respond in JSON format:
{
  "title": "Refined slide title",
  "content": ["Bullet point 1", "Bullet point 2", ...],
  "speakerNotes": "Speaker notes text",
  "imagePrompt": "Detailed description for AI image generation"
}`;

    const anthropic = getAnthropicClient();

    try {
        const response = await withRetry(
            async () => {
                return await anthropic.messages.create({
                    model: AI_CONFIG.models.default,
                    max_tokens: 1000,
                    temperature: 0.7,
                    system: `You are an expert presentation designer following the PRESENTATION_DESIGN_SYSTEM.md guidelines.

Your core mandate:
1. Create VISUALLY DISTINCTIVE content - not generic "AI-generated" looking
2. Each slide should be readable in 3 seconds with ONE clear idea
3. Create emotional impact, not just convey information
4. Use restraint - if everything is emphasized, nothing is emphasized
5. Generate image prompts that are conceptual, avoiding stock photo cliches

NEVER use:
- Generic blue gradient descriptions
- Corporate jargon like "synergy", "leverage", "paradigm shift"
- Weak verbs like "utilize" (use "use"), "implement" (use "build/create")
- Bullet points starting with the same word

Always respond with valid JSON only, no markdown code blocks.`,
                    messages: [{ role: "user", content: prompt }],
                });
            },
            { operationName: `generateSlide_${deckSlide.slideNumber}` }
        );

        const textBlock = response.content.find((block) => block.type === "text");
        const content = textBlock?.type === "text" ? textBlock.text : null;

        if (!content) {
            throw new AIGenerationError("No content generated from Anthropic", {
                retryable: false,
                errorCode: "NO_CONTENT",
            });
        }

        // Try direct JSON parse first, fall back to recovery system
        let generated;
        try {
            generated = JSON.parse(content);
        } catch (parseError) {
            logger.warn(
                {
                    parseError,
                    contentPreview: content.slice(0, 200),
                    slideNumber: deckSlide.slideNumber,
                },
                "Direct JSON parse failed, attempting recovery"
            );

            const recovered = recoverJSON<{
                title?: string;
                content?: string[];
                speakerNotes?: string;
                imagePrompt?: string;
            }>(content);

            if (recovered.success && recovered.data !== undefined) {
                logger.info(
                    {
                        strategy: recovered.strategy,
                        slideNumber: deckSlide.slideNumber,
                    },
                    "JSON recovered successfully for slide"
                );
                generated = recovered.data;
            } else {
                logger.error(
                    { error: parseError, content, slideNumber: deckSlide.slideNumber },
                    "Failed to parse Anthropic response as JSON"
                );
                throw new AIGenerationError("Invalid JSON response from Anthropic", {
                    retryable: false,
                    errorCode: "INVALID_JSON",
                });
            }
        }

        return {
            slideNumber: deckSlide.slideNumber,
            title: generated.title || deckSlide.title,
            content: generated.content || [deckSlide.description],
            speakerNotes: generated.speakerNotes || "",
            imagePrompt: generated.imagePrompt,
            layoutType: determineLayoutType(
                deckSlide,
                deckSlide.slideNumber - 1,
                options.previousSlides?.length || 10
            ),
            section: deckSlide.section,
        };
    } catch (error) {
        const {
            errorType,
            message: errorMessage,
            originalMessage,
            statusCode,
        } = parseAnthropicError(error);

        // Log with full context including original error message for debugging
        logger.error(
            {
                error,
                slideNumber: deckSlide.slideNumber,
                slideTitle: deckSlide.title,
                errorType,
                originalMessage,
                statusCode,
                model: AI_CONFIG.models.default,
            },
            `Failed to generate slide content: ${originalMessage}`
        );

        Sentry.captureException(error, {
            tags: {
                component: "slide-generator",
                action: "generate_slide_content",
                errorType,
                slideNumber: deckSlide.slideNumber.toString(),
            },
            extra: {
                originalMessage,
                statusCode,
                model: AI_CONFIG.models.default,
                slideTitle: deckSlide.title,
            },
        });

        // For rate limit errors, throw specific error with original message
        if (errorType === "rate_limit") {
            throw new RateLimitError(
                `Anthropic rate limit exceeded during slide generation: ${originalMessage}`
            );
        }

        // For non-recoverable errors, throw AI error with detailed message
        if (errorType === "token_limit" || errorType === "invalid_request") {
            throw new AIGenerationError(errorMessage, {
                retryable: false,
                errorCode: errorType.toUpperCase(),
            });
        }

        // Fallback to basic content for other errors
        logger.warn(
            { slideNumber: deckSlide.slideNumber, errorType, originalMessage },
            "Using fallback content due to AI generation failure"
        );

        return {
            slideNumber: deckSlide.slideNumber,
            title: deckSlide.title,
            content: [deckSlide.description],
            speakerNotes: `Discuss ${deckSlide.title} with the audience.`,
            layoutType: determineLayoutType(deckSlide, deckSlide.slideNumber - 1, 10),
            section: deckSlide.section,
        };
    }
}

// Default timeout: 5 minutes
const DEFAULT_GENERATION_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Generate all slides for a presentation
 * Includes timeout protection and comprehensive monitoring
 */
export async function generatePresentation(
    options: GeneratePresentationOptions
): Promise<SlideData[]> {
    const {
        deckStructure,
        customization,
        businessProfile,
        brandDesign,
        onSlideGenerated,
        timeoutMs = DEFAULT_GENERATION_TIMEOUT_MS,
    } = options;

    const startTime = Date.now();

    logger.info(
        {
            deckId: deckStructure.id,
            slideCount: deckStructure.slides.length,
            customization,
            timeoutMs,
        },
        "Starting presentation generation"
    );

    // Start Sentry span for performance monitoring
    return await Sentry.startSpan(
        {
            op: "ai.generate",
            name: "generatePresentation",
        },
        async (span) => {
            span.setAttribute("deck_id", deckStructure.id);
            span.setAttribute("slide_count", deckStructure.slides.length);

            const slides: SlideData[] = [];
            const totalSlides = deckStructure.slides.length;

            for (let i = 0; i < totalSlides; i++) {
                // Check timeout before each slide
                const elapsed = Date.now() - startTime;
                if (elapsed > timeoutMs) {
                    const error = new AIGenerationError(
                        `Presentation generation timed out after ${Math.round(elapsed / 1000)}s (${i}/${totalSlides} slides completed)`,
                        { retryable: false, errorCode: "TIMEOUT" }
                    );

                    logger.error(
                        {
                            elapsed,
                            slideIndex: i,
                            totalSlides,
                            deckId: deckStructure.id,
                        },
                        "Presentation generation timed out"
                    );

                    Sentry.captureException(error, {
                        tags: {
                            component: "slide-generator",
                            action: "generate_presentation_timeout",
                        },
                        extra: {
                            slidesCompleted: i,
                            totalSlides,
                            elapsedMs: elapsed,
                        },
                    });

                    throw error;
                }

                const deckSlide = deckStructure.slides[i];

                const slide = await generateSlideContent({
                    deckSlide,
                    customization,
                    businessProfile,
                    brandDesign,
                    previousSlides: slides,
                });

                slides.push(slide);

                const progress = Math.round(((i + 1) / totalSlides) * 100);

                if (onSlideGenerated) {
                    onSlideGenerated(slide, progress);
                }

                logger.info(
                    { slideNumber: slide.slideNumber, progress },
                    "Slide generated"
                );

                // Small delay to avoid rate limiting
                if (i < totalSlides - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 200));
                }
            }

            const totalTime = Date.now() - startTime;

            logger.info(
                { totalSlides: slides.length, totalTimeMs: totalTime },
                "Presentation generation complete"
            );

            // Record performance metrics
            Sentry.setMeasurement("slides_generated", slides.length, "none");
            Sentry.setMeasurement("generation_time_ms", totalTime, "millisecond");
            Sentry.setMeasurement(
                "ms_per_slide",
                totalTime / slides.length,
                "millisecond"
            );

            span.setStatus({ code: 1, message: "Success" });

            return slides;
        }
    );
}

/**
 * Regenerate a single slide with AI
 */
export async function regenerateSlide(
    slide: SlideData,
    instruction: string,
    _businessProfile?: BusinessProfile,
    _brandDesign?: BrandDesign
): Promise<SlideData> {
    const anthropic = getAnthropicClient();

    const prompt = `Modify this presentation slide based on the following instruction:

Current Slide:
- Title: ${slide.title}
- Content: ${slide.content.join("; ")}
- Speaker Notes: ${slide.speakerNotes}

User Instruction: ${instruction}

Generate updated content in JSON format:
{
  "title": "Updated title",
  "content": ["Updated bullet 1", "Updated bullet 2", ...],
  "speakerNotes": "Updated speaker notes",
  "imagePrompt": "Updated image description"
}`;

    try {
        const response = await withRetry(
            async () => {
                return await anthropic.messages.create({
                    model: AI_CONFIG.models.default,
                    max_tokens: 1000,
                    temperature: 0.7,
                    system: "You are an expert presentation designer. Modify the slide content based on the user's instruction while maintaining professionalism. Always respond with valid JSON only, no markdown code blocks.",
                    messages: [{ role: "user", content: prompt }],
                });
            },
            { operationName: `regenerateSlide_${slide.slideNumber}` }
        );

        const textBlock = response.content.find((block) => block.type === "text");
        const content = textBlock?.type === "text" ? textBlock.text : null;

        if (!content) {
            throw new AIGenerationError("No content generated from Anthropic", {
                retryable: false,
                errorCode: "NO_CONTENT",
            });
        }

        // Try direct JSON parse first, fall back to recovery system
        let generated;
        try {
            generated = JSON.parse(content);
        } catch (parseError) {
            logger.warn(
                {
                    parseError,
                    contentPreview: content.slice(0, 200),
                    slideNumber: slide.slideNumber,
                },
                "Direct JSON parse failed in regenerateSlide, attempting recovery"
            );

            const recovered = recoverJSON<{
                title?: string;
                content?: string[];
                speakerNotes?: string;
                imagePrompt?: string;
            }>(content);

            if (recovered.success && recovered.data !== undefined) {
                logger.info(
                    { strategy: recovered.strategy, slideNumber: slide.slideNumber },
                    "JSON recovered successfully for slide regeneration"
                );
                generated = recovered.data;
            } else {
                logger.error(
                    { error: parseError, content, slideNumber: slide.slideNumber },
                    "Failed to parse Anthropic response as JSON"
                );
                throw new AIGenerationError("Invalid JSON response from Anthropic", {
                    retryable: false,
                    errorCode: "INVALID_JSON",
                });
            }
        }

        return {
            ...slide,
            title: generated.title || slide.title,
            content: generated.content || slide.content,
            speakerNotes: generated.speakerNotes || slide.speakerNotes,
            imagePrompt: generated.imagePrompt,
        };
    } catch (error) {
        const { errorType, originalMessage, statusCode } = parseAnthropicError(error);

        logger.error(
            {
                error,
                slideNumber: slide.slideNumber,
                slideTitle: slide.title,
                errorType,
                originalMessage,
                statusCode,
                model: AI_CONFIG.models.default,
            },
            `Failed to regenerate slide: ${originalMessage}`
        );

        Sentry.captureException(error, {
            tags: {
                component: "slide-generator",
                action: "regenerate_slide",
                errorType,
                slideNumber: slide.slideNumber.toString(),
            },
            extra: {
                originalMessage,
                statusCode,
                model: AI_CONFIG.models.default,
                slideTitle: slide.title,
            },
        });

        throw error;
    }
}
