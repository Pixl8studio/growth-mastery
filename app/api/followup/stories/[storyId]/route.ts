/**
 * Story by ID API Endpoint
 *
 * Manages individual story operations.
 * Supports GET (retrieve), PUT (update), and DELETE operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError, NotFoundError } from "@/lib/errors";
import {
    getStory,
    updateStory,
    deleteStory,
} from "@/lib/followup/story-library-service";

type RouteContext = {
    params: Promise<{ storyId: string }>;
};

/**
 * GET /api/followup/stories/[storyId]
 *
 * Retrieve a specific story.
 */
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { storyId } = await context.params;

        if (!storyId) {
            throw new ValidationError("storyId is required");
        }

        // Get the story
        const result = await getStory(storyId);

        if (!result.success || !result.story) {
            throw new NotFoundError("Story");
        }

        // Verify ownership
        if (result.story.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this story");
        }

        return NextResponse.json({
            success: true,
            story: result.story,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in GET /api/followup/stories/[storyId]");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * PUT /api/followup/stories/[storyId]
 *
 * Update a story.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { storyId } = await context.params;

        if (!storyId) {
            throw new ValidationError("storyId is required");
        }

        // Verify ownership before updating
        const { data: existingStory } = await supabase
            .from("followup_story_library")
            .select("user_id")
            .eq("id", storyId)
            .single();

        if (!existingStory) {
            throw new NotFoundError("Story");
        }

        if (existingStory.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this story");
        }

        const body = await request.json();

        // Remove fields that shouldn't be updated
        const { id, user_id, created_at, ...updates } = body;

        logger.info(
            {
                storyId,
                userId: user.id,
                updateFields: Object.keys(updates),
            },
            "🔄 Updating story"
        );

        // Update the story
        const result = await updateStory(storyId, updates);

        if (!result.success) {
            logger.error({ error: result.error, storyId }, "❌ Story update failed");
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info({ storyId, userId: user.id }, "✅ Story updated via API");

        return NextResponse.json({
            success: true,
            story: result.story,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in PUT /api/followup/stories/[storyId]");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/followup/stories/[storyId]
 *
 * Delete a story.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { storyId } = await context.params;

        if (!storyId) {
            throw new ValidationError("storyId is required");
        }

        // Verify ownership before deleting
        const { data: existingStory } = await supabase
            .from("followup_story_library")
            .select("user_id")
            .eq("id", storyId)
            .single();

        if (!existingStory) {
            throw new NotFoundError("Story");
        }

        if (existingStory.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this story");
        }

        logger.info({ storyId, userId: user.id }, "🗑️  Deleting story");

        // Delete the story
        const result = await deleteStory(storyId);

        if (!result.success) {
            logger.error({ error: result.error, storyId }, "❌ Story deletion failed");
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info({ storyId, userId: user.id }, "✅ Story deleted via API");

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in DELETE /api/followup/stories/[storyId]");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
