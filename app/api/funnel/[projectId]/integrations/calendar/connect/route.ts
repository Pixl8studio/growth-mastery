/**
 * Calendar OAuth Connect Route
 *
 * Initiates Google Calendar OAuth flow for funnel-level connection.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCalendarAuthUrl } from "@/lib/integrations/calendar";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId } = await params;
        const { searchParams } = new URL(request.url);
        const redirectUri =
            searchParams.get("redirect_uri") ||
            `${process.env.NEXT_PUBLIC_APP_URL}/api/funnel/${projectId}/integrations/calendar/callback`;

        const authUrl = getCalendarAuthUrl(projectId, redirectUri);

        return NextResponse.json({ url: authUrl });
    } catch (error) {
        console.error("Calendar connect error:", error);
        return NextResponse.json(
            { error: "Failed to initiate calendar connection" },
            { status: 500 }
        );
    }
}
