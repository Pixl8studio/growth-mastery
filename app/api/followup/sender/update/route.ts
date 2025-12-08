/**
 * Update Sender Information API Endpoint
 *
 * POST /api/followup/sender/update
 * Updates sender name, email, and SMS sender ID.
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const body = await request.json();

        if (!body.agent_config_id) {
            throw new ValidationError("agent_config_id is required");
        }

        // Verify ownership
        const { data: config } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", body.agent_config_id)
            .single();

        if (!config || config.user_id !== user.id) {
            throw new AuthenticationError("Access denied to agent config");
        }

        logger.info(
            {
                userId: user.id,
                agentConfigId: body.agent_config_id,
                hasName: !!body.sender_name,
                hasEmail: !!body.sender_email,
                hasSMS: !!body.sms_sender_id,
            },
            "✏️  Updating sender info via API"
        );

        // Update sender information directly in database
        const { error: updateError } = await supabase
            .from("followup_agent_configs")
            .update({
                sender_name: body.sender_name,
                sender_email: body.sender_email,
                sms_sender_id: body.sms_sender_id,
            })
            .eq("id", body.agent_config_id);

        if (updateError) {
            logger.error({ updateError }, "Failed to update sender info");
            return NextResponse.json(
                { success: false, error: "Failed to update sender information" },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Sender information updated successfully",
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in POST /api/followup/sender/update");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "update_sender_info",
                endpoint: "POST /api/followup/sender/update",
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
