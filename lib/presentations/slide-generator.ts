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

// ============================================================================
// Premium Design System - Signature Moves & Visual Identity
// ============================================================================

/**
 * Signature moves are recurring visual elements that create cohesive identity.
 * Auto-selected based on visual style preference.
 */
type SignatureMove =
    | "gradient_accent_bar"
    | "colored_left_border"
    | "circular_elements"
    | "diagonal_sections"
    | "corner_accents"
    | "large_numbers"
    | "consistent_icons"
    | "color_blocking"
    | "serif_sans_pairing"
    | "dramatic_shadows";

const SIGNATURE_MOVE_BY_STYLE: Record<
    PresentationCustomization["visualStyle"],
    SignatureMove
> = {
    professional: "colored_left_border",
    creative: "diagonal_sections",
    minimal: "large_numbers",
    bold: "color_blocking",
};

const SIGNATURE_MOVE_DESCRIPTIONS: Record<SignatureMove, string> = {
    gradient_accent_bar:
        "A subtle gradient bar at the top or bottom of each slide using brand colors",
    colored_left_border:
        "A bold colored vertical bar on the left side of content cards/sections",
    circular_elements: "Rounded corners and circular decorative elements throughout",
    diagonal_sections: "Angled section dividers and diagonal cuts for dynamic energy",
    corner_accents: "Decorative corner elements that frame content consistently",
    large_numbers: "Oversized, stylized numbers for sequences and statistics",
    consistent_icons: "A unified icon style (outlined or filled) used throughout",
    color_blocking: "Bold blocks of solid color to create visual sections",
    serif_sans_pairing:
        "Elegant serif fonts for headlines paired with clean sans-serif body text",
    dramatic_shadows: "Deep, consistent drop shadows on cards and elevated elements",
};

function getSignatureMove(visualStyle: PresentationCustomization["visualStyle"]): {
    move: SignatureMove;
    description: string;
} {
    const move = SIGNATURE_MOVE_BY_STYLE[visualStyle];
    return { move, description: SIGNATURE_MOVE_DESCRIPTIONS[move] };
}

// ============================================================================
// Layout Variation Enforcement
// ============================================================================

const LAYOUT_TYPES: SlideData["layoutType"][] = [
    "title",
    "section",
    "bullets",
    "quote",
    "statistics",
    "comparison",
    "process",
    "content_left",
    "content_right",
    "cta",
];

/**
 * Ensures no two consecutive slides have the same layout type.
 * Returns an alternative layout if needed.
 */
function enforceLayoutVariation(
    proposedLayout: SlideData["layoutType"],
    previousLayout: SlideData["layoutType"] | undefined,
    slideIndex: number,
    totalSlides: number
): SlideData["layoutType"] {
    // First slide must be title, last slide should be CTA
    if (slideIndex === 0) return "title";
    if (slideIndex === totalSlides - 1) return "cta";

    // If different from previous, keep it
    if (proposedLayout !== previousLayout) return proposedLayout;

    // Need to pick an alternative - choose based on content suitability
    const alternatives = LAYOUT_TYPES.filter(
        (l) => l !== proposedLayout && l !== "title" && l !== "cta"
    );

    // Rotate through alternatives based on slide position
    return alternatives[slideIndex % alternatives.length];
}

// ============================================================================
// Premium Design System Prompt Builder
// ============================================================================

