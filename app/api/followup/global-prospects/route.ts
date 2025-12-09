/**
 * Global Prospects API Endpoint
 *
 * Fetches all prospects across all funnels for the authenticated user.
 * Supports filtering, searching, and sorting.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { getGlobalProspects } from "@/lib/followup/global-analytics-service";

/**
 * GET /api/followup/global-prospects
 *
 * Get all prospects for the user across all funnels.
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
        const segment = searchParams.get("segment");
        const minIntentScore = searchParams.get("min_intent_score");
        const converted = searchParams.get("converted");
        const funnelProjectId = searchParams.get("funnel_project_id");
        const search = searchParams.get("search");

        // Build filters
        const filters: {
            segment?: string;
            minIntentScore?: number;
            converted?: boolean;
            funnelProjectId?: string;
            search?: string;
        } = {};

        if (segment) {
            filters.segment = segment;
        }

        if (minIntentScore) {
            filters.minIntentScore = parseInt(minIntentScore, 10);
        }

        if (converted !== null) {
            filters.converted = converted === "true";
        }

        if (funnelProjectId) {
            filters.funnelProjectId = funnelProjectId;
        }

        if (search) {
            filters.search = search;
        }

        // Fetch prospects
        const result = await getGlobalProspects(user.id, filters);

        if (!result.success) {
            logger.error(
                { error: result.error, userId: user.id },
                "Failed to fetch global prospects"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            prospects: result.prospects || [],
            count: result.prospects?.length || 0,
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/followup/global-prospects");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "get_global_prospects",
                endpoint: "GET /api/followup/global-prospects",
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
