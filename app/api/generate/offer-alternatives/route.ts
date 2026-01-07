/**
 * Generate Alternative Offer Variations
 * Creates 3 strategic offer variations: value-focused, premium, and scale-optimized
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateTextWithAI } from "@/lib/ai/client";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

const generateAlternativesSchema = z.object({
    baseOfferId: z.string().uuid("Invalid offer ID"),
    projectId: z.string().uuid("Invalid project ID"),
});

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "generate-offer-alternatives" });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const validationResult = generateAlternativesSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { baseOfferId, projectId } = validationResult.data;

        requestLogger.info(
            { userId: user.id, baseOfferId, projectId },
            "Generating alternative offers"
        );

        // Get base offer
        const { data: baseOffer, error: offerError } = await supabase
            .from("offers")
            .select("*")
            .eq("id", baseOfferId)
            .eq("user_id", user.id)
            .single();

        if (offerError || !baseOffer) {
            throw new ValidationError("Base offer not found");
        }

        // Get transcript for context
        const { data: transcripts } = await supabase
            .from("vapi_transcripts")
            .select("transcript_text, extracted_data")
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);

        const transcript = transcripts?.[0];

        // Generate 3 alternative offers
        const prompt = `You are an expert offer strategist creating strategic offer variations.

BASE OFFER:
${JSON.stringify(baseOffer, null, 2)}

${transcript ? `BUSINESS CONTEXT:\n${transcript.transcript_text.substring(0, 1500)}...` : ""}

Create 3 alternative offer variations:

1. VALUE-FOCUSED: Lower price point ($${Math.round(baseOffer.price * 0.5)}-$${Math.round(baseOffer.price * 0.7)}), essential features only, perfect for entry-level clients
2. PREMIUM: Higher price point ($${Math.round(baseOffer.price * 1.5)}-$${Math.round(baseOffer.price * 2)}), comprehensive features, more bonuses, enhanced support
3. SCALE-OPTIMIZED: Mid-tier sweet spot ($${Math.round(baseOffer.price * 0.8)}-$${Math.round(baseOffer.price * 1.2)}), best conversion potential, balanced value

Each variation should include all Irresistible Offer Framework fields and be strategically different.

Return ONLY a JSON object:
{
  "variations": [
    {
      "type": "value",
      "name": "Offer name",
      "tagline": "Tagline",
      "price": 497,
      "currency": "USD",
      "promise": "The transformation (2-3 sentences)",
      "person": "Ideal client (2-3 sentences)",
      "process": "Method/framework (2-3 sentences)",
      "purpose": "Deeper why (2-3 sentences)",
      "pathway": "book_call or direct_purchase",
      "features": ["Feature 1", "Feature 2", "Feature 3"],
      "bonuses": ["Bonus 1", "Bonus 2", "Bonus 3"],
      "guarantee": "Guarantee statement",
      "keyDifference": "What makes this variation unique"
    },
    {
      "type": "premium",
      // ... same structure
    },
    {
      "type": "scale",
      // ... same structure
    }
  ]
}

CRITICAL:
- Set pathway based on price (>= $2000 = book_call, < $2000 = direct_purchase)
- Include 3-6 features and 3-5 bonuses per variation
- Make each variation strategically distinct`;

        const response = await generateTextWithAI(
            [
                { role: "system", content: "You are an expert offer strategist." },
                { role: "user", content: prompt },
            ],
            { maxTokens: 4000 }
        );

        // Parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Invalid AI response format");
        }

        const alternatives = JSON.parse(jsonMatch[0]);

        requestLogger.info(
            { userId: user.id, variationCount: alternatives.variations?.length },
            "Alternative offers generated successfully"
        );

        return NextResponse.json({
            success: true,
            alternatives: alternatives.variations,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate alternative offers");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate-offer-alternatives",
                endpoint: "POST /api/generate/offer-alternatives",
            },
            extra: {
                baseOfferId: (error as any).baseOfferId,
                projectId: (error as any).projectId,
            },
        });

        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate alternative offers" },
            { status: 500 }
        );
    }
}
