/**
 * Sequence by ID API Endpoint
 *
 * Manages individual sequence operations.
 * Supports GET (retrieve), PUT (update), and DELETE operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError, NotFoundError } from "@/lib/errors";
import {
    getSequence,
    updateSequence,
    deleteSequence,
} from "@/lib/followup/sequence-service";

type RouteContext = {
    params: Promise<{ sequenceId: string }>;
};

/**
 * GET /api/followup/sequences/[sequenceId]
 *
 * Retrieve a specific sequence.
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

        const { sequenceId } = await context.params;

        if (!sequenceId) {
            throw new ValidationError("sequenceId is required");
        }

        // Get the sequence
        const result = await getSequence(sequenceId);

        if (!result.success || !result.sequence) {
            throw new NotFoundError("Sequence");
        }

        // Verify ownership via agent config
        const { data: agentConfig } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", result.sequence.agent_config_id)
            .single();

        if (!agentConfig || agentConfig.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this sequence");
        }

        return NextResponse.json({
            success: true,
            sequence: result.sequence,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in GET /api/followup/sequences/[sequenceId]");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * PUT /api/followup/sequences/[sequenceId]
 *
 * Update a sequence.
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

        const { sequenceId } = await context.params;

        if (!sequenceId) {
            throw new ValidationError("sequenceId is required");
        }

        // Verify ownership before updating
        const { data: sequence } = await supabase
            .from("followup_sequences")
            .select("agent_config_id")
            .eq("id", sequenceId)
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
            throw new AuthenticationError("Access denied to this sequence");
        }

        const body = await request.json();

        // Remove fields that shouldn't be updated
        const { id, agent_config_id, created_at, ...updates } = body;

        logger.info(
            {
                sequenceId,
                userId: user.id,
                updateFields: Object.keys(updates),
            },
            "🔄 Updating sequence"
        );

        // Update the sequence
        const result = await updateSequence(sequenceId, updates);

        if (!result.success) {
            logger.error(
                { error: result.error, sequenceId },
                "❌ Sequence update failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info({ sequenceId, userId: user.id }, "✅ Sequence updated via API");

        return NextResponse.json({
            success: true,
            sequence: result.sequence,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in PUT /api/followup/sequences/[sequenceId]");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/followup/sequences/[sequenceId]
 *
 * Delete a sequence.
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

        const { sequenceId } = await context.params;

        if (!sequenceId) {
            throw new ValidationError("sequenceId is required");
        }

        // Verify ownership before deleting
        const { data: sequence } = await supabase
            .from("followup_sequences")
            .select("agent_config_id")
            .eq("id", sequenceId)
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
            throw new AuthenticationError("Access denied to this sequence");
        }

        logger.info({ sequenceId, userId: user.id }, "🗑️  Deleting sequence");

        // Delete the sequence
        const result = await deleteSequence(sequenceId);

        if (!result.success) {
            logger.error(
                { error: result.error, sequenceId },
                "❌ Sequence deletion failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info({ sequenceId, userId: user.id }, "✅ Sequence deleted via API");

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        logger.error(
            { error },
            "❌ Error in DELETE /api/followup/sequences/[sequenceId]"
        );

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
