/**
 * Pitch Videos API
 * Retrieve pitch videos for a project to use in page editor
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getThumbnailUrl } from "@/lib/cloudflare/client";
import type { PitchVideo } from "@/types/pages";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
    const requestLogger = logger.child({ handler: "pitch-videos-list" });

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
            },
            "Fetching pitch videos"
        );

        // Fetch pitch videos for this project
        const { data: videos, error: videosError } = await supabase
            .from("pitch_videos")
            .select("id, title, video_id, duration, created_at")
            .eq("funnel_project_id", projectId)
            .order("created_at", { ascending: false });

        if (videosError) {
            requestLogger.error({ error: videosError }, "Failed to fetch pitch videos");
            return NextResponse.json(
                { error: "Failed to fetch pitch videos" },
                { status: 500 }
            );
        }

        // Enhance with thumbnail URLs from Cloudflare
        const enhancedVideos: PitchVideo[] = (videos || []).map((video) => ({
            id: video.id,
            title: video.title || "Untitled Video",
            video_id: video.video_id,
            thumbnail_url: video.video_id ? getThumbnailUrl(video.video_id) : null,
            duration: video.duration || null,
            created_at: video.created_at,
        }));

        requestLogger.info(
            {
                userId: user.id,
                projectId,
                videoCount: enhancedVideos.length,
            },
            "Pitch videos fetched successfully"
        );

        return NextResponse.json({
            success: true,
            videos: enhancedVideos,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to fetch pitch videos");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "fetch_pitch_videos",
                endpoint: "GET /api/pages/pitch-videos",
            },
            extra: {
                errorMessage: error instanceof Error ? error.message : "Unknown error",
            },
        });

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch pitch videos",
            },
            { status: 500 }
        );
    }
}
