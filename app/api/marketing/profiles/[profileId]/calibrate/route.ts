/**
 * Profile Calibration API
 * Run Echo Mode calibration on a profile
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { generateEchoModeProfile } from "@/lib/marketing/brand-voice-service";

type RouteContext = {
    params: Promise<{ profileId: string }>;
};

/**
 * POST /api/marketing/profiles/[profileId]/calibrate
 * Calibrate voice using sample content
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

        // Verify ownership
        const { data: profile } = await supabase
            .from("marketing_profiles")
            .select("user_id")
            .eq("id", profileId)
            .single();

        if (!profile || profile.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this profile");
        }

        // Validate sample content
        if (!body.sample_content || !Array.isArray(body.sample_content)) {
            throw new ValidationError(
                "sample_content is required and must be an array of strings"
            );
        }

        if (body.sample_content.length === 0) {
            throw new ValidationError("At least one sample post is required");
        }

        // Generate Echo Mode profile
        const result = await generateEchoModeProfile(profileId, body.sample_content);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            { profileId, sampleCount: body.sample_content.length },
            "Voice calibrated"
        );

        return NextResponse.json({
            success: true,
            echo_mode_config: result.config,
            styleSummary: result.styleSummary,
            previewParagraph: result.previewParagraph,
        });
    } catch (error) {
        logger.error(
            { error },
            "Error in POST /api/marketing/profiles/[profileId]/calibrate"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/marketing/profiles/[profileId]/calibrate",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
