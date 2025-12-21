/**
 * Brand Design API
 * DELETE: Clear all brand guidelines for a project
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const deleteSchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
});

export async function DELETE(request: NextRequest) {
    const requestLogger = logger.child({ handler: "delete-brand-design" });

    try {
        const supabase = await createClient();

        // Verify authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get projectId from query params
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get("projectId");

        const validationResult = deleteSchema.safeParse({ projectId });
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid project ID", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        requestLogger.info({ userId: user.id, projectId }, "Deleting brand design");

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

        // Delete brand design
        const { error: deleteError } = await supabase
            .from("brand_designs")
            .delete()
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id);

        if (deleteError) {
            requestLogger.error(
                { error: deleteError, projectId, userId: user.id },
                "Failed to delete brand design"
            );
            return NextResponse.json(
                { error: "Failed to delete brand design" },
                { status: 500 }
            );
        }

        requestLogger.info(
            { userId: user.id, projectId },
            "Brand design deleted successfully"
        );

        return NextResponse.json({
            success: true,
            message: "Brand design cleared successfully",
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to delete brand design");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "delete-brand-design",
            },
        });

        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
