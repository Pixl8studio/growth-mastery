/**
 * Gmail OAuth Callback Endpoint
 *
 * GET /api/followup/gmail/callback
 * Handles the OAuth callback from Google after user authorizes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
    exchangeCodeForTokens,
    getGmailUserInfo,
    storeGmailTokens,
} from "@/lib/followup/gmail-oauth-service";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        // User denied access
        if (error) {
            logger.warn({ error }, "⚠️ User denied Gmail access");
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder?error=gmail_denied`
            );
        }

        if (!code || !state) {
            logger.error({}, "❌ Missing code or state in callback");
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder?error=invalid_callback`
            );
        }

        // Decode state to get agentConfigId and userId
        const { agentConfigId, userId } = JSON.parse(
            Buffer.from(state, "base64").toString()
        );

        logger.info(
            {
                agentConfigId,
                userId,
            },
            "🔐 Processing Gmail OAuth callback"
        );

        // Verify user is authenticated
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user || user.id !== userId) {
            logger.error({ userId, actualUserId: user?.id }, "❌ User mismatch");
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder?error=unauthorized`
            );
        }

        // Verify ownership of agent config
        const { data: config } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", agentConfigId)
            .single();

        if (!config || config.user_id !== user.id) {
            logger.error({ agentConfigId, userId }, "❌ Config access denied");
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder?error=unauthorized`
            );
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);

        // Get user info
        const userInfo = await getGmailUserInfo(tokens.access_token);

        // Store tokens and update config
        await storeGmailTokens(agentConfigId, tokens, userInfo);

        logger.info(
            {
                agentConfigId,
                email: userInfo.email,
            },
            "✅ Gmail connected successfully"
        );

        // Redirect back to funnel builder with success
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder?gmail_connected=true`
        );
    } catch (error) {
        logger.error({ error }, "❌ Gmail callback error");

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder?error=gmail_connection_failed`
        );
    }
}
