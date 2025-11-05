/**
 * Marketing Profile Detail API
 * Get and update specific profile
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError, NotFoundError } from "@/lib/errors";
import { getProfile } from "@/lib/marketing/brand-voice-service";

type RouteContext = {
    params: Promise<{ profileId: string }>;
};

/**
 * GET /api/marketing/profiles/[profileId]
 * Get a specific profile
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

        const result = await getProfile(profileId);

        if (!result.success || !result.profile) {
            throw new NotFoundError("Profile");
        }

        // Verify ownership
        if (result.profile.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this profile");
        }

        return NextResponse.json({
            success: true,
            profile: result.profile,
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/marketing/profiles/[profileId]");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * PUT /api/marketing/profiles/[profileId]
 * Update profile settings
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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

        // Build update object
        const updates: any = {};

        if (body.name !== undefined) updates.name = body.name;
        if (body.brand_voice !== undefined) updates.brand_voice = body.brand_voice;
        if (body.tone_settings !== undefined)
            updates.tone_settings = body.tone_settings;
        if (body.echo_mode_config !== undefined)
            updates.echo_mode_config = body.echo_mode_config;
        if (body.story_themes !== undefined) updates.story_themes = body.story_themes;
        if (body.visual_preferences !== undefined)
            updates.visual_preferences = body.visual_preferences;

        updates.updated_at = new Date().toISOString();

        const { data: updated, error } = await supabase
            .from("marketing_profiles")
            .update(updates)
            .eq("id", profileId)
            .select()
            .single();

        if (error || !updated) {
            logger.error({ error, profileId }, "Failed to update profile");
            return NextResponse.json(
                { error: "Failed to update profile" },
                { status: 500 }
            );
        }

        logger.info({ profileId, userId: user.id }, "Profile updated");

        return NextResponse.json({
            success: true,
            profile: updated,
        });
    } catch (error) {
        logger.error({ error }, "Error in PUT /api/marketing/profiles/[profileId]");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
