/**
 * Gmail OAuth Connect Route
 *
 * Initiates Gmail OAuth flow for funnel-level connection.
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGmailAuthUrl } from "@/lib/integrations/gmail";
import { logger } from "@/lib/logger";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId } = await params;
        const { searchParams } = new URL(request.url);
        const redirectUri =
            searchParams.get("redirect_uri") ||
            `${process.env.NEXT_PUBLIC_APP_URL}/api/funnel/${projectId}/integrations/gmail/callback`;

        const authUrl = getGmailAuthUrl(projectId, redirectUri);

        return NextResponse.json({ url: authUrl });
    } catch (error) {
        logger.error({ error, action: "gmail_connect" }, "Gmail connect error");
        Sentry.captureException(error, {
            tags: { component: "api", action: "gmail_connect" },
        });
        return NextResponse.json(
            { error: "Failed to initiate Gmail connection" },
            { status: 500 }
        );
    }
}
