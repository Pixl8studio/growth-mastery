/**
 * Dynamic Message Generation Service
 *
 * Intelligently generates message sequences that adapt to any count (3, 5, 8, 12+)
 * while following config.md specification with segment-based personalization.
 */

import { logger } from "@/lib/logger";
import type { FollowupMessage } from "@/types/followup";
import {
    getOpeningTemplate,
    getValueStoryTemplate,
    getSocialProofTemplate,
    getObjectionTemplate,
    getOfferRecapTemplate,
    getUrgencyTemplate,
    getClosingTemplate,
    getSMSCheckinTemplate,
} from "./message-templates";

export interface GenerationContext {
    count: number;
    deadline_hours: number;
    segments: string[];
    offer?: {
        name: string;
        price: string;
        bonuses?: string;
        guarantee?: string;
    };
    webinar?: {
        title: string;
    };
    company?: {
        name: string;
    };
    sender?: {
        name: string;
    };
}

interface MessagePlan {
    order: number;
    type: string;
    channel: "email" | "sms";
    delay_hours: number;
    position?: "early" | "middle" | "late";
}

/**
 * Calculate timing distribution for messages
 * Messages cluster at start and end, with even spacing in the middle
 */
function calculateMessageTiming(count: number, deadline_hours: number): number[] {
    if (count === 1) return [0];
    if (count === 2) return [0, deadline_hours];

    const timings: number[] = [];

    // Opening message(s) at start
    timings.push(0);

    if (count === 3) {
        // 3 messages: Start, Middle, End
        timings.push(Math.floor(deadline_hours * 0.67));
        timings.push(deadline_hours);
        return timings;
    }

    if (count === 4) {
        // 4 messages: Cluster early, then spread
        timings.push(0); // Second message at 0h (SMS)
        timings.push(Math.floor(deadline_hours * 0.5));
        timings.push(deadline_hours);
        return timings;
    }

    if (count === 5) {
        // 5 messages: Standard 3-day pattern from config.md
        timings.push(0); // Second at 0h (SMS)
        timings.push(Math.floor(deadline_hours * 0.33)); // ~24h
        timings.push(Math.floor(deadline_hours * 0.67)); // ~48h
        timings.push(deadline_hours); // 72h
        return timings;
    }

    // For 6+ messages, use sophisticated distribution
    const gaps = count - 2; // Excluding opening and closing
    const middleHours = deadline_hours;

    // Add second message early (often SMS)
    timings.push(Math.floor(deadline_hours * 0.03)); // ~2h for 72h deadline

    // Distribute remaining messages
    for (let i = 1; i < gaps; i++) {
        const position = i / (gaps - 1);
        // Use power curve for clustering
        const curvedPosition = Math.pow(position, 0.8);
        const delay = Math.floor(middleHours * curvedPosition * 0.9);
        timings.push(delay);
    }

    // Closing message at deadline
    timings.push(deadline_hours);

    // Sort and deduplicate
    const uniqueTimings = Array.from(new Set(timings)).sort((a, b) => a - b);

    return uniqueTimings.slice(0, count);
}

/**
 * Plan message types based on count
 */
