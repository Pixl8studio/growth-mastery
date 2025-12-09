/**
 * Promote to Production API
 * Move content from sandbox to production space
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, NotFoundError } from "@/lib/errors";
import { promoteToProduction } from "@/lib/marketing/publisher-service";

type RouteContext = {
    params: Promise<{ entryId: string }>;
};

/**
 * POST /api/marketing/calendar/[entryId]/promote
 * Promote from sandbox to production
 */
export async function POST(request: NextRequest, context: RouteContext) {
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

        // Verify entry exists and is in sandbox
        const { data: entry } = await supabase
            .from("marketing_content_calendar")
            .select("user_id, space")
            .eq("id", entryId)
            .single();

        if (!entry) {
            throw new NotFoundError("Calendar entry");
        }

        if (entry.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this entry");
        }

        if (entry.space !== "sandbox") {
            return NextResponse.json(
                { error: "Entry is not in sandbox space" },
                { status: 400 }
            );
        }

        const result = await promoteToProduction(entryId, user.id);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info({ entryId, userId: user.id }, "Entry promoted to production");

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        logger.error(
            { error },
            "Error in POST /api/marketing/calendar/[entryId]/promote"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/marketing/calendar/[entryId]/promote",
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
