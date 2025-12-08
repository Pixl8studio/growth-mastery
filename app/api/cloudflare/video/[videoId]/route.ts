/**
 * Cloudflare Video Status API
 * Retrieves video processing status and metadata
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getVideo } from "@/lib/cloudflare/client";
import { logger } from "@/lib/logger";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ videoId: string }> }
) {
    const requestLogger = logger.child({ handler: "cloudflare-video-status" });

    try {
        const { videoId } = await params;

        requestLogger.info({ videoId }, "Fetching video status");

        const video = await getVideo(videoId);

        return NextResponse.json({
            success: true,
            readyToStream: video.readyToStream,
            duration: video.duration,
            thumbnail: video.thumbnail,
            status: video.status.state,
        });
    } catch (error) {
        const { videoId } = await params;
        requestLogger.error({ error }, "Failed to get video status");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "get-video-status",
                endpoint: "GET /api/cloudflare/video/[videoId]",
            },
            extra: {
                videoId,
            },
        });

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to get video status",
            },
            { status: 500 }
        );
    }
}
