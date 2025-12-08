/**
 * Story Library API Endpoint
 *
 * Manages proof stories, testimonials, and case studies.
 * Supports POST (create) and GET (list) operations.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { createStory, listStories } from "@/lib/followup/story-library-service";
import type { CreateStoryInput } from "@/lib/followup/story-library-service";

/**
 * POST /api/followup/stories
 *
 * Create a new story in the library.
 */
export async function POST(request: NextRequest) {
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

        const body = await request.json();

        // Validate required fields
        if (!body.title) {
            throw new ValidationError("title is required");
        }

        if (!body.story_type) {
            throw new ValidationError("story_type is required");
        }

        if (!body.content) {
            throw new ValidationError("content is required");
        }

        if (!body.objection_category) {
            throw new ValidationError("objection_category is required");
        }

        if (!body.business_niche || body.business_niche.length === 0) {
            throw new ValidationError("business_niche is required (array)");
        }

        // Create story input
        const storyInput: CreateStoryInput = {
            title: body.title,
            story_type: body.story_type,
            content: body.content,
            objection_category: body.objection_category,
            business_niche: body.business_niche,
            price_band: body.price_band,
            persona_match: body.persona_match || [],
            agent_config_id: body.agent_config_id,
        };

        // Create the story
        const result = await createStory(user.id, storyInput);

        if (!result.success) {
            logger.error(
                { error: result.error, userId: user.id },
                "❌ Story creation failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            {
                storyId: result.story?.id,
                userId: user.id,
                title: body.title,
            },
            "✅ Story created via API"
        );

        return NextResponse.json({
            success: true,
            story: result.story,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in POST /api/followup/stories");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "create_story",
                endpoint: "POST /api/followup/stories",
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
 * GET /api/followup/stories
 *
 * List stories with optional filtering.
 */
export async function GET(request: NextRequest) {
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

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const storyType = searchParams.get("story_type");
        const objectionCategory = searchParams.get("objection_category");
        const businessNiche = searchParams.get("business_niche");

        // Build filters
        const filters: {
            story_type?: string;
            objection_category?: string;
            business_niche?: string;
        } = {};

        if (storyType) {
            filters.story_type = storyType;
        }

        if (objectionCategory) {
            filters.objection_category = objectionCategory;
        }

        if (businessNiche) {
            filters.business_niche = businessNiche;
        }

        // List stories
        const result = await listStories(user.id, filters);

        if (!result.success) {
            logger.error(
                { error: result.error, userId: user.id },
                "❌ Failed to list stories"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            stories: result.stories || [],
            count: result.stories?.length || 0,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in GET /api/followup/stories");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "list_stories",
                endpoint: "GET /api/followup/stories",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
