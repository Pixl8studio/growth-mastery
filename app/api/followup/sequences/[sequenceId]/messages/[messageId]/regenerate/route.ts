/**
 * Regenerate Single Message API
 *
 * Regenerates a single message with fresh AI-generated content
 * following the config.md specification and segment personalization.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, NotFoundError } from "@/lib/errors";
import { regenerateSingleMessage } from "@/lib/followup/message-generation-service";

type RouteContext = {
    params: Promise<{ sequenceId: string; messageId: string }>;
};

/**
 * POST /api/followup/sequences/[sequenceId]/messages/[messageId]/regenerate
 *
 * Regenerate a message with fresh content.
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

        const { sequenceId, messageId } = await context.params;

        // Get message and verify ownership
        const { data: message } = await supabase
            .from("followup_messages")
            .select(
                "*, followup_sequences(*, followup_agent_configs(funnel_project_id, user_id))"
            )
            .eq("id", messageId)
            .eq("sequence_id", sequenceId)
            .single();

        if (!message) {
            throw new NotFoundError("Message");
        }

        const sequence = message.followup_sequences as any;
        const agentConfig = sequence?.followup_agent_configs as any;

        if (!agentConfig || agentConfig.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this message");
        }

        logger.info(
            { messageId, sequenceId, userId: user.id },
            "🔄 Regenerating message"
        );

        // Determine message type from metadata or name
        const messageType =
            message.metadata?.template_type ||
            message.name
                .toLowerCase()
                .replace(/[📧📱]/g, "")
                .trim()
                .split(" ")[0]
                .replace(/-/g, "_");

        // Regenerate the message
        const result = await regenerateSingleMessage(messageId, messageType, "sampler");

        if (!result.success) {
            return NextResponse.json(
                {
                    error: "Failed to regenerate message",
                    details: result.error,
                },
                { status: 500 }
            );
        }

        // Update the message in database
        const { data: updatedMessage, error: updateError } = await supabase
            .from("followup_messages")
            .update({
                subject_line: result.template?.subject_line,
                body_content: result.template?.body_content,
                updated_at: new Date().toISOString(),
            })
            .eq("id", messageId)
            .select()
            .single();

        if (updateError) {
            logger.error(
                { error: updateError, messageId },
                "❌ Failed to update message"
            );
            return NextResponse.json(
                { error: "Failed to save regenerated message" },
                { status: 500 }
            );
        }

        logger.info({ messageId, sequenceId }, "✅ Message regenerated successfully");

        return NextResponse.json({
            success: true,
            message: updatedMessage,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in regenerate message");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "regenerate_message",
                endpoint:
                    "POST /api/followup/sequences/[sequenceId]/messages/[messageId]/regenerate",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
