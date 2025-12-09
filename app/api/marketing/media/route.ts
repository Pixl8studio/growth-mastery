/**
 * Marketing Media Library API
 * Manage uploaded media for marketing posts
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const funnelProjectId = searchParams.get("funnel_project_id");

        logger.info({ userId: user.id, funnelProjectId }, "Media library requested");

        // Mock media library
        const mockMedia: Array<{
            id: string;
            url: string;
            alt_text: string;
            type: "image" | "video";
            created_at: string;
        }> = [];

        return NextResponse.json({
            success: true,
            media: mockMedia,
        });
    } catch (error) {
        logger.error({ error }, "Failed to retrieve media");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "GET /api/marketing/media",
            },
        });

        return NextResponse.json(
            {
                success: false,
                error: "Failed to retrieve media",
            },
            { status: 500 }
        );
    }
}

export async function POST(_request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        logger.info({ userId: user.id }, "Media upload requested");

        // Mock upload success
        return NextResponse.json({
            success: true,
            message: "Media upload endpoint - implementation pending",
        });
    } catch (error) {
        logger.error({ error }, "Media upload failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/marketing/media",
            },
        });

        return NextResponse.json(
            {
                success: false,
                error: "Failed to upload media",
            },
            { status: 500 }
        );
    }
}