function buildPremiumSystemPrompt(
    customization: PresentationCustomization,
    signatureMove: { move: SignatureMove; description: string }
): string {
    return `You are an ELITE presentation designer creating slides that rival top design agencies.

## YOUR CORE MANDATE - PREMIUM QUALITY ONLY

You create slides that are:
1. VISUALLY DISTINCTIVE - Never generic "AI-generated" looking
2. EMOTIONALLY IMPACTFUL - Each slide creates a feeling, not just conveys info
3. INSTANTLY READABLE - 3-second rule: one clear idea per slide
4. PROFESSIONALLY POLISHED - Like a $10,000 custom presentation

## DESIGN PHILOSOPHY (Non-Negotiable)

### Commit to Bold Aesthetic Direction
- Every presentation needs a DISTINCTIVE visual identity
- One dominant color owns 60-70% of visual weight (60-30-10 rule)
- Your signature move for this presentation: ${signatureMove.description}

### Design for Moments, Not Pages
- Each slide = ONE powerful idea
- Clear focal point that draws the eye
- Create anticipation for the next slide

### Restraint Creates Impact
- Maximum 3 font sizes per slide
- Maximum 3 colors per slide
- Maximum 5 bullet points (fewer is better)
- Maximum 2 sentences per paragraph
- If everything is emphasized, nothing is emphasized

### Visual Hierarchy is Non-Negotiable
- PRIMARY: What the eye sees first (large, bold, contrasting)
- SECONDARY: Supporting information (medium, readable)
- TERTIARY: Details, sources (small, muted)

## ANTI-PATTERNS - ABSOLUTELY FORBIDDEN

### Content Anti-Patterns
- Generic corporate jargon ("synergy", "leverage", "paradigm shift", "utilize")
- Starting consecutive bullets with the same word
- Vague statements without specifics ("improve results", "drive growth")
- Walls of text or paragraphs longer than 2 sentences
- Weak verbs: use "build" not "implement", use "use" not "utilize"

### Visual Description Anti-Patterns (for imagePrompt)
- Generic blue gradients
- Purple-to-pink gradients (overused)
- Rainbow gradients
- Stock photo clichés (handshakes, people pointing at screens, arrows hitting targets)
- Generic "business people in meeting" imagery

### Layout Anti-Patterns
- Centering ALL elements on every slide
- Using the same layout for 2+ consecutive slides
- Content touching slide edges (need 40px+ padding)

## STYLE PARAMETERS FOR THIS PRESENTATION

- Visual Style: ${customization.visualStyle.toUpperCase()}
- Text Density: ${customization.textDensity}
- Emphasis: ${customization.emphasisPreference}
- Image Style: ${customization.imageStyle}
- Signature Move: ${signatureMove.move.replace(/_/g, " ")}

## OUTPUT FORMAT

Always respond with valid JSON only. No markdown code blocks, no explanations.
Make every word count. Every bullet point should spark curiosity or drive action.`;
}

function buildPremiumUserPrompt(
    deckSlide: DeckStructureSlide,
    customization: PresentationCustomization,
    bulletCount: { min: number; max: number },
    businessContext: string,
    previousSlides: SlideData[] | undefined,
    signatureMove: { move: SignatureMove; description: string }
): string {
    const previousLayoutsInfo =
        previousSlides && previousSlides.length > 0
            ? `\nPREVIOUS SLIDE LAYOUTS (do NOT repeat consecutively):
${previousSlides
    .slice(-3)
    .map((s) => `- Slide ${s.slideNumber}: ${s.layoutType}`)
    .join("\n")}`
            : "";

    const layoutRecommendation = getLayoutRecommendation(deckSlide, previousSlides);

    return `Create PREMIUM slide content that would impress a Fortune 500 CEO.

${businessContext}

## SLIDE BRIEF
- Slide Number: ${deckSlide.slideNumber}
- Title Theme: ${deckSlide.title}
- Purpose: ${deckSlide.description}
- Section: ${deckSlide.section}
${previousLayoutsInfo}

## RECOMMENDED LAYOUT: ${layoutRecommendation}
(Choose this or a suitable alternative - but NEVER repeat the previous slide's layout)

## SIGNATURE MOVE TO INCORPORATE
${signatureMove.description}
When creating the imagePrompt, suggest how this signature element could appear visually.

## DELIVERABLES

Create JSON with these fields:

1. **title**: Punchy, specific headline (6-10 words max)
   - Use power words that create emotion
   - Be specific, not vague
   - Example: "3 Hidden Mistakes Costing You $10K Monthly" not "Common Business Mistakes"

2. **content**: Array of ${bulletCount.min}-${bulletCount.max} bullet points
   - Each bullet: max 12 words, starts with different word
   - Use concrete numbers/examples when possible
   - Action-oriented language
   - Build momentum - each point should flow to the next

3. **speakerNotes**: 2-3 sentences for the presenter
   - Explain the "why" behind the content
   - Include a transition hint to the next topic
   - Conversational, not robotic

4. **imagePrompt**: Detailed AI image generation prompt
   - Style: ${customization.imageStyle}
   - Include mood, lighting, color direction (aligned with brand)
   - Be conceptual/metaphorical, not literal
   - Mention the signature element: ${signatureMove.move.replace(/_/g, " ")}
   - Avoid: handshakes, pointing at screens, generic office scenes

5. **layoutType**: One of: title, section, bullets, quote, statistics, comparison, process, content_left, content_right, cta
   - Must be different from previous slide
   - Match the content type

{
  "title": "...",
  "content": ["...", "..."],
  "speakerNotes": "...",
  "imagePrompt": "...",
  "layoutType": "..."
}`;
}

