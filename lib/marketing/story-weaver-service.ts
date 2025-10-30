/**
 * Story Weaver Service
 * Generates story angles and expands them into full content
 * Applies Echo Mode voice mirroring and story frameworks
 */

import { generateWithAI, generateTextWithAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { getVoiceGuidelines } from "./brand-voice-service";
import type {
    ContentBrief,
    StoryAngle,
    MarketingStoryFramework,
} from "@/types/marketing";

/**
 * Generate 3 story angles from a content brief
 * Returns: Founder Saga, Myth-Buster, Industry POV variants
 */
export async function generateStoryAngles(
    brief: ContentBrief,
    profileId: string
): Promise<{ success: boolean; angles?: StoryAngle[]; error?: string }> {
    try {
        // Get voice guidelines for this profile
        const voiceResult = await getVoiceGuidelines(profileId);
        if (!voiceResult.success || !voiceResult.guidelines) {
            return {
                success: false,
                error: "Unable to fetch voice guidelines",
            };
        }

        const prompt = `You are a master storyteller creating compelling social media content. Generate 3 different story angles for the same topic, each using a different framework.

CONTENT BRIEF:
- Topic: ${brief.topic}
- Goal: ${brief.goal}
- Target Audience (ICP): ${brief.icp_description || "General audience"}
- Transformation Focus: ${brief.transformation_focus || "Desired outcome"}
- Funnel Entry Point: ${brief.funnel_entry_point}

${voiceResult.guidelines}

Generate 3 story angles:
1. **Founder Saga** - Personal journey, vulnerable moment, transformation
2. **Myth-Buster** - Challenge common belief, reveal truth, shift perspective
3. **Industry POV** - Expert insight, trend analysis, thought leadership

For each angle, provide:
- A compelling hook (first 1-2 sentences that stop the scroll)
- Story outline (3-5 key beats of the narrative)
- Key message (main takeaway)
- Estimated length in words

Return as JSON:
{
  "angles": [
    {
      "angle": "Founder",
      "framework": "founder_saga",
      "hook": "...",
      "story_outline": "...",
      "key_message": "...",
      "estimated_length": 150
    },
    {
      "angle": "Myth-Buster",
      "framework": "myth_buster",
      "hook": "...",
      "story_outline": "...",
      "key_message": "...",
      "estimated_length": 180
    },
    {
      "angle": "Industry POV",
      "framework": "philosophy_pov",
      "hook": "...",
      "story_outline": "...",
      "key_message": "...",
      "estimated_length": 200
    }
  ]
}`;

        const result = await generateWithAI<{ angles: StoryAngle[] }>(
            [
                {
                    role: "system",
                    content:
                        "You are an expert storyteller who creates compelling, scroll-stopping social media content using proven narrative frameworks.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.8,
                maxTokens: 2000,
            }
        );

        logger.info(
            { briefId: brief.id, angleCount: result.angles.length },
            "Story angles generated"
        );

        return { success: true, angles: result.angles };
    } catch (error) {
        logger.error({ error, briefId: brief.id }, "Failed to generate story angles");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Expand a selected story angle into full content
 * Applies voice guidelines and target length
 */
export async function expandStory(
    angle: StoryAngle,
    brief: ContentBrief,
    profileId: string,
    targetLength: number = 300
): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
        // Get voice guidelines
        const voiceResult = await getVoiceGuidelines(profileId);
        if (!voiceResult.success || !voiceResult.guidelines) {
            return {
                success: false,
                error: "Unable to fetch voice guidelines",
            };
        }

        const prompt = `Expand this story angle into a complete social media post.

STORY ANGLE:
- Framework: ${angle.framework}
- Hook: ${angle.hook}
- Story Outline: ${angle.story_outline}
- Key Message: ${angle.key_message}

CONTENT REQUIREMENTS:
- Target Length: ~${targetLength} words
- Topic: ${brief.topic}
- Goal: ${brief.goal}
- Call to Action Focus: ${brief.funnel_entry_point}

${voiceResult.guidelines}

Write a complete post that:
1. Opens with the compelling hook
2. Develops the story following the outline
3. Delivers the key message naturally
4. Includes a clear call-to-action related to ${brief.funnel_entry_point}
5. Maintains authenticity and the specified voice/tone

Write conversationally, as if speaking directly to ${brief.icp_description || "the reader"}.
Use short paragraphs for readability.
Include emotional resonance and specific details.

Return ONLY the post content (no meta commentary).`;

        const content = await generateTextWithAI(
            [
                {
                    role: "system",
                    content:
                        "You are an expert content writer who creates authentic, engaging social media posts that drive action while maintaining brand voice.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.7,
                maxTokens: Math.ceil(targetLength * 2), // Allow buffer for generation
            }
        );

        logger.info(
            { briefId: brief.id, framework: angle.framework, length: content.length },
            "Story expanded"
        );

        return { success: true, content };
    } catch (error) {
        logger.error({ error, briefId: brief.id }, "Failed to expand story");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Generate story for a specific framework
 * Specialized generation for each framework type
 */
export async function generateFrameworkStory(
    framework: MarketingStoryFramework,
    brief: ContentBrief,
    profileId: string
): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
        const voiceResult = await getVoiceGuidelines(profileId);
        if (!voiceResult.success || !voiceResult.guidelines) {
            return {
                success: false,
                error: "Unable to fetch voice guidelines",
            };
        }

        let frameworkPrompt = "";

        switch (framework) {
            case "founder_saga":
                frameworkPrompt = `Write a personal founder story about ${brief.topic}.

Structure:
- Start with a relatable struggle or vulnerable moment
- Show the journey and what you learned
- Connect to how this helps your audience with ${brief.transformation_focus}
- End with hope and a clear next step

Make it raw, honest, and deeply personal. This is YOUR story.`;
                break;

            case "myth_buster":
                frameworkPrompt = `Write a myth-busting post about ${brief.topic}.

Structure:
- Open with the common belief/myth (make it provocative)
- Explain why this belief is wrong (with evidence or experience)
- Reveal the truth
- Show what changes when they adopt the correct perspective
- Call them to action

Be bold. Challenge assumptions. Back it up with specifics.`;
                break;

            case "philosophy_pov":
                frameworkPrompt = `Write a thought leadership post about ${brief.topic}.

Structure:
- Present your unique perspective or framework
- Explain the underlying principle
- Give concrete examples or applications
- Connect to bigger industry trends
- Inspire them to think differently

Position yourself as the expert who sees what others miss.`;
                break;

            case "current_event":
                frameworkPrompt = `Write a timely post connecting a current event/trend to ${brief.topic}.

Structure:
- Reference the current event (what everyone's talking about)
- Make the connection to your expertise
- Share your unique take
- Show what this means for your audience
- Give them actionable next steps

Ride the wave of relevance while staying authentic.`;
                break;

            case "how_to":
                frameworkPrompt = `Write an actionable how-to post about ${brief.topic}.

Structure:
- Promise a specific outcome
- Break down the process into clear steps
- Add insider tips or common mistakes to avoid
- Show the transformation they'll experience
- Invite them to go deeper with you

Make it tactical and immediately valuable.`;
                break;
        }

        const fullPrompt = `${frameworkPrompt}

CONTENT REQUIREMENTS:
- Goal: ${brief.goal}
- Target Audience: ${brief.icp_description || "Your ideal customer"}
- Call to Action: Related to ${brief.funnel_entry_point}

${voiceResult.guidelines}

Write 250-350 words in a conversational, authentic style.`;

        const content = await generateTextWithAI(
            [
                {
                    role: "system",
                    content:
                        "You are an expert content creator who writes compelling social media posts using proven storytelling frameworks.",
                },
                {
                    role: "user",
                    content: fullPrompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.7,
                maxTokens: 1000,
            }
        );

        logger.info(
            { briefId: brief.id, framework, length: content.length },
            "Framework story generated"
        );

        return { success: true, content };
    } catch (error) {
        logger.error(
            { error, framework, briefId: brief.id },
            "Failed to generate story"
        );
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Adapt existing content to a different story framework
 * Useful for creating variants from the same core message
 */
export async function adaptToFramework(
    originalContent: string,
    targetFramework: MarketingStoryFramework,
    profileId: string
): Promise<{ success: boolean; adapted?: string; error?: string }> {
    try {
        const voiceResult = await getVoiceGuidelines(profileId);
        if (!voiceResult.success || !voiceResult.guidelines) {
            return {
                success: false,
                error: "Unable to fetch voice guidelines",
            };
        }

        const frameworkDescriptions: Record<MarketingStoryFramework, string> = {
            founder_saga:
                "Personal journey framework - vulnerable, authentic, transformation-focused",
            myth_buster:
                "Challenge assumptions framework - provocative, truth-revealing, perspective-shifting",
            philosophy_pov:
                "Thought leadership framework - expert insight, unique perspective, trend analysis",
            current_event:
                "Timely relevance framework - connect to what's happening now, ride the wave",
            how_to: "Actionable education framework - step-by-step, tactical, immediately valuable",
        };

        const prompt = `Adapt this content to use the ${targetFramework} framework.

ORIGINAL CONTENT:
${originalContent}

TARGET FRAMEWORK: ${frameworkDescriptions[targetFramework]}

${voiceResult.guidelines}

Rewrite the content to follow the new framework while:
- Keeping the core message and key insights
- Restructuring the narrative to fit the framework
- Maintaining the authentic voice
- Ensuring it's equally compelling
- Keeping similar length (~10% variance)

Return ONLY the adapted content.`;

        const adapted = await generateTextWithAI(
            [
                {
                    role: "system",
                    content:
                        "You are an expert at adapting content across different storytelling frameworks while maintaining core message and voice.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.6,
                maxTokens: 1000,
            }
        );

        logger.info(
            { targetFramework, originalLength: originalContent.length },
            "Content adapted to framework"
        );

        return { success: true, adapted };
    } catch (error) {
        logger.error({ error, targetFramework }, "Failed to adapt to framework");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Generate multiple story variants at once
 * Useful for A/B testing different angles
 */
export async function generateStoryVariants(
    brief: ContentBrief,
    profileId: string,
    count: number = 3
): Promise<{
    success: boolean;
    variants?: Array<{ framework: MarketingStoryFramework; content: string }>;
    error?: string;
}> {
    try {
        const frameworks: MarketingStoryFramework[] = [
            "founder_saga",
            "myth_buster",
            "philosophy_pov",
            "current_event",
            "how_to",
        ];

        // Select random frameworks if count < 5
        const selectedFrameworks =
            count >= 5
                ? frameworks
                : frameworks.sort(() => Math.random() - 0.5).slice(0, count);

        const variants: Array<{ framework: MarketingStoryFramework; content: string }> =
            [];

        // Generate stories for each framework in parallel
        const results = await Promise.all(
            selectedFrameworks.map((framework) =>
                generateFrameworkStory(framework, brief, profileId)
            )
        );

        results.forEach((result, index) => {
            if (result.success && result.content) {
                variants.push({
                    framework: selectedFrameworks[index],
                    content: result.content,
                });
            }
        });

        if (variants.length === 0) {
            return {
                success: false,
                error: "Failed to generate any variants",
            };
        }

        logger.info(
            { briefId: brief.id, variantCount: variants.length },
            "Story variants generated"
        );

        return { success: true, variants };
    } catch (error) {
        logger.error({ error, briefId: brief.id }, "Failed to generate variants");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
