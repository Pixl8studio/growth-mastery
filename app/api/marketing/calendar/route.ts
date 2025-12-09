/**
 * Calendar API
 * Manage scheduled content
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { schedulePost } from "@/lib/marketing/publisher-service";

/**
 * GET /api/marketing/calendar?start=X&end=Y&space=sandbox
 * Fetch calendar entries for date range
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
        const start = searchParams.get("start");
        const end = searchParams.get("end");
        const space = searchParams.get("space");

        let query = supabase
            .from("marketing_content_calendar")
            .select("*, marketing_post_variants(*)")
            .eq("user_id", user.id)
            .order("scheduled_publish_at", { ascending: true });

        if (start) {
            query = query.gte("scheduled_publish_at", start);
        }

        if (end) {
            query = query.lte("scheduled_publish_at", end);
        }

        if (space) {
            query = query.eq("space", space);
        }

        const { data: entries, error } = await query;

        if (error) {
            logger.error({ error }, "Failed to fetch calendar entries");
            return NextResponse.json(
                { error: "Failed to fetch calendar" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            entries: entries || [],
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/marketing/calendar");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "GET /api/marketing/calendar",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * POST /api/marketing/calendar
 * Schedule a post
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

        if (!body.post_variant_id) {
            throw new ValidationError("post_variant_id is required");
        }

        if (!body.scheduled_publish_at) {
            throw new ValidationError("scheduled_publish_at is required");
        }

        // Verify variant ownership
        const { data: variant } = await supabase
            .from("marketing_post_variants")
            .select("user_id")
            .eq("id", body.post_variant_id)
            .single();

        if (!variant || variant.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this variant");
        }

        const result = await schedulePost(
            body.post_variant_id,
            new Date(body.scheduled_publish_at),
            user.id,
            body.space || "sandbox"
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            { calendarId: result.calendarId, variantId: body.post_variant_id },
            "Post scheduled"
        );

        return NextResponse.json({
            success: true,
            calendar_id: result.calendarId,
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/marketing/calendar");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/marketing/calendar",
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
