/**
 * Regenerate Brand Colors API
 * POST: Generate new color palette with AI based on business context
 * Only regenerates colors and rationale, preserves messaging and application sections
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import { z } from "zod";
import type OpenAI from "openai";
import type { BusinessProfile } from "@/types/business-profile";

const regenerateColorsSchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
});

interface ColorGenerationResult {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    text_color: string;
    rationale: string;
}

/**
 * Create prompt for color-only regeneration
 */
function createColorRegenerationPrompt(
    businessContext: string,
    currentDesignStyle?: string,
    personalityTraits?: Record<string, unknown>
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const styleContext = currentDesignStyle
        ? `\nCurrent design style: ${currentDesignStyle}`
        : "";
    const personalityContext = personalityTraits
        ? `\nBrand personality: ${JSON.stringify(personalityTraits)}`
        : "";

    return [
        {
            role: "system",
            content: `You are an expert brand color designer. Generate a fresh, cohesive color palette based on the business context while maintaining the brand's established style.

COLOR PSYCHOLOGY PRINCIPLES:
- Blue: Trust, stability, professionalism (finance, healthcare, tech)
- Green: Growth, nature, health, wealth (wellness, finance, sustainability)
- Purple: Luxury, creativity, wisdom (coaching, premium services)
- Orange: Energy, enthusiasm, warmth (fitness, youth, food)
- Red: Passion, urgency, power (sales, entertainment, food)
- Yellow: Optimism, clarity, warmth (education, children, creativity)
- Pink: Compassion, nurturing, femininity (wellness, beauty, relationships)
- Teal: Balance, calm, sophistication (modern wellness, tech)
- Black: Sophistication, luxury, authority (high-end brands)

IMPORTANT:
- Generate colors that feel DIFFERENT from a typical palette
- Ensure the new palette still matches the brand's personality
- All colors must be valid 6-digit HEX codes
- Background should be light for readability
- Text must have sufficient contrast with background
- Accent color must work well for CTA buttons`,
        },
        {
            role: "user",
            content: `Generate a NEW color palette for this business:

BUSINESS CONTEXT:
${businessContext}
${styleContext}
${personalityContext}

Return ONLY a JSON object with this exact structure:
{
  "primary_color": "#XXXXXX (main brand color - headings, buttons)",
  "secondary_color": "#XXXXXX (complementary - accents, hover states)",
  "accent_color": "#XXXXXX (CTAs - must stand out)",
  "background_color": "#XXXXXX (page background - usually light)",
  "text_color": "#XXXXXX (body text - must contrast with background)",
  "rationale": "2-3 sentences explaining why this color palette fits this business, what emotions it evokes, and how it will connect with the target audience"
}

CRITICAL: Generate a fresh palette that differs from typical defaults. Be creative but stay on-brand.`,
        },
    ];
}

/**
 * Convert business profile to context string
 */
function businessProfileToContext(profile: BusinessProfile): string {
    const sections: string[] = [];

    if (profile.ideal_customer) {
        sections.push(`Target Customer: ${profile.ideal_customer}`);
    }
    if (profile.transformation) {
        sections.push(`Transformation: ${profile.transformation}`);
    }
    if (profile.offer_name) {
        sections.push(`Offer: ${profile.offer_name}`);
    }
    if (profile.signature_method) {
        sections.push(`Method: ${profile.signature_method}`);
    }

    return sections.join("\n") || "No business context available";
}

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "regenerate-brand-colors" });

    try {
        const supabase = await createClient();

        // Verify authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse request body
        const body = await request.json();

        const validationResult = regenerateColorsSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { projectId } = validationResult.data;

        requestLogger.info(
            { userId: user.id, projectId },
            "Regenerating brand colors"
        );

        // Get existing brand design
        const { data: brandDesign, error: brandError } = await supabase
            .from("brand_designs")
            .select("*")
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id)
            .single();

        if (brandError || !brandDesign) {
            return NextResponse.json(
                { error: "Brand design not found" },
                { status: 404 }
            );
        }

        // Get business context - try business profile first
        let businessContext = "";

        const { data: businessProfile } = await supabase
            .from("business_profiles")
            .select("*")
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (businessProfile) {
            businessContext = businessProfileToContext(
                businessProfile as BusinessProfile
            );
        } else {
            // Try to get transcript
            const { data: transcript } = await supabase
                .from("vapi_transcripts")
                .select("transcript_text")
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (transcript) {
                businessContext = transcript.transcript_text.substring(0, 2000);
            }
        }

        if (!businessContext) {
            businessContext =
                "A professional business offering transformational services.";
        }

        // Generate new colors with AI
        let generatedColors: ColorGenerationResult;
        try {
            generatedColors = await generateWithAI<ColorGenerationResult>(
                createColorRegenerationPrompt(
                    businessContext,
                    brandDesign.design_style,
                    brandDesign.personality_traits
                )
            );
        } catch (aiError) {
            requestLogger.error(
                { error: aiError, projectId, userId: user.id },
                "AI color generation failed"
            );
            return NextResponse.json(
                {
                    error: "Failed to generate new colors. Please try again.",
                    retryable: true,
                },
                { status: 500 }
            );
        }

        // Validate generated colors
        const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
        if (
            !hexColorRegex.test(generatedColors.primary_color) ||
            !hexColorRegex.test(generatedColors.secondary_color) ||
            !hexColorRegex.test(generatedColors.accent_color) ||
            !hexColorRegex.test(generatedColors.background_color) ||
            !hexColorRegex.test(generatedColors.text_color)
        ) {
            requestLogger.error(
                { generatedColors, projectId },
                "AI returned invalid color format"
            );
            return NextResponse.json(
                {
                    error: "AI generated invalid colors. Please try again.",
                    retryable: true,
                },
                { status: 500 }
            );
        }

        // Update the brand design with new colors AND rationale
        const { data: updatedDesign, error: updateError } = await supabase
            .from("brand_designs")
            .update({
                primary_color: generatedColors.primary_color,
                secondary_color: generatedColors.secondary_color,
                accent_color: generatedColors.accent_color,
                background_color: generatedColors.background_color,
                text_color: generatedColors.text_color,
                color_rationale: generatedColors.rationale,
                last_regenerated_at: new Date().toISOString(),
            })
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (updateError) {
            requestLogger.error(
                { error: updateError, projectId, userId: user.id },
                "Failed to save regenerated colors"
            );
            return NextResponse.json(
                { error: "Failed to save new colors" },
                { status: 500 }
            );
        }

        requestLogger.info(
            {
                userId: user.id,
                projectId,
                newPrimary: generatedColors.primary_color,
            },
            "Brand colors regenerated successfully"
        );

        return NextResponse.json({
            success: true,
            primary_color: generatedColors.primary_color,
            secondary_color: generatedColors.secondary_color,
            accent_color: generatedColors.accent_color,
            background_color: generatedColors.background_color,
            text_color: generatedColors.text_color,
            color_rationale: generatedColors.rationale,
            ...updatedDesign,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to regenerate brand colors");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "regenerate-brand-colors",
            },
        });

        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
