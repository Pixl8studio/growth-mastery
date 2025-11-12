/**
 * Dynamic Content Service
 *
 * Injects AI-selected stories and proof elements into messages.
 * Enhances personalization with context-aware content.
 */

import { logger } from "@/lib/logger";
import { selectStoriesForProspect } from "./content-selector-service";
import { findMatchingStories, recordStoryUsage } from "./story-library-service";
import type { FollowupProspect } from "@/types/followup";
import type { StoryLibraryEntry } from "./story-library-service";

/**
 * Inject dynamic stories into message content.
 *
 * Finds {story} or {proof} placeholders and replaces with selected content.
 * Supports multiple story slots: {story_1}, {story_2}, {proof_1}, etc.
 */
export async function injectDynamicContent(
    messageContent: string,
    prospect: FollowupProspect,
    context: {
        business_niche?: string;
        price_band?: "low" | "mid" | "high";
    }
): Promise<{
    success: boolean;
    content?: string;
    stories_used?: StoryLibraryEntry[];
    error?: string;
}> {
    logger.info(
        {
            prospectId: prospect.id,
            hasStoryPlaceholder: messageContent.includes("{story"),
            hasProofPlaceholder: messageContent.includes("{proof"),
        },
        "🎨 Injecting dynamic content"
    );

    // Check if message has story/proof placeholders
    const storyPlaceholders = extractStoryPlaceholders(messageContent);

    if (storyPlaceholders.length === 0) {
        // No placeholders, return original content
        return { success: true, content: messageContent, stories_used: [] };
    }

    // Select stories for this prospect
    const storiesResult = await selectStoriesForProspect(
        prospect,
        context.business_niche,
        context.price_band,
        storyPlaceholders.length
    );

    if (!storiesResult.success || !storiesResult.stories) {
        logger.warn(
            { prospectId: prospect.id },
            "⚠️  No stories available for dynamic content"
        );
        // Return original content with placeholders removed
        let content = messageContent;
        storyPlaceholders.forEach((placeholder) => {
            content = content.replace(placeholder, "");
        });
        return { success: true, content, stories_used: [] };
    }

    // Replace each placeholder with a story
    let enhancedContent = messageContent;
    const storiesUsed: StoryLibraryEntry[] = [];

    storyPlaceholders.forEach((placeholder, index) => {
        const story = storiesResult.stories![index];
        if (story) {
            enhancedContent = enhancedContent.replace(
                placeholder,
                formatStoryContent(story)
            );
            storiesUsed.push(story);
        } else {
            // No story available for this placeholder, remove it
            enhancedContent = enhancedContent.replace(placeholder, "");
        }
    });

    logger.info(
        {
            prospectId: prospect.id,
            storiesInjected: storiesUsed.length,
            storyIds: storiesUsed.map((s) => s.id),
        },
        "✅ Dynamic content injected"
    );

    return {
        success: true,
        content: enhancedContent,
        stories_used: storiesUsed,
    };
}

/**
 * Build objection-aware message variant.
 *
 * Selects and formats content specifically addressing detected objections.
 * Returns enhanced message body with objection handling baked in.
 */
