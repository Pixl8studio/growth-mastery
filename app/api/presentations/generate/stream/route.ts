/**
 * Presentations API - Streaming Generation
 * GET /api/presentations/generate/stream
 * Streams slide generation progress via Server-Sent Events (SSE)
 *
 * Related: GitHub Issue #327 - Real-time Streaming Editor
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generatePresentation } from "@/lib/presentations/slide-generator";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/middleware/rate-limit";

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

    // Validate required params
    if (!projectId || !deckStructureId) {
        return new Response(
            JSON.stringify({ error: "Missing projectId or deckStructureId" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        const supabase = await createClient();

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
        const [projectResult, deckStructureResult, brandDesignResult, businessProfileResult] =
            await Promise.all([
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

        // Validate slides
        const rawSlides = Array.isArray(deckStructure.slides) ? deckStructure.slides : [];
        const validatedSlides = rawSlides.map((slide: unknown, index: number) => {
            const parsed = DeckStructureSlideSchema.safeParse(slide);
            if (parsed.success) {
                return parsed.data;
            }
            return { title: `Slide ${index + 1}`, description: "", section: "" };
        });

        // Create presentation record
        const { data: presentation, error: createError } = await supabase
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

        if (createError) {
            logger.error({ error: createError, projectId }, "Failed to create presentation record");
            return new Response(
                JSON.stringify({ error: "Failed to create presentation" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        logger.info(
            { userId: user.id, projectId, deckStructureId, presentationId: presentation.id },
            "Starting streaming presentation generation"
        );

        // Create SSE stream
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                // Send connected event
                controller.enqueue(
                    encoder.encode(
                        formatSSE({
                            type: "connected",
                            data: {
                                presentationId: presentation.id,
                                totalSlides: validatedSlides.length,
                            },
                        })
                    )
                );

                try {
                    // Wrap generation in timeout to prevent hung connections
                    // This protects against OpenAI API hangs and ensures resources are released
                    const generationPromise = generatePresentation({
                        deckStructure: {
                            id: deckStructure.id,
                            title: deckStructure.title || "Presentation",
                            slideCount: validatedSlides.length,
                            slides: validatedSlides.map(
                                (s: z.infer<typeof DeckStructureSlideSchema>, i: number) => ({
                                    slideNumber: i + 1,
                                    title: s.title || `Slide ${i + 1}`,
                                    description: s.description || "",
                                    section: s.section || "",
                                })
                            ),
                        },
                        customization,
                        businessProfile: businessProfile || undefined,
                        brandDesign: brandDesign || undefined,
                        onSlideGenerated: async (slide, progress) => {
                            // Send slide generated event
                            controller.enqueue(
                                encoder.encode(
                                    formatSSE({
                                        type: "slide_generated",
                                        data: {
                                            slide,
                                            slideNumber: slide.slideNumber,
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
                                        data: { progress, currentSlide: slide.slideNumber },
                                    })
                                )
                            );

                            // Update database progress (fire-and-forget to avoid slowing generation)
                            void supabase
                                .from("presentations")
                                .update({ generation_progress: progress })
                                .eq("id", presentation.id)
                                .then(({ error }) => {
                                    if (error) {
                                        logger.warn(
                                            { error, presentationId: presentation.id, progress },
                                            "Failed to update generation progress"
                                        );
                                    }
                                });
                        },
                    });

                    // Race between generation and timeout
                    const generatedSlides = await Promise.race([
                        generationPromise,
                        createTimeoutPromise<Awaited<typeof generationPromise>>(STREAM_TIMEOUT_MS),
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
                        { presentationId: presentation.id, slideCount: generatedSlides.length },
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

                    // Mark presentation as failed
                    await supabase
                        .from("presentations")
                        .update({
                            status: "failed",
                            error_message: errorMessage,
                        })
                        .eq("id", presentation.id);

                    // Send error event with timeout flag
                    controller.enqueue(
                        encoder.encode(
                            formatSSE({
                                type: "error",
                                data: {
                                    error: errorMessage,
                                    presentationId: presentation.id,
                                    isTimeout,
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
        logger.error({ error }, "Failed to initialize streaming generation");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "stream_presentation_init",
            },
        });

        return new Response(
            JSON.stringify({ error: "Failed to initialize generation" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
