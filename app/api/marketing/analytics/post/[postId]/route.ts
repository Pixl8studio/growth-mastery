/**
 * Post Analytics API
 * Get analytics for individual post
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, NotFoundError } from "@/lib/errors";

type RouteContext = {
    params: Promise<{ postId: string }>;
};

/**
 * GET /api/marketing/analytics/post/[postId]
 * Get detailed analytics for a specific post
 */
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { postId } = await context.params;

        // Get variant
        const { data: variant, error: variantError } = await supabase
            .from("marketing_post_variants")
            .select("*")
            .eq("id", postId)
            .single();

        if (variantError || !variant) {
            throw new NotFoundError("Post variant");
        }

        // Verify ownership
        if (variant.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this post");
        }

        // Get analytics
        const { data: analytics, error: analyticsError } = await supabase
            .from("marketing_analytics")
            .select("*")
            .eq("post_variant_id", postId)
            .single();

        // Analytics may not exist yet if post not published
        const analyticsData = analyticsError ? null : analytics;

        // Get calendar entry if scheduled/published
        const { data: calendarEntry } = await supabase
            .from("marketing_content_calendar")
            .select("*")
            .eq("post_variant_id", postId)
            .single();

        return NextResponse.json({
            success: true,
            variant,
            analytics: analyticsData,
            calendar_entry: calendarEntry,
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/marketing/analytics/post/[postId]");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "GET /api/marketing/analytics/post/[postId]",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
