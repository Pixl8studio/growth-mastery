/**
 * Cloudflare Upload URL Generator
 * Generates secure upload URLs for video uploads
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateUploadUrl } from "@/lib/cloudflare/client";

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "cloudflare-upload-url" });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { fileName, projectId } = body;

        requestLogger.info(
            { userId: user.id, fileName, projectId },
            "Generating upload URL"
        );

        // Generate upload URL from Cloudflare
        const { uploadUrl, videoId } = await generateUploadUrl({
            name: fileName || "Pitch Video",
            requireSignedURLs: false,
        });

        requestLogger.info({ userId: user.id, videoId }, "Upload URL generated");

        return NextResponse.json({
            success: true,
            uploadUrl,
            videoId,
        });
    } catch (error) {
        requestLogger.error(
            {
                error,
                hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
                hasApiToken: !!process.env.CLOUDFLARE_STREAM_API_TOKEN,
            },
            "Failed to generate upload URL"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate-upload-url",
                endpoint: "POST /api/cloudflare/upload-url",
            },
            extra: {
                hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
                hasApiToken: !!process.env.CLOUDFLARE_STREAM_API_TOKEN,
            },
        });

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate upload URL",
            },
            { status: 500 }
        );
    }
}
