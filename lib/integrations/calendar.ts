/**
 * Google Calendar API Client
 *
 * Handles Google Calendar OAuth and calendar operations.
 */

import { env } from "@/lib/env";
import type { OAuthTokenResponse, GoogleCalendarInfo } from "@/types/integrations";

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";

export function getCalendarAuthUrl(projectId: string, redirectUri: string): string {
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
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
            `Calendar token exchange failed: ${error.error_description || "Unknown error"}`
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
            `Calendar token refresh failed: ${error.error_description || "Unknown error"}`
        );
    }

    return response.json();
}

export async function listCalendars(
    accessToken: string
): Promise<GoogleCalendarInfo[]> {
    const response = await fetch(`${CALENDAR_API_URL}/users/me/calendarList`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Failed to list calendars: ${error.error?.message || "Unknown error"}`
        );
    }

    const data = await response.json();
    return data.items || [];
}

export async function verifyToken(accessToken: string): Promise<boolean> {
    try {
        const response = await fetch(`${CALENDAR_API_URL}/users/me/calendarList`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.ok;
    } catch {
        return false;
    }
}

export async function createEvent(
    accessToken: string,
    calendarId: string,
    event: {
        summary: string;
        description?: string;
        start: { dateTime: string; timeZone: string };
        end: { dateTime: string; timeZone: string };
        attendees?: Array<{ email: string }>;
    }
): Promise<void> {
    const response = await fetch(`${CALENDAR_API_URL}/calendars/${calendarId}/events`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Failed to create event: ${error.error?.message || "Unknown error"}`
        );
    }
}
