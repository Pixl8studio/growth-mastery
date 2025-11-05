/**
 * Test Publish API
 * Test publish to sandbox without actually posting
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { runPreflightValidation } from "@/lib/marketing/preflight-service";

/**
 * POST /api/marketing/publish/test
 * Validate content without publishing
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

        // Get variant
        const { data: variant, error: variantError } = await supabase
            .from("marketing_post_variants")
            .select("*")
            .eq("id", body.post_variant_id)
            .single();

        if (variantError || !variant) {
            return NextResponse.json({ error: "Variant not found" }, { status: 404 });
        }

        // Verify ownership
        if (variant.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this variant");
        }

        // Get profile for validation
        const { data: brief } = await supabase
            .from("marketing_content_briefs")
            .select("marketing_profile_id")
            .eq("id", variant.content_brief_id)
            .single();

        if (!brief || !brief.marketing_profile_id) {
            return NextResponse.json(
                { error: "Profile not found for validation" },
                { status: 400 }
            );
        }

        // Run preflight validation
        const result = await runPreflightValidation(
            variant as any,
            variant.platform as any,
            brief.marketing_profile_id
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            {
                variantId: body.post_variant_id,
                passed: result.result?.passed,
            },
            "Test publish validation complete"
        );

        return NextResponse.json({
            success: true,
            validation: result.result,
            ready_to_publish: result.result?.passed || false,
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/marketing/publish/test");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
