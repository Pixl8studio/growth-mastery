/**
 * Content Selection API Endpoint
 *
 * AI-powered selection of proof stories for prospects.
 * Matches content based on objection, niche, price band, and persona.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import {
    selectStoriesForProspect,
    detectObjections,
    getRecommendedStoryTypes,
} from "@/lib/followup/content-selector-service";

/**
 * POST /api/followup/content/select
 *
 * Select best stories for a prospect.
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
        if (!body.prospect_id) {
            throw new ValidationError("prospect_id is required");
        }

        // Fetch prospect
        const { data: prospect, error: prospectError } = await supabase
            .from("followup_prospects")
            .select("*")
            .eq("id", body.prospect_id)
            .single();

        if (prospectError || !prospect) {
            throw new ValidationError("Prospect not found");
        }

        // Verify ownership
        if (prospect.user_id !== user.id) {
            throw new AuthenticationError("Access denied to prospect");
        }

        // Select stories
        const result = await selectStoriesForProspect(
            prospect,
            body.business_niche,
            body.price_band,
            body.max_stories || 3
        );

        if (!result.success) {
            logger.error(
                { error: result.error, prospectId: body.prospect_id },
                "❌ Story selection failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Detect objections for context
        const detectedObjections = detectObjections(prospect);
        const recommendedTypes = getRecommendedStoryTypes(prospect.segment);

        logger.info(
            {
                prospectId: body.prospect_id,
                storiesSelected: result.stories?.length || 0,
                detectedObjections,
            },
            "✅ Stories selected via API"
        );

        return NextResponse.json({
            success: true,
            stories: result.stories || [],
            detected_objections: detectedObjections,
            recommended_story_types: recommendedTypes,
            count: result.stories?.length || 0,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in POST /api/followup/content/select");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
