/**
 * Gmail OAuth Disconnect Endpoint
 *
 * POST /api/followup/gmail/disconnect
 * Disconnects Gmail and reverts to SendGrid provider.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { disconnectGmail } from "@/lib/followup/gmail-oauth-service";

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

        // Verify ownership of agent config
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
            },
            "🔌 Disconnecting Gmail"
        );

        await disconnectGmail(body.agent_config_id);

        return NextResponse.json({
            success: true,
            message: "Gmail disconnected successfully",
        });
    } catch (error) {
        logger.error({ error }, "❌ Gmail disconnect error");

        if (error instanceof AuthenticationError || error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error instanceof AuthenticationError ? 401 : 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to disconnect Gmail" },
            { status: 500 }
        );
    }
}
