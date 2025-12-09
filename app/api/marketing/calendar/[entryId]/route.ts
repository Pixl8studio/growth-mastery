/**
 * Calendar Entry Detail API
 * Update and delete calendar entries
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, NotFoundError } from "@/lib/errors";
import { cancelScheduledPost } from "@/lib/marketing/publisher-service";

type RouteContext = {
    params: Promise<{ entryId: string }>;
};

/**
 * PUT /api/marketing/calendar/[entryId]
 * Reschedule or update a calendar entry
 */
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { entryId } = await context.params;
        const body = await request.json();

        // Verify ownership
        const { data: entry } = await supabase
            .from("marketing_content_calendar")
            .select("user_id")
            .eq("id", entryId)
            .single();

        if (!entry) {
            throw new NotFoundError("Calendar entry");
        }

        if (entry.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this entry");
        }

        // Build updates
        const updates: any = {};

        if (body.scheduled_publish_at !== undefined) {
            updates.scheduled_publish_at = body.scheduled_publish_at;
        }

        if (body.publish_notes !== undefined) {
            updates.publish_notes = body.publish_notes;
        }

        updates.updated_at = new Date().toISOString();

        const { data: updated, error } = await supabase
            .from("marketing_content_calendar")
            .update(updates)
            .eq("id", entryId)
            .select()
            .single();

        if (error || !updated) {
            logger.error({ error, entryId }, "Failed to update calendar entry");
            return NextResponse.json(
                { error: "Failed to update entry" },
                { status: 500 }
            );
        }

        logger.info({ entryId, userId: user.id }, "Calendar entry updated");

        return NextResponse.json({
            success: true,
            entry: updated,
        });
    } catch (error) {
        logger.error({ error }, "Error in PUT /api/marketing/calendar/[entryId]");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "PUT /api/marketing/calendar/[entryId]",
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

/**
 * DELETE /api/marketing/calendar/[entryId]
 * Cancel a scheduled post
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { entryId } = await context.params;

        const result = await cancelScheduledPost(entryId, user.id);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info({ entryId, userId: user.id }, "Calendar entry cancelled");

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        logger.error({ error }, "Error in DELETE /api/marketing/calendar/[entryId]");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "DELETE /api/marketing/calendar/[entryId]",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
