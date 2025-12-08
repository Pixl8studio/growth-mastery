/**
 * Twitter OAuth Connect Route
 *
 * Initiates Twitter OAuth 2.0 flow for funnel-level connection.
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTwitterAuthUrl, generateCodeChallenge } from "@/lib/integrations/twitter";
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
            `${process.env.NEXT_PUBLIC_APP_URL}/api/funnel/${projectId}/integrations/twitter/callback`;

        const { verifier, challenge } = generateCodeChallenge();

        const authUrl = getTwitterAuthUrl(projectId, redirectUri, challenge);

        return NextResponse.json({
            url: authUrl,
            code_verifier: verifier,
        });
    } catch (error) {
        logger.error({ error, action: "twitter_connect" }, "Twitter connect error");
        Sentry.captureException(error, {
            tags: { component: "api", action: "twitter_connect" },
        });
        return NextResponse.json(
            { error: "Failed to initiate Twitter connection" },
            { status: 500 }
        );
    }
}
