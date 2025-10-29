/**
 * Check Domain Verification Status API Endpoint
 *
 * GET /api/followup/sender/check-verification
 * Checks domain verification status with SendGrid.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { checkDomainVerificationStatus } from "@/lib/followup/sendgrid-domain-service";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { searchParams } = new URL(request.url);
        const agentConfigId = searchParams.get("agent_config_id");

        if (!agentConfigId) {
            throw new ValidationError("agent_config_id query parameter is required");
        }

        // Verify ownership
        const { data: config } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", agentConfigId)
            .single();

        if (!config || config.user_id !== user.id) {
            throw new AuthenticationError("Access denied to agent config");
        }

        logger.info(
            { userId: user.id, agentConfigId },
            "🔍 Checking verification status via API"
        );

        // Check verification status
        const result = await checkDomainVerificationStatus(agentConfigId);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            verified: result.verified,
            dns_records: result.dns_records,
            message: result.verified
                ? "Domain is verified and ready for sending"
                : "Domain verification pending. DNS records may take up to 48 hours to propagate.",
        });
    } catch (error) {
        logger.error(
            { error },
            "❌ Error in GET /api/followup/sender/check-verification"
        );

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