function getLayoutRecommendation(
    slide: DeckStructureSlide,
    previousSlides: SlideData[] | undefined
): string {
    const title = slide.title.toLowerCase();
    const section = slide.section?.toLowerCase() || "";
    const prevLayout = previousSlides?.[previousSlides.length - 1]?.layoutType;

    // Determine best layout based on content
    let recommended: SlideData["layoutType"] = "bullets";

    if (slide.slideNumber === 1) {
        recommended = "title";
    } else if (
        title.includes("quote") ||
        title.includes("testimonial") ||
        title.includes("said")
    ) {
        recommended = "quote";
    } else if (
        title.includes("step") ||
        title.includes("process") ||
        title.includes("how")
    ) {
        recommended = "process";
    } else if (
        title.includes("vs") ||
        title.includes("before") ||
        title.includes("after") ||
        title.includes("comparison")
    ) {
        recommended = "comparison";
    } else if (
        title.includes("stat") ||
        title.includes("number") ||
        title.includes("data") ||
        title.includes("%")
    ) {
        recommended = "statistics";
    } else if (section === "hook" || section === "connect") {
        recommended = slide.slideNumber % 2 === 0 ? "content_left" : "quote";
    } else if (section === "offer" || section === "invite") {
        recommended = slide.slideNumber % 2 === 0 ? "cta" : "content_right";
    }

    // Ensure we don't recommend the same as previous
    if (recommended === prevLayout) {
        const alternatives: SlideData["layoutType"][] = [
            "content_left",
            "content_right",
            "bullets",
            "statistics",
        ];
        recommended = alternatives[slide.slideNumber % alternatives.length];
    }

    return recommended;
}

/**
 * Generate content for a single slide using AI
 * Uses premium design system prompts for professional-quality output
 */
export async function generateSlideContent(
    options: GenerateSlideOptions
): Promise<SlideData> {
    const { deckSlide, customization, businessProfile, brandDesign, previousSlides } =
        options;

    const bulletCount = getBulletCount(customization.textDensity);
    const signatureMove = getSignatureMove(customization.visualStyle);

    // Build rich business context for personalization
    const businessContext = businessProfile
        ? `## BUSINESS CONTEXT (Use this to personalize content)
- Business Name: ${businessProfile.business_name || "Not specified"}
- Target Audience: ${businessProfile.target_audience || "Not specified"}
- Main Offer: ${businessProfile.main_offer || "Not specified"}
- Unique Mechanism: ${businessProfile.unique_mechanism || "Not specified"}
- Brand Voice: ${businessProfile.brand_voice || "Professional and engaging"}
${brandDesign ? `\n## BRAND COLORS (Reference for imagePrompt)\n- Primary: ${brandDesign.primary_color || "Not set"}\n- Secondary: ${brandDesign.secondary_color || "Not set"}\n- Accent: ${brandDesign.accent_color || "Not set"}` : ""}`
        : "";

    // Build premium prompts using the design system
    const systemPrompt = buildPremiumSystemPrompt(customization, signatureMove);
    const userPrompt = buildPremiumUserPrompt(
        deckSlide,
        customization,
        bulletCount,
        businessContext,
        previousSlides,
        signatureMove
    );

    const anthropic = getAnthropicClient();

    try {
        const response = await withRetry(
            async () => {
                return await anthropic.messages.create({
                    model: AI_CONFIG.models.default,
                    max_tokens: 1500,
                    temperature: 0.8, // Slightly higher for more creative output
                    system: systemPrompt,
                    messages: [{ role: "user", content: userPrompt }],
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
                layoutType?: SlideData["layoutType"];
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

        // Get the layout from AI or determine it, then enforce variation
        const previousLayout = previousSlides?.[previousSlides.length - 1]?.layoutType;
        const aiLayout =
            generated.layoutType && LAYOUT_TYPES.includes(generated.layoutType)
                ? generated.layoutType
                : determineLayoutType(
                      deckSlide,
                      deckSlide.slideNumber - 1,
                      previousSlides?.length || 60
                  );

        // Apply post-generation validation to ensure no consecutive identical layouts
        const finalLayout = enforceLayoutVariation(
            aiLayout,
            previousLayout,
            deckSlide.slideNumber - 1,
            previousSlides?.length || 60
        );

        if (finalLayout !== aiLayout) {
            logger.info(
                {
                    slideNumber: deckSlide.slideNumber,
                    originalLayout: aiLayout,
                    enforcedLayout: finalLayout,
                    previousLayout,
                },
                "Layout adjusted to prevent consecutive duplicates"
            );
        }

        return {
            slideNumber: deckSlide.slideNumber,
            title: generated.title || deckSlide.title,
            content: generated.content || [deckSlide.description],
            speakerNotes: generated.speakerNotes || "",
            imagePrompt: generated.imagePrompt,
            layoutType: finalLayout,
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
