/**
 * Story Library Service
 *
 * Manages proof stories, testimonials, and case studies.
 * Provides indexed content for objection handling and persona matching.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface StoryLibraryEntry {
    id: string;
    user_id: string;
    agent_config_id: string | null;
    title: string;
    story_type: "micro_story" | "proof_element" | "testimonial" | "case_study";
    content: string;
    objection_category: string;
    business_niche: string[];
    price_band: "low" | "mid" | "high" | null;
    persona_match: string[];
    times_used: number;
    effectiveness_score: number | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface CreateStoryInput {
    title: string;
    story_type: "micro_story" | "proof_element" | "testimonial" | "case_study";
    content: string;
    objection_category: string;
    business_niche: string[];
    price_band?: "low" | "mid" | "high";
    persona_match?: string[];
    agent_config_id?: string;
}

/**
 * Create a new story in the library.
 */
export async function createStory(
    userId: string,
    storyData: CreateStoryInput
): Promise<{ success: boolean; story?: StoryLibraryEntry; error?: string }> {
    const supabase = await createClient();

    logger.info(
        {
            userId,
            title: storyData.title,
            storyType: storyData.story_type,
            objectionCategory: storyData.objection_category,
        },
        "📚 Creating story library entry"
    );

    const { data, error } = await supabase
        .from("followup_story_library")
        .insert({
            user_id: userId,
            agent_config_id: storyData.agent_config_id || null,
            title: storyData.title,
            story_type: storyData.story_type,
            content: storyData.content,
            objection_category: storyData.objection_category,
            business_niche: storyData.business_niche,
            price_band: storyData.price_band || null,
            persona_match: storyData.persona_match || [],
            times_used: 0,
            effectiveness_score: null,
        })
        .select()
        .single();

    if (error) {
        logger.error({ error, userId }, "❌ Failed to create story");
        return { success: false, error: error.message };
    }

    logger.info(
        { storyId: data.id, title: data.title },
        "✅ Story created successfully"
    );

    return { success: true, story: data as StoryLibraryEntry };
}

/**
 * Find stories matching objection, niche, and price band.
 *
 * Returns stories ranked by effectiveness and relevance.
 */
export async function findMatchingStories(params: {
    user_id: string;
    objection_category: string;
    business_niche?: string;
    price_band?: "low" | "mid" | "high";
    story_type?: string;
    limit?: number;
}): Promise<{ success: boolean; stories?: StoryLibraryEntry[]; error?: string }> {
    const supabase = await createClient();

    logger.info(
        {
            userId: params.user_id,
            objectionCategory: params.objection_category,
            niche: params.business_niche,
            priceBand: params.price_band,
        },
        "🔍 Finding matching stories"
    );

    let query = supabase
        .from("followup_story_library")
        .select("*")
        .eq("user_id", params.user_id)
        .eq("objection_category", params.objection_category);

    // Filter by niche if provided
    if (params.business_niche) {
        query = query.contains("business_niche", [params.business_niche]);
    }

    // Filter by price band if provided
    if (params.price_band) {
        query = query.eq("price_band", params.price_band);
    }

    // Filter by story type if provided
    if (params.story_type) {
        query = query.eq("story_type", params.story_type);
    }

    // Order by effectiveness and usage
    query = query.order("effectiveness_score", { ascending: false, nullsFirst: false });
    query = query.order("times_used", { ascending: true });

    // Limit results
    query = query.limit(params.limit || 10);

    const { data, error } = await query;

    if (error) {
        logger.error({ error, params }, "❌ Failed to find matching stories");
        return { success: false, error: error.message };
    }

    logger.info(
        {
            userId: params.user_id,
            objectionCategory: params.objection_category,
            foundCount: data.length,
        },
        "✅ Found matching stories"
    );

    return { success: true, stories: data as StoryLibraryEntry[] };
}

/**
 * Get story by ID.
 */
export async function getStory(
    storyId: string
): Promise<{ success: boolean; story?: StoryLibraryEntry; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("followup_story_library")
        .select("*")
        .eq("id", storyId)
        .single();

    if (error) {
        logger.error({ error, storyId }, "❌ Failed to fetch story");
        return { success: false, error: error.message };
    }

    return { success: true, story: data as StoryLibraryEntry };
}

/**
 * Update a story.
 */
export async function updateStory(
    storyId: string,
    updates: Partial<StoryLibraryEntry>
): Promise<{ success: boolean; story?: StoryLibraryEntry; error?: string }> {
    const supabase = await createClient();

    logger.info({ storyId, updates: Object.keys(updates) }, "📝 Updating story");

    const { data, error } = await supabase
        .from("followup_story_library")
        .update(updates)
        .eq("id", storyId)
        .select()
        .single();

    if (error) {
        logger.error({ error, storyId }, "❌ Failed to update story");
        return { success: false, error: error.message };
    }

    logger.info({ storyId }, "✅ Story updated successfully");

    return { success: true, story: data as StoryLibraryEntry };
}

/**
 * Delete a story.
 */
export async function deleteStory(
    storyId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.info({ storyId }, "🗑️  Deleting story");

    const { error } = await supabase
        .from("followup_story_library")
        .delete()
        .eq("id", storyId);

    if (error) {
        logger.error({ error, storyId }, "❌ Failed to delete story");
        return { success: false, error: error.message };
    }

    logger.info({ storyId }, "✅ Story deleted successfully");

    return { success: true };
}

/**
 * Record story usage.
 *
 * Increments times_used counter when story is included in a message.
 */
export async function recordStoryUsage(
    storyId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.info({ storyId }, "📊 Recording story usage");

    const { error } = await supabase.rpc("increment_story_usage", {
        p_story_id: storyId,
    });

    if (error) {
        // Fallback to manual increment
        const { data: story } = await supabase
            .from("followup_story_library")
            .select("times_used")
            .eq("id", storyId)
            .single();

        if (story) {
            await supabase
                .from("followup_story_library")
                .update({ times_used: (story.times_used || 0) + 1 })
                .eq("id", storyId);
        }
    }

    return { success: true };
}

/**
 * Update story effectiveness based on conversion data.
 */
export async function updateStoryEffectiveness(
    storyId: string,
    effectiveness: number
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.info({ storyId, effectiveness }, "📈 Updating story effectiveness");

    const { error } = await supabase
        .from("followup_story_library")
        .update({ effectiveness_score: effectiveness })
        .eq("id", storyId);

    if (error) {
        logger.error({ error, storyId }, "❌ Failed to update effectiveness");
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * List stories for a user with optional filtering.
 */
export async function listStories(
    userId: string,
    filters?: {
        story_type?: string;
        objection_category?: string;
        business_niche?: string;
    }
): Promise<{ success: boolean; stories?: StoryLibraryEntry[]; error?: string }> {
    const supabase = await createClient();

    let query = supabase
        .from("followup_story_library")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (filters?.story_type) {
        query = query.eq("story_type", filters.story_type);
    }

    if (filters?.objection_category) {
        query = query.eq("objection_category", filters.objection_category);
    }

    if (filters?.business_niche) {
        query = query.contains("business_niche", [filters.business_niche]);
    }

    const { data, error } = await query;

    if (error) {
        logger.error({ error, userId }, "❌ Failed to list stories");
        return { success: false, error: error.message };
    }

    return { success: true, stories: data as StoryLibraryEntry[] };
}
