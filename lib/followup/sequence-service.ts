/**
 * Follow-Up Sequence Service
 * Generates default sequences and messages for post-webinar follow-up automation
 */

import * as Sentry from "@sentry/nextjs";
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

            Sentry.captureException(error, {
                tags: {
                    service: "sequence",
                    operation: "create_sequence",
                },
                extra: {
                    agentConfigId,
                    sequenceName: input.name,
                },
            });

            return { success: false, error: error.message };
        }

        logger.info({ sequenceId: sequence.id, agentConfigId }, "Sequence created");
        return { success: true, sequence };
    } catch (error) {
        logger.error({ error }, "Exception creating sequence");

        Sentry.captureException(error, {
            tags: {
                service: "sequence",
                operation: "create_sequence",
            },
            extra: {
                agentConfigId,
                sequenceName: input.name,
            },
        });

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

/**
 * Create 3 default sequences with pre-built templates.
 *
 * Auto-creates sequences on agent activation:
 * 1. Post-Webinar Follow-Up (3-day deadline)
 * 2. Reactivation Sequence
 * 3. Abandoned Registration Sequence
 */
export async function createDefaultSequences(
    agentConfigId: string,
    offerId?: string
): Promise<{
    success: boolean;
    sequences?: any[];
    message_count?: number;
    error?: string;
}> {
    logger.info({ agentConfigId, offerId }, "📋 Creating default sequences");

    try {
        const supabase = await createClient();

        // Fetch offer and intake data for personalization
        let offerData: OfferData | null = null;
        let intakeData: IntakeData | null = null;

        if (offerId) {
            const { data: offer } = await supabase
                .from("offers")
                .select("name, tagline, promise, price, currency")
                .eq("id", offerId)
                .single();

            if (offer) {
                offerData = offer;
            }
        }

        // Get funnel project ID from agent config
        const { data: config } = await supabase
            .from("followup_agent_configs")
            .select("funnel_project_id")
            .eq("id", agentConfigId)
            .single();

        if (config?.funnel_project_id) {
            const { data: project } = await supabase
                .from("funnel_projects")
                .select("target_audience, desired_outcome, main_problem")
                .eq("id", config.funnel_project_id)
                .single();

            if (project) {
                intakeData = {
                    targetAudience: project.target_audience,
                    desiredOutcome: project.desired_outcome,
                    mainProblem: project.main_problem,
                };
            }
        }

        const messageTemplates = generateDefaultSequenceMessages(offerData, intakeData);
        const createdSequences: any[] = [];
        let totalMessages = 0;

        // 1. Post-Webinar Follow-Up Sequence (3-day discount)
        const postWebinarResult = await createSequence(agentConfigId, {
            name: "Post-Webinar Follow-Up (3-Day Offer)",
            description:
                "Automated follow-up sequence after webinar ends. Segments prospects by engagement and delivers tailored messaging over 72 hours with deadline urgency.",
            sequence_type: "3_day_discount",
            trigger_event: "webinar_end",
            trigger_delay_hours: 0,
            deadline_hours: 72,
            total_messages: 5,
            target_segments: ["no_show", "skimmer", "sampler", "engaged", "hot"],
            requires_manual_approval: true,
            is_automated: false,
        });

        if (postWebinarResult.success && postWebinarResult.sequence) {
            createdSequences.push(postWebinarResult.sequence);

            // Create segment-specific messages
            const segments: Array<
                "no_show" | "skimmer" | "sampler" | "engaged" | "hot"
            > = ["no_show", "skimmer", "sampler", "engaged", "hot"];

            for (const segment of segments) {
                const template = messageTemplates[segment];
                const timings = getMessageTiming(segment);

                for (let i = 0; i < timings.length; i++) {
                    const messageResult = await createMessage(
                        postWebinarResult.sequence.id,
                        {
                            name: `Message ${i + 1} - ${segment}`,
                            message_order: i + 1,
                            channel: "email",
                            send_delay_hours: timings[i],
                            subject_line: template.subject,
                            body_content: template.body,
                            personalization_rules: {
                                [segment]: {
                                    tone:
                                        segment === "hot"
                                            ? "urgency_driven"
                                            : "conversion_focused",
                                    cta:
                                        segment === "no_show"
                                            ? "watch_replay"
                                            : "claim_offer",
                                },
                            },
                            primary_cta: {
                                text:
                                    segment === "no_show"
                                        ? "Watch Replay"
                                        : "Get Started",
                                url: "{offer_link}",
                                tracking_enabled: true,
                            },
                        }
                    );

                    if (messageResult.success) {
                        totalMessages++;
                    }
                }
            }
        }

        // 2. Reactivation Sequence
        const reactivationResult = await createSequence(agentConfigId, {
            name: "Reactivation Sequence",
            description:
                "Re-engages prospects who haven't interacted in 7+ days. Gentle reminder of value with FOMO elements.",
            sequence_type: "reengagement",
            trigger_event: "no_engagement_7_days",
            trigger_delay_hours: 168, // 7 days
            deadline_hours: 120, // 5 days
            total_messages: 3,
            target_segments: ["skimmer", "sampler", "engaged"],
            requires_manual_approval: true,
            is_automated: false,
        });

        if (reactivationResult.success && reactivationResult.sequence) {
            createdSequences.push(reactivationResult.sequence);

            const reactivationMessages = [
                {
                    order: 1,
                    delay: 0,
                    subject: "Quick check-in...",
                    body: `Hey {first_name},

I noticed you watched the training but haven't taken the next step yet.

Just checking in - do you have any questions about ${offerData?.name || "the program"}?

Sometimes people hesitate because they're not sure if it's right for them, or they need clarity on implementation.

That's totally normal. Happy to jump on a quick call to discuss your specific situation.

No pressure - just want to make sure you have what you need to make an informed decision.

👉 Book a 15-min clarity call: {booking_link}

Best,
{sender_name}`,
                },
                {
                    order: 2,
                    delay: 48,
                    subject: "Don't let this opportunity slip away",
                    body: `{first_name},

I haven't heard back from you, so I wanted to reach out one more time.

The training showed you WHAT to do.

${offerData?.name || "The program"} shows you exactly HOW to do it.

And right now, you're in a unique position - you have the knowledge and the opportunity to act on it.

But windows close. Momentum fades. Life gets in the way.

If you're serious about ${intakeData?.desiredOutcome || "getting results"}, now is the time.

👉 Let's make this happen: {offer_link}

{sender_name}

P.S. Still not sure? Hit reply with your biggest question or concern. I'll respond personally.`,
                },
                {
                    order: 3,
                    delay: 120,
                    subject: "Final reminder (then I'll stop bugging you! 😊)",
                    body: `Hi {first_name},

This is my last message - I promise!

I genuinely believe ${offerData?.name || "this program"} can help you, but I also respect that timing might not be right.

So here's my final offer:

If you want to move forward, I'm here. The door is open.

If not, no worries at all. I hope the training gave you valuable insights you can apply.

Either way, I wish you all the success in ${intakeData?.desiredOutcome || "reaching your goals"}.

👉 Ready to join? {offer_link}

All the best,
{sender_name}`,
                },
            ];

            for (const msg of reactivationMessages) {
                const messageResult = await createMessage(
                    reactivationResult.sequence.id,
                    {
                        name: `Reactivation ${msg.order}`,
                        message_order: msg.order,
                        channel: "email",
                        send_delay_hours: msg.delay,
                        subject_line: msg.subject,
                        body_content: msg.body,
                        primary_cta: {
                            text: "Take Action",
                            url: "{offer_link}",
                            tracking_enabled: true,
                        },
                    }
                );

                if (messageResult.success) {
                    totalMessages++;
                }
            }
        }

        // 3. Abandoned Registration Sequence
        const abandonedResult = await createSequence(agentConfigId, {
            name: "Abandoned Registration",
            description:
                "Follows up with registrants who started but didn't complete registration. Gentle reminder over 24 hours.",
            sequence_type: "nurture",
            trigger_event: "registration_incomplete",
            trigger_delay_hours: 2,
            deadline_hours: 24,
            total_messages: 2,
            target_segments: ["no_show"],
            requires_manual_approval: true,
            is_automated: false,
        });

        if (abandonedResult.success && abandonedResult.sequence) {
            createdSequences.push(abandonedResult.sequence);

            const abandonedMessages = [
                {
                    order: 1,
                    delay: 2,
                    subject: "Finish your registration?",
                    body: `Hi {first_name},

I noticed you started registering for the training but didn't quite finish.

No worries - it happens! Maybe you got distracted or needed to check your calendar.

The training is coming up soon, and I don't want you to miss out.

It only takes 30 seconds to complete your registration:

👉 Finish registering: {registration_link}

Looking forward to seeing you there!

{sender_name}`,
                },
                {
                    order: 2,
                    delay: 24,
                    subject: "Last chance to join the training",
                    body: `{first_name},

The training starts soon and spots are filling up fast.

You showed interest by starting registration - don't let this opportunity pass you by.

In just 60 minutes, you'll learn:

✅ How to ${intakeData?.desiredOutcome || "achieve your goals"}
✅ The biggest mistakes to avoid
✅ A proven step-by-step framework

This is specifically for ${intakeData?.targetAudience || "people like you"}.

👉 Secure your spot now: {registration_link}

See you soon!
{sender_name}

P.S. If you can't make it live, register anyway and I'll send you the replay.`,
                },
            ];

            for (const msg of abandonedMessages) {
                const messageResult = await createMessage(abandonedResult.sequence.id, {
                    name: `Abandoned Registration ${msg.order}`,
                    message_order: msg.order,
                    channel: "email",
                    send_delay_hours: msg.delay,
                    subject_line: msg.subject,
                    body_content: msg.body,
                    primary_cta: {
                        text: "Complete Registration",
                        url: "{registration_link}",
                        tracking_enabled: true,
                    },
                });

                if (messageResult.success) {
                    totalMessages++;
                }
            }
        }

        logger.info(
            {
                agentConfigId,
                sequenceCount: createdSequences.length,
                messageCount: totalMessages,
            },
            "✅ Default sequences created successfully"
        );

        return {
            success: true,
            sequences: createdSequences,
            message_count: totalMessages,
        };
    } catch (error) {
        logger.error({ error, agentConfigId }, "❌ Error creating default sequences");

        Sentry.captureException(error, {
            tags: {
                service: "sequence",
                operation: "create_default_sequences",
            },
            extra: {
                agentConfigId,
                offerId,
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
