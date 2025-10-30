/**
 * LinkedIn OAuth Integration
 * Handles OAuth flow and API communication with LinkedIn
 */

import { env } from "@/lib/env";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";

/**
 * Generate LinkedIn OAuth authorization URL
 */
export function getLinkedInAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: env.LINKEDIN_CLIENT_ID || "",
        redirect_uri: redirectUri,
        state,
        scope: "w_member_social r_basicprofile r_liteprofile", // Scopes for posting and profile
    });

    return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
    code: string,
    redirectUri: string
): Promise<{
    access_token: string;
    expires_in: number;
}> {
    const response = await fetch(LINKEDIN_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            client_id: env.LINKEDIN_CLIENT_ID || "",
            client_secret: env.LINKEDIN_CLIENT_SECRET || "",
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LinkedIn token exchange failed: ${error}`);
    }

    return response.json();
}

/**
 * Get user profile information
 */
export async function getUserInfo(accessToken: string): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
}> {
    const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch LinkedIn user info");
    }

    const data = await response.json();

    return {
        id: data.id,
        firstName: data.localizedFirstName || "",
        lastName: data.localizedLastName || "",
        profilePicture: data.profilePicture?.displayImage || undefined,
    };
}

/**
 * Create a LinkedIn post (UGC Post)
 */
export async function createPost(
    accessToken: string,
    authorUrn: string, // Person URN
    content: {
        text: string;
        mediaUrl?: string;
    }
): Promise<{ id: string; url: string }> {
    const payload: any = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
            "com.linkedin.ugc.ShareContent": {
                shareCommentary: {
                    text: content.text,
                },
                shareMediaCategory: content.mediaUrl ? "IMAGE" : "NONE",
            },
        },
        visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
    };

    // Add media if provided
    if (content.mediaUrl) {
        payload.specificContent["com.linkedin.ugc.ShareContent"].media = [
            {
                status: "READY",
                originalUrl: content.mediaUrl,
            },
        ];
    }

    const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LinkedIn post creation failed: ${error}`);
    }

    const data = await response.json();

    return {
        id: data.id,
        url: `https://www.linkedin.com/feed/update/${data.id}`,
    };
}

/**
 * Refresh access token (LinkedIn tokens expire)
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
}> {
    const response = await fetch(LINKEDIN_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: env.LINKEDIN_CLIENT_ID || "",
            client_secret: env.LINKEDIN_CLIENT_SECRET || "",
        }),
    });

    if (!response.ok) {
        throw new Error("LinkedIn token refresh failed");
    }

    return response.json();
}
