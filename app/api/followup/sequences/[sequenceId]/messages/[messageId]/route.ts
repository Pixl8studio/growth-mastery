/**
 * Message by ID API Endpoint
 *
 * Manages individual message template operations.
 * Supports GET (retrieve), PUT (update), and DELETE operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError, NotFoundError } from "@/lib/errors";

type RouteContext = {
    params: Promise<{ sequenceId: string; messageId: string }>;
};

/**
 * GET /api/followup/sequences/[sequenceId]/messages/[messageId]
 *
 * Retrieve a specific message.
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

        const { messageId } = await context.params;

        const { data: message, error } = await supabase
            .from("followup_messages")
            .select("*")
            .eq("id", messageId)
            .single();

        if (error || !message) {
            throw new NotFoundError("Message");
        }

        // Verify ownership via sequence → agent config
        const { data: sequence } = await supabase
            .from("followup_sequences")
            .select("agent_config_id")
            .eq("id", message.sequence_id)
            .single();

        if (!sequence) {
            throw new NotFoundError("Sequence");
        }

        const { data: agentConfig } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", sequence.agent_config_id)
            .single();

        if (!agentConfig || agentConfig.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this message");
        }

        return NextResponse.json({
            success: true,
            message,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in GET message");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * PUT /api/followup/sequences/[sequenceId]/messages/[messageId]
 *
 * Update a message template.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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

        const { sequenceId, messageId } = await context.params;

        logger.info(
            { sequenceId, messageId, userId: user.id },
            "🔍 PUT message - params received"
        );

        // Verify ownership before updating
        const { data: message, error: messageError } = await supabase
            .from("followup_messages")
            .select("sequence_id")
            .eq("id", messageId)
            .single();

        if (messageError) {
            logger.error({ messageError, messageId }, "❌ Message query error");
        }

        if (!message) {
            logger.error({ messageId, sequenceId }, "❌ Message not found");
            throw new NotFoundError("Message");
        }

        logger.info(
            { messageId, messageSequenceId: message.sequence_id },
            "✅ Message found"
        );

        const { data: sequence, error: sequenceError } = await supabase
            .from("followup_sequences")
            .select("agent_config_id")
            .eq("id", message.sequence_id)
            .single();

        if (sequenceError) {
            logger.error(
                { sequenceError, sequenceId: message.sequence_id },
                "❌ Sequence query error"
            );
        }

        if (!sequence) {
            logger.error(
                { sequenceId: message.sequence_id, messageId },
                "❌ Sequence not found"
            );
            throw new NotFoundError("Sequence");
        }

        logger.info(
            {
                sequenceId: message.sequence_id,
                agentConfigId: sequence.agent_config_id,
            },
            "✅ Sequence found"
        );

        const { data: agentConfig, error: agentConfigError } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", sequence.agent_config_id)
            .single();

        if (agentConfigError) {
            logger.error(
                { agentConfigError, agentConfigId: sequence.agent_config_id },
                "❌ Agent config query error"
            );
        }

        if (!agentConfig || agentConfig.user_id !== user.id) {
            logger.error(
                {
                    agentConfigId: sequence.agent_config_id,
                    userId: user.id,
                    hasAgentConfig: !!agentConfig,
                },
                "❌ Access denied"
            );
            throw new AuthenticationError("Access denied to this message");
        }

        logger.info({ userId: user.id }, "✅ Authorization verified");

        const body = await request.json();

        // Remove fields that shouldn't be updated
        const { id, sequence_id, created_at, ...updates } = body;

        logger.info({ messageId, userId: user.id }, "🔄 Updating message");

        const { data: updatedMessage, error: updateError } = await supabase
            .from("followup_messages")
            .update(updates)
            .eq("id", messageId)
            .select()
            .single();

        if (updateError) {
            logger.error({ error: updateError, messageId }, "❌ Message update failed");
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        logger.info({ messageId, userId: user.id }, "✅ Message updated via API");

        return NextResponse.json({
            success: true,
            message: updatedMessage,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in PUT message");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/followup/sequences/[sequenceId]/messages/[messageId]
 *
 * Delete a message template.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

        const { messageId } = await context.params;

        // Verify ownership before deleting
        const { data: message } = await supabase
            .from("followup_messages")
            .select("sequence_id")
            .eq("id", messageId)
            .single();

        if (!message) {
            throw new NotFoundError("Message");
        }

        const { data: sequence } = await supabase
            .from("followup_sequences")
            .select("agent_config_id")
            .eq("id", message.sequence_id)
            .single();

        if (!sequence) {
            throw new NotFoundError("Sequence");
        }

        const { data: agentConfig } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", sequence.agent_config_id)
            .single();

        if (!agentConfig || agentConfig.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this message");
        }

        logger.info({ messageId, userId: user.id }, "🗑️  Deleting message");

        const { error: deleteError } = await supabase
            .from("followup_messages")
            .delete()
            .eq("id", messageId);

        if (deleteError) {
            logger.error(
                { error: deleteError, messageId },
                "❌ Message deletion failed"
            );
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        logger.info({ messageId, userId: user.id }, "✅ Message deleted via API");

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in DELETE message");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
