/**
 * Follow-Up Sequence Service
 * Generates default sequences and messages for post-webinar follow-up automation
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface SequenceInput {
    name: string;
    description?: string;
    sequence_type?: string;
    trigger_event: string;
    trigger_delay_hours?: number;
    deadline_hours?: number;
    total_messages?: number;
    target_segments?: string[];
    requires_manual_approval?: boolean;
    is_automated?: boolean;
    is_active?: boolean;
}

interface OfferData {
    name: string;
    tagline?: string | null;
    promise?: string | null;
    price?: number;
    currency?: string;
}

interface IntakeData {
    targetAudience?: string;
    desiredOutcome?: string;
    mainProblem?: string;
}

/**
 * Generate default post-webinar follow-up sequence with 5 segment-specific messages
 */
export function generateDefaultSequenceMessages(
    offerData: OfferData | null,
    intakeData: IntakeData | null
) {
    const offerName = offerData?.name || "this program";
    const outcome = intakeData?.desiredOutcome || "transform your business";
    const audience = intakeData?.targetAudience || "business owner";

    return {
        no_show: {
            subject: "You missed it! Here's your replay link",
            body: `Hey {first_name},

I noticed you registered for the training but weren't able to attend - no worries, life happens!

The good news? The replay is ready for you to watch on your own schedule.

In just 60 minutes, you'll discover exactly how to ${outcome.toLowerCase()}.

👉 Watch the replay here: {replay_link}

This training is specifically designed for ${audience.toLowerCase()}s like you who want to break through to the next level.

Don't let this opportunity slip away - the replay won't be available forever.

To your success,
{sender_name}

P.S. The best time to start is now. Click the replay link and watch the first 15 minutes - I think you'll be hooked!`,
        },
        skimmer: {
            subject: "Quick question about the training...",
            body: `Hi {first_name},

I saw you started watching the training (thanks for joining!), but it looks like you had to step away around the {minutes}-minute mark.

Here's what you missed in the second half:

🎯 The exact framework for ${outcome.toLowerCase()}
⚡ The #1 mistake that keeps ${audience.toLowerCase()}s stuck
🚀 How to implement this starting TODAY

The good news? You can pick up right where you left off:

👉 Continue watching: {replay_link}

The breakthrough moments happen in the final 30 minutes - that's where I share the step-by-step system you can start using immediately.

Worth finishing?

Best,
{sender_name}

P.S. The most powerful part of ${offerName} is revealed at the 40-minute mark. Don't miss it!`,
        },
        sampler: {
            subject: "Ready to take the next step?",
            body: `Hey {first_name},

Thanks for watching most of the training! I could see you made it through the key frameworks - awesome.

Based on where you are, I'm guessing you're thinking: "This makes sense... but how do I actually DO this?"

That's exactly what ${offerName} is for.

It's the complete implementation system that takes you from understanding to RESULTS.

Here's what happens when you join:

✅ You get the complete ${outcome.toLowerCase()} framework
✅ Step-by-step implementation guidance
✅ Real examples you can model
${offerData?.promise ? `✅ ${offerData.promise}` : ""}

Ready to go deeper?

👉 Learn more: {offer_link}

This is specifically designed for ${audience.toLowerCase()}s who are ready to move fast and get results.

Let me know if you have any questions!

{sender_name}`,
        },
        engaged: {
            subject: "Let's make this happen for you",
            body: `Hi {first_name},

I'm excited that you watched the full training!

You clearly see the potential here - you invested the time to go through everything, which tells me you're serious about ${outcome.toLowerCase()}.

The question now is: what's next?

${offerName} gives you everything you need to implement what you learned:

🎯 Complete system and frameworks
⚡ Implementation templates
🚀 Ongoing support and guidance
${offerData?.promise ? `💡 ${offerData.promise}` : ""}

I've helped hundreds of ${audience.toLowerCase()}s get results with this exact approach.

Want to be next?

👉 Let's talk: {booking_link}

Book a quick 15-minute call and we'll map out your path forward. No pressure, just clarity on whether this is right for you.

Looking forward to it,
{sender_name}

P.S. Spots are limited because I want to give everyone proper attention. Book now to secure your time.`,
        },
        hot: {
            subject: "🔥 Your exclusive access (limited time)",
            body: `{first_name},

You watched the ENTIRE training AND clicked to learn more about ${offerName}.

That tells me you're ready.

Here's the thing: I'm only taking on a limited number of new ${audience.toLowerCase()}s this month to ensure everyone gets proper support.

And based on your engagement, I'm holding a spot for you.

But I need to hear from you in the next 48 hours.

Here's what you get when you join:

✅ Complete ${offerName} program
✅ All implementation frameworks and templates
✅ Direct access for questions and support
${offerData?.promise ? `✅ ${offerData.promise}` : ""}
${offerData?.price ? `\n💰 Investment: ${offerData.currency || "USD"} ${offerData.price}` : ""}

This is everything you need to ${outcome.toLowerCase()}.

👉 Claim your spot: {offer_link}

Or if you want to discuss your specific situation first:
👉 Book a call: {booking_link}

I'll be checking responses personally, so hit reply if you have any questions.

Let's do this,
{sender_name}

P.S. I'm serious about the 48-hour window. After that, your spot goes to the next person on the waitlist.`,
        },
    };
}

