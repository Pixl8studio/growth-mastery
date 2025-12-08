/**
 * Gmail OAuth Connect Endpoint
 *
 * GET /api/followup/gmail/connect
 * Initiates Gmail OAuth flow by redirecting to Google's authorization page.
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { generateGmailOAuthUrl } from "@/lib/followup/gmail-oauth-service";

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
            throw new ValidationError("agent_config_id is required");
        }

        // Verify ownership of agent config
        const { data: config } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", agentConfigId)
            .single();

        if (!config || config.user_id !== user.id) {
            throw new AuthenticationError("Access denied to agent config");
        }

        logger.info(
            {
                userId: user.id,
                agentConfigId,
            },
            "🔐 Initiating Gmail OAuth flow"
        );

        // Generate OAuth URL
        const authUrl = generateGmailOAuthUrl(agentConfigId, user.id);

        return NextResponse.json({ authUrl });
    } catch (error) {
        logger.error(
            {
                error,
                errorMessage: error instanceof Error ? error.message : "Unknown error",
                errorStack: error instanceof Error ? error.stack : undefined,
            },
            "❌ Gmail connect error"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "gmail_connect",
                endpoint: "GET /api/followup/gmail/connect",
            },
        });

        if (error instanceof AuthenticationError || error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error instanceof AuthenticationError ? 401 : 400 }
            );
        }

        // Check for specific Gmail OAuth configuration errors
        if (error instanceof Error && error.message.includes("GOOGLE_CLIENT_ID")) {
            return NextResponse.json(
                {
                    error: "Gmail OAuth not configured",
                    details:
                        "Gmail integration requires Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) to be configured by your administrator. Please use SendGrid instead or contact support for assistance.",
                    setupRequired: true,
                },
                { status: 503 }
            );
        }

        // Generic error for other cases
        return NextResponse.json(
            {
                error: "Failed to initiate Gmail connection",
                details:
                    error instanceof Error
                        ? error.message
                        : "An unexpected error occurred. Please try again or use SendGrid instead.",
            },
            { status: 500 }
        );
    }
}
