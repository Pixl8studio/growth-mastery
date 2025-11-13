/**
 * Gmail OAuth Status Check Endpoint
 *
 * GET /api/followup/gmail/status
 * Checks if Gmail OAuth is properly configured with required environment variables.
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function GET() {
    try {
        const clientId = env.GOOGLE_CLIENT_ID;
        const clientSecret = env.GOOGLE_CLIENT_SECRET;

        const isConfigured = !!(clientId && clientSecret);

        logger.info({ isConfigured }, "Checked Gmail OAuth configuration status");

        return NextResponse.json({
            available: isConfigured,
            message: isConfigured
                ? "Gmail OAuth is configured and ready to use"
                : "Gmail OAuth requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables. Please contact your administrator or use SendGrid instead.",
            configured: isConfigured,
        });
    } catch (error) {
        logger.error({ error }, "Failed to check Gmail OAuth status");

        return NextResponse.json(
            {
                available: false,
                message: "Unable to check Gmail OAuth configuration",
                configured: false,
            },
            { status: 500 }
        );
    }
}
