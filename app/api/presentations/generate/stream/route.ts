/**
 * Presentations API - Streaming Generation
 * GET /api/presentations/generate/stream
 * Streams slide generation progress via Server-Sent Events (SSE)
 *
 * Related: GitHub Issue #327 - Real-time Streaming Editor
 * Enhanced: Auto-generates images per slide during streaming
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AIGenerationError } from "@/lib/errors";
import { generatePresentation } from "@/lib/presentations/slide-generator";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/middleware/rate-limit";
import {
    PRESENTATION_LIMIT,
    PRESENTATION_LIMIT_ENABLED,
    PresentationStatus,
} from "@/lib/constants/presentations";

// =============================================================================
// Timeout Configuration
// All timeout values in one place for easy tuning and maintenance
// =============================================================================

// Stream timeout protection (75 minutes for reliable 60-slide generation with images)
// Each slide with image takes ~30-60 seconds, so 60 slides needs up to 60 minutes
// Adding 15 minute buffer for network latency and API variability
const STREAM_TIMEOUT_MS = 75 * 60 * 1000;

// Heartbeat interval to keep SSE connection alive during slow image generation
// Proxies and load balancers may close "idle" connections after 30-60 seconds
// Using 20s to stay well under common proxy timeouts (30-60s)
const HEARTBEAT_INTERVAL_MS = 20 * 1000;

// Per-image generation timeout and retry settings
const IMAGE_GENERATION_TIMEOUT_MS = 90 * 1000; // 90 seconds per image attempt
const IMAGE_DOWNLOAD_TIMEOUT_MS = 30 * 1000; // 30 seconds for image download
const IMAGE_GENERATION_MAX_RETRIES = 2; // Try up to 2 times before giving up
const RETRY_BASE_DELAY_MS = 1000; // Base delay for exponential backoff

// =============================================================================

// Lazy OpenAI client initialization for image generation
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY environment variable is required");
        }
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
}

/**
 * Wraps a promise with a timeout, rejecting if the operation takes too long.
 *
 * Used to prevent hanging on slow external API calls (OpenAI DALL-E, image downloads).
 * The timeout is enforced via Promise.race - the underlying operation continues
 * but we stop waiting for it.
 *
 * Note: This does NOT cancel the underlying operation (e.g., a fetch request).
 * For cancellable operations, use AbortController separately.
 *
 * @template T - The type returned by the promise
 * @param promise - The promise to wrap with timeout
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @param operationName - Human-readable name for error messages (e.g., "DALL-E image generation")
 * @returns The resolved value of the promise
 * @throws Error with message "{operationName} timed out after {timeoutMs}ms"
 *
 * @example
 * const result = await withTimeout(
 *   openai.images.generate({ prompt: "..." }),
 *   90000,
 *   "DALL-E image generation"
 * );
 */
async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string
): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        if (timeoutId) clearTimeout(timeoutId);
        return result;
    } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Generate an image for a slide using DALL-E 3 with timeout and retry
 * Returns the permanent Supabase storage URL or null on failure
 *
 * Retry behavior:
 * - Network errors, timeouts, and transient failures: Will retry with exponential backoff
 * - Empty URL from OpenAI: No retry (indicates content policy rejection or API issue,
 *   not a transient error - retrying would waste time and credits)
 * - Failed download/upload: Will retry (transient network issues)
 */
