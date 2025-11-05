/**
 * Analytics API Endpoint
 *
 * Provides analytics data for AI follow-up engine performance.
 * Returns deliverability, engagement, conversion, and segment metrics.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { getDashboardAnalytics } from "@/lib/followup/analytics-service";

/**
 * GET /api/followup/analytics
 *
 * Get complete analytics for a funnel project.
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

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const funnelProjectId = searchParams.get("funnel_project_id");

        if (!funnelProjectId) {
            throw new ValidationError("funnel_project_id query parameter is required");
        }

        // Verify ownership
        const { data: project } = await supabase
            .from("funnel_projects")
            .select("user_id")
            .eq("id", funnelProjectId)
            .single();

        if (!project || project.user_id !== user.id) {
            throw new AuthenticationError("Access denied to funnel project");
        }

        // Optional date range
        const startDate = searchParams.get("start_date");
        const endDate = searchParams.get("end_date");
        const dateRange =
            startDate && endDate
                ? {
                      start: startDate,
                      end: endDate,
                  }
                : undefined;

        // Get analytics
        const result = await getDashboardAnalytics(funnelProjectId, dateRange);

        if (!result.success) {
            logger.error(
                { error: result.error, funnelProjectId },
                "❌ Failed to get analytics"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            analytics: result.analytics,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in GET /api/followup/analytics");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
