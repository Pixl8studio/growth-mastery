/**
 * Individual Prospect API Endpoint
 *
 * Manages individual prospect operations: get, update watch data, update intake data, opt-out.
 * Supports GET (retrieve), PATCH (update), and DELETE (opt-out) operations.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, NotFoundError, ValidationError } from "@/lib/errors";
import {
    getProspect,
    markProspectConverted,
    optOutProspect,
    updateProspectIntakeData,
    updateProspectWatchData,
} from "@/lib/followup/prospect-service";

type RouteContext = {
    params: Promise<{ prospectId: string }>;
};

/**
 * GET /api/followup/prospects/[prospectId]
 *
 * Get a single prospect by ID.
 */
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();
        const { prospectId } = await context.params;

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        // Fetch prospect
        const result = await getProspect(prospectId);

        if (!result.success) {
            logger.error(
                { error: result.error, prospectId },
                "❌ Failed to fetch prospect"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        if (!result.prospect) {
            throw new NotFoundError("Prospect");
        }

        // Verify ownership
        if (result.prospect.user_id !== user.id) {
            throw new AuthenticationError("Access denied");
        }

        return NextResponse.json({
            success: true,
            prospect: result.prospect,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in GET /api/followup/prospects/[prospectId]");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "get_prospect",
                endpoint: "GET /api/followup/prospects/[prospectId]",
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
 * PATCH /api/followup/prospects/[prospectId]
 *
 * Update prospect data (watch data, intake data, conversion, etc.).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const supabase = await createClient();
        const { prospectId } = await context.params;

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        // Verify ownership
        const prospectResult = await getProspect(prospectId);
        if (!prospectResult.prospect) {
            throw new NotFoundError("Prospect");
        }

        if (prospectResult.prospect.user_id !== user.id) {
            throw new AuthenticationError("Access denied");
        }

        const body = await request.json();

        // Handle different update types
        if (body.watch_data) {
            const result = await updateProspectWatchData(prospectId, body.watch_data);
            if (!result.success) {
                return NextResponse.json({ error: result.error }, { status: 500 });
            }
            return NextResponse.json({ success: true, prospect: result.prospect });
        }

        if (body.intake_data) {
            const result = await updateProspectIntakeData(prospectId, body.intake_data);
            if (!result.success) {
                return NextResponse.json({ error: result.error }, { status: 500 });
            }
            return NextResponse.json({ success: true, prospect: result.prospect });
        }

        if (body.mark_converted) {
            const result = await markProspectConverted(
                prospectId,
                body.conversion_value
            );
            if (!result.success) {
                return NextResponse.json({ error: result.error }, { status: 500 });
            }
            return NextResponse.json({ success: true, prospect: result.prospect });
        }

        throw new ValidationError("No valid update action specified");
    } catch (error) {
        logger.error(
            { error },
            "❌ Error in PATCH /api/followup/prospects/[prospectId]"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "update_prospect",
                endpoint: "PATCH /api/followup/prospects/[prospectId]",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/followup/prospects/[prospectId]
 *
 * Opt out a prospect from all follow-up communications.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { prospectId } = await context.params;

        // Parse optional reason from query params
        const { searchParams } = new URL(request.url);
        const reason = searchParams.get("reason") || undefined;

        logger.info({ prospectId, reason }, "🚫 Processing opt-out request");

        const result = await optOutProspect(prospectId, reason);

        if (!result.success) {
            logger.error({ error: result.error, prospectId }, "❌ Opt-out failed");
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Prospect opted out successfully",
            prospect: result.prospect,
        });
    } catch (error) {
        logger.error(
            { error },
            "❌ Error in DELETE /api/followup/prospects/[prospectId]"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "opt_out_prospect",
                endpoint: "DELETE /api/followup/prospects/[prospectId]",
            },
        });

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