async function generateSlideImage(
    presentationId: string,
    slideNumber: number,
    imagePrompt: string,
    brandPrimaryColor: string | null,
    supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
    const openai = getOpenAIClient();

    // Enhance prompt with brand context
    const styleContext = [
        "Professional business presentation slide image.",
        brandPrimaryColor ? `Color scheme inspired by ${brandPrimaryColor}.` : "",
        "Clean, modern design suitable for presentations.",
        "High quality, no text overlays.",
    ]
        .filter(Boolean)
        .join(" ");

    const enhancedPrompt = `${styleContext} ${imagePrompt}`;

    // Retry loop for image generation with exponential backoff
    for (let attempt = 1; attempt <= IMAGE_GENERATION_MAX_RETRIES; attempt++) {
        try {
            logger.info(
                {
                    presentationId,
                    slideNumber,
                    attempt,
                    maxRetries: IMAGE_GENERATION_MAX_RETRIES,
                    promptLength: enhancedPrompt.length,
                },
                "Generating AI image for slide during streaming"
            );

            // Wrap OpenAI call with timeout to prevent hanging
            const response = await withTimeout(
                openai.images.generate({
                    model: "dall-e-3",
                    prompt: enhancedPrompt,
                    n: 1,
                    size: "1792x1024", // 16:9 aspect ratio for slides
                    quality: "standard",
                    style: "natural",
                }),
                IMAGE_GENERATION_TIMEOUT_MS,
                "DALL-E image generation"
            );

            const tempImageUrl = response.data?.[0]?.url;
            if (!tempImageUrl) {
                // Empty URL typically means content policy rejection or API-side issue
                // This is not transient - retrying would waste time and API credits
                logger.warn(
                    { presentationId, slideNumber, attempt },
                    "No image URL returned from OpenAI - likely content policy or API issue, not retrying"
                );
                return null;
            }

            // Download and upload to permanent storage with AbortController
            // AbortController ensures the fetch is cancelled on timeout, preventing memory leaks
            const downloadController = new AbortController();
            const downloadTimeout = setTimeout(() => {
                downloadController.abort();
            }, IMAGE_DOWNLOAD_TIMEOUT_MS);

            let imageResponse: Response;
            try {
                imageResponse = await fetch(tempImageUrl, {
                    signal: downloadController.signal,
                });
            } catch (fetchError) {
                clearTimeout(downloadTimeout);
                const isAbortError =
                    fetchError instanceof Error && fetchError.name === "AbortError";
                logger.warn(
                    { presentationId, slideNumber, attempt, isAbortError },
                    isAbortError
                        ? "Image download timed out"
                        : "Failed to fetch image from OpenAI"
                );
                if (attempt < IMAGE_GENERATION_MAX_RETRIES) {
                    continue; // Retry
                }
                return null;
            } finally {
                clearTimeout(downloadTimeout);
            }

            if (!imageResponse.ok) {
                logger.warn(
                    { presentationId, slideNumber, attempt },
                    "Failed to download image from OpenAI"
                );
                if (attempt < IMAGE_GENERATION_MAX_RETRIES) {
                    continue; // Retry
                }
                return null;
            }

            const imageBlob = await imageResponse.blob();
            const imageBuffer = await imageBlob.arrayBuffer();

            const timestamp = Date.now();
            const storagePath = `presentations/${presentationId}/slide-${slideNumber}-${timestamp}.png`;

            const { error: uploadError } = await supabase.storage
                .from("presentation-media")
                .upload(storagePath, imageBuffer, {
                    contentType: "image/png",
                    cacheControl: "31536000",
                    upsert: true,
                });

            if (uploadError) {
                logger.warn(
                    { error: uploadError, presentationId, slideNumber, attempt },
                    "Failed to upload image to storage"
                );
                if (attempt < IMAGE_GENERATION_MAX_RETRIES) {
                    continue; // Retry
                }
                return null;
            }

            const { data: urlData } = supabase.storage
                .from("presentation-media")
                .getPublicUrl(storagePath);

            logger.info(
                { presentationId, slideNumber, storagePath, attempt },
                "Image generated and uploaded successfully during streaming"
            );

            return urlData.publicUrl;
        } catch (error) {
            const isTimeout =
                error instanceof Error && error.message.includes("timed out");

            logger.warn(
                {
                    error,
                    presentationId,
                    slideNumber,
                    attempt,
                    maxRetries: IMAGE_GENERATION_MAX_RETRIES,
                    isTimeout,
                },
                `Image generation attempt ${attempt} failed${attempt < IMAGE_GENERATION_MAX_RETRIES ? ", retrying..." : ""}`
            );

            if (attempt >= IMAGE_GENERATION_MAX_RETRIES) {
                // All retries exhausted - log error, track in Sentry, and return null
                logger.error(
                    { error, presentationId, slideNumber },
                    "Failed to generate image after all retries - slide will show placeholder"
                );

                // Track exhausted retries in Sentry for monitoring
                Sentry.captureException(error, {
                    tags: {
                        component: "image-generation",
                        action: "dall-e-retry-exhausted",
                    },
                    extra: {
                        presentationId,
                        slideNumber,
                        maxRetries: IMAGE_GENERATION_MAX_RETRIES,
                        isTimeout,
                    },
                });

                return null;
            }

            // Exponential backoff with jitter before retry
            // Base delays: 1s, 2s, 4s with ±30% random jitter
            // Jitter prevents thundering herd when multiple requests retry simultaneously
            const baseDelay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
            const jitter = (Math.random() - 0.5) * 0.6; // ±30% variation
            const backoffDelay = Math.round(baseDelay * (1 + jitter));
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
    }

    return null;
}

// Zod schema for presentation customization
const PresentationCustomizationSchema = z.object({
    textDensity: z.enum(["minimal", "balanced", "detailed"]),
    visualStyle: z.enum(["professional", "creative", "minimal", "bold"]),
    emphasisPreference: z.enum(["text", "visuals", "balanced"]),
    animationLevel: z.enum(["none", "subtle", "moderate", "dynamic"]),
    imageStyle: z.enum(["photography", "illustration", "abstract", "icons"]),
});

// Zod schema for deck structure slides from JSONB
const DeckStructureSlideSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    section: z.string().optional(),
});

