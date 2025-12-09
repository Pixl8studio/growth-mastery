/**
 * Marketing Analytics API
 * Dashboard analytics for marketing content performance
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { getDashboardAnalytics } from "@/lib/marketing/analytics-collector-service";

/**
 * GET /api/marketing/analytics?funnel_project_id=X
 * Get comprehensive analytics dashboard
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { searchParams } = new URL(request.url);
        const funnelProjectId = searchParams.get("funnel_project_id");

        if (!funnelProjectId) {
            throw new ValidationError("funnel_project_id is required");
        }

        // Verify project ownership
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
            startDate && endDate ? { start: startDate, end: endDate } : undefined;

        const result = await getDashboardAnalytics(funnelProjectId, dateRange);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            dashboard: result.dashboard,
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/marketing/analytics");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "GET /api/marketing/analytics",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