function planMessageSequence(count: number, deadline_hours: number): MessagePlan[] {
    const timings = calculateMessageTiming(count, deadline_hours);
    const plans: MessagePlan[] = [];

    if (count === 1) {
        // Single message: Opening only
        plans.push({
            order: 1,
            type: "opening",
            channel: "email",
            delay_hours: 0,
        });
        return plans;
    }

    if (count === 2) {
        // Two messages: Opening and Closing
        plans.push({
            order: 1,
            type: "opening",
            channel: "email",
            delay_hours: timings[0],
        });
        plans.push({
            order: 2,
            type: "closing",
            channel: "email",
            delay_hours: timings[1],
        });
        return plans;
    }

    if (count === 3) {
        // Three messages: Opening, Offer, Closing
        plans.push({
            order: 1,
            type: "opening",
            channel: "email",
            delay_hours: timings[0],
        });
        plans.push({
            order: 2,
            type: "offer_recap",
            channel: "email",
            delay_hours: timings[1],
        });
        plans.push({
            order: 3,
            type: "closing",
            channel: "email",
            delay_hours: timings[2],
        });
        return plans;
    }

    if (count === 4) {
        // Four messages: Opening Email, Opening SMS, Offer, Closing
        plans.push({
            order: 1,
            type: "opening",
            channel: "email",
            delay_hours: timings[0],
        });
        plans.push({
            order: 2,
            type: "sms_checkin",
            channel: "sms",
            delay_hours: timings[1],
            position: "early",
        });
        plans.push({
            order: 3,
            type: "offer_recap",
            channel: "email",
            delay_hours: timings[2],
        });
        plans.push({
            order: 4,
            type: "closing",
            channel: "email",
            delay_hours: timings[3],
        });
        return plans;
    }

    if (count === 5) {
        // Five messages: Standard 3-day from config.md
        plans.push({
            order: 1,
            type: "opening",
            channel: "email",
            delay_hours: timings[0],
        });
        plans.push({
            order: 2,
            type: "sms_checkin",
            channel: "sms",
            delay_hours: timings[1],
            position: "early",
        });
        plans.push({
            order: 3,
            type: "value_story",
            channel: "email",
            delay_hours: timings[2],
        });
        plans.push({
            order: 4,
            type: "offer_recap",
            channel: "email",
            delay_hours: timings[3],
        });
        plans.push({
            order: 5,
            type: "closing",
            channel: "email",
            delay_hours: timings[4],
        });
        return plans;
    }

    // For 6+ messages, fill with full content arc
    const messageTypes = [
        "opening", // Always first
        "sms_checkin", // Early SMS
        "value_story", // Value content
    ];

    // Add middle content based on remaining slots
    const remainingSlots = count - 3; // Opening, early SMS, closing already accounted for

    if (remainingSlots >= 1) messageTypes.push("social_proof");
    if (remainingSlots >= 2) messageTypes.push("objection");
    if (remainingSlots >= 3) messageTypes.push("offer_recap");
    if (remainingSlots >= 4) messageTypes.push("sms_checkin"); // Middle SMS
    if (remainingSlots >= 5) messageTypes.push("value_story"); // Second value story
    if (remainingSlots >= 6) messageTypes.push("urgency");
    if (remainingSlots >= 7) messageTypes.push("sms_checkin"); // Late SMS

    // Fill any remaining with alternating value and social proof
    while (messageTypes.length < count - 1) {
        messageTypes.push(
            messageTypes.length % 2 === 0 ? "value_story" : "social_proof"
        );
    }

    messageTypes.push("closing"); // Always last

    // Trim to exact count
    const finalTypes = messageTypes.slice(0, count);

    // Create plans with timing
    finalTypes.forEach((type, index) => {
        // Determine channel (80% email, 20% SMS)
        const channel = type === "sms_checkin" ? "sms" : "email";

        // Determine SMS position
        let position: "early" | "middle" | "late" | undefined;
        if (type === "sms_checkin") {
            if (index <= 2) position = "early";
            else if (index >= count - 2) position = "late";
            else position = "middle";
        }

        plans.push({
            order: index + 1,
            type,
            channel,
            delay_hours: timings[index] || 0,
            position,
        });
    });

    return plans;
}

/**
 * Generate messages for all target segments
 */
