/**
 * Twitter (X) API v2 Client
 *
 * Handles Twitter OAuth 2.0 and API interactions.
 */

import crypto from "crypto";
import { env } from "@/lib/env";
import type { OAuthTokenResponse, TwitterUserInfo } from "@/types/integrations";

const TWITTER_API_V2 = "https://api.twitter.com/2";
const TWITTER_OAUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

export function getTwitterAuthUrl(
    projectId: string,
    redirectUri: string,
    codeChallenge: string
): string {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: env.TWITTER_CLIENT_ID!,
        redirect_uri: redirectUri,
        scope: "tweet.read tweet.write users.read offline.access",
        state: projectId,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
    });

    return `${TWITTER_OAUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
    code: string,
    redirectUri: string,
    codeVerifier: string
): Promise<OAuthTokenResponse> {
    const auth = Buffer.from(
        `${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(TWITTER_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Twitter token exchange failed: ${error.error_description || "Unknown error"}`
        );
    }

    return response.json();
}

export async function refreshAccessToken(
    refreshToken: string
): Promise<OAuthTokenResponse> {
    const auth = Buffer.from(
        `${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(TWITTER_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Twitter token refresh failed: ${error.error_description || "Unknown error"}`
        );
    }

    return response.json();
}

export async function getUserInfo(accessToken: string): Promise<TwitterUserInfo> {
    const response = await fetch(
        `${TWITTER_API_V2}/users/me?user.fields=profile_image_url,verified`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Failed to fetch Twitter user: ${error.detail || "Unknown error"}`
        );
    }

    const data = await response.json();
    return data.data;
}

export async function verifyToken(accessToken: string): Promise<boolean> {
    try {
        const response = await fetch(`${TWITTER_API_V2}/users/me`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.ok;
    } catch {
        return false;
    }
}

export function generateCodeChallenge(): { verifier: string; challenge: string } {
    const verifier = generateRandomString(128);
    const challenge = base64URLEncode(sha256(verifier));
    return { verifier, challenge };
}

function generateRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function sha256(str: string): Buffer {
    return crypto.createHash("sha256").update(str).digest();
}

function base64URLEncode(buffer: Buffer): string {
    return buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}
