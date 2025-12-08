/**
 * Messages API Endpoint
 *
 * Manages follow-up message templates: creation, retrieval, and listing.
 * Supports POST (create) and GET (list) operations.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";

/**
 * POST /api/followup/messages
 *
 * Create a new follow-up message template.
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
        if (!body.sequence_id) {
            throw new ValidationError("sequence_id is required");
        }

        if (!body.name) {
            throw new ValidationError("name is required");
        }

        if (!body.body_content) {
            throw new ValidationError("body_content is required");
        }

        // Verify ownership of sequence (through agent config)
        const { data: sequence } = await supabase
            .from("followup_sequences")
            .select("agent_config_id, followup_agent_configs(user_id)")
            .eq("id", body.sequence_id)
            .single();

        if (
            !sequence ||
            !(sequence as any).followup_agent_configs?.user_id ||
            (sequence as any).followup_agent_configs.user_id !== user.id
        ) {
            throw new AuthenticationError("Access denied to sequence");
        }

        // Create the message
        const { data: message, error: createError } = await supabase
            .from("followup_messages")
            .insert({
                sequence_id: body.sequence_id,
                name: body.name,
                message_order: body.message_order || 1,
                channel: body.channel || "email",
                send_delay_hours: body.send_delay_hours || 0,
                subject_line: body.subject_line,
                body_content: body.body_content,
                personalization_rules: body.personalization_rules || {},
                primary_cta: body.primary_cta || {},
                ab_test_variant: body.ab_test_variant,
                variant_weight: body.variant_weight || 100,
            })
            .select()
            .single();

        if (createError) {
            logger.error(
                { error: createError, userId: user.id },
                "❌ Message creation failed"
            );
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        logger.info(
            {
                messageId: message.id,
                sequenceId: body.sequence_id,
                userId: user.id,
            },
            "✅ Message created via API"
        );

        return NextResponse.json({
            success: true,
            message,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in POST /api/followup/messages");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "create_message_template",
                endpoint: "POST /api/followup/messages",
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
 * GET /api/followup/messages
 *
 * List messages for a sequence.
 */
export async function GET(request: NextRequest) {
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

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const sequenceId = searchParams.get("sequence_id");

        if (!sequenceId) {
            throw new ValidationError("sequence_id query parameter is required");
        }

        // Verify ownership
        const { data: sequence } = await supabase
            .from("followup_sequences")
            .select("agent_config_id, followup_agent_configs(user_id)")
            .eq("id", sequenceId)
            .single();

        if (
            !sequence ||
            !(sequence as any).followup_agent_configs?.user_id ||
            (sequence as any).followup_agent_configs.user_id !== user.id
        ) {
            throw new AuthenticationError("Access denied to sequence");
        }

        // List messages
        const { data: messages, error: listError } = await supabase
            .from("followup_messages")
            .select("*")
            .eq("sequence_id", sequenceId)
            .order("message_order", { ascending: true });

        if (listError) {
            logger.error(
                { error: listError, userId: user.id },
                "❌ Failed to list messages"
            );
            return NextResponse.json({ error: listError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            messages: messages || [],
            count: messages?.length || 0,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in GET /api/followup/messages");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "list_message_templates",
                endpoint: "GET /api/followup/messages",
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
