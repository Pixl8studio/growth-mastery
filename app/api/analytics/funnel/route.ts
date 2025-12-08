/**
 * Funnel Analytics API
 * Provides real-time analytics from funnel_analytics and contact_events tables
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
    const requestLogger = logger.child({ handler: "get-funnel-analytics" });

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get("project_id");
        const timeRange = searchParams.get("time_range") || "30"; // days

        if (!projectId) {
            return NextResponse.json({ error: "Missing project_id" }, { status: 400 });
        }

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - parseInt(timeRange));

        requestLogger.info(
            { projectId, timeRange, dateThreshold },
            "Fetching funnel analytics"
        );

        // Get registrations count
        const { count: registrations } = await supabase
            .from("contacts")
            .select("*", { count: "exact", head: true })
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id)
            .gte("created_at", dateThreshold.toISOString());

        // Get video views count (unique contacts who watched at least 25%)
        const { count: views } = await supabase
            .from("contacts")
            .select("*", { count: "exact", head: true })
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id)
            .gte("video_watch_percentage", 25)
            .gte("created_at", dateThreshold.toISOString());

        // Get enrollments (viewed enrollment page)
        const { count: enrollments } = await supabase
            .from("contacts")
            .select("*", { count: "exact", head: true })
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id)
            .eq("current_stage", "enrolled")
            .gte("created_at", dateThreshold.toISOString());

        // Get revenue from payment transactions
        const { data: transactions } = await supabase
            .from("payment_transactions")
            .select("amount")
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id)
            .eq("status", "succeeded")
            .gte("created_at", dateThreshold.toISOString());

        const revenue =
            transactions?.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0) || 0;

        // Calculate rates
        const watchRate = registrations ? (views! / registrations) * 100 : 0;
        const enrollmentRate = views ? (enrollments! / views) * 100 : 0;
        const revenuePerRegistrant = registrations ? revenue / registrations : 0;

        const analyticsData = {
            registrations: registrations || 0,
            views: views || 0,
            enrollments: enrollments || 0,
            revenue,
            watchRate: Math.round(watchRate * 10) / 10,
            enrollmentRate: Math.round(enrollmentRate * 10) / 10,
            revenuePerRegistrant: Math.round(revenuePerRegistrant * 100) / 100,
        };

        requestLogger.info({ analyticsData }, "Funnel analytics retrieved");

        return NextResponse.json(analyticsData);
    } catch (error) {
        requestLogger.error({ error }, "Failed to get analytics");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "fetch_funnel_analytics",
                endpoint: "GET /api/analytics/funnel",
            },
            extra: {
                projectId,
                timeRange,
            },
        });
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
