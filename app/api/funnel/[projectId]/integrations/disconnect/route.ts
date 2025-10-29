/**
 * Integration Disconnect Route
 *
 * Disconnects any social or calendar integration.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId } = await params;
        const body = await request.json();
        const { provider, type } = body;

        if (!provider) {
            return NextResponse.json(
                { error: "Provider is required" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        if (type === "calendar") {
            await supabase
                .from("funnel_calendar_connections")
                .delete()
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .eq("provider", provider);
        } else {
            await supabase
                .from("funnel_social_connections")
                .delete()
                .eq("funnel_project_id", projectId)
                .eq("user_id", user.id)
                .eq("provider", provider);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Disconnect error:", error);
        return NextResponse.json(
            { error: "Failed to disconnect integration" },
            { status: 500 }
        );
    }
}
