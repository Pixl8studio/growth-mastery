/**
 * Generate Brand Voice Guidelines API
 *
 * POST /api/followup/generate-brand-voice
 * Generates brand voice guidelines based on business context and product knowledge
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { generateBrandVoiceGuidelines } from "@/lib/marketing/brand-voice-service";
import type { BusinessContext, ProductKnowledge } from "@/types/marketing";

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
        const { businessContext, productKnowledge } = body;

        if (!businessContext || !productKnowledge) {
            throw new ValidationError(
                "businessContext and productKnowledge are required"
            );
        }

        logger.info(
            {
                userId: user.id,
                businessName: businessContext.business_name,
                productName: productKnowledge.product_name,
            },
            "Generating brand voice guidelines"
        );

        const brandVoice = await generateBrandVoiceGuidelines(
            businessContext as BusinessContext,
            productKnowledge as ProductKnowledge
        );

        return NextResponse.json({ success: true, brandVoice });
    } catch (error) {
        logger.error({ error }, "Failed to generate brand voice guidelines");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate_brand_voice",
                endpoint: "POST /api/followup/generate-brand-voice",
            },
        });

        if (error instanceof AuthenticationError || error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error instanceof AuthenticationError ? 401 : 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate brand voice guidelines" },
            { status: 500 }
        );
    }
}
