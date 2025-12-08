/**
 * Messages API Endpoint
 *
 * Manages messages within a sequence.
 * Supports POST (create) and GET (list) operations.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { createMessage, listMessages } from "@/lib/followup/sequence-service";

type RouteContext = {
    params: Promise<{ sequenceId: string }>;
};

/**
 * POST /api/followup/sequences/[sequenceId]/messages
 *
 * Create a message in a sequence.
 */
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();
        const { sequenceId } = await context.params;

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        // Verify ownership of sequence (through agent config)
        const { data: sequence } = await supabase
            .from("followup_sequences")
            .select("agent_config_id, followup_agent_configs!inner(user_id)")
            .eq("id", sequenceId)
            .single();

        if (!sequence) {
            throw new AuthenticationError("Access denied to sequence");
        }

        const body = await request.json();

        // Validate required fields
        if (!body.name) {
            throw new ValidationError("name is required");
        }

        if (body.message_order === undefined) {
            throw new ValidationError("message_order is required");
        }

        if (!body.channel) {
            throw new ValidationError("channel is required");
        }

        if (body.send_delay_hours === undefined) {
            throw new ValidationError("send_delay_hours is required");
        }

        if (!body.body_content) {
            throw new ValidationError("body_content is required");
        }

        // Create the message
        const result = await createMessage(sequenceId, {
            name: body.name,
            message_order: body.message_order,
            channel: body.channel,
            send_delay_hours: body.send_delay_hours,
            subject_line: body.subject_line,
            body_content: body.body_content,
            primary_cta: body.primary_cta,
            ab_test_variant: body.ab_test_variant,
        });

        if (!result.success) {
            logger.error(
                { error: result.error, sequenceId },
                "❌ Message creation failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            {
                messageId: result.message?.id,
                sequenceId,
                order: body.message_order,
            },
            "✅ Message created via API"
        );

        return NextResponse.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        logger.error(
            { error },
            "❌ Error in POST /api/followup/sequences/[sequenceId]/messages"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "create_message",
                endpoint: "POST /api/followup/sequences/[sequenceId]/messages",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * GET /api/followup/sequences/[sequenceId]/messages
 *
 * List all messages in a sequence.
 */
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();
        const { sequenceId } = await context.params;

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        // Verify ownership
        const { data: sequence } = await supabase
            .from("followup_sequences")
            .select("agent_config_id, followup_agent_configs!inner(user_id)")
            .eq("id", sequenceId)
            .single();

        if (!sequence) {
            throw new AuthenticationError("Access denied to sequence");
        }

        // List messages
        const result = await listMessages(sequenceId);

        if (!result.success) {
            logger.error(
                { error: result.error, sequenceId },
                "❌ Failed to list messages"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            messages: result.messages || [],
            count: result.messages?.length || 0,
        });
    } catch (error) {
        logger.error(
            { error },
            "❌ Error in GET /api/followup/sequences/[sequenceId]/messages"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "list_messages",
                endpoint: "GET /api/followup/sequences/[sequenceId]/messages",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
