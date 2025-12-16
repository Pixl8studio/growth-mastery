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

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Fetch single presentation
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
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
            return NextResponse.json(
                { error: "Presentation not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ presentation });
    } catch (error) {
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
            return NextResponse.json(
                { error: "Presentation not found" },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { title, slides, customization, status } = body;

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title;
        if (slides !== undefined) updateData.slides = slides;
        if (customization !== undefined) updateData.customization = customization;
        if (status !== undefined) updateData.status = status;

        const { data: presentation, error } = await supabase
            .from("presentations")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logger.error({ error }, "Failed to update presentation");
            throw error;
        }

        logger.info({ userId: user.id, presentationId: id }, "Presentation updated");

        return NextResponse.json({ presentation });
    } catch (error) {
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
            logger.error({ error }, "Failed to delete presentation");
            throw error;
        }

        logger.info({ userId: user.id, presentationId: id }, "Presentation deleted");

        return NextResponse.json({ success: true });
    } catch (error) {
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
