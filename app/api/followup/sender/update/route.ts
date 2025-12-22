/**
 * Update Sender Information API Endpoint
 *
 * POST /api/followup/sender/update
 * Updates sender name, email, reply-to, and SMS sender ID.
 *
 * Supports two modes:
 * - platform: Uses platform domain (mail.geniefunnels.com) with reply-to routing
 * - custom: Uses user's verified custom domain
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";

type EmailMode = "platform" | "custom";

interface SenderUpdateBody {
    agent_config_id: string;
    email_mode?: EmailMode;
    sender_name?: string;
    sender_email?: string;
    reply_to_email?: string;
    sms_sender_id?: string | null;
    custom_domain_id?: string | null;
}

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

        const body: SenderUpdateBody = await request.json();

        if (!body.agent_config_id) {
            throw new ValidationError("agent_config_id is required");
        }

        // Verify ownership and get current metadata
        const { data: config } = await supabase
            .from("followup_agent_configs")
            .select("user_id, metadata")
            .eq("id", body.agent_config_id)
            .single();

        if (!config || config.user_id !== user.id) {
            throw new AuthenticationError("Access denied to agent config");
        }

        const emailMode = body.email_mode || "platform";

        logger.info(
            {
                userId: user.id,
                agentConfigId: body.agent_config_id,
                emailMode,
                hasName: !!body.sender_name,
                hasEmail: !!body.sender_email,
                hasReplyTo: !!body.reply_to_email,
                hasSMS: !!body.sms_sender_id,
                hasCustomDomain: !!body.custom_domain_id,
            },
            "Updating sender info via API"
        );

        // Build metadata with email settings
        // Store email_mode, reply_to_email, and custom_domain_id in metadata
        // until proper DB columns are added via migration
        const currentMetadata = (config.metadata as Record<string, unknown>) || {};
        const updatedMetadata = {
            ...currentMetadata,
            email_mode: emailMode,
            reply_to_email: body.reply_to_email || null,
            custom_domain_id: body.custom_domain_id || null,
        };

        // Update sender information directly in database
        const { error: updateError } = await supabase
            .from("followup_agent_configs")
            .update({
                sender_name: body.sender_name,
                sender_email: body.sender_email,
                sms_sender_id: body.sms_sender_id,
                metadata: updatedMetadata,
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
            emailMode,
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/followup/sender/update");

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
