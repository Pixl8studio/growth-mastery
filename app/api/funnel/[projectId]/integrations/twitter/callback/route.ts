/**
 * Twitter OAuth Callback Route
 *
 * Handles Twitter OAuth callback and stores connection.
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { exchangeCodeForToken, getUserInfo } from "@/lib/integrations/twitter";
import { encryptToken } from "@/lib/integrations/crypto";
import { logger } from "@/lib/logger";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
        }

        const { projectId } = await params;
        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const codeVerifier = searchParams.get("code_verifier");

        if (!code || state !== projectId || !codeVerifier) {
            throw new Error("Invalid OAuth callback");
        }

        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/funnel/${projectId}/integrations/twitter/callback`;

        const tokenResponse = await exchangeCodeForToken(
            code,
            redirectUri,
            codeVerifier
        );
        const userInfo = await getUserInfo(tokenResponse.access_token);

        const supabase = await createClient();

        const expiresAt = tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
            : null;

        await supabase.from("funnel_social_connections").upsert({
            funnel_project_id: projectId,
            user_id: user.id,
            provider: "twitter",
            account_id: userInfo.id,
            account_name: userInfo.username,
            access_token: encryptToken(tokenResponse.access_token),
            refresh_token: tokenResponse.refresh_token
                ? encryptToken(tokenResponse.refresh_token)
                : null,
            token_expires_at: expiresAt,
            scopes: tokenResponse.scope?.split(" "),
            profile_data: {
                name: userInfo.name,
                profile_image_url: userInfo.profile_image_url,
                verified: userInfo.verified,
            },
            is_active: true,
            connected_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString(),
        });

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder/${projectId}?tab=settings`
        );
    } catch (error) {
        logger.error({ error, action: "twitter_callback" }, "Twitter callback error");
        Sentry.captureException(error, {
            tags: { component: "api", action: "twitter_callback" },
        });
        const { projectId } = await params;
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder/${projectId}?tab=settings&error=twitter_connection_failed`
        );
    }
}
