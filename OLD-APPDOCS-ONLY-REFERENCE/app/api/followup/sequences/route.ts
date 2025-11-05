/**
 * Sequences API Endpoint
 *
 * Manages follow-up sequences: creation, retrieval, and listing.
 * Supports POST (create) and GET (list) operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { createSequence, listSequences } from "@/lib/followup/sequence-service";

/**
 * POST /api/followup/sequences
 *
 * Create a new follow-up sequence.
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

        if (!body.name) {
            throw new ValidationError("name is required");
        }

        if (!body.trigger_event) {
            throw new ValidationError("trigger_event is required");
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
        const result = await createSequence(body.agent_config_id, {
            name: body.name,
            description: body.description,
            sequence_type: body.sequence_type,
            trigger_event: body.trigger_event,
            trigger_delay_hours: body.trigger_delay_hours,
            deadline_hours: body.deadline_hours,
            total_messages: body.total_messages,
            target_segments: body.target_segments,
            requires_manual_approval: body.requires_manual_approval,
        });

        if (!result.success) {
            logger.error(
                { error: result.error, userId: user.id },
                "❌ Sequence creation failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            {
                sequenceId: result.sequence?.id,
                userId: user.id,
                name: body.name,
            },
            "✅ Sequence created via API"
        );

        return NextResponse.json({
            success: true,
            sequence: result.sequence,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in POST /api/followup/sequences");

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
 * GET /api/followup/sequences
 *
 * List sequences for an agent config.
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
        const agentConfigId = searchParams.get("agent_config_id");

        if (!agentConfigId) {
            throw new ValidationError("agent_config_id query parameter is required");
        }

        // Verify ownership
        const { data: agentConfig } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", agentConfigId)
            .single();

        if (!agentConfig || agentConfig.user_id !== user.id) {
            throw new AuthenticationError("Access denied to agent config");
        }

        // List sequences
        const result = await listSequences(agentConfigId);

        if (!result.success) {
            logger.error(
                { error: result.error, userId: user.id },
                "❌ Failed to list sequences"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            sequences: result.sequences || [],
            count: result.sequences?.length || 0,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in GET /api/followup/sequences");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
