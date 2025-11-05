/**
 * Publish Status API
 * Check status of a published post
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, NotFoundError } from "@/lib/errors";

type RouteContext = {
    params: Promise<{ publishId: string }>;
};

/**
 * GET /api/marketing/publish/[publishId]/status
 * Get publish status and details
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

        const { publishId } = await context.params;

        // Get calendar entry (publishId is the calendar entry ID)
        const { data: entry, error } = await supabase
            .from("marketing_content_calendar")
            .select("*, marketing_post_variants(*)")
            .eq("id", publishId)
            .single();

        if (error || !entry) {
            throw new NotFoundError("Publish entry");
        }

        // Verify ownership
        if (entry.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this entry");
        }

        // Get analytics if published
        let analytics = null;
        if (entry.publish_status === "published") {
            const { data: analyticsData } = await supabase
                .from("marketing_analytics")
                .select("*")
                .eq("post_variant_id", entry.post_variant_id)
                .single();

            analytics = analyticsData;
        }

        return NextResponse.json({
            success: true,
            entry,
            analytics,
        });
    } catch (error) {
        logger.error(
            { error },
            "Error in GET /api/marketing/publish/[publishId]/status"
        );

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
