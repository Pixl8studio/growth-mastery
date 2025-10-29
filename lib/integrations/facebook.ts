/**
 * Facebook Graph API Client
 *
 * Handles Facebook OAuth and Graph API interactions.
 */

import { env } from "@/lib/env";
import type { OAuthTokenResponse, FacebookPageInfo } from "@/types/integrations";

const FACEBOOK_GRAPH_API = "https://graph.facebook.com/v18.0";
const FACEBOOK_OAUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";

export function getFacebookAuthUrl(projectId: string, redirectUri: string): string {
    const params = new URLSearchParams({
        client_id: env.FACEBOOK_APP_ID!,
        redirect_uri: redirectUri,
        state: projectId,
        scope: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
        response_type: "code",
    });

    return `${FACEBOOK_OAUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
    code: string,
    redirectUri: string
): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
        client_id: env.FACEBOOK_APP_ID!,
        client_secret: env.FACEBOOK_APP_SECRET!,
        redirect_uri: redirectUri,
        code,
    });

    const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Facebook token exchange failed: ${error.error?.message || "Unknown error"}`
        );
    }

    return response.json();
}

export async function getUserPages(accessToken: string): Promise<FacebookPageInfo[]> {
    const response = await fetch(
        `${FACEBOOK_GRAPH_API}/me/accounts?access_token=${accessToken}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Failed to fetch Facebook pages: ${error.error?.message || "Unknown error"}`
        );
    }

    const data = await response.json();
    return data.data || [];
}

export async function verifyToken(accessToken: string): Promise<boolean> {
    try {
        const response = await fetch(
            `${FACEBOOK_GRAPH_API}/me?access_token=${accessToken}`
        );
        return response.ok;
    } catch {
        return false;
    }
}

export async function getLongLivedToken(
    shortLivedToken: string
): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: env.FACEBOOK_APP_ID!,
        client_secret: env.FACEBOOK_APP_SECRET!,
        fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Failed to get long-lived token: ${error.error?.message || "Unknown error"}`
        );
    }

    return response.json();
}
