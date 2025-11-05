/**
 * Content Generation API
 * Generate story angles and platform variants from a brief
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError, NotFoundError } from "@/lib/errors";
import { generateStoryAngles } from "@/lib/marketing/story-weaver-service";
import { generatePlatformVariants } from "@/lib/marketing/content-architect-service";
import { generateCTA } from "@/lib/marketing/cta-strategist-service";
import {
    runPreflightValidation,
    createPreflightStatus,
} from "@/lib/marketing/preflight-service";
import type { ContentBrief } from "@/types/marketing";

type RouteContext = {
    params: Promise<{ briefId: string }>;
};

/**
 * POST /api/marketing/briefs/[briefId]/generate
 * Generate content from a brief
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

        const { briefId } = await context.params;
        const body = await request.json();

        // Get brief
        const { data: brief, error: briefError } = await supabase
            .from("marketing_content_briefs")
            .select("*")
            .eq("id", briefId)
            .single();

        if (briefError || !brief) {
            throw new NotFoundError("Brief");
        }

        // Verify ownership
        if (brief.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this brief");
        }

        // Update status to generating
        await supabase
            .from("marketing_content_briefs")
            .update({ status: "generating" })
            .eq("id", briefId);

        // Step 1: Generate story angles (unless specific angle provided)
        let storyAngles;
        let selectedAngle;

        if (body.selected_angle) {
            // Use provided angle
            selectedAngle = body.selected_angle;
        } else {
            // Generate 3 angles
            const profileId = brief.marketing_profile_id;
            if (!profileId) {
                throw new ValidationError(
                    "marketing_profile_id required for generation. Create a profile first."
                );
            }

            const anglesResult = await generateStoryAngles(
                brief as ContentBrief,
                profileId
            );

            if (!anglesResult.success || !anglesResult.angles) {
                await supabase
                    .from("marketing_content_briefs")
                    .update({ status: "draft" })
                    .eq("id", briefId);

                return NextResponse.json(
                    { error: anglesResult.error },
                    { status: 500 }
                );
            }

            storyAngles = anglesResult.angles;
            selectedAngle = storyAngles[0]; // Default to first angle
        }

        // Step 2: Generate platform variants
        const variantsResult = await generatePlatformVariants({
            baseContent: body.base_content || selectedAngle.story_outline,
            platforms: body.platforms || brief.target_platforms,
            brief: brief as ContentBrief,
            profileId: brief.marketing_profile_id!,
            storyAngle: selectedAngle,
        });

        if (!variantsResult.success || !variantsResult.variants) {
            await supabase
                .from("marketing_content_briefs")
                .update({ status: "draft" })
                .eq("id", briefId);

            return NextResponse.json({ error: variantsResult.error }, { status: 500 });
        }

        // Step 3: Generate CTAs and run preflight for each variant
        const savedVariants = [];

        for (const variant of variantsResult.variants) {
            // Generate CTA
            const ctaResult = await generateCTA(
                brief as ContentBrief,
                variant.platform!,
                body.base_url
            );

            if (ctaResult.success && ctaResult.cta) {
                variant.cta_config = ctaResult.cta;
                variant.link_strategy = ctaResult.linkStrategy;
            }

            // Run preflight validation
            const preflightResult = await runPreflightValidation(
                variant,
                variant.platform!,
                brief.marketing_profile_id!
            );

            if (preflightResult.success && preflightResult.result) {
                variant.preflight_status = createPreflightStatus(
                    preflightResult.result
                );
            }

            // Save variant
            const { data: saved, error: saveError } = await supabase
                .from("marketing_post_variants")
                .insert({
                    content_brief_id: briefId,
                    user_id: user.id,
                    platform: variant.platform,
                    format_type: variant.format_type,
                    copy_text: variant.copy_text,
                    media_urls: variant.media_urls,
                    alt_text: variant.alt_text,
                    hashtags: variant.hashtags,
                    caption: variant.caption,
                    cta_config: variant.cta_config,
                    link_strategy: variant.link_strategy,
                    story_framework: variant.story_framework,
                    story_angle: variant.story_angle,
                    approval_status: "pending",
                    preflight_status: variant.preflight_status,
                })
                .select()
                .single();

            if (!saveError && saved) {
                savedVariants.push(saved);
            }
        }

        // Update brief status
        await supabase
            .from("marketing_content_briefs")
            .update({ status: "ready" })
            .eq("id", briefId);

        logger.info(
            { briefId, variantCount: savedVariants.length },
            "Content generated successfully"
        );

        return NextResponse.json({
            success: true,
            story_angles: storyAngles,
            variants: savedVariants,
        });
    } catch (error) {
        logger.error(
            { error },
            "Error in POST /api/marketing/briefs/[briefId]/generate"
        );

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
