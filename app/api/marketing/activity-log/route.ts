/**
 * Marketing Activity Log API
 * Retrieve audit trail of marketing actions
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Authenticate user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get query params
        const searchParams = request.nextUrl.searchParams;
        const funnelProjectId = searchParams.get("funnel_project_id");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // For now, return mock activity log data
        // In production, this would query a marketing_activity_log table
        const mockActivities = [
            {
                id: "1",
                action: "Created content brief",
                details: "Q4 Lead Gen Campaign",
                user_id: user.id,
                created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
                id: "2",
                action: "Generated variants",
                details: "Created 4 platform variants",
                user_id: user.id,
                created_at: new Date(Date.now() - 7200000).toISOString(),
            },
            {
                id: "3",
                action: "Approved variant",
                details: "Instagram post approved for publishing",
                user_id: user.id,
                created_at: new Date(Date.now() - 10800000).toISOString(),
            },
            {
                id: "4",
                action: "Scheduled post",
                details: "Scheduled for tomorrow at 9:00 AM",
                user_id: user.id,
                created_at: new Date(Date.now() - 14400000).toISOString(),
            },
            {
                id: "5",
                action: "Updated profile settings",
                details: "Modified tone settings and brand voice",
                user_id: user.id,
                created_at: new Date(Date.now() - 86400000).toISOString(),
            },
        ];

        logger.info(
            { userId: user.id, funnelProjectId, limit },
            "Activity log retrieved"
        );

        return NextResponse.json({
            success: true,
            activities: mockActivities.slice(offset, offset + limit),
            total: mockActivities.length,
        });
    } catch (error) {
        logger.error({ error }, "Failed to retrieve activity log");

        return NextResponse.json(
            {
                success: false,
                error: "Failed to retrieve activity log",
            },
            { status: 500 }
        );
    }
}
