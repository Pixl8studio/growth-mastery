/**
 * Presentations API - Individual Slide Operations
 * PATCH /api/presentations/[id]/slides/[slideNumber]
 * Handles quick actions and AI editing for individual slides
 *
 * Related: GitHub Issue #327 - Quick Actions and AI Editing
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
    ValidationError,
    NotFoundError,
    ForbiddenError,
    AIGenerationError,
} from "@/lib/errors";
import { regenerateSlide } from "@/lib/presentations/slide-generator";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/middleware/rate-limit";
import { parseSlidesFromDB, type Slide } from "@/lib/presentations/schemas";
import { SLIDE_CONTENT_LIMITS } from "@/lib/presentations/slide-constants";

// Quick action types
const QuickActionSchema = z.enum([
    "regenerate_image",
    "make_concise",
    "better_title",
    "change_layout",
    "regenerate_notes",
    "expand_content",
    "simplify_language",
]);

// Maximum length for custom prompts to prevent abuse
const MAX_CUSTOM_PROMPT_LENGTH = 1000;

// Request schema
const SlideUpdateSchema = z.object({
    action: QuickActionSchema.optional(),
    customPrompt: z.string().max(MAX_CUSTOM_PROMPT_LENGTH).optional(),
    layoutType: z
        .enum([
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
        ])
        .optional(),
    // Direct updates (for manual editing)
    title: z.string().optional(),
    content: z.array(z.string()).optional(),
    speakerNotes: z.string().optional(),
    imagePrompt: z.string().optional(),
});

// Action prompts for AI - all include length constraints to prevent truncation
// Constraints are defined in SLIDE_CONTENT_LIMITS (lib/presentations/slide-constants.ts)
const ACTION_PROMPTS: Record<z.infer<typeof QuickActionSchema>, string> = {
    regenerate_image:
        "Generate a new, more compelling image prompt for this slide that better captures the key message.",
    make_concise:
        "Make the content more concise. Reduce word count while keeping the key points impactful. IMPORTANT: Title must be maximum 12 words. Each bullet point must be maximum 16 words. Content must fit on the slide without truncation.",
    better_title:
        "Rewrite the title to be more engaging, memorable, and action-oriented while keeping the same meaning. CRITICAL: The title MUST be 10 words or fewer. Do not exceed this limit under any circumstances. A punchy, short title is better than a long one that gets cut off.",
    change_layout:
        "Restructure the content to work better with a different layout. Adjust bullet points and flow accordingly. IMPORTANT: Title must be maximum 12 words. Each bullet point must be maximum 16 words.",
    regenerate_notes:
        "Generate new speaker notes that are more engaging and provide better guidance for the presenter.",
    expand_content:
        "Add richer detail and depth to the existing bullet points. Elaborate on each point with specific examples, data, or context. CRITICAL CONSTRAINTS: Title stays maximum 12 words. Each bullet point must be maximum 16 words - pack meaning into fewer words. Add depth through specificity, not length. If you need more detail, add 1-2 additional bullet points (maximum 5 total) rather than making existing ones longer.",
    simplify_language:
        "Simplify the language to be more accessible. Use shorter sentences and common words. IMPORTANT: Title must be maximum 12 words. Each bullet point must be maximum 16 words.",
};

export async function PATCH(
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

        // Rate limiting - 30 requests per minute for slide edits
        const rateLimitIdentifier = getRateLimitIdentifier(request, user.id);
        const rateLimitResponse = await checkRateLimit(
            rateLimitIdentifier,
            "slide-edit"
        );
        if (rateLimitResponse) {
            logger.warn(
                { userId: user.id, endpoint: "slide-edit" },
                "Rate limit exceeded for slide editing"
            );
            return rateLimitResponse;
        }

        // Parse request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            throw new ValidationError("Invalid JSON body");
        }

        const validation = SlideUpdateSchema.safeParse(body);
        if (!validation.success) {
            const errorMessage = validation.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join(", ");
            throw new ValidationError(errorMessage);
        }

        const {
            action,
            customPrompt,
            layoutType,
            title,
            content,
            speakerNotes,
            imagePrompt,
        } = validation.data;

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
        let updatedSlide: Slide = { ...currentSlide };

        // Handle direct updates (manual editing)
        if (
            title !== undefined ||
            content !== undefined ||
            speakerNotes !== undefined
        ) {
            if (title !== undefined) updatedSlide.title = title;
            if (content !== undefined) updatedSlide.content = content;
            if (speakerNotes !== undefined) updatedSlide.speakerNotes = speakerNotes;
            if (imagePrompt !== undefined) updatedSlide.imagePrompt = imagePrompt;

            logger.info(
                { presentationId, slideNumber, action: "direct_update" },
                "Slide directly updated"
            );
        }
        // Handle layout change
        else if (layoutType) {
            updatedSlide.layoutType = layoutType;

            logger.info(
                { presentationId, slideNumber, layoutType },
                "Slide layout changed"
            );
        }
        // Handle quick action or custom AI prompt
        else if (action || customPrompt) {
            // Build instruction with safety framing for custom prompts
            // This prevents prompt injection by wrapping user input
            let instruction: string;
            if (customPrompt) {
                // Frame user prompt to maintain context and prevent injection
                instruction = `Apply the following user-requested modification to the slide while maintaining appropriate professional business presentation content. User request: "${customPrompt}"`;
            } else {
                instruction = ACTION_PROMPTS[action!];
            }

            // Fetch business profile and brand design for context
            const [businessProfileResult, brandDesignResult] = await Promise.all([
                supabase
                    .from("business_profiles")
                    .select("*")
                    .eq("funnel_project_id", presentation.funnel_project_id)
                    .maybeSingle(),
                supabase
                    .from("brand_designs")
                    .select("*")
                    .eq("funnel_project_id", presentation.funnel_project_id)
                    .maybeSingle(),
            ]);

            try {
                updatedSlide = await regenerateSlide(
                    currentSlide,
                    instruction,
                    businessProfileResult.data || undefined,
                    brandDesignResult.data || undefined
                );

                // Preserve slide number and layout type (unless explicitly changed)
                updatedSlide.slideNumber = currentSlide.slideNumber;
                if (!layoutType) {
                    updatedSlide.layoutType = currentSlide.layoutType;
                }

                logger.info(
                    { presentationId, slideNumber, action: action || "custom_edit" },
                    "Slide regenerated with AI"
                );
            } catch (error) {
                logger.error(
                    { error, presentationId, slideNumber },
                    "AI regeneration failed"
                );

                if (error instanceof AIGenerationError) {
                    throw error;
                }

                throw new AIGenerationError("Failed to regenerate slide content", {
                    retryable: true,
                    errorCode: "AI_REGENERATION_FAILED",
                });
            }
        } else {
            throw new ValidationError(
                "No update action specified. Provide action, customPrompt, layoutType, or direct updates."
            );
        }

        // Update the slides array
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
                "Failed to update presentation slides"
            );
            throw updateError;
        }

        const totalTime = (Date.now() - startTime) / 1000;

        return NextResponse.json({
            success: true,
            slide: updatedSlide,
            slideNumber,
            updateTime: totalTime,
        });
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
            const statusCode = error.retryable ? 503 : 500;
            return NextResponse.json(
                {
                    error: error.message,
                    errorCode: error.errorCode,
                    retryable: error.retryable,
                },
                { status: statusCode }
            );
        }

        logger.error({ error }, "Slide update failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "update_slide",
                endpoint: "PATCH /api/presentations/[id]/slides/[slideNumber]",
            },
        });

        return NextResponse.json({ error: "Slide update failed" }, { status: 500 });
    }
}
