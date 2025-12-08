/**
 * Calendar OAuth Callback Route
 *
 * Handles Google Calendar OAuth callback and stores connection.
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { exchangeCodeForToken, listCalendars } from "@/lib/integrations/calendar";
import { getUserInfo } from "@/lib/integrations/gmail";
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

        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/funnel/${projectId}/integrations/calendar/callback`;

        const tokenResponse = await exchangeCodeForToken(code, redirectUri);
        const calendars = await listCalendars(tokenResponse.access_token);
        const userInfo = await getUserInfo(tokenResponse.access_token);

        const primaryCalendar = calendars.find((c) => c.primary) || calendars[0];

        if (!primaryCalendar) {
            throw new Error("No calendars found");
        }

        const supabase = await createClient();

        const expiresAt = tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
            : null;

        await supabase.from("funnel_calendar_connections").upsert({
            funnel_project_id: projectId,
            user_id: user.id,
            provider: "google",
            account_email: userInfo.email,
            access_token: encryptToken(tokenResponse.access_token),
            refresh_token: tokenResponse.refresh_token
                ? encryptToken(tokenResponse.refresh_token)
                : null,
            token_expires_at: expiresAt,
            calendar_id: primaryCalendar.id,
            calendar_name: primaryCalendar.summary,
            is_active: true,
            connected_at: new Date().toISOString(),
            metadata: { timezone: primaryCalendar.timezone },
        });

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder/${projectId}?tab=settings`
        );
    } catch (error) {
        logger.error({ error, action: "calendar_callback" }, "Calendar callback error");
        Sentry.captureException(error, {
            tags: { component: "api", action: "calendar_callback" },
        });
        const { projectId } = await params;
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/funnel-builder/${projectId}?tab=settings&error=calendar_connection_failed`
        );
    }
}
