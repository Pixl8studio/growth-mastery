/**
 * Instagram OAuth Connect Route
 *
 * Initiates Instagram OAuth flow (via Facebook) for funnel-level connection.
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFacebookAuthUrl } from "@/lib/integrations/facebook";
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
            `${process.env.NEXT_PUBLIC_APP_URL}/api/funnel/${projectId}/integrations/instagram/callback`;

        const authUrl = getFacebookAuthUrl(projectId, redirectUri);

        return NextResponse.json({ url: authUrl });
    } catch (error) {
        logger.error({ error, action: "instagram_connect" }, "Instagram connect error");
        Sentry.captureException(error, {
            tags: { component: "api", action: "instagram_connect" },
        });
        return NextResponse.json(
            { error: "Failed to initiate Instagram connection" },
            { status: 500 }
        );
    }
}
