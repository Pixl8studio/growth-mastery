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
import { generatePresentation } from "@/lib/presentations/slide-generator";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/middleware/rate-limit";
import { PRESENTATION_LIMIT, PresentationStatus } from "@/lib/constants/presentations";

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
 * Generate an image for a slide using DALL-E 3
 * Returns the permanent Supabase storage URL or null on failure
 */
async function generateSlideImage(
    presentationId: string,
    slideNumber: number,
    imagePrompt: string,
    brandPrimaryColor: string | null,
    supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
    try {
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

        logger.info(
            { presentationId, slideNumber, promptLength: enhancedPrompt.length },
            "Generating AI image for slide during streaming"
        );

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: enhancedPrompt,
            n: 1,
            size: "1792x1024", // 16:9 aspect ratio for slides
            quality: "standard",
            style: "natural",
        });

        const tempImageUrl = response.data?.[0]?.url;
        if (!tempImageUrl) {
            logger.warn(
                { presentationId, slideNumber },
                "No image URL returned from OpenAI"
            );
            return null;
        }

        // Download and upload to permanent storage
        const imageResponse = await fetch(tempImageUrl);
        if (!imageResponse.ok) {
            logger.warn(
                { presentationId, slideNumber },
                "Failed to download image from OpenAI"
            );
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
                { error: uploadError, presentationId, slideNumber },
                "Failed to upload image to storage"
            );
            return null;
        }

        const { data: urlData } = supabase.storage
            .from("presentation-media")
            .getPublicUrl(storagePath);

        logger.info(
            { presentationId, slideNumber, storagePath },
            "Image generated and uploaded successfully during streaming"
        );

        return urlData.publicUrl;
    } catch (error) {
        // Log but don't throw - image generation failure shouldn't stop slide generation
        logger.error(
            { error, presentationId, slideNumber },
            "Failed to generate image during streaming - slide will show placeholder"
        );
        return null;
    }
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

// Stream timeout protection (30 minutes max for large presentations)
const STREAM_TIMEOUT_MS = 30 * 60 * 1000;

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
    const isResuming = !!resumePresentationId && !!resumeFromSlide;

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

        // Rate limiting - 5 requests per minute for expensive AI generation
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
        // Only applies to new presentations, not resuming
        if (!isResuming) {
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

                try {
                    // Wrap generation in timeout to prevent hung connections
                    // This protects against OpenAI API hangs and ensures resources are released
                    // Generate only the slides that need to be generated (filtered for resume)
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

                    controller.close();
                } catch (error) {
                    const isTimeout = error instanceof StreamTimeoutError;
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
