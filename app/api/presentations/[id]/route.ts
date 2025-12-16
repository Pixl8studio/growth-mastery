/**
 * Presentations API - Single Presentation Operations
 * GET /api/presentations/[id] - Get presentation
 * PATCH /api/presentations/[id] - Update presentation
 * DELETE /api/presentations/[id] - Delete presentation
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { SlideDataSchema } from "@/lib/presentations/pptx-generator";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Zod schema for route parameter
const RouteParamSchema = z.object({
    id: z.string().uuid("id must be a valid UUID"),
});

// Zod schema for PATCH request body
const UpdatePresentationSchema = z.object({
    title: z.string().min(1).max(500).optional(),
    slides: z.array(SlideDataSchema).optional(),
    customization: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(["draft", "generating", "completed", "failed"]).optional(),
});

// GET - Fetch single presentation
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Validate route parameter
        const paramValidation = RouteParamSchema.safeParse({ id });
        if (!paramValidation.success) {
            throw new ValidationError("Invalid presentation ID format");
        }

        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: presentation, error } = await supabase
            .from("presentations")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (error || !presentation) {
            throw new NotFoundError("Presentation");
        }

        return NextResponse.json({ presentation });
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        logger.error({ error }, "Failed to fetch presentation");

        Sentry.captureException(error, {
            tags: { component: "api", action: "get_presentation" },
        });

        return NextResponse.json(
            { error: "Failed to fetch presentation" },
            { status: 500 }
        );
    }
}

// PATCH - Update presentation
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Validate route parameter
        const paramValidation = RouteParamSchema.safeParse({ id });
        if (!paramValidation.success) {
            throw new ValidationError("Invalid presentation ID format");
        }

        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabase
            .from("presentations")
            .select("id")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !existing) {
            throw new NotFoundError("Presentation");
        }

        // Parse and validate body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            throw new ValidationError("Invalid JSON body");
        }

        const validation = UpdatePresentationSchema.safeParse(body);
        if (!validation.success) {
            const errorMessage = validation.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join(", ");
            throw new ValidationError(errorMessage);
        }

        const { title, slides, customization, status } = validation.data;

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title;
        if (slides !== undefined) updateData.slides = slides;
        if (customization !== undefined) updateData.customization = customization;
        if (status !== undefined) updateData.status = status;

        if (Object.keys(updateData).length === 0) {
            throw new ValidationError("No valid fields to update");
        }

        const { data: presentation, error } = await supabase
            .from("presentations")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logger.error(
                { error, presentationId: id },
                "Failed to update presentation"
            );
            throw error;
        }

        logger.info({ userId: user.id, presentationId: id }, "Presentation updated");

        return NextResponse.json({ presentation });
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        logger.error({ error }, "Failed to update presentation");

        Sentry.captureException(error, {
            tags: { component: "api", action: "update_presentation" },
        });

        return NextResponse.json(
            { error: "Failed to update presentation" },
            { status: 500 }
        );
    }
}

// DELETE - Delete presentation
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Validate route parameter
        const paramValidation = RouteParamSchema.safeParse({ id });
        if (!paramValidation.success) {
            throw new ValidationError("Invalid presentation ID format");
        }

        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify ownership and delete
        const { error } = await supabase
            .from("presentations")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) {
            logger.error(
                { error, presentationId: id },
                "Failed to delete presentation"
            );
            throw error;
        }

        logger.info({ userId: user.id, presentationId: id }, "Presentation deleted");

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        logger.error({ error }, "Failed to delete presentation");

        Sentry.captureException(error, {
            tags: { component: "api", action: "delete_presentation" },
        });

        return NextResponse.json(
            { error: "Failed to delete presentation" },
            { status: 500 }
        );
    }
}
