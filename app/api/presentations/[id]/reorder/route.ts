/**
 * Presentations API - Slide Reordering
 * POST /api/presentations/[id]/reorder
 * Reorders slides within a presentation (for drag-and-drop)
 *
 * Related: GitHub Issue #327 - Drag-and-Drop Slide Reordering
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";

// Request schema
const ReorderSchema = z.object({
    // Array of slide numbers in the new order
    newOrder: z.array(z.number().int().positive()),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: presentationId } = await params;

        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            throw new ValidationError("Invalid JSON body");
        }

        const validation = ReorderSchema.safeParse(body);
        if (!validation.success) {
            const errorMessage = validation.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join(", ");
            throw new ValidationError(errorMessage);
        }

        const { newOrder } = validation.data;

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

        const slides = Array.isArray(presentation.slides) ? presentation.slides : [];

        // Get existing slide numbers from database
        const existingSlideNumbers = new Set(
            slides.map((s: { slideNumber: number }) => s.slideNumber)
        );

        // Validate new order length matches existing slides
        if (newOrder.length !== slides.length) {
            throw new ValidationError(
                `New order must contain exactly ${slides.length} slide numbers`
            );
        }

        // Check for duplicates in newOrder
        const uniqueNumbers = new Set(newOrder);
        if (uniqueNumbers.size !== newOrder.length) {
            throw new ValidationError("Duplicate slide numbers in new order");
        }

        // Verify all slide numbers in newOrder exist in the presentation
        // (handles non-contiguous slideNumbers after duplicates/deletes)
        for (const num of newOrder) {
            if (!existingSlideNumbers.has(num)) {
                throw new ValidationError(
                    `Invalid slide number ${num}. Slide does not exist in presentation`
                );
            }
        }

        // Reorder slides
        const reorderedSlides = newOrder.map((slideNum, index) => {
            const slide = slides.find(
                (s: { slideNumber: number }) => s.slideNumber === slideNum
            );
            return {
                ...slide,
                slideNumber: index + 1, // Update slide number to new position
            };
        });

        // Save to database
        const { error: updateError } = await supabase
            .from("presentations")
            .update({
                slides: reorderedSlides,
                updated_at: new Date().toISOString(),
            })
            .eq("id", presentationId);

        if (updateError) {
            logger.error(
                { error: updateError, presentationId },
                "Failed to update slide order"
            );
            throw updateError;
        }

        logger.info({ presentationId, newOrder }, "Slides reordered successfully");

        return NextResponse.json({
            success: true,
            slides: reorderedSlides,
            slideCount: reorderedSlides.length,
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

        logger.error({ error }, "Slide reorder failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "reorder_slides",
                endpoint: "POST /api/presentations/[id]/reorder",
            },
        });

        return NextResponse.json({ error: "Slide reorder failed" }, { status: 500 });
    }
}
