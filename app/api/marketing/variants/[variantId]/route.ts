/**
 * Variant Detail API
 * Get and update specific variant
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, NotFoundError } from "@/lib/errors";
import {
    runPreflightValidation,
    createPreflightStatus,
} from "@/lib/marketing/preflight-service";

type RouteContext = {
    params: Promise<{ variantId: string }>;
};

/**
 * GET /api/marketing/variants/[variantId]
 * Get a specific variant
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

        const { variantId } = await context.params;

        const { data: variant, error } = await supabase
            .from("marketing_post_variants")
            .select("*")
            .eq("id", variantId)
            .single();

        if (error || !variant) {
            throw new NotFoundError("Variant");
        }

        // Verify ownership
        if (variant.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this variant");
        }

        return NextResponse.json({
            success: true,
            variant,
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/marketing/variants/[variantId]");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "GET /api/marketing/variants/[variantId]",
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
 * PUT /api/marketing/variants/[variantId]
 * Update a variant (manual editing)
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

        const { variantId } = await context.params;
        const body = await request.json();

        // Get existing variant
        const { data: variant, error: fetchError } = await supabase
            .from("marketing_post_variants")
            .select("*")
            .eq("id", variantId)
            .single();

        if (fetchError || !variant) {
            throw new NotFoundError("Variant");
        }

        // Verify ownership
        if (variant.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this variant");
        }

        // Build update object
        const updates: any = {};

        if (body.copy_text !== undefined) updates.copy_text = body.copy_text;
        if (body.media_urls !== undefined) updates.media_urls = body.media_urls;
        if (body.alt_text !== undefined) updates.alt_text = body.alt_text;
        if (body.hashtags !== undefined) updates.hashtags = body.hashtags;
        if (body.caption !== undefined) updates.caption = body.caption;
        if (body.cta_config !== undefined) updates.cta_config = body.cta_config;
        if (body.link_strategy !== undefined)
            updates.link_strategy = body.link_strategy;

        updates.updated_at = new Date().toISOString();

        // Re-run preflight validation if content changed
        if (body.copy_text || body.media_urls || body.alt_text) {
            // Get brief for profile ID
            const { data: brief } = await supabase
                .from("marketing_content_briefs")
                .select("marketing_profile_id")
                .eq("id", variant.content_brief_id)
                .single();

            if (brief && brief.marketing_profile_id) {
                const updatedVariant = { ...variant, ...updates };
                const preflightResult = await runPreflightValidation(
                    updatedVariant,
                    variant.platform,
                    brief.marketing_profile_id
                );

                if (preflightResult.success && preflightResult.result) {
                    updates.preflight_status = createPreflightStatus(
                        preflightResult.result
                    );
                }
            }
        }

        const { data: updated, error } = await supabase
            .from("marketing_post_variants")
            .update(updates)
            .eq("id", variantId)
            .select()
            .single();

        if (error || !updated) {
            logger.error({ error, variantId }, "Failed to update variant");
            return NextResponse.json(
                { error: "Failed to update variant" },
                { status: 500 }
            );
        }

        logger.info({ variantId, userId: user.id }, "Variant updated");

        return NextResponse.json({
            success: true,
            variant: updated,
        });
    } catch (error) {
        logger.error({ error }, "Error in PUT /api/marketing/variants/[variantId]");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "PUT /api/marketing/variants/[variantId]",
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
