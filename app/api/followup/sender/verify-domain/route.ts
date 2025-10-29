/**
 * Domain Verification API Endpoint
 *
 * POST /api/followup/sender/verify-domain
 * Initiates domain verification with SendGrid.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { initiateDomainVerification } from "@/lib/followup/sendgrid-domain-service";

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

        if (!body.sender_email) {
            throw new ValidationError("sender_email is required");
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
                senderEmail: body.sender_email,
            },
            "🔐 Verifying domain via API"
        );

        // Initiate domain verification
        const result = await initiateDomainVerification(
            body.agent_config_id,
            body.sender_email,
            user.id
        );

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            dns_records: result.dns_records,
            domain_id: result.domain_id,
            message:
                "Domain verification initiated. Please add DNS records to your domain.",
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in POST /api/followup/sender/verify-domain");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
