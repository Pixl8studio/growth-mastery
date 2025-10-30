/**
 * Brief Variants API
 * List all variants for a brief
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, NotFoundError } from "@/lib/errors";

type RouteContext = {
    params: Promise<{ briefId: string }>;
};

/**
 * GET /api/marketing/briefs/[briefId]/variants
 * List all variants for a brief
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

        const { briefId } = await context.params;

        // Verify brief ownership
        const { data: brief } = await supabase
            .from("marketing_content_briefs")
            .select("user_id")
            .eq("id", briefId)
            .single();

        if (!brief) {
            throw new NotFoundError("Brief");
        }

        if (brief.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this brief");
        }

        // Get variants
        const { data: variants, error } = await supabase
            .from("marketing_post_variants")
            .select("*")
            .eq("content_brief_id", briefId)
            .order("created_at", { ascending: false });

        if (error) {
            logger.error({ error, briefId }, "Failed to fetch variants");
            return NextResponse.json(
                { error: "Failed to fetch variants" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            variants: variants || [],
        });
    } catch (error) {
        logger.error(
            { error },
            "Error in GET /api/marketing/briefs/[briefId]/variants"
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
