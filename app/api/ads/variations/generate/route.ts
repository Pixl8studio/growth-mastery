/**
 * Ad Variations Generation API
 * Generate ad variations using AI and funnel data
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { generateAdVariations } from "@/lib/ads/ad-generator";
import type { AdGenerationRequest } from "@/types/ads";
import { GenerateVariationsSchema } from "@/lib/ads/validation-schemas";
import { z } from "zod";

/**
 * POST /api/ads/variations/generate
 * Generate 5 ad variations based on funnel data
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
            validatedData = GenerateVariationsSchema.parse(body);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorMessage = error.issues
                    .map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`)
                    .join(", ");

                Sentry.captureException(error, {
                    tags: {
                        component: "api",
                        action: "validate_variations_request",
                        endpoint: "POST /api/ads/variations/generate",
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

        const { funnel_project_id } = validatedData;

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

        // Load offer data
        const { data: offer } = await supabase
            .from("funnel_offers")
            .select("*")
            .eq("funnel_project_id", funnel_project_id)
            .single();

        // Load intake data
        const { data: intakes } = await supabase
            .from("intake_sessions")
            .select("*")
            .eq("funnel_project_id", funnel_project_id)
            .order("created_at", { ascending: false })
            .limit(1);

        const intake = intakes?.[0];

        // Load marketing profile for brand voice
        const { data: profile } = await supabase
            .from("marketing_profiles")
            .select("*")
            .eq("funnel_project_id", funnel_project_id)
            .eq("is_active", true)
            .single();

        // Build generation request
        const generationRequest: AdGenerationRequest = {
            funnel_project_id,
            offer_data: {
                product_name: offer?.product_name || project.name,
                tagline: offer?.tagline || "",
                promise: offer?.promise || "",
                price: offer?.price || 0,
                currency: offer?.currency || "USD",
                guarantee: offer?.guarantee,
            },
            audience_data: {
                target_audience:
                    intake?.extracted_data?.target_audience || "business owners",
                pain_points: intake?.extracted_data?.pain_points || [
                    "struggling with growth",
                ],
                desired_outcome:
                    intake?.extracted_data?.desired_outcome || "achieve success",
            },
            brand_voice: profile?.brand_voice,
            tone_settings: profile?.tone_settings,
        };

        // Generate variations
        const variations = await generateAdVariations(generationRequest);

        logger.info(
            { funnelProjectId: funnel_project_id, variationCount: variations.length },
            "Ad variations generated"
        );

        return NextResponse.json({
            success: true,
            variations,
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/ads/variations/generate");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate_ad_variations",
                endpoint: "POST /api/ads/variations/generate",
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
