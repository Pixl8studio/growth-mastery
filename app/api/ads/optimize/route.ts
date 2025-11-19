/**
 * Ad Optimization API
 * Trigger optimization analysis and execution
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError } from "@/lib/errors";
import { optimizeAllCampaigns, optimizeCampaign } from "@/lib/ads/optimization-engine";

/**
 * POST /api/ads/optimize
 * Run optimization analysis (and optionally execute if autopilot enabled)
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const body = await request.json();
        const { campaign_id, autopilot } = body;

        let results;

        if (campaign_id) {
            // Optimize specific campaign
            results = await optimizeCampaign(campaign_id, user.id, autopilot);
        } else {
            // Optimize all campaigns for user
            const { data: briefs } = await supabase
                .from("marketing_content_briefs")
                .select("id")
                .eq("user_id", user.id)
                .eq("campaign_type", "paid_ad")
                .eq("is_active", true);

            results = [];

            if (briefs && briefs.length > 0) {
                for (const brief of briefs) {
                    const campaignResults = await optimizeCampaign(
                        brief.id,
                        user.id,
                        autopilot
                    );
                    results.push(...campaignResults);
                }
            }
        }

        logger.info(
            { userId: user.id, optimizationsFound: results.length, autopilot },
            "Optimization completed"
        );

        return NextResponse.json({
            success: true,
            optimizations: results,
            autopilot,
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/ads/optimize");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * GET /api/ads/optimize
 * Get optimization recommendations without executing
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
        const campaignId = searchParams.get("campaign_id");

        // Get recommended optimizations (not executed)
        const query = supabase
            .from("marketing_ad_optimizations")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "recommended")
            .order("created_at", { ascending: false });

        if (campaignId) {
            query.eq("content_brief_id", campaignId);
        }

        const { data: optimizations } = await query.limit(50);

        return NextResponse.json({
            success: true,
            optimizations: optimizations || [],
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/ads/optimize");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
