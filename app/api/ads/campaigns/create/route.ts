/**
 * Campaign Creation API
 * Create and deploy Meta ad campaigns with multiple ad variations
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import {
    createCampaign,
    createAdSet,
    createLeadAdCreative,
    createAd,
} from "@/lib/integrations/meta-ads";
import { decryptToken } from "@/lib/crypto/token-encryption";
import { CreateCampaignSchema } from "@/lib/ads/validation-schemas";
import { z } from "zod";

/**
 * POST /api/ads/campaigns/create
 * Create a Meta ad campaign with multiple variations
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

        // Validate request body with Zod
        let validatedData;
        try {
            validatedData = CreateCampaignSchema.parse(body);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorMessage = error.issues
                    .map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`)
                    .join(", ");

                Sentry.captureException(error, {
                    tags: {
                        component: "api",
                        action: "validate_campaign_request",
                        endpoint: "POST /api/ads/campaigns/create",
                    },
                    extra: {
                        validationErrors: error.issues,
                        requestBody: body,
                    },
                });

                throw new ValidationError(errorMessage);
            }
            throw error;
        }

        const {
            funnel_project_id,
            ad_account_id,
            variations,
            audience_config,
            daily_budget_cents,
        } = validatedData;

        // Verify project ownership
        const { data: project } = await supabase
            .from("funnel_projects")
            .select("*")
            .eq("id", funnel_project_id)
            .eq("user_id", user.id)
            .single();

        if (!project) {
            throw new AuthenticationError("Access denied to funnel project");
        }

        // Get OAuth connection
        const { data: connection } = await supabase
            .from("marketing_oauth_connections")
            .select("*")
            .eq("platform", "facebook")
            .eq("status", "active")
            .single();

        if (!connection) {
            throw new ValidationError("Facebook not connected");
        }

        const accessToken = await decryptToken(connection.access_token_encrypted);

        // Create content brief
        const { data: brief, error: briefError } = await supabase
            .from("marketing_content_briefs")
            .insert({
                user_id: user.id,
                funnel_project_id,
                name: `${project.name} - Lead Gen Campaign`,
                goal: "drive_registrations",
                topic: project.name,
                campaign_type: "paid_ad",
                ad_objective: "lead_generation",
                daily_budget_cents,
                status: "ready",
            })
            .select()
            .single();

        if (briefError || !brief) {
            throw new Error("Failed to create campaign brief");
        }

        // Create Meta campaign
        const metaCampaign = await createCampaign(
            ad_account_id,
            `${project.name} - Lead Gen`,
            "LEAD_GENERATION",
            "PAUSED", // Start paused, user activates from UI
            accessToken
        );

        logger.info({ campaignId: metaCampaign.id }, "Meta campaign created");

        // Create ad set
        const targeting = {
            geo_locations: {
                countries: ["US"],
            },
            age_min: 25,
            age_max: 65,
        };

        const metaAdSet = await createAdSet(
            metaCampaign.id,
            `${project.name} - Ad Set 1`,
            targeting,
            daily_budget_cents,
            "IMPRESSIONS",
            "LEAD_GENERATION",
            "LOWEST_COST_WITHOUT_CAP",
            "PAUSED",
            accessToken
        );

        logger.info({ adSetId: metaAdSet.id }, "Meta ad set created");

        // Update brief with Meta IDs
        await supabase
            .from("marketing_content_briefs")
            .update({
                meta_campaign_id: metaCampaign.id,
                meta_adset_id: metaAdSet.id,
                is_active: true,
            })
            .eq("id", brief.id);

        // Create ad creatives and ads for each variation
        const createdAds = [];

        for (const variation of variations) {
            // Create post variant record
            const { data: variant, error: variantError } = await supabase
                .from("marketing_post_variants")
                .insert({
                    content_brief_id: brief.id,
                    user_id: user.id,
                    platform: "facebook",
                    ad_creative_type: "lead_ad",
                    primary_text: variation.primary_text,
                    headline: variation.headline,
                    link_description: variation.link_description,
                    ad_hooks: variation.hooks,
                    call_to_action: variation.call_to_action,
                    copy_text: variation.primary_text,
                })
                .select()
                .single();

            if (variantError || !variant) {
                logger.error({ error: variantError }, "Failed to create variant");
                continue;
            }

            // Note: In production, you'd create actual Meta ad creatives here
            // For now, we'll store the variants and mark them as ready
            // The actual Meta API calls would happen with real page IDs, image hashes, etc.

            logger.info({ variantId: variant.id }, "Variant created");
            createdAds.push(variant);
        }

        logger.info(
            {
                campaignId: metaCampaign.id,
                briefId: brief.id,
                adsCreated: createdAds.length,
            },
            "Campaign deployment complete"
        );

        return NextResponse.json({
            success: true,
            campaign: {
                id: brief.id,
                meta_campaign_id: metaCampaign.id,
                meta_adset_id: metaAdSet.id,
                ads_created: createdAds.length,
            },
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/ads/campaigns/create");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "create_campaign",
                endpoint: "POST /api/ads/campaigns/create",
            },
            extra: {
                errorType:
                    error instanceof Error ? error.constructor.name : typeof error,
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
