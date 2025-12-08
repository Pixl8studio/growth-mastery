/**
 * API route to toggle publish status for enrollment pages
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfileForAPI } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const { user } = await getCurrentUserWithProfileForAPI();
        const { pageId } = await params;
        const { published } = await request.json();

        const supabase = await createClient();

        const { data: page, error } = await supabase
            .from("enrollment_pages")
            .update({ is_published: published })
            .eq("id", pageId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            logger.error(
                { error, pageId, userId: user.id },
                "Failed to update enrollment page publish status"
            );
            return NextResponse.json(
                { error: "Failed to update page" },
                { status: 500 }
            );
        }

        logger.info(
            { pageId, published, userId: user.id },
            "Enrollment page publish status updated"
        );

        return NextResponse.json({ success: true, page });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Handle authentication errors
        if (errorMessage === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        logger.error({ error }, "Error in enrollment page publish route");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "toggle_enrollment_page_publish",
                endpoint: "POST /api/pages/enrollment/[pageId]/publish",
            },
            extra: {
                errorMessage,
            },
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