/**
 * Get message timing for 3-day sequence (in hours from webinar end)
 */
export function getMessageTiming(segment: string) {
    const timings = {
        no_show: [24, 48], // Day 1, Day 2
        skimmer: [12, 24, 48], // 12hrs, Day 1, Day 2
        sampler: [6, 24, 48, 60], // 6hrs, Day 1, Day 2, 2.5 days
        engaged: [3, 12, 24, 48, 72], // 3hrs, 12hrs, Day 1, Day 2, Day 3
        hot: [1, 6, 24, 36, 48], // 1hr, 6hrs, Day 1, 1.5 days, Day 2
    };

    return timings[segment as keyof typeof timings] || [24, 48, 72];
}

/**
 * Generate objection handling templates
 */
export function generateObjectionTemplates() {
    return {
        price: {
            title: "Price Concern",
            reframe:
                "I totally understand - this is an investment. Let me put it in perspective...",
            stories: [
                {
                    title: "ROI Focus",
                    content:
                        "One client was hesitant about the price, but after implementing just ONE strategy from the program, they generated an extra $15K in revenue. The program paid for itself 10x over.",
                },
                {
                    title: "Cost of Inaction",
                    content:
                        "The real question isn't 'Can I afford this?' - it's 'Can I afford to keep doing what I'm doing?' How much is staying stuck costing you?",
                },
            ],
        },
        timing: {
            title: "Timing Concern",
            reframe:
                "I hear you - timing is important. But here's what I've learned...",
            stories: [
                {
                    title: "Perfect Time Myth",
                    content:
                        "There's never a 'perfect' time. The clients who get the best results are the ones who start now and figure it out as they go. We'll support you every step.",
                },
                {
                    title: "Early Action Bonus",
                    content:
                        "The sooner you start, the sooner you see results. Every week you wait is a week of lost progress and potential revenue.",
                },
            ],
        },
        trust: {
            title: "Trust / Credibility",
            reframe: "I appreciate healthy skepticism! Let me share some proof...",
            stories: [
                {
                    title: "Social Proof",
                    content:
                        "We've helped over 500 clients get results with this exact system. Check out these testimonials from people just like you...",
                },
                {
                    title: "Guarantee",
                    content:
                        "Plus, you're protected by our guarantee - if you implement the system and don't see results, we'll refund every penny. All the upside, none of the risk.",
                },
            ],
        },
        need: {
            title: "Need Justification",
            reframe: "Fair question - let me explain why this matters for you...",
            stories: [
                {
                    title: "Gap Analysis",
                    content:
                        "You mentioned you want to [desired outcome]. To get there from where you are now, you need [specific thing program provides]. Without it, you'll stay stuck.",
                },
                {
                    title: "Unique Method",
                    content:
                        "This isn't just information - it's a proven system you can't find anywhere else. We've spent years refining this specifically for [target audience].",
                },
            ],
        },
    };
}

/**
 * Create a new follow-up sequence in the database
 */