export async function buildObjectionAwareMessage(
    baseMessage: string,
    prospect: FollowupProspect,
    primaryObjection: string,
    context: {
        business_niche?: string;
        price_band?: "low" | "mid" | "high";
    }
): Promise<{
    success: boolean;
    message?: string;
    story?: StoryLibraryEntry;
    error?: string;
}> {
    logger.info(
        {
            prospectId: prospect.id,
            primaryObjection,
            niche: context.business_niche,
        },
        "🎯 Building objection-aware message"
    );

    // Find story matching the objection
    const result = await findMatchingStories({
        user_id: prospect.user_id,
        objection_category: primaryObjection,
        business_niche: context.business_niche,
        price_band: context.price_band,
        story_type: "micro_story",
        limit: 1,
    });

    if (!result.success || !result.stories || result.stories.length === 0) {
        logger.warn(
            {
                prospectId: prospect.id,
                objection: primaryObjection,
            },
            "⚠️  No story found for objection"
        );
        return { success: false, error: "No matching story found" };
    }

    const story = result.stories[0];

    // Build objection reframe section
    const objectionReframe = `

---

**You might be wondering about ${formatObjectionName(primaryObjection)}.**

${story.content}

---

`;

    // Insert reframe into message (before CTA if present)
    let enhancedMessage = baseMessage;
    if (
        baseMessage.includes("{enrollment_link}") ||
        baseMessage.includes("{ENROLLMENT_LINK}")
    ) {
        // Insert before enrollment link
        enhancedMessage = baseMessage.replace(
            /({enrollment_link}|{ENROLLMENT_LINK})/,
            `${objectionReframe}$1`
        );
    } else {
        // Append to end
        enhancedMessage = `${baseMessage}${objectionReframe}`;
    }

    // Record story usage
    await recordStoryUsage(story.id);

    logger.info(
        {
            prospectId: prospect.id,
            storyId: story.id,
            objection: primaryObjection,
        },
        "✅ Objection-aware message built"
    );

    return {
        success: true,
        message: enhancedMessage,
        story,
    };
}

/**
 * Get persona-matched stories.
 *
 * Filters stories by persona descriptors for better resonance.
 */
export async function getPersonaMatchedStories(params: {
    user_id: string;
    persona_descriptors: string[];
    objection_category: string;
    limit?: number;
}): Promise<{ success: boolean; stories?: StoryLibraryEntry[]; error?: string }> {
    logger.info(
        {
            userId: params.user_id,
            personas: params.persona_descriptors,
            objection: params.objection_category,
        },
        "👤 Finding persona-matched stories"
    );

    // Get all stories for objection
    const result = await findMatchingStories({
        user_id: params.user_id,
        objection_category: params.objection_category,
        limit: 20,
    });

    if (!result.success || !result.stories) {
        return result;
    }

    // Filter by persona match
    const personaMatched = result.stories.filter((story) => {
        // Check if any of the prospect's personas match any of the story's personas
        return params.persona_descriptors.some((descriptor) =>
            story.persona_match.includes(descriptor)
        );
    });

    // If no persona matches, return all stories
    const finalStories = personaMatched.length > 0 ? personaMatched : result.stories;

    logger.info(
        {
            userId: params.user_id,
            totalStories: result.stories.length,
            personaMatchedCount: personaMatched.length,
            returned: finalStories.slice(0, params.limit || 5).length,
        },
        "✅ Persona-matched stories found"
    );

    return {
        success: true,
        stories: finalStories.slice(0, params.limit || 5),
    };
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Extract story placeholders from message content.
 */
function extractStoryPlaceholders(content: string): string[] {
    const placeholders: string[] = [];
    const patterns = [
        /\{story(?:_\d+)?\}/g,
        /\{proof(?:_\d+)?\}/g,
        /\{testimonial(?:_\d+)?\}/g,
        /\{case_study(?:_\d+)?\}/g,
    ];

    patterns.forEach((pattern) => {
        const matches = content.match(pattern);
        if (matches) {
            placeholders.push(...matches);
        }
    });

    return [...new Set(placeholders)]; // Remove duplicates
}

/**
 * Format story content for insertion into message.
 */
function formatStoryContent(story: StoryLibraryEntry): string {
    // Format based on story type
    switch (story.story_type) {
        case "testimonial":
            return `"${story.content}"\n\n— Real client result`;

        case "case_study":
            return `**Real Example:** ${story.content}`;

        case "proof_element":
            return `✓ ${story.content}`;

        case "micro_story":
        default:
            return story.content;
    }
}

/**
 * Format objection name for display.
 */
function formatObjectionName(objectionCategory: string): string {
    const names: Record<string, string> = {
        price_concern: "the investment",
        timing_concern: "the timing",
        need_justification: "whether this is right for you",
        competitive_concern: "how this compares to other options",
    };

    return names[objectionCategory] || objectionCategory.replace("_", " ");
}
