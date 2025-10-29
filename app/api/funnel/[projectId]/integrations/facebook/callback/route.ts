/**
 * Facebook OAuth Callback Route
 *
 * Handles Facebook OAuth callback and stores connection.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
    exchangeCodeForToken,
    getUserPages,
    getLongLivedToken,
} from "@/lib/integrations/facebook";
import { encryptToken } from "@/lib/integrations/crypto";

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

        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/funnel/${projectId}/integrations/facebook/callback`;

        const tokenResponse = await exchangeCodeForToken(code, redirectUri);
        const longLivedToken = await getLongLivedToken(tokenResponse.access_token);
        const pages = await getUserPages(longLivedToken.access_token);

        if (pages.length === 0) {
            throw new Error("No Facebook pages found");
        }

        const page = pages[0];
        const supabase = await createClient();

        const expiresAt = longLivedToken.expires_in
            ? new Date(Date.now() + longLivedToken.expires_in * 1000).toISOString()
            : null;

        await supabase.from("funnel_social_connections").upsert({
            funnel_project_id: projectId,
            user_id: user.id,
            provider: "facebook",
            account_id: page.id,
            account_name: page.name,
            access_token: encryptToken(page.access_token),
            token_expires_at: expiresAt,
            scopes: tokenResponse.scope?.split(","),
            profile_data: { tasks: page.tasks },
            is_active: true,
            connected_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString(),
        });

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder/${projectId}?tab=settings`
        );
    } catch (error) {
        console.error("Facebook callback error:", error);
        const { projectId } = await params;
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder/${projectId}?tab=settings&error=facebook_connection_failed`
        );
    }
}
