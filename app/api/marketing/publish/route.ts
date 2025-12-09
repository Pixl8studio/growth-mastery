/**
 * Publish API
 * Immediately publish content to platforms
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { publishNow } from "@/lib/marketing/publisher-service";

/**
 * POST /api/marketing/publish
 * Publish content immediately
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

        if (!body.platform) {
            throw new ValidationError("platform is required");
        }

        // Verify variant ownership
        const { data: variant } = await supabase
            .from("marketing_post_variants")
            .select("user_id, platform")
            .eq("id", body.post_variant_id)
            .single();

        if (!variant || variant.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this variant");
        }

        // Publish
        const result = await publishNow(body.post_variant_id, body.platform, user.id);

        if (!result.success) {
            logger.error(
                { error: result.error, variantId: body.post_variant_id },
                "Publishing failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            {
                variantId: body.post_variant_id,
                platform: body.platform,
                providerPostId: result.providerPostId,
            },
            "Content published"
        );

        return NextResponse.json({
            success: true,
            provider_post_id: result.providerPostId,
            platform_url: result.platformUrl,
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/marketing/publish");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/marketing/publish",
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
