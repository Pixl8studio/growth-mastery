/**
 * Generate Messages for Sequence API
 *
 * Generates AI-powered messages iteratively for an existing sequence.
 * More robust than batch generation - failures are isolated per message.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, NotFoundError } from "@/lib/errors";
import type { DeckContext, OfferContext } from "@/lib/ai/prompts";

type RouteContext = {
    params: Promise<{ sequenceId: string }>;
};

/**
 * POST /api/followup/sequences/[sequenceId]/generate-messages
 *
 * Generate messages for an existing sequence.
 */
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();

        // Authenticate
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { sequenceId } = await context.params;

        // Get sequence and verify ownership
        const { data: sequence } = await supabase
            .from("followup_sequences")
            .select("*, followup_agent_configs(funnel_project_id, user_id)")
            .eq("id", sequenceId)
            .single();

        if (!sequence) {
            throw new NotFoundError("Sequence");
        }

        const agentConfig = sequence.followup_agent_configs as any;
        if (!agentConfig || agentConfig.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this sequence");
        }

        const funnelProjectId = agentConfig.funnel_project_id;

        logger.info(
            { sequenceId, funnelProjectId, userId: user.id },
            "🎨 Starting iterative message generation"
        );

        // Fetch deck structure
        const { data: deckStructure } = await supabase
            .from("deck_structures")
            .select("*")
            .eq("funnel_project_id", funnelProjectId)
            .single();

        if (!deckStructure) {
            return NextResponse.json(
                {
                    error: "Deck structure not found. Please complete deck setup first.",
                },
                { status: 400 }
            );
        }

        // Fetch offer
        const { data: offer } = await supabase
            .from("offers")
            .select("*")
            .eq("funnel_project_id", funnelProjectId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (!offer) {
            return NextResponse.json(
                { error: "Offer not found. Please complete offer setup first." },
                { status: 400 }
            );
        }

        // Generate messages dynamically using new service
        const { generateDynamicSequence } =
            await import("@/lib/followup/message-generation-service");

        const generationContext = {
            count: sequence.total_messages || 5,
            deadline_hours: sequence.deadline_hours || 72,
            segments: sequence.target_segments || ["sampler", "engaged", "hot"],
            offer: {
                name: offer.name,
                price: offer.price?.toString() || "$997",
                bonuses: Array.isArray(offer.bonuses)
                    ? offer.bonuses.join(", ")
                    : undefined,
                guarantee: offer.guarantee || "30-day money-back guarantee",
            },
            webinar: {
                title: deckStructure.metadata?.title || "Webinar Presentation",
            },
        };

        // Delete existing messages for this sequence before generating new ones
        const { error: deleteError } = await supabase
            .from("followup_messages")
            .delete()
            .eq("sequence_id", sequenceId);

        if (deleteError) {
            logger.error(
                { error: deleteError, sequenceId },
                "⚠️ Failed to delete existing messages (continuing anyway)"
            );
        } else {
            logger.info(
                { sequenceId },
                "🗑️ Deleted existing messages before regeneration"
            );
        }

        const result = await generateDynamicSequence(sequenceId, generationContext);

        if (!result.success) {
            return NextResponse.json(
                {
                    error: "Failed to generate messages",
                    details: result.errors,
                },
                { status: 500 }
            );
        }

        // Save messages to database
        const messageIds: string[] = [];
        let savedCount = 0;

        for (const message of result.messages || []) {
            const { data: savedMessage, error: saveError } = await supabase
                .from("followup_messages")
                .insert(message)
                .select("id")
                .single();

            if (!saveError && savedMessage) {
                messageIds.push(savedMessage.id);
                savedCount++;
            } else {
                logger.error(
                    { error: saveError, messageOrder: message.message_order },
                    "❌ Failed to save message"
                );
            }
        }

        logger.info(
            {
                sequenceId,
                messagesGenerated: savedCount,
                totalAttempted: result.messages?.length || 0,
            },
            "✅ Message generation and save complete"
        );

        return NextResponse.json({
            success: true,
            messages_generated: savedCount,
            message_ids: messageIds,
            total_attempted: result.messages?.length || 0,
            errors: result.errors || [],
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in generate messages");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