export async function createSequence(agentConfigId: string, input: SequenceInput) {
    try {
        const supabase = await createClient();

        const { data: sequence, error } = await supabase
            .from("followup_sequences")
            .insert({
                agent_config_id: agentConfigId,
                name: input.name,
                description: input.description,
                sequence_type: input.sequence_type || "3_day_discount",
                trigger_event: input.trigger_event,
                trigger_delay_hours: input.trigger_delay_hours || 0,
                deadline_hours: input.deadline_hours || 72,
                total_messages: input.total_messages || 5,
                target_segments: input.target_segments || [
                    "no_show",
                    "skimmer",
                    "sampler",
                    "engaged",
                    "hot",
                ],
                requires_manual_approval: input.requires_manual_approval ?? true,
                is_active: true,
            })
            .select()
            .single();

        if (error) {
            logger.error({ error, agentConfigId }, "Failed to create sequence");
            return { success: false, error: error.message };
        }

        logger.info({ sequenceId: sequence.id, agentConfigId }, "Sequence created");
        return { success: true, sequence };
    } catch (error) {
        logger.error({ error }, "Exception creating sequence");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * List all sequences for an agent config
 */
export async function listSequences(agentConfigId: string) {
    try {
        const supabase = await createClient();

        const { data: sequences, error } = await supabase
            .from("followup_sequences")
            .select("*")
            .eq("agent_config_id", agentConfigId)
            .order("created_at", { ascending: false });

        if (error) {
            logger.error({ error, agentConfigId }, "Failed to list sequences");
            return { success: false, error: error.message };
        }

        return { success: true, sequences };
    } catch (error) {
        logger.error({ error }, "Exception listing sequences");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get a single sequence by ID
 */
export async function getSequence(sequenceId: string) {
    try {
        const supabase = await createClient();

        const { data: sequence, error } = await supabase
            .from("followup_sequences")
            .select("*")
            .eq("id", sequenceId)
            .single();

        if (error) {
            logger.error({ error, sequenceId }, "Failed to get sequence");
            return { success: false, error: error.message };
        }

        return { success: true, sequence };
    } catch (error) {
        logger.error({ error }, "Exception getting sequence");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Update an existing sequence
 */
export async function updateSequence(
    sequenceId: string,
    updates: Partial<SequenceInput>
) {
    try {
        const supabase = await createClient();

        const { data: sequence, error } = await supabase
            .from("followup_sequences")
            .update(updates)
            .eq("id", sequenceId)
            .select()
            .single();

        if (error) {
            logger.error({ error, sequenceId }, "Failed to update sequence");
            return { success: false, error: error.message };
        }

        logger.info({ sequenceId }, "Sequence updated");
        return { success: true, sequence };
    } catch (error) {
        logger.error({ error }, "Exception updating sequence");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Delete a sequence
 */
export async function deleteSequence(sequenceId: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("followup_sequences")
            .delete()
            .eq("id", sequenceId);

        if (error) {
            logger.error({ error, sequenceId }, "Failed to delete sequence");
            return { success: false, error: error.message };
        }

        logger.info({ sequenceId }, "Sequence deleted");
        return { success: true };
    } catch (error) {
        logger.error({ error }, "Exception deleting sequence");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Create a new message template
 */
export async function createMessage(sequenceId: string, messageData: any) {
    try {
        const supabase = await createClient();

        const { data: message, error } = await supabase
            .from("followup_messages")
            .insert({
                sequence_id: sequenceId,
                ...messageData,
            })
            .select()
            .single();

        if (error) {
            logger.error({ error, sequenceId }, "Failed to create message");
            return { success: false, error: error.message };
        }

        logger.info({ messageId: message.id, sequenceId }, "Message created");
        return { success: true, message };
    } catch (error) {
        logger.error({ error }, "Exception creating message");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get a single message by ID
 */
export async function getMessage(messageId: string) {
    try {
        const supabase = await createClient();

        const { data: message, error } = await supabase
            .from("followup_messages")
            .select("*")
            .eq("id", messageId)
            .single();

        if (error) {
            logger.error({ error, messageId }, "Failed to get message");
            return { success: false, error: error.message };
        }

        return { success: true, message };
    } catch (error) {
        logger.error({ error }, "Exception getting message");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * List all messages for a sequence
 */
export async function listMessages(sequenceId: string) {
    try {
        const supabase = await createClient();

        const { data: messages, error } = await supabase
            .from("followup_messages")
            .select("*")
            .eq("sequence_id", sequenceId)
            .order("message_order", { ascending: true });

        if (error) {
            logger.error({ error, sequenceId }, "Failed to list messages");
            return { success: false, error: error.message };
        }

        return { success: true, messages };
    } catch (error) {
        logger.error({ error }, "Exception listing messages");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Update an existing message
 */
export async function updateMessage(messageId: string, updates: any) {
    try {
        const supabase = await createClient();

        const { data: message, error } = await supabase
            .from("followup_messages")
            .update(updates)
            .eq("id", messageId)
            .select()
            .single();

        if (error) {
            logger.error({ error, messageId }, "Failed to update message");
            return { success: false, error: error.message };
        }

        logger.info({ messageId }, "Message updated");
        return { success: true, message };
    } catch (error) {
        logger.error({ error }, "Exception updating message");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("followup_messages")
            .delete()
            .eq("id", messageId);

        if (error) {
            logger.error({ error, messageId }, "Failed to delete message");
            return { success: false, error: error.message };
        }

        logger.info({ messageId }, "Message deleted");
        return { success: true };
    } catch (error) {
        logger.error({ error }, "Exception deleting message");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
