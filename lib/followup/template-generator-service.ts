/**
 * Template Generator Service
 *
 * Generates AI-powered follow-up message templates by analyzing deck content
 * and offer details. Falls back to default templates when AI generation fails.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import {
    createFollowupSequencePrompt,
    type DeckContext,
    type OfferContext,
} from "@/lib/ai/prompts";
import { getDefault3DaySequence } from "./default-templates";
import type { FollowupSegment } from "@/types/followup";

export interface GenerateTemplatesInput {
    funnel_project_id: string;
    offer_id: string;
    agent_config_id?: string;
    segment?: FollowupSegment;
    use_defaults?: boolean;
}

export interface GenerateTemplatesResult {
    success: boolean;
    sequence_id?: string;
    message_ids?: string[];
    generation_method?: "ai" | "default";
    error?: string;
}

interface AIGeneratedMessage {
    name: string;
    message_order: number;
    channel: "email" | "sms";
    send_delay_hours: number;
    subject_line?: string;
    body_content: string;
    tone_notes?: string;
    estimated_read_time?: string;
}

interface AIGeneratedSequence {
    sequence_name: string;
    sequence_description: string;
    messages: AIGeneratedMessage[];
}

/**
 * Generate follow-up templates using AI or default templates.
 *
 * Flow:
 * 1. Fetch deck structure and offer
 * 2. Extract context from deck
 * 3. Call OpenAI to generate personalized templates
 * 4. Fall back to defaults if AI fails
 * 5. Create sequence and messages in database
 */
export async function generateFollowupTemplates(
    userId: string,
    input: GenerateTemplatesInput
): Promise<GenerateTemplatesResult> {
    const supabase = await createClient();

    logger.info(
        {
            userId,
            funnelProjectId: input.funnel_project_id,
            offerId: input.offer_id,
            useDefaults: input.use_defaults,
        },
        "🎨 Generating follow-up templates"
    );

    // If user explicitly wants defaults, skip AI generation
    if (input.use_defaults) {
        return await createDefaultSequence(userId, input);
    }

    try {
        // Fetch deck structure
        const { data: deckStructure, error: deckError } = await supabase
            .from("deck_structures")
            .select("*")
            .eq("funnel_project_id", input.funnel_project_id)
            .single();

        if (deckError || !deckStructure) {
            logger.warn(
                { error: deckError, funnelProjectId: input.funnel_project_id },
                "⚠️  No deck structure found, using defaults"
            );
            return await createDefaultSequence(userId, input);
        }

        // Fetch offer details
        const { data: offer, error: offerError } = await supabase
            .from("offers")
            .select("*")
            .eq("id", input.offer_id)
            .single();

        if (offerError || !offer) {
            logger.warn(
                { error: offerError, offerId: input.offer_id },
                "⚠️  No offer found, using defaults"
            );
            return await createDefaultSequence(userId, input);
        }

        // Extract context from deck and offer
        const deckContext = extractDeckContext(deckStructure);
        const offerContext = extractOfferContext(offer);

        logger.info(
            { deckContext, offerContext },
            "📊 Extracted context from deck and offer"
        );

        // Generate templates with AI
        const aiResult = await generateWithAI<AIGeneratedSequence>(
            createFollowupSequencePrompt(
                deckContext,
                offerContext,
                input.segment || "engaged"
            ),
            {
                temperature: 0.7,
                maxTokens: 4000,
            }
        );

        logger.info(
            { messageCount: aiResult.messages.length },
            "✅ AI generated templates successfully"
        );

        // Create sequence and messages in database
        return await createSequenceFromAIResult(userId, input, aiResult);
    } catch (error) {
        logger.error(
            { error, funnelProjectId: input.funnel_project_id },
            "❌ AI generation failed, falling back to defaults"
        );

        // Fall back to default templates
        return await createDefaultSequence(userId, input);
    }
}

/**
 * Extract deck context from deck structure.
 * Analyzes slides to identify key points, pain points, and solutions.
 */
function extractDeckContext(deckStructure: {
    slides: any;
    metadata?: any;
    template_type?: string;
}): DeckContext {
    const slides = Array.isArray(deckStructure.slides) ? deckStructure.slides : [];

    const title = deckStructure.metadata?.title || "Webinar Presentation";

    // Extract key information from slides
    const keyPoints: string[] = [];
    const painPoints: string[] = [];
    const solutions: string[] = [];
    let mainPromise = "";

    for (const slide of slides) {
        const slideTitle = slide.title || "";
        const slideDesc = slide.description || "";
        const section = slide.section || "";

        // Extract based on section
        if (section === "problem" || section === "agitate") {
            if (slideTitle) painPoints.push(slideTitle);
        } else if (section === "solution") {
            if (slideTitle) solutions.push(slideTitle);
        } else if (section === "hook") {
            if (!mainPromise && slideTitle) {
                mainPromise = slideTitle;
            }
        }

        // Add to key points if significant
        if (slideTitle && keyPoints.length < 5) {
            keyPoints.push(slideTitle);
        }
    }

    // Set defaults if extraction didn't find much
    if (keyPoints.length === 0) {
        keyPoints.push("Transform your business with proven strategies");
        keyPoints.push("Overcome the biggest challenges in your industry");
        keyPoints.push("Implement a system that delivers results");
    }

    if (painPoints.length === 0) {
        painPoints.push("Feeling stuck and overwhelmed");
        painPoints.push("Not seeing the results you want");
    }

    if (solutions.length === 0) {
        solutions.push("A proven framework to achieve your goals");
        solutions.push("Step-by-step guidance and support");
    }

    if (!mainPromise) {
        mainPromise = "Achieve the transformation you've been looking for";
    }

    return {
        title,
        keyPoints,
        painPoints,
        solutions,
        mainPromise,
    };
}

