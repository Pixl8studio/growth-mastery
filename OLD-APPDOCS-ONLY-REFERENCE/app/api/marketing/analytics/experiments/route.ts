/**
 * Experiments Analytics API
 * Get A/B test results and experiment performance
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError } from "@/lib/errors";

/**
 * GET /api/marketing/analytics/experiments?funnel_project_id=X
 * Get all experiments and results
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
        const status = searchParams.get("status");

        // Get all briefs for this funnel
        let query = supabase
            .from("marketing_experiments")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (funnelProjectId) {
            // Join through briefs to filter by funnel
            const { data: briefs } = await supabase
                .from("marketing_content_briefs")
                .select("id")
                .eq("funnel_project_id", funnelProjectId);

            if (briefs && briefs.length > 0) {
                const briefIds = briefs.map((b) => b.id);
                query = query.in("content_brief_id", briefIds);
            }
        }

        if (status) {
            query = query.eq("status", status);
        }

        const { data: experiments, error } = await query;

        if (error) {
            logger.error({ error }, "Failed to fetch experiments");
            return NextResponse.json(
                { error: "Failed to fetch experiments" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            experiments: experiments || [],
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/marketing/analytics/experiments");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
