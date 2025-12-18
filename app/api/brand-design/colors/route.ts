/**
 * Brand Design Colors API
 * PUT: Update brand colors for a project
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const updateColorsSchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
    primary_color: z.string().regex(hexColorRegex, "Invalid hex color format"),
    secondary_color: z.string().regex(hexColorRegex, "Invalid hex color format"),
    accent_color: z.string().regex(hexColorRegex, "Invalid hex color format"),
    background_color: z.string().regex(hexColorRegex, "Invalid hex color format"),
    text_color: z.string().regex(hexColorRegex, "Invalid hex color format"),
});

export async function PUT(request: NextRequest) {
    const requestLogger = logger.child({ handler: "update-brand-colors" });

    try {
        const supabase = await createClient();

        // Verify authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse request body
        const body = await request.json();

        const validationResult = updateColorsSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const {
            projectId,
            primary_color,
            secondary_color,
            accent_color,
            background_color,
            text_color,
        } = validationResult.data;

        requestLogger.info({ userId: user.id, projectId }, "Updating brand colors");

        // Verify user owns the project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            return NextResponse.json(
                { error: "Project not found or access denied" },
                { status: 404 }
            );
        }

        // Update brand colors
        const { data: updatedDesign, error: updateError } = await supabase
            .from("brand_designs")
            .update({
                primary_color,
                secondary_color,
                accent_color,
                background_color,
                text_color,
                updated_at: new Date().toISOString(),
            })
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (updateError) {
            requestLogger.error(
                { error: updateError, projectId, userId: user.id },
                "Failed to update brand colors"
            );
            return NextResponse.json(
                { error: "Failed to update brand colors" },
                { status: 500 }
            );
        }

        if (!updatedDesign) {
            return NextResponse.json(
                { error: "Brand design not found" },
                { status: 404 }
            );
        }

        requestLogger.info(
            { userId: user.id, projectId, brandDesignId: updatedDesign.id },
            "Brand colors updated successfully"
        );

        return NextResponse.json({
            success: true,
            ...updatedDesign,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to update brand colors");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "update-brand-colors",
            },
        });

        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