/**
 * Extract offer context from offer record.
 */
function extractOfferContext(offer: {
    name: string;
    tagline?: string | null;
    price?: number | null;
    features?: any;
    bonuses?: any;
    guarantee?: string | null;
}): OfferContext {
    return {
        name: offer.name,
        tagline: offer.tagline || undefined,
        price: offer.price || 997,
        features: Array.isArray(offer.features)
            ? offer.features
            : ["Complete training program", "Expert guidance", "Proven framework"],
        bonuses: Array.isArray(offer.bonuses) ? offer.bonuses : undefined,
        guarantee: offer.guarantee || undefined,
    };
}

/**
 * Create sequence and messages from AI-generated result.
 */
async function createSequenceFromAIResult(
    userId: string,
    input: GenerateTemplatesInput,
    aiResult: AIGeneratedSequence
): Promise<GenerateTemplatesResult> {
    const supabase = await createClient();

    // Create the sequence
    const { data: sequence, error: sequenceError } = await supabase
        .from("followup_sequences")
        .insert({
            agent_config_id: input.agent_config_id || null,
            name: aiResult.sequence_name,
            description: aiResult.sequence_description,
            sequence_type: "3_day_discount",
            trigger_event: "webinar_end",
            deadline_hours: 72,
            total_messages: aiResult.messages.length,
            requires_manual_approval: false,
            is_automated: true,
            is_active: true,
        })
        .select()
        .single();

    if (sequenceError || !sequence) {
        logger.error({ error: sequenceError }, "❌ Failed to create sequence");
        return {
            success: false,
            error: "Failed to create sequence in database",
        };
    }

    // Create the messages
    const messagesToInsert = aiResult.messages.map((msg) => ({
        sequence_id: sequence.id,
        name: msg.name,
        message_order: msg.message_order,
        channel: msg.channel,
        send_delay_hours: msg.send_delay_hours,
        subject_line: msg.subject_line || null,
        body_content: msg.body_content,
        personalization_rules: buildPersonalizationRules(),
        primary_cta: {
            text: "Take Action",
            url: "{{next_step}}",
            tracking_enabled: true,
        },
        metadata: {
            tone_notes: msg.tone_notes,
            estimated_read_time: msg.estimated_read_time,
            generated_by: "ai",
        },
    }));

    const { data: messages, error: messagesError } = await supabase
        .from("followup_messages")
        .insert(messagesToInsert)
        .select();

    if (messagesError || !messages) {
        logger.error({ error: messagesError }, "❌ Failed to create messages");
        return {
            success: false,
            error: "Failed to create messages in database",
        };
    }

    logger.info(
        { sequenceId: sequence.id, messageCount: messages.length },
        "✅ Sequence and messages created successfully"
    );

    return {
        success: true,
        sequence_id: sequence.id,
        message_ids: messages.map((m) => m.id),
        generation_method: "ai",
    };
}

/**
 * Create sequence using default templates.
 */
async function createDefaultSequence(
    userId: string,
    input: GenerateTemplatesInput
): Promise<GenerateTemplatesResult> {
    const supabase = await createClient();
    const defaultSeq = getDefault3DaySequence();

    logger.info(
        { funnelProjectId: input.funnel_project_id },
        "📝 Using default templates"
    );

    // Create the sequence
    const { data: sequence, error: sequenceError } = await supabase
        .from("followup_sequences")
        .insert({
            agent_config_id: input.agent_config_id || null,
            name: defaultSeq.name,
            description: defaultSeq.description,
            sequence_type: defaultSeq.sequence_type,
            trigger_event: defaultSeq.trigger_event,
            deadline_hours: defaultSeq.deadline_hours,
            total_messages: defaultSeq.total_messages,
            requires_manual_approval: false,
            is_automated: true,
            is_active: true,
        })
        .select()
        .single();

    if (sequenceError || !sequence) {
        logger.error({ error: sequenceError }, "❌ Failed to create default sequence");
        return {
            success: false,
            error: "Failed to create sequence in database",
        };
    }

    // Create the messages
    const messagesToInsert = defaultSeq.messages.map((msg) => ({
        sequence_id: sequence.id,
        name: msg.name,
        message_order: msg.message_order,
        channel: msg.channel,
        send_delay_hours: msg.send_delay_hours,
        subject_line: msg.subject_line || null,
        body_content: msg.body_content,
        personalization_rules: msg.personalization_rules,
        primary_cta: msg.primary_cta,
        metadata: {
            generated_by: "default",
        },
    }));

    const { data: messages, error: messagesError } = await supabase
        .from("followup_messages")
        .insert(messagesToInsert)
        .select();

    if (messagesError || !messages) {
        logger.error({ error: messagesError }, "❌ Failed to create default messages");
        return {
            success: false,
            error: "Failed to create messages in database",
        };
    }

    logger.info(
        { sequenceId: sequence.id, messageCount: messages.length },
        "✅ Default sequence and messages created successfully"
    );

    return {
        success: true,
        sequence_id: sequence.id,
        message_ids: messages.map((m) => m.id),
        generation_method: "default",
    };
}

/**
 * Build standard personalization rules for all segments.
 */
function buildPersonalizationRules() {
    return {
        no_show: {
            tone: "gentle_reminder",
            cta: "watch_replay",
        },
        skimmer: {
            tone: "curiosity_building",
            cta: "key_moments",
        },
        sampler: {
            tone: "value_reinforcement",
            cta: "complete_watch",
        },
        engaged: {
            tone: "conversion_focused",
            cta: "book_call",
        },
        hot: {
            tone: "urgency_driven",
            cta: "claim_offer",
        },
    };
}
