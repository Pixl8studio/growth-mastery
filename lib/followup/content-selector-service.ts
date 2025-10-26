/**
 * Content Selector Service
 *
 * AI-powered selection of proof stories and testimonials.
 * Matches content to prospect context using objection, niche, and price band.
 */

import { logger } from "@/lib/logger";
import { findMatchingStories, recordStoryUsage } from "./story-library-service";
import type { FollowupProspect } from "@/types/followup";
import type { StoryLibraryEntry } from "./story-library-service";

/**
 * Detect likely objections from prospect data.
 *
 * Analyzes watch percentage, engagement level, and explicit objection hints
 * to determine what objections the prospect might have.
 */
export function detectObjections(prospect: FollowupProspect): string[] {
    const objections: string[] = [];

    // Explicit objection hints from conversational intake
    if (prospect.objection_hints && prospect.objection_hints.length > 0) {
        objections.push(...prospect.objection_hints);
    }

    // Infer objections from behavior patterns
    if (prospect.watch_percentage < 50) {
        // Low watch percentage suggests need justification
        if (!objections.includes("need_justification")) {
            objections.push("need_justification");
        }
    }

    if (prospect.offer_clicks > 0 && !prospect.converted) {
        // Clicked offer but didn't convert suggests price concern
        if (!objections.includes("price_concern")) {
            objections.push("price_concern");
        }
    }

    if (prospect.engagement_level === "hot" && !prospect.converted) {
        // High engagement but no conversion suggests timing concern
        if (!objections.includes("timing_concern")) {
            objections.push("timing_concern");
        }
    }

    // Default to general objections if none detected
    if (objections.length === 0) {
        objections.push("need_justification");
    }

    logger.info(
        {
            prospectId: prospect.id,
            detectedObjections: objections,
            watchPct: prospect.watch_percentage,
            engagementLevel: prospect.engagement_level,
        },
        "🎯 Detected prospect objections"
    );

    return objections;
}

/**
 * Determine price band from offer amount.
 */
export function determinePriceBand(offerAmount: number): "low" | "mid" | "high" {
    if (offerAmount < 1000) return "low";
    if (offerAmount < 5000) return "mid";
    return "high";
}

/**
 * Select best story for a prospect and objection.
 *
 * Uses AI-powered matching based on objection, niche, price band, and persona.
 * Returns the most relevant story from the library.
 */
export async function selectBestStory(params: {
    prospect: FollowupProspect;
    objection_category: string;
    business_niche?: string;
    price_band?: "low" | "mid" | "high";
    story_type?: "micro_story" | "proof_element" | "testimonial" | "case_study";
}): Promise<{ success: boolean; story?: StoryLibraryEntry; error?: string }> {
    logger.info(
        {
            prospectId: params.prospect.id,
            objectionCategory: params.objection_category,
            niche: params.business_niche,
            priceBand: params.price_band,
        },
        "🤖 Selecting best story with AI matching"
    );

    // Find matching stories
    const result = await findMatchingStories({
        user_id: params.prospect.user_id,
        objection_category: params.objection_category,
        business_niche: params.business_niche,
        price_band: params.price_band,
        story_type: params.story_type,
        limit: 5,
    });

    if (!result.success || !result.stories || result.stories.length === 0) {
        logger.warn(
            {
                prospectId: params.prospect.id,
                objectionCategory: params.objection_category,
            },
            "⚠️  No matching stories found"
        );
        return { success: false, error: "No matching stories found" };
    }

    // Score each story based on prospect match
    const scoredStories = result.stories.map((story) => ({
        story,
        score: calculateStoryRelevanceScore(story, params.prospect, params),
    }));

    // Sort by relevance score
    scoredStories.sort((a, b) => b.score - a.score);

    const bestStory = scoredStories[0].story;

    logger.info(
        {
            prospectId: params.prospect.id,
            selectedStoryId: bestStory.id,
            storyTitle: bestStory.title,
            relevanceScore: scoredStories[0].score,
        },
        "✅ Best story selected"
    );

    // Record usage
    await recordStoryUsage(bestStory.id);

    return { success: true, story: bestStory };
}

/**
 * Select multiple stories for comprehensive objection handling.
 *
 * Returns up to N stories covering different objections the prospect might have.
 */
export async function selectStoriesForProspect(
    prospect: FollowupProspect,
    businessNiche?: string,
    priceBand?: "low" | "mid" | "high",
    maxStories: number = 3
): Promise<{ success: boolean; stories?: StoryLibraryEntry[]; error?: string }> {
    logger.info(
        {
            prospectId: prospect.id,
            niche: businessNiche,
            priceBand,
            maxStories,
        },
        "🎯 Selecting stories for prospect"
    );

    // Detect likely objections
    const objections = detectObjections(prospect);

    // Select best story for each objection
    const selectedStories: StoryLibraryEntry[] = [];

    for (const objection of objections.slice(0, maxStories)) {
        const result = await selectBestStory({
            prospect,
            objection_category: objection,
            business_niche: businessNiche,
            price_band: priceBand,
        });

        if (result.success && result.story) {
            selectedStories.push(result.story);
        }
    }

    logger.info(
        {
            prospectId: prospect.id,
            requestedObjections: objections.length,
            storiesFound: selectedStories.length,
        },
        "✅ Stories selected for prospect"
    );

    return { success: true, stories: selectedStories };
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Calculate relevance score for a story based on prospect context.
 *
 * Higher scores indicate better match.
 */
function calculateStoryRelevanceScore(
    story: StoryLibraryEntry,
    prospect: FollowupProspect,
    context: {
        business_niche?: string;
        price_band?: "low" | "mid" | "high";
    }
): number {
    let score = 0;

    // Base score from effectiveness
    if (story.effectiveness_score) {
        score += story.effectiveness_score * 10;
    }

    // Bonus for exact niche match
    if (
        context.business_niche &&
        story.business_niche.includes(context.business_niche)
    ) {
        score += 30;
    }

    // Bonus for exact price band match
    if (context.price_band && story.price_band === context.price_band) {
        score += 20;
    }

    // Bonus for persona match (if we had persona data)
    // This could be enhanced with actual persona matching

    // Penalty for overuse (fresher stories preferred)
    if (story.times_used > 10) {
        score -= story.times_used;
    }

    // Bonus for newer stories (recency)
    const ageInDays =
        (Date.now() - new Date(story.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 30) {
        score += 10;
    }

    return score;
}

/**
 * Get recommended story types for a prospect segment.
 */
export function getRecommendedStoryTypes(segment: string): string[] {
    const recommendations: Record<string, string[]> = {
        no_show: ["micro_story"],
        skimmer: ["micro_story", "proof_element"],
        sampler: ["proof_element", "testimonial"],
        engaged: ["testimonial", "case_study"],
        hot: ["case_study", "proof_element"],
    };

    return recommendations[segment] || ["proof_element"];
}
