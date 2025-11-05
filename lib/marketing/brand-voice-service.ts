/**
 * Brand Voice Service
 * Manages marketing profiles, Echo Mode voice mirroring, and voice calibration
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI, generateTextWithAI } from "@/lib/ai/client";
import type {
    MarketingProfile,
    ToneSettings,
    EchoModeConfig,
    BusinessContext,
    ProductKnowledge,
} from "@/types/marketing";

/**
 * Initialize a marketing profile from intake and offer data
 * Auto-populates business context and product knowledge
 */
export async function initializeProfile(
    userId: string,
    funnelProjectId: string,
    name: string = "Main Profile"
): Promise<{ success: boolean; profile?: MarketingProfile; error?: string }> {
    try {
        const supabase = await createClient();

        // Fetch intake data for business context
        const { data: intakeData } = await supabase
            .from("vapi_transcripts")
            .select("extracted_data, transcript_text")
            .eq("funnel_project_id", funnelProjectId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        // Fetch offer data for product details
        const { data: offerData } = await supabase
            .from("offers")
            .select("*")
            .eq("funnel_project_id", funnelProjectId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        // Build business context from intake
        const businessContext: BusinessContext = {
            business_name: "",
            industry: "",
            target_audience: "",
            main_challenge: "",
            desired_outcome: "",
        };

        if (intakeData?.extracted_data) {
            const extracted = intakeData.extracted_data as any;
            businessContext.business_name = extracted.businessName || "";
            businessContext.industry = extracted.industry || "";
            businessContext.target_audience = extracted.targetAudience || "";
            businessContext.main_challenge = extracted.mainProblem || "";
            businessContext.desired_outcome = extracted.desiredOutcome || "";
        }

        // Build product knowledge from offer
        const productKnowledge: ProductKnowledge = {
            product_name: "",
            tagline: "",
            promise: "",
            features: [],
            guarantee: "",
        };

        if (offerData) {
            productKnowledge.product_name = offerData.name || "";
            productKnowledge.tagline = offerData.tagline || "";
            productKnowledge.promise = offerData.promise || "";
            productKnowledge.features = Array.isArray(offerData.features)
                ? offerData.features.map((f: any) =>
                      typeof f === "string" ? f : f.title || ""
                  )
                : [];
            productKnowledge.guarantee = offerData.guarantee || "";
        }

        // Generate initial brand voice guidelines using AI
        const brandVoice = await generateBrandVoiceGuidelines(
            businessContext,
            productKnowledge
        );

        // Create the profile
        const { data: profile, error } = await supabase
            .from("marketing_profiles")
            .insert({
                user_id: userId,
                funnel_project_id: funnelProjectId,
                name,
                brand_voice: brandVoice,
                business_context: businessContext,
                product_knowledge: productKnowledge,
                is_active: true,
            })
            .select()
            .single();

        if (error) {
            logger.error(
                { error, userId, funnelProjectId },
                "Failed to create profile"
            );
            return { success: false, error: error.message };
        }

        logger.info(
            { profileId: profile.id, userId, funnelProjectId },
            "Marketing profile initialized"
        );

        return { success: true, profile: profile as MarketingProfile };
    } catch (error) {
        logger.error({ error, userId, funnelProjectId }, "Error initializing profile");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Generate brand voice guidelines using AI
 */
export async function generateBrandVoiceGuidelines(
    businessContext: BusinessContext,
    productKnowledge: ProductKnowledge
): Promise<string> {
    const prompt = `You are an expert brand voice consultant. Create comprehensive brand voice guidelines based on the following business information.

Business Context:
- Business Name: ${businessContext.business_name}
- Industry: ${businessContext.industry}
- Target Audience: ${businessContext.target_audience}
- Main Challenge: ${businessContext.main_challenge}
- Desired Outcome: ${businessContext.desired_outcome}

Product Information:
- Product: ${productKnowledge.product_name}
- Tagline: ${productKnowledge.tagline}
- Promise: ${productKnowledge.promise}
- Key Features: ${productKnowledge.features.join(", ")}

Create brand voice guidelines that include:
1. Overall tone (conversational, professional, empathetic, etc.)
2. Key messaging themes
3. Words and phrases to use
4. Words and phrases to avoid
5. Storytelling approach
6. How to address the target audience

Keep it concise but actionable (300-500 words).`;

    try {
        const guidelines = await generateTextWithAI(
            [
                {
                    role: "system",
                    content:
                        "You are an expert brand voice consultant. Generate clear, actionable brand voice guidelines.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.7,
                maxTokens: 1000,
            }
        );

        return guidelines;
    } catch (error) {
        logger.error({ error }, "Failed to generate brand voice guidelines");
        // Return a basic default
        return `Brand Voice Guidelines:

Tone: Professional yet approachable, empathetic to customer challenges.

Key Themes:
- Focus on the transformation and results
- Lead with empathy for ${businessContext.main_challenge}
- Emphasize the value of ${productKnowledge.product_name}

Approach:
- Use clear, jargon-free language
- Share authentic stories and experiences
- Always connect features to benefits
- End with clear calls-to-action`;
    }
}

/**
 * Generate Echo Mode profile by analyzing existing content
 * Identifies voice characteristics, pacing, and cadence
 */
export async function generateEchoModeProfile(
    profileId: string,
    sampleContent: string[],
    sourceUrl?: string
): Promise<{
    success: boolean;
    config?: EchoModeConfig;
    styleSummary?: string;
    previewParagraph?: string;
    error?: string;
}> {
    try {
        if (sampleContent.length === 0) {
            return {
                success: false,
                error: "No sample content provided for analysis",
            };
        }

        const prompt = `Analyze the following social media posts and identify the unique voice characteristics:

${sampleContent.map((content, i) => `Post ${i + 1}:\n${content}\n`).join("\n")}

Analyze and return a JSON object with:
{
  "voice_characteristics": ["characteristic1", "characteristic2", ...],
  "pacing": "slow" | "moderate" | "fast",
  "cadence": "rhythmic" | "balanced" | "varied",
  "signature_phrases": ["phrase1", "phrase2", ...]
}

Voice characteristics should capture:
- Sentence structure (short/punchy vs long/flowing)
- Use of questions, exclamations, ellipses
- Humor style (if any)
- Emotional tone patterns
- Personal pronouns usage

Pacing refers to how quickly ideas are presented.
Cadence refers to the rhythm and flow of sentences.
Signature phrases are unique expressions this person uses repeatedly.`;

        const analysis = await generateWithAI<{
            voice_characteristics: string[];
            pacing: "slow" | "moderate" | "fast";
            cadence: "rhythmic" | "balanced" | "varied";
            signature_phrases: string[];
        }>(
            [
                {
                    role: "system",
                    content:
                        "You are an expert in voice analysis and linguistic patterns. Analyze writing samples to identify unique voice characteristics.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.3,
                maxTokens: 1000,
            }
        );

        const echoConfig: EchoModeConfig = {
            enabled: true,
            voice_characteristics: analysis.voice_characteristics,
            pacing: analysis.pacing,
            cadence: analysis.cadence,
            signature_phrases: analysis.signature_phrases,
        };

        // Update the profile
        const supabase = await createClient();
        const { error } = await supabase
            .from("marketing_profiles")
            .update({
                echo_mode_config: echoConfig,
                last_calibrated_at: new Date().toISOString(),
            })
            .eq("id", profileId);

        if (error) {
            logger.error({ error, profileId }, "Failed to update Echo Mode config");
            return { success: false, error: error.message };
        }

        logger.info({ profileId }, "Echo Mode profile generated");

        // Generate style summary and preview paragraph
        const { styleSummary, previewParagraph } = await generateVoiceStyleSummary(
            echoConfig,
            sampleContent
        );

        return {
            success: true,
            config: echoConfig,
            styleSummary,
            previewParagraph,
        };
    } catch (error) {
        logger.error({ error, profileId }, "Error generating Echo Mode profile");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Generate a readable style summary and preview paragraph
 * Describes the detected tone and style in user-friendly language
 */
async function generateVoiceStyleSummary(
    config: EchoModeConfig,
    sampleContent: string[]
): Promise<{ styleSummary: string; previewParagraph: string }> {
    try {
        const prompt = `Based on the following voice analysis, create:
1. A concise style summary (2-3 sentences) describing the writing style
2. A preview paragraph (3-4 sentences) written in this exact voice

Voice Analysis:
- Characteristics: ${config.voice_characteristics.join(", ")}
- Pacing: ${config.pacing}
- Cadence: ${config.cadence}
- Signature Phrases: ${config.signature_phrases.join(", ") || "None detected"}

Sample Content:
${sampleContent
    .slice(0, 3)
    .map((c, i) => `Example ${i + 1}:\n${c.substring(0, 300)}`)
    .join("\n\n")}

Return as JSON:
{
  "styleSummary": "A 2-3 sentence summary of the writing style",
  "previewParagraph": "A 3-4 sentence paragraph written in this exact voice demonstrating the detected characteristics"
}`;

        const result = await generateWithAI<{
            styleSummary: string;
            previewParagraph: string;
        }>(
            [
                {
                    role: "system",
                    content:
                        "You are an expert in voice analysis and writing style. Generate clear, accurate summaries and demonstrate voice characteristics through example writing.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.5,
                maxTokens: 500,
            }
        );

        return {
            styleSummary:
                result.styleSummary || "Voice analysis completed successfully.",
            previewParagraph:
                result.previewParagraph ||
                "This is a preview of content written in your detected voice style.",
        };
    } catch (error) {
        logger.error({ error }, "Failed to generate voice style summary");
        // Return fallback summary
        const characteristics = config.voice_characteristics.join(", ");
        return {
            styleSummary: `Writing style characterized by: ${characteristics}. Pacing is ${config.pacing} with a ${config.cadence} cadence.`,
            previewParagraph: `This preview demonstrates your unique voice characteristics including ${config.voice_characteristics[0] || "distinctive patterns"}. The ${config.pacing} pacing and ${config.cadence} cadence create an authentic, recognizable style that resonates with your audience.`,
        };
    }
}

/**
 * Calibrate voice settings based on user adjustments
 */
export async function calibrateVoice(
    profileId: string,
    toneSettings: Partial<ToneSettings>
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("marketing_profiles")
            .update({
                tone_settings: toneSettings,
                last_calibrated_at: new Date().toISOString(),
            })
            .eq("id", profileId);

        if (error) {
            logger.error({ error, profileId }, "Failed to calibrate voice");
            return { success: false, error: error.message };
        }

        logger.info({ profileId, toneSettings }, "Voice calibrated");
        return { success: true };
    } catch (error) {
        logger.error({ error, profileId }, "Error calibrating voice");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get formatted voice guidelines for AI prompts
 * Combines brand voice, tone settings, and Echo Mode config
 */
export async function getVoiceGuidelines(
    profileId: string
): Promise<{ success: boolean; guidelines?: string; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: profile, error } = await supabase
            .from("marketing_profiles")
            .select("*")
            .eq("id", profileId)
            .single();

        if (error || !profile) {
            return { success: false, error: "Profile not found" };
        }

        const toneSettings = profile.tone_settings as ToneSettings;
        const echoMode = profile.echo_mode_config as EchoModeConfig;

        // Format guidelines for AI consumption
        const guidelines = `BRAND VOICE GUIDELINES:

${profile.brand_voice}

TONE SETTINGS:
- Conversational vs Professional: ${toneSettings.conversational_professional}/100 (${getToneLabel(toneSettings.conversational_professional, "conversational", "professional")})
- Warmth: ${toneSettings.warmth}/100 (${getIntensityLabel(toneSettings.warmth)})
- Urgency: ${toneSettings.urgency}/100 (${getIntensityLabel(toneSettings.urgency)})
- Empathy: ${toneSettings.empathy}/100 (${getIntensityLabel(toneSettings.empathy)})
- Confidence: ${toneSettings.confidence}/100 (${getIntensityLabel(toneSettings.confidence)})

${
    echoMode.enabled
        ? `
ECHO MODE - VOICE CHARACTERISTICS:
- Voice Patterns: ${echoMode.voice_characteristics.join(", ")}
- Pacing: ${echoMode.pacing}
- Cadence: ${echoMode.cadence}
${echoMode.signature_phrases.length > 0 ? `- Signature Phrases: ${echoMode.signature_phrases.join(", ")}` : ""}

When writing, mirror these characteristics while maintaining authenticity.
`
        : ""
}

BUSINESS CONTEXT:
${formatBusinessContext(profile.business_context as BusinessContext)}

PRODUCT KNOWLEDGE:
${formatProductKnowledge(profile.product_knowledge as ProductKnowledge)}`;

        return { success: true, guidelines };
    } catch (error) {
        logger.error({ error, profileId }, "Error getting voice guidelines");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

// Helper functions
function getToneLabel(value: number, lowLabel: string, highLabel: string): string {
    if (value < 30) return `Very ${lowLabel}`;
    if (value < 45) return lowLabel;
    if (value < 55) return "Balanced";
    if (value < 70) return highLabel;
    return `Very ${highLabel}`;
}

function getIntensityLabel(value: number): string {
    if (value < 30) return "Low";
    if (value < 45) return "Moderate-Low";
    if (value < 55) return "Moderate";
    if (value < 70) return "Moderate-High";
    return "High";
}

function formatBusinessContext(context: BusinessContext): string {
    return `- Business: ${context.business_name}
- Industry: ${context.industry}
- Target Audience: ${context.target_audience}
- Main Challenge: ${context.main_challenge}
- Desired Outcome: ${context.desired_outcome}`;
}

function formatProductKnowledge(product: ProductKnowledge): string {
    return `- Product: ${product.product_name}
- Tagline: ${product.tagline}
- Promise: ${product.promise}
- Key Features: ${product.features.join(", ")}
${product.guarantee ? `- Guarantee: ${product.guarantee}` : ""}`;
}

/**
 * Get a profile by ID
 */
export async function getProfile(
    profileId: string
): Promise<{ success: boolean; profile?: MarketingProfile; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: profile, error } = await supabase
            .from("marketing_profiles")
            .select("*")
            .eq("id", profileId)
            .single();

        if (error || !profile) {
            return { success: false, error: "Profile not found" };
        }

        return { success: true, profile: profile as MarketingProfile };
    } catch (error) {
        logger.error({ error, profileId }, "Error getting profile");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * List profiles for a user or funnel project
 */
export async function listProfiles(
    userId: string,
    funnelProjectId?: string
): Promise<{ success: boolean; profiles?: MarketingProfile[]; error?: string }> {
    try {
        const supabase = await createClient();

        let query = supabase
            .from("marketing_profiles")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (funnelProjectId) {
            query = query.eq("funnel_project_id", funnelProjectId);
        }

        const { data: profiles, error } = await query;

        if (error) {
            logger.error({ error, userId }, "Failed to list profiles");
            return { success: false, error: error.message };
        }

        return { success: true, profiles: (profiles as MarketingProfile[]) || [] };
    } catch (error) {
        logger.error({ error, userId }, "Error listing profiles");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