export async function generateDynamicSequence(
    sequenceId: string,
    context: GenerationContext
): Promise<{
    success: boolean;
    messages?: Partial<FollowupMessage>[];
    errors?: string[];
}> {
    logger.info(
        {
            sequenceId,
            count: context.count,
            deadline_hours: context.deadline_hours,
            segments: context.segments,
        },
        "🎨 Generating dynamic message sequence"
    );

    try {
        const messagePlans = planMessageSequence(context.count, context.deadline_hours);

        logger.info(
            {
                sequenceId,
                plans: messagePlans.map((p) => ({
                    order: p.order,
                    type: p.type,
                    channel: p.channel,
                    delay: p.delay_hours,
                })),
            },
            "📋 Message sequence planned"
        );

        const messages: Partial<FollowupMessage>[] = [];

        // Generate messages following the plan
        for (const plan of messagePlans) {
            // Use "sampler" as default segment for generation (will adapt at send time)
            const defaultSegment = "sampler";

            let template;
            switch (plan.type) {
                case "opening":
                    template = getOpeningTemplate(defaultSegment);
                    break;
                case "value_story":
                    template = getValueStoryTemplate(defaultSegment);
                    break;
                case "social_proof":
                    template = getSocialProofTemplate(defaultSegment);
                    break;
                case "objection":
                    template = getObjectionTemplate(defaultSegment);
                    break;
                case "offer_recap":
                    template = getOfferRecapTemplate(defaultSegment);
                    break;
                case "urgency":
                    template = getUrgencyTemplate(defaultSegment);
                    break;
                case "closing":
                    template = getClosingTemplate(defaultSegment);
                    break;
                case "sms_checkin":
                    template = getSMSCheckinTemplate(
                        defaultSegment,
                        plan.position || "middle"
                    );
                    break;
                default:
                    template = getValueStoryTemplate(defaultSegment);
            }

            // Create message name
            const channelEmoji = plan.channel === "email" ? "📧" : "📱";
            const typeName = plan.type
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
            const messageName = `${channelEmoji} ${typeName} (Day ${Math.floor(plan.delay_hours / 24)})`;

            const message: Partial<FollowupMessage> = {
                sequence_id: sequenceId,
                name: messageName,
                message_order: plan.order,
                channel: plan.channel,
                send_delay_hours: plan.delay_hours,
                subject_line: template.subjectLineTemplate || undefined,
                body_content: template.bodyTemplate,
                primary_cta: {
                    text: template.ctaText || "Take Action",
                    url: template.ctaUrl || "{next_step}",
                    tracking_enabled: true,
                },
                personalization_rules: {
                    no_show: { tone: "gentle", cta: "watch_replay" },
                    skimmer: { tone: "curious", cta: "key_moments" },
                    sampler: { tone: "value", cta: "complete_watch" },
                    engaged: { tone: "conversion", cta: "book_call" },
                    hot: { tone: "urgency", cta: "claim_offer" },
                },
                ab_test_variant: null,
                variant_weight: 100,
                metadata: {
                    generated_at: new Date().toISOString(),
                    template_type: plan.type,
                    generation_context: {
                        total_count: context.count,
                        deadline_hours: context.deadline_hours,
                    },
                },
            };

            messages.push(message);
        }

        logger.info(
            {
                sequenceId,
                messagesGenerated: messages.length,
                emailCount: messages.filter((m) => m.channel === "email").length,
                smsCount: messages.filter((m) => m.channel === "sms").length,
            },
            "✅ Dynamic sequence generated successfully"
        );

        return {
            success: true,
            messages,
        };
    } catch (error) {
        logger.error({ error, sequenceId }, "❌ Failed to generate dynamic sequence");
        return {
            success: false,
            errors: [error instanceof Error ? error.message : "Unknown error"],
        };
    }
}

/**
 * Regenerate a single message with fresh content
 */
export async function regenerateSingleMessage(
    messageId: string,
    messageType: string,
    segment: string = "sampler"
): Promise<{
    success: boolean;
    template?: { subject_line?: string; body_content: string };
    error?: string;
}> {
    logger.info({ messageId, messageType, segment }, "🔄 Regenerating single message");

    try {
        let template;
        switch (messageType) {
            case "opening":
                template = getOpeningTemplate(segment);
                break;
            case "value_story":
                template = getValueStoryTemplate(segment);
                break;
            case "social_proof":
                template = getSocialProofTemplate(segment);
                break;
            case "objection":
                template = getObjectionTemplate(segment);
                break;
            case "offer_recap":
                template = getOfferRecapTemplate(segment);
                break;
            case "urgency":
                template = getUrgencyTemplate(segment);
                break;
            case "closing":
                template = getClosingTemplate(segment);
                break;
            case "sms_checkin":
                template = getSMSCheckinTemplate(segment, "middle");
                break;
            default:
                throw new Error(`Unknown message type: ${messageType}`);
        }

        return {
            success: true,
            template: {
                subject_line: template.subjectLineTemplate,
                body_content: template.bodyTemplate,
            },
        };
    } catch (error) {
        logger.error(
            { error, messageId, messageType },
            "❌ Failed to regenerate message"
        );
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
