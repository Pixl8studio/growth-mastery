/**
 * Global Analytics API Endpoint
 *
 * Provides aggregated analytics across all funnels for a user.
 * Returns comprehensive metrics for the AI Followup dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError } from "@/lib/errors";
import { getGlobalAnalytics } from "@/lib/followup/global-analytics-service";

/**
 * GET /api/followup/global-analytics
 *
 * Get comprehensive analytics across all funnel projects for the user.
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        // Optional date range
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("start_date");
        const endDate = searchParams.get("end_date");
        const dateRange =
            startDate && endDate
                ? {
                      start: startDate,
                      end: endDate,
                  }
                : undefined;

        // Get global analytics
        const result = await getGlobalAnalytics(user.id, dateRange);

        if (!result.success) {
            logger.error(
                { error: result.error, userId: user.id },
                "Failed to get global analytics"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            analytics: result.analytics,
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/followup/global-analytics");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
