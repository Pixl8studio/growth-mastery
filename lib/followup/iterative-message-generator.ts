/**
 * Iterative Message Generator
 *
 * Generates follow-up messages one at a time, using previously generated
 * messages as context for better coherence and robustness.
 */

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import type { DeckContext, OfferContext } from "@/lib/ai/prompts";
import { createMessage } from "./sequence-service";

interface GeneratedMessage {
    name: string;
    message_order: number;
    channel: "email" | "sms";
    send_delay_hours: number;
    subject_line?: string;
    body_content: string;
}

/**
 * Generate a single message with context from previous messages.
 *
 * Uses previous messages to maintain narrative coherence and avoid repetition.
 */
export async function generateSingleMessage(
    sequenceId: string,
    messageOrder: number,
    deckContext: DeckContext,
    offerContext: OfferContext,
    previousMessages: GeneratedMessage[]
): Promise<{ success: boolean; message_id?: string; error?: string }> {
    logger.info(
        {
            sequenceId,
            messageOrder,
            previousCount: previousMessages.length,
        },
        "🎨 Generating single message"
    );

    try {
        // Build context-aware prompt
        const prompt = buildMessagePrompt(
            messageOrder,
            deckContext,
            offerContext,
            previousMessages
        );

        // Generate with AI (JSON response format)
        const aiResponse = await generateWithAI<{
            subject_line?: string;
            body_content: string;
        }>(
            [
                {
                    role: "system",
                    content: prompt.system,
                },
                {
                    role: "user",
                    content: prompt.user,
                },
            ],
            {
                model: "gpt-4o",
                temperature: 0.7,
                maxTokens: 1500,
            }
        );

        // Convert AI response to message data
        const messageData = convertToMessageData(aiResponse, messageOrder);

        // Save to database
        const result = await createMessage(sequenceId, {
            name: messageData.name,
            message_order: messageData.message_order,
            channel: messageData.channel,
            send_delay_hours: messageData.send_delay_hours,
            subject_line: messageData.subject_line,
            body_content: messageData.body_content,
            primary_cta: {
                text: "Take Action",
                url: "{{next_step}}",
                tracking_enabled: true,
            },
        });

        if (!result.success) {
            throw new Error(result.error || "Failed to save message");
        }

        logger.info(
            { sequenceId, messageOrder, messageId: result.message?.id },
            "✅ Message generated and saved"
        );

        return {
            success: true,
            message_id: result.message?.id,
        };
    } catch (error) {
        logger.error(
            { error, sequenceId, messageOrder },
            "❌ Failed to generate message"
        );

        Sentry.captureException(error, {
            tags: {
                service: "message-generator",
                operation: "generate_single_message",
            },
            extra: {
                sequenceId,
                messageOrder,
                previousMessageCount: previousMessages.length,
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Build prompt for a specific message in sequence.
 */
function buildMessagePrompt(
    messageOrder: number,
    deckContext: DeckContext,
    offerContext: OfferContext,
    previousMessages: GeneratedMessage[]
): { system: string; user: string } {
    const messageSpecs = [
        {
            order: 1,
            name: "Day 0 - Thank You Email",
            channel: "email",
            delay: 0,
            focus: "Thank you + value echo + open conversation",
            length: "150-200 words",
        },
        {
            order: 2,
            name: "Day 0 - SMS Check-in",
            channel: "sms",
            delay: 0,
            focus: "Short, friendly micro-ask",
            length: "Under 160 characters",
        },
        {
            order: 3,
            name: "Day 1 - Story + Value",
            channel: "email",
            delay: 24,
            focus: "Micro-story that reframes objection + clear CTA",
            length: "180-250 words with 120-word story",
        },
        {
            order: 4,
            name: "Day 2 - Offer Recap",
            channel: "email",
            delay: 48,
            focus: "Offer breakdown + bonuses + deadline (T-1)",
            length: "150-200 words",
        },
        {
            order: 5,
            name: "Day 3 - Final Call",
            channel: "email",
            delay: 72,
            focus: "Mission + urgency + final CTA",
            length: "150-180 words",
        },
    ];

    const spec = messageSpecs.find((s) => s.order === messageOrder) || messageSpecs[0];

    const system = `You are an expert email copywriter creating personalized follow-up messages for post-webinar engagement.

Write a single ${spec.channel} message that is professional, personal, and conversion-focused.

CRITICAL RULES:
1. Use these tokens for personalization: {{first_name}}, {{watch_pct}}, {{minutes_watched}}, {{challenge_notes}}, {{goal_notes}}, {{replay_link}}, {{checkout_url}}, {{book_call_url}}, {{timezone}}

2. First line MUST mirror prospect's language from {{challenge_notes}}

3. Write naturally - sound like a real person helping another real person

4. ${spec.channel === "email" ? "Include a subject line" : "Keep under 160 characters"}

5. Target length: ${spec.length}

6. Focus: ${spec.focus}

${previousMessages.length > 0 ? `7. Build on previous messages - don't repeat what you already said. Reference earlier touchpoints naturally.` : ""}`;

    let previousContext = "";
    if (previousMessages.length > 0) {
        previousContext = `\n\nPREVIOUS MESSAGES IN THIS SEQUENCE:\n${previousMessages.map((m, i) => `\nMessage ${i + 1} (${m.channel}):\nSubject: ${m.subject_line || "N/A"}\nBody: ${m.body_content.substring(0, 200)}...`).join("\n")}`;
    }

    const user = `Create ${spec.name} for this webinar and offer:

WEBINAR: ${deckContext.title}
Main Promise: ${deckContext.mainPromise}
Key Points: ${deckContext.keyPoints.slice(0, 3).join(", ")}
Pain Points: ${deckContext.painPoints.slice(0, 2).join(", ")}

OFFER: ${offerContext.name}
Price: $${offerContext.price}
Features: ${offerContext.features.slice(0, 3).join(", ")}${offerContext.bonuses ? `\nBonuses: ${offerContext.bonuses.slice(0, 2).join(", ")}` : ""}${previousContext}

Return ONLY a JSON object:
{
  "subject_line": "${spec.channel === "email" ? "Subject with {{tokens}}" : ""}",
  "body_content": "Message body with {{tokens}} and natural, conversational language"
}

Remember: This is message ${messageOrder} of 5 in a 3-day sequence. ${previousMessages.length > 0 ? "Build naturally on what came before." : "Set the tone for what follows."}`;

    return { system, user };
}

/**
 * Convert AI JSON response into message data.
 */
function convertToMessageData(
    aiResponse: { subject_line?: string; body_content: string },
    messageOrder: number
): GeneratedMessage {
    const messageSpecs = [
        {
            order: 1,
            name: "Day 0 - Thank You Email",
            channel: "email" as const,
            delay: 0,
        },
        { order: 2, name: "Day 0 - SMS Check-in", channel: "sms" as const, delay: 0 },
        {
            order: 3,
            name: "Day 1 - Story + Value",
            channel: "email" as const,
            delay: 24,
        },
        { order: 4, name: "Day 2 - Offer Recap", channel: "email" as const, delay: 48 },
        { order: 5, name: "Day 3 - Final Call", channel: "email" as const, delay: 72 },
    ];

    const spec = messageSpecs.find((s) => s.order === messageOrder) || messageSpecs[0];

    return {
        name: spec.name,
        message_order: messageOrder,
        channel: spec.channel,
        send_delay_hours: spec.delay,
        subject_line: spec.channel === "email" ? aiResponse.subject_line : undefined,
        body_content: aiResponse.body_content,
    };
}

/**
 * Generate all 5 messages iteratively for a sequence.
 *
 * More robust than generating all at once - failures are isolated,
 * and each message has context from previous ones.
 */
export async function generateAllMessages(
    sequenceId: string,
    deckContext: DeckContext,
    offerContext: OfferContext,
    onProgress?: (progress: number, message: string) => void
): Promise<{
    success: boolean;
    messages_generated: number;
    message_ids: string[];
    errors: string[];
}> {
    logger.info({ sequenceId }, "🚀 Starting iterative message generation");

    const messageIds: string[] = [];
    const errors: string[] = [];
    const generatedMessages: GeneratedMessage[] = [];

    for (let i = 1; i <= 5; i++) {
        if (onProgress) {
            onProgress(((i - 1) / 5) * 100, `Generating message ${i} of 5...`);
        }

        const result = await generateSingleMessage(
            sequenceId,
            i,
            deckContext,
            offerContext,
            generatedMessages
        );

        if (result.success && result.message_id) {
            messageIds.push(result.message_id);

            // Fetch the generated message to use as context for next one
            const supabase = await createClient();
            const { data: msg } = await supabase
                .from("followup_messages")
                .select("*")
                .eq("id", result.message_id)
                .single();

            if (msg) {
                generatedMessages.push({
                    name: msg.name,
                    message_order: msg.message_order,
                    channel: msg.channel,
                    send_delay_hours: msg.send_delay_hours,
                    subject_line: msg.subject_line || undefined,
                    body_content: msg.body_content,
                });
            }
        } else {
            errors.push(`Message ${i}: ${result.error || "Unknown error"}`);
            logger.error(
                { messageOrder: i, error: result.error },
                "Message generation failed"
            );
            // Continue to next message instead of stopping
        }
    }

    if (onProgress) {
        onProgress(100, "Complete!");
    }

    logger.info(
        {
            sequenceId,
            messagesGenerated: messageIds.length,
            totalAttempted: 5,
            errors: errors.length,
        },
        "✅ Iterative generation complete"
    );

    return {
        success: messageIds.length > 0, // Success if at least 1 message generated
        messages_generated: messageIds.length,
        message_ids: messageIds,
        errors,
    };
}
