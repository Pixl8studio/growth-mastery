/**
 * Create Default Sequence API Endpoint
 *
 * Automatically creates a post-webinar follow-up sequence with segment-specific messages
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import {
    createSequence,
    createMessage,
    generateDefaultSequenceMessages,
    getMessageTiming,
} from "@/lib/followup/sequence-service";

/**
 * POST /api/followup/sequences/create-default
 *
 * Create default post-webinar sequence with 5 segment-specific messages
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const body = await request.json();

        // Validate required fields
        if (!body.agent_config_id) {
            throw new ValidationError("agent_config_id is required");
        }

        // Verify ownership of agent config
        const { data: agentConfig } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", body.agent_config_id)
            .single();

        if (!agentConfig || agentConfig.user_id !== user.id) {
            throw new AuthenticationError("Access denied to agent config");
        }

        // Create the sequence
        const sequenceResult = await createSequence(body.agent_config_id, {
            name: "Post-Webinar Follow-Up Sequence",
            description: "Automated follow-up sequence for webinar attendees",
            sequence_type: "3_day_discount",
            trigger_event: "webinar_end",
            trigger_delay_hours: 0,
            deadline_hours: 72,
            total_messages: 5,
            target_segments: ["no_show", "skimmer", "sampler", "engaged", "hot"],
        });

        if (!sequenceResult.success) {
            throw new Error(sequenceResult.error || "Failed to create sequence");
        }

        const sequenceId = sequenceResult.sequence!.id;

        // Generate messages for each segment
        const messages = generateDefaultSequenceMessages(
            body.offer_data || null,
            body.intake_data || null
        );
        const segments = ["no_show", "skimmer", "sampler", "engaged", "hot"] as const;

        // Create messages for each segment
        const createdMessages = [];
        for (const segment of segments) {
            const messageContent = messages[segment];
            const timings = getMessageTiming(segment);

            const messageResult = await createMessage(sequenceId, {
                name: `${segment.charAt(0).toUpperCase() + segment.slice(1)} Message`,
                message_order: 1,
                channel: "email",
                send_delay_hours: timings[0] || 24,
                subject_line: messageContent.subject,
                body_content: messageContent.body,
                personalization_rules: {
                    [segment]: {
                        tone:
                            segment === "hot"
                                ? "urgency_driven"
                                : segment === "engaged"
                                  ? "conversion_focused"
                                  : segment === "sampler"
                                    ? "value_reinforcement"
                                    : segment === "skimmer"
                                      ? "curiosity_building"
                                      : "gentle_reminder",
                        cta:
                            segment === "hot" || segment === "engaged"
                                ? "book_call"
                                : segment === "sampler"
                                  ? "complete_watch"
                                  : "watch_replay",
                    },
                },
                primary_cta: {
                    text:
                        segment === "hot" || segment === "engaged"
                            ? "Book Your Call"
                            : segment === "sampler"
                              ? "Complete Training"
                              : "Watch Replay",
                    url: "{replay_link}",
                    tracking_enabled: true,
                },
            });

            if (messageResult.success) {
                createdMessages.push(messageResult.message);
            }
        }

        logger.info(
            {
                sequenceId,
                messageCount: createdMessages.length,
                userId: user.id,
            },
            "✅ Default sequence created with segment messages"
        );

        return NextResponse.json({
            success: true,
            sequence: sequenceResult.sequence,
            messages: createdMessages,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error creating default sequence");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
