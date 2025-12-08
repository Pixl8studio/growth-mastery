/**
 * API route to update watch page details
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const { user } = await getCurrentUserWithProfile();
        const { pageId } = await params;
        const body = await request.json();
        const { vanity_slug } = body;

        const supabase = await createClient();

        // Check if slug already exists for another page
        if (vanity_slug) {
            const { data: existingPage } = await supabase
                .from("watch_pages")
                .select("id")
                .eq("user_id", user.id)
                .eq("vanity_slug", vanity_slug)
                .neq("id", pageId)
                .single();

            if (existingPage) {
                return NextResponse.json(
                    { error: "Slug already in use" },
                    { status: 400 }
                );
            }
        }

        const { data: page, error } = await supabase
            .from("watch_pages")
            .update({ vanity_slug, updated_at: new Date().toISOString() })
            .eq("id", pageId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            logger.error(
                { error, pageId, userId: user.id },
                "Failed to update watch page"
            );
            return NextResponse.json(
                { error: "Failed to update page" },
                { status: 500 }
            );
        }

        logger.info(
            { pageId, vanity_slug, userId: user.id },
            "Watch page updated successfully"
        );

        return NextResponse.json({ success: true, page });
    } catch (error) {
        logger.error({ error }, "Error in watch page update route");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "update_watch_page",
                endpoint: "PATCH /api/pages/watch/[pageId]",
            },
            extra: {
                method: "PATCH",
            },
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
