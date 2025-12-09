/**
 * Gmail OAuth Callback Route
 *
 * Handles Gmail OAuth callback and stores connection.
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { exchangeCodeForToken, getUserInfo } from "@/lib/integrations/gmail";
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

        if (!code || state !== projectId) {
            throw new Error("Invalid OAuth callback");
        }

        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/funnel/${projectId}/integrations/gmail/callback`;

        const tokenResponse = await exchangeCodeForToken(code, redirectUri);
        const userInfo = await getUserInfo(tokenResponse.access_token);

        const supabase = await createClient();

        const expiresAt = tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
            : null;

        await supabase.from("funnel_social_connections").upsert({
            funnel_project_id: projectId,
            user_id: user.id,
            provider: "gmail",
            account_id: userInfo.email,
            account_name: userInfo.name || userInfo.email,
            account_email: userInfo.email,
            access_token: encryptToken(tokenResponse.access_token),
            refresh_token: tokenResponse.refresh_token
                ? encryptToken(tokenResponse.refresh_token)
                : null,
            token_expires_at: expiresAt,
            scopes: tokenResponse.scope?.split(" "),
            profile_data: {
                picture: userInfo.picture,
                verified_email: userInfo.verified_email,
            },
            is_active: true,
            connected_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString(),
        });

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder/${projectId}?tab=settings`
        );
    } catch (error) {
        logger.error({ error, action: "gmail_callback" }, "Gmail callback error");
        Sentry.captureException(error, {
            tags: { component: "api", action: "gmail_callback" },
        });
        const { projectId } = await params;
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder/${projectId}?tab=settings&error=gmail_connection_failed`
        );
    }
}