// SSE message types
type SSEEventType =
    | "connected"
    | "slide_generated"
    | "progress"
    | "completed"
    | "error";

interface SSEMessage {
    type: SSEEventType;
    data: Record<string, unknown>;
}

function formatSSE(message: SSEMessage): string {
    return `event: ${message.type}\ndata: ${JSON.stringify(message.data)}\n\n`;
}

class StreamTimeoutError extends Error {
    constructor(timeoutMs: number) {
        super(`Stream generation timed out after ${Math.round(timeoutMs / 1000)}s`);
        this.name = "StreamTimeoutError";
    }
}

function createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new StreamTimeoutError(timeoutMs)), timeoutMs);
    });
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const deckStructureId = searchParams.get("deckStructureId");
    const customizationParam = searchParams.get("customization");

    // Resume parameters (optional)
    const resumePresentationId = searchParams.get("resumePresentationId");
    const resumeFromSlideParam = searchParams.get("resumeFromSlide");
    const resumeFromSlide = resumeFromSlideParam
        ? parseInt(resumeFromSlideParam, 10)
        : null;
    // Type-safe resume check: slideNumber must be a positive integer (1-indexed)
    // Using !== null instead of !! to handle edge case where resumeFromSlide=0 is passed
    const isResuming =
        !!resumePresentationId && resumeFromSlide !== null && resumeFromSlide > 0;

    // Diagnostic logging - request received
    logger.debug(
        {
            projectId,
            deckStructureId,
            hasCustomization: !!customizationParam,
            isResuming,
            resumePresentationId,
            resumeFromSlide,
        },
        "SSE stream request received"
    );

    // Validate required params
    if (!projectId || !deckStructureId) {
        return new Response(
            JSON.stringify({ error: "Missing projectId or deckStructureId" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        const supabase = await createClient();
        logger.debug({}, "Supabase client created");

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Rate limiting - 10 requests per minute for expensive AI generation
        // IMPORTANT: Resume requests bypass rate limiting to allow seamless reconnection
        // This prevents users from being locked out when SSE connections drop mid-generation
        if (!isResuming) {
            const rateLimitIdentifier = getRateLimitIdentifier(request, user.id);
            const rateLimitResponse = await checkRateLimit(
                rateLimitIdentifier,
                "presentation-generation"
            );
            if (rateLimitResponse) {
                logger.warn(
                    { userId: user.id, endpoint: "presentation-generation-stream" },
                    "Rate limit exceeded for streaming presentation generation"
                );
                return rateLimitResponse;
            }
        } else {
            logger.info(
                { userId: user.id, resumePresentationId, resumeFromSlide },
                "Bypassing rate limit for resume request"
            );
        }

        // Parse customization
        let customization: z.infer<typeof PresentationCustomizationSchema>;
        try {
            customization = customizationParam
                ? PresentationCustomizationSchema.parse(JSON.parse(customizationParam))
                : {
                      textDensity: "balanced" as const,
                      visualStyle: "professional" as const,
                      emphasisPreference: "balanced" as const,
                      animationLevel: "subtle" as const,
                      imageStyle: "photography" as const,
                  };
        } catch {
            return new Response(
                JSON.stringify({ error: "Invalid customization parameters" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Fetch required data
        const [
            projectResult,
            deckStructureResult,
            brandDesignResult,
            businessProfileResult,
        ] = await Promise.all([
            supabase
                .from("funnel_projects")
                .select("id, name, user_id")
                .eq("id", projectId)
                .single(),
            supabase
                .from("deck_structures")
                .select("*")
                .eq("id", deckStructureId)
                .eq("user_id", user.id)
                .single(),
            supabase
                .from("brand_designs")
                .select("*")
                .eq("funnel_project_id", projectId)
                .maybeSingle(),
            supabase
                .from("business_profiles")
                .select("*")
                .eq("funnel_project_id", projectId)
                .maybeSingle(),
        ]);

        const { data: project, error: projectError } = projectResult;
        const { data: deckStructure, error: deckError } = deckStructureResult;
        const { data: brandDesign } = brandDesignResult;
        const { data: businessProfile } = businessProfileResult;

        if (projectError || !project) {
            return new Response(JSON.stringify({ error: "Project not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (project.user_id !== user.id) {
            return new Response(JSON.stringify({ error: "Access denied" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (deckError || !deckStructure) {
            return new Response(JSON.stringify({ error: "Deck structure not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Check generation limit (3 presentations per funnel)
        // Only applies to new presentations, not resuming, and only when limit is enabled
        if (PRESENTATION_LIMIT_ENABLED && !isResuming) {
            const { count, error: countError } = await supabase
                .from("presentations")
                .select("*", { count: "exact", head: true })
                .eq("funnel_project_id", projectId)
                .neq("status", PresentationStatus.FAILED); // Failed presentations don't count against quota

            if (countError) {
                logger.error(
                    { error: countError, projectId },
                    "Failed to check presentation count"
                );
            }

            if ((count ?? 0) >= PRESENTATION_LIMIT) {
                logger.warn(
                    { projectId, count, limit: PRESENTATION_LIMIT },
                    "Presentation generation limit reached"
                );
                return new Response(
                    JSON.stringify({
                        error: "Presentation limit reached",
                        message: `You have reached the limit of ${PRESENTATION_LIMIT} presentations per funnel. This limit cannot be reset by deleting presentations.`,
                        code: "PRESENTATION_LIMIT_REACHED",
                    }),
                    { status: 429, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        // Validate slides
        const rawSlides = Array.isArray(deckStructure.slides)
            ? deckStructure.slides
            : [];
        const validatedSlides = rawSlides.map((slide: unknown, index: number) => {
            const parsed = DeckStructureSlideSchema.safeParse(slide);
            if (parsed.success) {
                return parsed.data;
            }
            return { title: `Slide ${index + 1}`, description: "", section: "" };
        });

        // Create or resume presentation record
        const totalExpectedSlides = validatedSlides.length;
        let presentation: any;
        let startFromSlideNumber = 1;

        if (isResuming && resumePresentationId) {
            // Resume mode: fetch existing presentation and validate ownership
            const { data: existingPresentation, error: fetchError } = await supabase
                .from("presentations")
                .select("*")
                .eq("id", resumePresentationId)
                .single();

            if (fetchError || !existingPresentation) {
                logger.error(
                    { error: fetchError, resumePresentationId },
                    "Failed to fetch presentation for resume"
                );
                return new Response(
                    JSON.stringify({ error: "Presentation not found for resume" }),
                    { status: 404, headers: { "Content-Type": "application/json" } }
                );
            }

            if (existingPresentation.user_id !== user.id) {
                return new Response(
                    JSON.stringify({
                        error: "Not authorized to resume this presentation",
                    }),
                    { status: 403, headers: { "Content-Type": "application/json" } }
                );
            }

            // Update presentation status to generating
            const { error: updateError } = await supabase
                .from("presentations")
                .update({
                    status: "generating",
                    error_message: null,
                })
                .eq("id", resumePresentationId);

            if (updateError) {
                logger.error(
                    { error: updateError, resumePresentationId },
                    "Failed to update presentation status for resume"
                );
            }

            presentation = existingPresentation;
            startFromSlideNumber = resumeFromSlide || 1;

            logger.info(
                {
                    userId: user.id,
                    projectId,
                    presentationId: presentation.id,
                    resumeFromSlide: startFromSlideNumber,
                    existingSlideCount: Array.isArray(presentation.slides)
                        ? presentation.slides.length
                        : 0,
                },
                "Resuming presentation generation"
            );
        } else {
            // New presentation mode
            // First try with total_expected_slides (requires migration 20251218000002)
            // If that fails, fall back to without the column for backward compatibility
            let newPresentation;
            let createError;

            try {
                const result = await supabase
                    .from("presentations")
                    .insert({
                        user_id: user.id,
                        funnel_project_id: projectId,
                        deck_structure_id: deckStructureId,
                        title: deckStructure.title || "Untitled Presentation",
                        customization: customization,
                        status: "generating",
                        slides: [],
                        generation_progress: 0,
                        total_expected_slides: totalExpectedSlides,
                    })
                    .select()
                    .single();

                newPresentation = result.data;
                createError = result.error;

                // If error mentions the column doesn't exist, try without it
                if (
                    createError &&
                    createError.message?.includes("total_expected_slides")
                ) {
                    logger.warn(
                        { error: createError },
                        "total_expected_slides column not found, retrying without it"
                    );

                    const fallbackResult = await supabase
                        .from("presentations")
                        .insert({
                            user_id: user.id,
                            funnel_project_id: projectId,
                            deck_structure_id: deckStructureId,
                            title: deckStructure.title || "Untitled Presentation",
                            customization: customization,
                            status: "generating",
                            slides: [],
                            generation_progress: 0,
                        })
                        .select()
                        .single();

                    newPresentation = fallbackResult.data;
                    createError = fallbackResult.error;
                }
            } catch (insertException) {
                logger.error(
                    { error: insertException, projectId, userId: user.id },
                    "Exception during presentation INSERT"
                );
                createError = insertException;
            }

            if (createError || !newPresentation) {
                logger.error(
                    {
                        error: createError,
                        projectId,
                        userId: user.id,
                        deckStructureId,
                    },
                    "Failed to create presentation record"
                );
                return new Response(
                    JSON.stringify({
                        error: "Failed to create presentation",
                        details:
                            createError instanceof Error
                                ? createError.message
                                : String(createError),
                    }),
                    { status: 500, headers: { "Content-Type": "application/json" } }
                );
            }

            presentation = newPresentation;

            logger.info(
                {
                    userId: user.id,
                    projectId,
                    deckStructureId,
                    presentationId: presentation.id,
                },
                "Starting new streaming presentation generation"
            );
        }

        // Filter slides to generate (skip already generated ones in resume mode)
        const slidesToGenerate = validatedSlides.filter(
            (_: unknown, index: number) => index + 1 >= startFromSlideNumber
        );

        // Create SSE stream
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                // Start heartbeat to keep connection alive during slow image generation
                // Proxies/load balancers may close connections that appear idle
                // Using SSE comments (lines starting with :) for efficient keep-alive
                let heartbeatStopped = false;
                const heartbeatInterval = setInterval(() => {
                    if (heartbeatStopped) {
                        clearInterval(heartbeatInterval);
                        return;
                    }
                    try {
                        // SSE comment format - ignored by clients, keeps connection alive
                        controller.enqueue(
                            encoder.encode(`:heartbeat ${Date.now()}\n\n`)
                        );
                    } catch {
                        // Controller closed - mark as stopped and clear interval
                        heartbeatStopped = true;
                        clearInterval(heartbeatInterval);
                    }
                }, HEARTBEAT_INTERVAL_MS);

                // Helper to clean up heartbeat on stream end - idempotent
                const stopHeartbeat = () => {
                    heartbeatStopped = true;
                    clearInterval(heartbeatInterval);
                };

                try {
                    // Send connected event with resume info
                    controller.enqueue(
                        encoder.encode(
                            formatSSE({
                                type: "connected",
                                data: {
                                    presentationId: presentation.id,
                                    totalSlides: validatedSlides.length,
                                    isResuming,
                                    startFromSlide: startFromSlideNumber,
                                    slidesToGenerate: slidesToGenerate.length,
                                },
                            })
                        )
                    );
                    // Wrap generation in timeout to prevent hung connections
                    // This protects against OpenAI API hangs and ensures resources are released
                    // Generate only the slides that need to be generated (filtered for resume)
                    // CRITICAL: Pass explicit timeout to align with stream timeout
                    // Without this, slide-generator uses a 5-minute default which is too short
                    // for presentations with image generation (~30-60 seconds per slide)
                    const generationPromise = generatePresentation({
                        deckStructure: {
                            id: deckStructure.id,
                            title: deckStructure.title || "Presentation",
                            slideCount: validatedSlides.length, // Total expected
                            slides: slidesToGenerate.map(
                                (
                                    s: z.infer<typeof DeckStructureSlideSchema>,
                                    i: number
                                ) => ({
                                    // Use actual slide numbers for resume continuity
                                    slideNumber: startFromSlideNumber + i,
                                    title:
                                        s.title || `Slide ${startFromSlideNumber + i}`,
                                    description: s.description || "",
                                    section: s.section || "",
                                })
                            ),
                        },
                        customization,
                        businessProfile: businessProfile || undefined,
                        brandDesign: brandDesign || undefined,
                        timeoutMs: STREAM_TIMEOUT_MS,
                        onSlideGenerated: async (slide, progress) => {
                            // Generate image for the slide if it has an imagePrompt
                            // This happens BEFORE sending the slide to the client
                            let slideWithImage = { ...slide };

                            if (slide.imagePrompt && !slide.imageUrl) {
                                const imageUrl = await generateSlideImage(
                                    presentation.id,
                                    slide.slideNumber,
                                    slide.imagePrompt,
                                    brandDesign?.primary_color || null,
                                    supabase
                                );

                                if (imageUrl) {
                                    slideWithImage = {
                                        ...slide,
                                        imageUrl,
                                        imageGeneratedAt: new Date().toISOString(),
                                    };
                                }
                            }

                            // Send slide generated event with the complete slide (including image)
                            controller.enqueue(
                                encoder.encode(
                                    formatSSE({
                                        type: "slide_generated",
                                        data: {
                                            slide: slideWithImage,
                                            slideNumber: slideWithImage.slideNumber,
                                            progress,
                                        },
                                    })
                                )
                            );

                            // Also send progress update
                            controller.enqueue(
                                encoder.encode(
                                    formatSSE({
                                        type: "progress",
                                        data: {
                                            progress,
                                            currentSlide: slideWithImage.slideNumber,
                                        },
                                    })
                                )
                            );

                            // CRITICAL: Save slide to database immediately for persistence
                            // Uses atomic RPC to prevent race conditions with parallel slides
                            try {
                                const { error: appendError } = await supabase.rpc(
                                    "append_slide_to_presentation",
                                    {
                                        p_presentation_id: presentation.id,
                                        p_slide: slideWithImage,
                                        p_progress: progress,
                                    }
                                );

                                if (appendError) {
                                    throw appendError;
                                }

                                logger.info(
                                    {
                                        presentationId: presentation.id,
                                        slideNumber: slideWithImage.slideNumber,
                                        progress,
                                        hasImage: !!slideWithImage.imageUrl,
                                    },
                                    "Slide saved to database during generation"
                                );
                            } catch (saveError) {
                                logger.error(
                                    {
                                        error: saveError,
                                        presentationId: presentation.id,
                                        slideNumber: slideWithImage.slideNumber,
                                    },
                                    "Failed to save slide during generation"
                                );
                            }
                        },
                    });

                    // Race between generation and timeout
                    const generatedSlides = await Promise.race([
                        generationPromise,
                        createTimeoutPromise<Awaited<typeof generationPromise>>(
                            STREAM_TIMEOUT_MS
                        ),
                    ]);

                    // Update presentation with completed slides
                    await supabase
                        .from("presentations")
                        .update({
                            slides: generatedSlides,
                            status: "completed",
                            generation_progress: 100,
                            completed_at: new Date().toISOString(),
                        })
                        .eq("id", presentation.id);

                    // Send completion event
                    controller.enqueue(
                        encoder.encode(
                            formatSSE({
                                type: "completed",
                                data: {
                                    presentationId: presentation.id,
                                    slides: generatedSlides,
                                    slideCount: generatedSlides.length,
                                },
                            })
                        )
                    );

                    logger.info(
                        {
                            presentationId: presentation.id,
                            slideCount: generatedSlides.length,
                        },
                        "Streaming presentation generation complete"
                    );

                    stopHeartbeat();
                    controller.close();
                } catch (error) {
                    // Detect timeout from either:
                    // 1. StreamTimeoutError (outer Promise.race timeout)
                    // 2. AIGenerationError with TIMEOUT code (inner slide-generator timeout)
                    const isStreamTimeout = error instanceof StreamTimeoutError;
                    const isGenerationTimeout =
                        error instanceof AIGenerationError &&
                        error.errorCode === "TIMEOUT";
                    const isTimeout = isStreamTimeout || isGenerationTimeout;

                    const errorMessage = isTimeout
                        ? "AI_PROVIDER_TIMEOUT"
                        : error instanceof Error
                          ? error.message
                          : "Unknown error";

                    logger.error(
                        {
                            error,
                            presentationId: presentation.id,
                            isTimeout,
                            timeoutMs: STREAM_TIMEOUT_MS,
                        },
                        isTimeout
                            ? "Streaming generation timed out"
                            : "Streaming generation failed"
                    );

                    // Check how many slides were generated before the error
                    const { data: currentState } = await supabase
                        .from("presentations")
                        .select("slides")
                        .eq("id", presentation.id)
                        .single();

                    const currentSlides = Array.isArray(currentState?.slides)
                        ? currentState.slides
                        : [];

                    // If some slides were generated, mark as draft (resumable)
                    // Only mark as failed if no slides were generated at all
                    const newStatus = currentSlides.length > 0 ? "draft" : "failed";

                    await supabase
                        .from("presentations")
                        .update({
                            status: newStatus,
                            error_message:
                                currentSlides.length > 0
                                    ? `Generation stopped at slide ${currentSlides.length}. ${errorMessage}`
                                    : errorMessage,
                        })
                        .eq("id", presentation.id);

                    logger.info(
                        {
                            presentationId: presentation.id,
                            slidesGenerated: currentSlides.length,
                            newStatus,
                        },
                        `Presentation marked as ${newStatus} after generation error`
                    );

                    // Send error event with timeout flag and slides info
                    controller.enqueue(
                        encoder.encode(
                            formatSSE({
                                type: "error",
                                data: {
                                    error: errorMessage,
                                    presentationId: presentation.id,
                                    isTimeout,
                                    slidesGenerated: currentSlides.length,
                                    status: newStatus,
                                },
                            })
                        )
                    );

                    Sentry.captureException(error, {
                        tags: {
                            component: "api",
                            action: "stream_presentation_generation",
                            errorType: isTimeout ? "timeout" : "generation_error",
                        },
                        extra: {
                            presentationId: presentation.id,
                            timeoutMs: STREAM_TIMEOUT_MS,
                            slidesGenerated: currentSlides.length,
                        },
                    });

                    stopHeartbeat();
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (error) {
        // Enhanced error logging for debugging
        const errorDetails = {
            message: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : "Unknown",
            stack: error instanceof Error ? error.stack : undefined,
        };

        logger.error(
            { error, errorDetails },
            "Failed to initialize streaming generation"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "stream_presentation_init",
            },
            extra: errorDetails,
        });

        return new Response(
            JSON.stringify({
                error: "Failed to initialize generation",
                details: errorDetails.message,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
