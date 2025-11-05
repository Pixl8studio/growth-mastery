/**
 * Sequence Trigger API Endpoint
 *
 * Triggers follow-up sequences for prospects.
 * Creates scheduled deliveries based on sequence configuration.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { triggerSequence } from "@/lib/followup/scheduler-service";

/**
 * POST /api/followup/trigger
 *
 * Trigger a sequence for a prospect.
 * Creates all scheduled deliveries for the sequence.
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
        if (!body.prospect_id) {
            throw new ValidationError("prospect_id is required");
        }

        if (!body.sequence_id) {
            throw new ValidationError("sequence_id is required");
        }

        // Verify ownership of prospect
        const { data: prospect } = await supabase
            .from("followup_prospects")
            .select("user_id")
            .eq("id", body.prospect_id)
            .single();

        if (!prospect || prospect.user_id !== user.id) {
            throw new AuthenticationError("Access denied to prospect");
        }

        // Verify ownership of sequence (through agent config)
        const { data: sequence } = await supabase
            .from("followup_sequences")
            .select("agent_config_id, followup_agent_configs!inner(user_id)")
            .eq("id", body.sequence_id)
            .single();

        if (!sequence) {
            throw new AuthenticationError("Access denied to sequence");
        }

        // Trigger the sequence
        const result = await triggerSequence(body.prospect_id, body.sequence_id);

        if (!result.success) {
            logger.error(
                {
                    error: result.error,
                    prospectId: body.prospect_id,
                    sequenceId: body.sequence_id,
                },
                "❌ Failed to trigger sequence"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            {
                prospectId: body.prospect_id,
                sequenceId: body.sequence_id,
                deliveriesCreated: result.deliveries_created,
            },
            "✅ Sequence triggered via API"
        );

        return NextResponse.json({
            success: true,
            deliveries_created: result.deliveries_created,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in POST /api/followup/trigger");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
