/**
 * Page Media Library API
 * Retrieve uploaded and generated images for a project
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { PageMedia } from "@/types/pages";

export async function GET(request: NextRequest) {
    const requestLogger = logger.child({ handler: "page-media-list" });

    try {
        const supabase = await createClient();

        // Authenticate user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get("projectId");
        const pageId = searchParams.get("pageId");
        const mediaType = searchParams.get("mediaType");

        if (!projectId) {
            return NextResponse.json(
                { error: "Project ID is required" },
                { status: 400 }
            );
        }

        // Verify user owns the project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id, user_id")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            requestLogger.error(
                { error: projectError, projectId },
                "Project not found"
            );
            return NextResponse.json(
                { error: "Project not found or access denied" },
                { status: 404 }
            );
        }

        requestLogger.info(
            {
                userId: user.id,
                projectId,
                pageId,
                mediaType,
            },
            "Fetching page media"
        );

        // Build query
        let query = supabase
            .from("page_media")
            .select("*")
            .eq("funnel_project_id", projectId)
            .order("created_at", { ascending: false });

        // Apply filters
        if (pageId) {
            query = query.eq("page_id", pageId);
        }

        if (mediaType) {
            query = query.eq("media_type", mediaType);
        }

        const { data: media, error: mediaError } = await query;

        if (mediaError) {
            requestLogger.error({ error: mediaError }, "Failed to fetch media");
            return NextResponse.json(
                { error: "Failed to fetch media" },
                { status: 500 }
            );
        }

        requestLogger.info(
            {
                userId: user.id,
                projectId,
                mediaCount: media?.length || 0,
            },
            "Page media fetched successfully"
        );

        return NextResponse.json({
            success: true,
            media: media as PageMedia[],
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to fetch page media");

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Failed to fetch media",
            },
            { status: 500 }
        );
    }
}
