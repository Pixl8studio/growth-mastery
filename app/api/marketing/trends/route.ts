/**
 * Trends API
 * Fetch trending topics for user's niche
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { getActiveTrends, dismissTrend } from "@/lib/marketing/trend-scanner-service";

/**
 * GET /api/marketing/trends?limit=10
 * Get active trends for user
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
        const limit = parseInt(searchParams.get("limit") || "10");

        const result = await getActiveTrends(user.id, limit);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            trends: result.trends,
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/marketing/trends");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "GET /api/marketing/trends",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/marketing/trends?trend_id=X
 * Dismiss a trend
 */
export async function DELETE(request: NextRequest) {
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
        const trendId = searchParams.get("trend_id");

        if (!trendId) {
            throw new ValidationError("trend_id is required");
        }

        const result = await dismissTrend(trendId, user.id);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        logger.error({ error }, "Error in DELETE /api/marketing/trends");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "DELETE /api/marketing/trends",
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
