/**
 * Gmail API Client
 *
 * Handles Gmail OAuth and email sending via Google APIs.
 */

import { env } from "@/lib/env";
import type { OAuthTokenResponse, GmailUserInfo } from "@/types/integrations";

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GMAIL_API_URL = "https://www.googleapis.com/gmail/v1/users/me";

export function getGmailAuthUrl(projectId: string, redirectUri: string): string {
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        access_type: "offline",
        prompt: "consent",
        state: projectId,
    });

    return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
    code: string,
    redirectUri: string
): Promise<OAuthTokenResponse> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Gmail token exchange failed: ${error.error_description || "Unknown error"}`
        );
    }

    return response.json();
}

export async function refreshAccessToken(
    refreshToken: string
): Promise<OAuthTokenResponse> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            grant_type: "refresh_token",
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Gmail token refresh failed: ${error.error_description || "Unknown error"}`
        );
    }

    return response.json();
}

export async function getUserInfo(accessToken: string): Promise<GmailUserInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Failed to fetch Gmail user info: ${error.error?.message || "Unknown error"}`
        );
    }

    return response.json();
}

export async function verifyToken(accessToken: string): Promise<boolean> {
    try {
        const response = await fetch(`${GMAIL_API_URL}/profile`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.ok;
    } catch {
        return false;
    }
}

export async function sendEmail(
    accessToken: string,
    to: string,
    subject: string,
    body: string
): Promise<void> {
    const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/html; charset=utf-8",
        "",
        body,
    ].join("\n");

    const encodedEmail = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    const response = await fetch(`${GMAIL_API_URL}/messages/send`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            raw: encodedEmail,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Failed to send email: ${error.error?.message || "Unknown error"}`
        );
    }
}
