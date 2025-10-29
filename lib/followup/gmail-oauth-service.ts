/**
 * Gmail OAuth Service
 *
 * Handles Gmail OAuth flow and token management for sending emails
 * through users' Gmail accounts via OAuth.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export interface GmailOAuthTokens {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

export interface GmailUserInfo {
    email: string;
    verified_email: boolean;
    name?: string;
    picture?: string;
}

/**
 * Generate Gmail OAuth URL
 *
 * Creates the OAuth authorization URL for users to connect their Gmail account.
 */
export function generateGmailOAuthUrl(agentConfigId: string, userId: string): string {
    const clientId = env.GOOGLE_CLIENT_ID;
    const redirectUri =
        env.GMAIL_REDIRECT_URI ||
        `${env.NEXT_PUBLIC_APP_URL}/api/followup/gmail/callback`;

    if (!clientId) {
        throw new Error(
            "Gmail OAuth not configured. Set GOOGLE_CLIENT_ID environment variable."
        );
    }

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    // State includes both agentConfigId and userId for security and routing
    const state = Buffer.from(JSON.stringify({ agentConfigId, userId })).toString(
        "base64"
    );

    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("access_type", "offline"); // Gets refresh token
    authUrl.searchParams.set("prompt", "consent"); // Forces refresh token on re-auth
    authUrl.searchParams.set(
        "scope",
        [
            "https://www.googleapis.com/auth/gmail.send", // Send emails
            "https://www.googleapis.com/auth/userinfo.email", // Get email address
            "https://www.googleapis.com/auth/userinfo.profile", // Get profile
        ].join(" ")
    );
    authUrl.searchParams.set("state", state);

    return authUrl.toString();
}

/**
 * Exchange authorization code for tokens
 *
 * Exchanges the authorization code received from OAuth callback for access and refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<GmailOAuthTokens> {
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
        env.GMAIL_REDIRECT_URI ||
        `${env.NEXT_PUBLIC_APP_URL}/api/followup/gmail/callback`;

    if (!clientId || !clientSecret) {
        throw new Error("Gmail OAuth not configured");
    }

    logger.info({}, "🔐 Exchanging authorization code for Gmail tokens");

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error({ error, status: response.status }, "❌ Token exchange failed");
        throw new Error(`Gmail OAuth token exchange failed: ${error}`);
    }

    const tokens: GmailOAuthTokens = await response.json();

    logger.info({}, "✅ Gmail tokens obtained successfully");

    return tokens;
}

/**
 * Refresh Gmail access token
 *
 * Uses refresh token to get a new access token when the current one expires.
 */
export async function refreshGmailToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
}> {
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("Gmail OAuth not configured");
    }

    logger.info({}, "🔄 Refreshing Gmail access token");

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token",
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error({ error }, "❌ Token refresh failed");
        throw new Error(`Gmail token refresh failed: ${error}`);
    }

    const data = await response.json();

    logger.info({}, "✅ Gmail token refreshed successfully");

    return {
        access_token: data.access_token,
        expires_in: data.expires_in,
    };
}

/**
 * Get Gmail user info
 *
 * Fetches the user's Gmail email address and profile information.
 */
export async function getGmailUserInfo(accessToken: string): Promise<GmailUserInfo> {
    logger.info({}, "📧 Fetching Gmail user info");

    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error({ error }, "❌ Failed to fetch user info");
        throw new Error(`Failed to fetch Gmail user info: ${error}`);
    }

    const userInfo: GmailUserInfo = await response.json();

    logger.info({ email: userInfo.email }, "✅ Gmail user info retrieved");

    return userInfo;
}

/**
 * Store Gmail OAuth tokens
 *
 * Saves OAuth tokens and user info to the agent configuration.
 */
export async function storeGmailTokens(
    agentConfigId: string,
    tokens: GmailOAuthTokens,
    userInfo: GmailUserInfo
): Promise<void> {
    const supabase = await createClient();

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    logger.info(
        { agentConfigId, email: userInfo.email, expiresAt },
        "💾 Storing Gmail OAuth tokens"
    );

    const { error } = await supabase
        .from("followup_agent_configs")
        .update({
            gmail_access_token: tokens.access_token,
            gmail_refresh_token: tokens.refresh_token || null,
            gmail_token_expires_at: expiresAt.toISOString(),
            gmail_user_email: userInfo.email,
            gmail_connected_at: new Date().toISOString(),
            email_provider_type: "gmail",
            sender_email: userInfo.email, // Set sender email to Gmail account
            sender_name: userInfo.name || userInfo.email.split("@")[0],
            sender_verified: true, // Gmail accounts are pre-verified
            domain_verification_status: "verified",
        })
        .eq("id", agentConfigId);

    if (error) {
        logger.error({ error, agentConfigId }, "❌ Failed to store tokens");
        throw error;
    }

    logger.info({ agentConfigId }, "✅ Gmail OAuth tokens stored successfully");
}

/**
 * Get valid Gmail access token
 *
 * Returns a valid access token, refreshing if necessary.
 */
export async function getValidGmailToken(agentConfigId: string): Promise<{
    access_token: string;
    user_email: string;
}> {
    const supabase = await createClient();

    const { data: config, error } = await supabase
        .from("followup_agent_configs")
        .select(
            "gmail_access_token, gmail_refresh_token, gmail_token_expires_at, gmail_user_email"
        )
        .eq("id", agentConfigId)
        .single();

    if (error || !config) {
        throw new Error("Agent config not found");
    }

    if (!config.gmail_access_token || !config.gmail_user_email) {
        throw new Error("Gmail not connected. Please connect Gmail first.");
    }

    const expiresAt = new Date(config.gmail_token_expires_at);
    const now = new Date();

    // Token expires in less than 5 minutes - refresh it
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        if (!config.gmail_refresh_token) {
            throw new Error("No refresh token available. Please reconnect Gmail.");
        }

        logger.info({ agentConfigId }, "🔄 Access token expired, refreshing");

        const refreshed = await refreshGmailToken(config.gmail_refresh_token);

        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

        await supabase
            .from("followup_agent_configs")
            .update({
                gmail_access_token: refreshed.access_token,
                gmail_token_expires_at: newExpiresAt.toISOString(),
            })
            .eq("id", agentConfigId);

        return {
            access_token: refreshed.access_token,
            user_email: config.gmail_user_email,
        };
    }

    return {
        access_token: config.gmail_access_token,
        user_email: config.gmail_user_email,
    };
}

/**
 * Disconnect Gmail
 *
 * Removes Gmail OAuth tokens and resets to SendGrid provider.
 */
export async function disconnectGmail(agentConfigId: string): Promise<void> {
    const supabase = await createClient();

    logger.info({ agentConfigId }, "🔌 Disconnecting Gmail");

    const { error } = await supabase
        .from("followup_agent_configs")
        .update({
            gmail_access_token: null,
            gmail_refresh_token: null,
            gmail_token_expires_at: null,
            gmail_user_email: null,
            gmail_connected_at: null,
            email_provider_type: "sendgrid",
        })
        .eq("id", agentConfigId);

    if (error) {
        logger.error({ error, agentConfigId }, "❌ Failed to disconnect Gmail");
        throw error;
    }

    logger.info({ agentConfigId }, "✅ Gmail disconnected successfully");
}
