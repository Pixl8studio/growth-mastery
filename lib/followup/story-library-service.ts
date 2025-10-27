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

/**
 * Seed default stories for a user.
 *
 * Creates 5 generic objection-handling stories:
 * - Price concern → ROI calculator story
 * - Timing concern → 15-minute wedge story
 * - Fit concern → Same-but-different case study
 * - Self-belief → Micro-commitment story
 * - Trust → Show-your-work transparency story
 */
export async function seedDefaultStories(
    userId: string,
    agentConfigId?: string
): Promise<{ success: boolean; stories_created?: number; error?: string }> {
    logger.info({ userId, agentConfigId }, "🌱 Seeding default stories");

    const defaultStories: CreateStoryInput[] = [
        {
            title: "ROI Calculator Story - Price Objection",
            story_type: "micro_story",
            content: `You said {{challenge_notes}} and wondered if the investment makes sense. Here's how Lena, a {{niche}} coach, felt the same way.

She started with one 15-minute block per day to install the offer assets. In week 2, she booked 5 paid calls. Her first client covered the entire program cost.

The shift wasn't "can I afford it?"—it was "can I afford NOT to compound this?"

Tiny step: pick your one 15-minute block this week.

If you want the exact worksheet Lena used, I'll send it—or we can line up {{next_step}} and I'll walk you through it.`,
            objection_category: "price",
            business_niche: ["coaching", "consulting", "services"],
            price_band: "mid",
            persona_match: ["coach", "consultant", "service provider"],
        },
        {
            title: "15-Minute Wedge - Time/Capacity Objection",
            story_type: "micro_story",
            content: `Most people think their niche is too different or they don't have time. Deon thought so too—he was running a B2B business with a tiny list and felt overwhelmed.

We adjusted 2 steps in his approach, and his first 21-day cycle produced 8 qualified demos. He only needed 15 minutes per day.

If time's the blocker, I'll show you the exact 10-step plan Deon used. Want me to text it back? Reply P for the plan, or C to book a 15-min setup call.`,
            objection_category: "timing",
            business_niche: ["B2B", "professional services", "agency"],
            price_band: "high",
            persona_match: ["business owner", "agency owner", "professional"],
        },
        {
            title: "Same-But-Different - Fit/Edge Case Objection",
            story_type: "case_study",
            content: `Most {{niche}} professionals think their situation is too unique. That's actually what makes this work better.

Sarah ran a {{niche}} practice and thought the framework wouldn't apply. But the 3 core principles work regardless of niche: attention, trust, and conversion.

We made 2 small tweaks for her specific situation. Within 30 days, she had a predictable flow of qualified prospects.

Your case being unique isn't a bug—it's a feature. Want me to map the two tweaks I'd make for you? Hit reply and let's talk specifics.`,
            objection_category: "fit",
            business_niche: ["any"],
            price_band: "mid",
            persona_match: ["professional", "specialist", "expert"],
        },
        {
            title: "Micro-Commitment - Self-Belief Objection",
            story_type: "micro_story",
            content: `I hear you on {{challenge_notes}}. A lot of people feel that way before they start.

The difference isn't talent or luck—it's having a system you can follow. Step-by-step. No guessing.

Maria felt the same uncertainty. She committed to just the first week—nothing more. By day 5, she had clarity. By week 2, she had her first result.

You don't need to believe you can do the whole thing. Just the next step. That's all that matters.

Want to see what the first week looks like? I'll walk you through it: {{book_call_url}}`,
            objection_category: "self_belief",
            business_niche: ["any"],
            price_band: "low",
            persona_match: ["new", "beginner", "uncertain"],
        },
        {
            title: "Show Your Work - Trust/Credibility Objection",
            story_type: "proof_element",
            content: `I understand the skepticism around {{challenge_notes}}. You've probably seen a lot of promises that didn't deliver.

Here's what's different: I'm not asking you to believe me. I'm showing you the exact process.

[Screenshot of the framework]
[Link to case study with real numbers]
[Timeline of implementation steps]

This isn't theory. It's a documented system that 47 people have used successfully in the past 90 days.

You can verify every claim. You can see the process before you commit. And you're protected by {{guarantee}}.

Want to see inside before deciding? {{replay_link}}`,
            objection_category: "trust",
            business_niche: ["any"],
            price_band: "high",
            persona_match: ["skeptical", "analytical", "research-oriented"],
        },
    ];

    let createdCount = 0;
    const errors: string[] = [];

    for (const storyData of defaultStories) {
        const result = await createStory(userId, {
            ...storyData,
            agent_config_id: agentConfigId,
        });

        if (result.success) {
            createdCount++;
        } else {
            errors.push(result.error || "Unknown error");
        }
    }

    if (createdCount === 0) {
        logger.error({ userId, errors }, "❌ Failed to seed any default stories");
        return {
            success: false,
            error: `Failed to create stories: ${errors.join(", ")}`,
        };
    }

    logger.info(
        { userId, createdCount, totalAttempted: defaultStories.length },
        "✅ Default stories seeded"
    );

    return {
        success: true,
        stories_created: createdCount,
    };
}
