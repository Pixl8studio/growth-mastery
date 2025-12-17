/**
 * Presentations API - AI Image Generation for Slides
 * POST /api/presentations/[id]/slides/[slideNumber]/image
 * Generates an AI image for a specific slide using the image prompt
 *
 * Related: GitHub Issue #327 - AI Image Generation per Slide
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
    ValidationError,
    NotFoundError,
    ForbiddenError,
    AIGenerationError,
} from "@/lib/errors";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/middleware/rate-limit";
import { parseSlidesFromDB } from "@/lib/presentations/schemas";

// Lazy OpenAI client initialization
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

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; slideNumber: string }> }
) {
    const startTime = Date.now();

    try {
        const { id: presentationId, slideNumber: slideNumberStr } = await params;
        const slideNumber = parseInt(slideNumberStr, 10);

        if (isNaN(slideNumber) || slideNumber < 1) {
            throw new ValidationError("Invalid slide number");
        }

        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limiting - 10 image generations per minute
        const rateLimitIdentifier = getRateLimitIdentifier(request, user.id);
        const rateLimitResponse = await checkRateLimit(
            rateLimitIdentifier,
            "image-generation"
        );
        if (rateLimitResponse) {
            logger.warn(
                { userId: user.id, endpoint: "image-generation" },
                "Rate limit exceeded for image generation"
            );
            return rateLimitResponse;
        }

        // Fetch presentation
        const { data: presentation, error: presentationError } = await supabase
            .from("presentations")
            .select("*")
            .eq("id", presentationId)
            .single();

        if (presentationError || !presentation) {
            throw new NotFoundError("Presentation");
        }

        if (presentation.user_id !== user.id) {
            throw new ForbiddenError("You do not have access to this presentation");
        }

        // Parse and validate slides from JSONB with type safety
        const slides = parseSlidesFromDB(presentation.slides);
        const slideIndex = slideNumber - 1;

        if (slideIndex < 0 || slideIndex >= slides.length) {
            throw new NotFoundError("Slide");
        }

        const currentSlide = slides[slideIndex];
        if (!currentSlide) {
            throw new NotFoundError("Slide");
        }

        if (!currentSlide.imagePrompt) {
            throw new ValidationError(
                "Slide does not have an image prompt. Generate slide content first."
            );
        }

        // Fetch brand design for styling context
        const { data: brandDesign } = await supabase
            .from("brand_designs")
            .select("*")
            .eq("funnel_project_id", presentation.funnel_project_id)
            .maybeSingle();

        // Build enhanced prompt with brand context
        let enhancedPrompt = currentSlide.imagePrompt;

        if (brandDesign) {
            const styleContext = [
                "Professional business presentation slide image.",
                `Color scheme inspired by ${brandDesign.primary_color || "#3b82f6"}.`,
                "Clean, modern design suitable for presentations.",
                "High quality, no text overlays.",
            ].join(" ");

            enhancedPrompt = `${styleContext} ${currentSlide.imagePrompt}`;
        }

        logger.info(
            { presentationId, slideNumber, promptLength: enhancedPrompt.length },
            "Generating AI image for slide"
        );

        const openai = getOpenAIClient();

        try {
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
                throw new AIGenerationError("No image URL returned from OpenAI", {
                    retryable: true,
                    errorCode: "NO_IMAGE_URL",
                });
            }

            // Download image and upload to permanent storage
            // OpenAI temporary URLs expire after 1 hour
            let permanentImageUrl: string;
            try {
                const imageResponse = await fetch(tempImageUrl);
                if (!imageResponse.ok) {
                    throw new Error(`Failed to download image: ${imageResponse.status}`);
                }

                const imageBlob = await imageResponse.blob();
                const imageBuffer = await imageBlob.arrayBuffer();

                // Generate storage path for the image
                const timestamp = Date.now();
                const storagePath = `presentations/${presentationId}/slide-${slideNumber}-${timestamp}.png`;

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from("presentation-media")
                    .upload(storagePath, imageBuffer, {
                        contentType: "image/png",
                        cacheControl: "31536000", // 1 year cache
                        upsert: true,
                    });

                if (uploadError) {
                    logger.error(
                        { error: uploadError, storagePath, presentationId },
                        "Failed to upload image to storage, falling back to temporary URL"
                    );
                    // Fall back to temporary URL if storage fails
                    permanentImageUrl = tempImageUrl;
                } else {
                    // Get public URL
                    const { data: urlData } = supabase.storage
                        .from("presentation-media")
                        .getPublicUrl(storagePath);
                    permanentImageUrl = urlData.publicUrl;

                    logger.info(
                        { storagePath, presentationId, slideNumber },
                        "Image uploaded to permanent storage"
                    );
                }
            } catch (downloadError) {
                logger.error(
                    { error: downloadError, presentationId, slideNumber },
                    "Failed to download and store image, using temporary URL"
                );
                // Fall back to temporary URL if download fails
                permanentImageUrl = tempImageUrl;
            }

            // Update slide with permanent image URL
            const updatedSlide = {
                ...currentSlide,
                imageUrl: permanentImageUrl,
                imageGeneratedAt: new Date().toISOString(),
            };

            const updatedSlides = [...slides];
            updatedSlides[slideIndex] = updatedSlide;

            // Save to database
            const { error: updateError } = await supabase
                .from("presentations")
                .update({
                    slides: updatedSlides,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", presentationId);

            if (updateError) {
                logger.error(
                    { error: updateError, presentationId },
                    "Failed to update slide with image"
                );
                throw updateError;
            }

            const totalTime = (Date.now() - startTime) / 1000;

            logger.info(
                { presentationId, slideNumber, totalTime },
                "AI image generated successfully"
            );

            return NextResponse.json({
                success: true,
                imageUrl: permanentImageUrl,
                slideNumber,
                generationTime: totalTime,
            });
        } catch (error) {
            // Parse OpenAI errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isRateLimit =
                errorMessage.toLowerCase().includes("rate limit") ||
                errorMessage.includes("429");
            const isContentPolicy = errorMessage.toLowerCase().includes("content policy");

            if (isRateLimit) {
                throw new AIGenerationError("OpenAI rate limit exceeded. Please try again.", {
                    retryable: true,
                    errorCode: "RATE_LIMIT",
                });
            }

            if (isContentPolicy) {
                throw new AIGenerationError(
                    "Image prompt was rejected by content policy. Try a different description.",
                    {
                        retryable: false,
                        errorCode: "CONTENT_POLICY",
                    }
                );
            }

            throw new AIGenerationError(`Image generation failed: ${errorMessage}`, {
                retryable: true,
                errorCode: "GENERATION_FAILED",
            });
        }
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        if (error instanceof AIGenerationError) {
            const statusCode = error.retryable ? 503 : 400;
            return NextResponse.json(
                {
                    error: error.message,
                    errorCode: error.errorCode,
                    retryable: error.retryable,
                },
                { status: statusCode }
            );
        }

        logger.error({ error }, "Image generation failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate_slide_image",
                endpoint: "POST /api/presentations/[id]/slides/[slideNumber]/image",
            },
        });

        return NextResponse.json(
            { error: "Image generation failed" },
            { status: 500 }
        );
    }
}
