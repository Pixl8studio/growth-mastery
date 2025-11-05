/**
 * Profile URL Analysis API
 * Scrapes a URL, extracts content, and generates Echo Mode voice profile
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { scrapeAndExtractContent } from "@/lib/marketing/social-scraper-service";
import { generateEchoModeProfile } from "@/lib/marketing/brand-voice-service";

type RouteContext = {
    params: Promise<{ profileId: string }>;
};

/**
 * POST /api/marketing/profiles/[profileId]/analyze-url
 * Scrape URL, extract content, and generate voice profile
 */
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { profileId } = await context.params;
        const body = await request.json();

        // Validate URL
        if (!body.url || typeof body.url !== "string") {
            throw new ValidationError("URL is required and must be a string");
        }

        // Verify ownership
        const { data: profile } = await supabase
            .from("marketing_profiles")
            .select("user_id")
            .eq("id", profileId)
            .single();

        if (!profile || profile.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this profile");
        }

        logger.info({ profileId, url: body.url }, "Starting URL analysis");

        // Scrape and extract content
        const scrapeResult = await scrapeAndExtractContent(body.url);

        if (!scrapeResult.success || !scrapeResult.data) {
            return NextResponse.json(
                { error: scrapeResult.error || "Failed to scrape URL" },
                { status: 400 }
            );
        }

        const { content, platform } = scrapeResult.data;

        if (content.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "No content extracted from this URL. Please try pasting content manually.",
                },
                { status: 400 }
            );
        }

        logger.info(
            { profileId, platform, contentCount: content.length },
            "Content scraped successfully"
        );

        // Generate Echo Mode profile
        const result = await generateEchoModeProfile(
            profileId,
            content,
            body.url
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || "Failed to generate voice profile" },
                { status: 500 }
            );
        }

        logger.info(
            {
                profileId,
                platform,
                contentCount: content.length,
                characteristicsCount:
                    result.config?.voice_characteristics.length || 0,
            },
            "Voice profile generated from URL"
        );

        return NextResponse.json({
            success: true,
            echo_mode_config: result.config,
            styleSummary: result.styleSummary,
            previewParagraph: result.previewParagraph,
            sampleCount: content.length,
            platform,
        });
    } catch (error) {
        logger.error(
            { error },
            "Error in POST /api/marketing/profiles/[profileId]/analyze-url"
        );

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

