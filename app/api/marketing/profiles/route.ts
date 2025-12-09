/**
 * Marketing Profiles API
 * Create and list marketing profiles
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { initializeProfile, listProfiles } from "@/lib/marketing/brand-voice-service";

/**
 * POST /api/marketing/profiles
 * Create a new marketing profile
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const body = await request.json();

        if (!body.funnel_project_id) {
            throw new ValidationError("funnel_project_id is required");
        }

        // Verify project ownership
        const { data: project } = await supabase
            .from("funnel_projects")
            .select("user_id")
            .eq("id", body.funnel_project_id)
            .single();

        if (!project || project.user_id !== user.id) {
            throw new AuthenticationError("Access denied to funnel project");
        }

        const result = await initializeProfile(
            user.id,
            body.funnel_project_id,
            body.name || "Main Profile"
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            { profileId: result.profile?.id, userId: user.id },
            "Profile created"
        );

        return NextResponse.json({
            success: true,
            profile: result.profile,
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/marketing/profiles");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/marketing/profiles",
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

/**
 * GET /api/marketing/profiles?funnel_project_id=X
 * List profiles for user or specific funnel
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { searchParams } = new URL(request.url);
        const funnelProjectId = searchParams.get("funnel_project_id");

        // If funnel project specified, verify ownership
        if (funnelProjectId) {
            const { data: project } = await supabase
                .from("funnel_projects")
                .select("user_id")
                .eq("id", funnelProjectId)
                .single();

            if (!project || project.user_id !== user.id) {
                throw new AuthenticationError("Access denied to funnel project");
            }
        }

        const result = await listProfiles(user.id, funnelProjectId || undefined);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            profiles: result.profiles,
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/marketing/profiles");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "GET /api/marketing/profiles",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
