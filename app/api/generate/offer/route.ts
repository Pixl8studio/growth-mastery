/**
 * Offer Generation API
 * Generates offer with AI from VAPI transcript
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import { createOfferGenerationPrompt } from "@/lib/ai/prompts";
import type { OfferGeneration } from "@/lib/ai/types";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

const generateOfferSchema = z.object({
    transcriptId: z.string().uuid("Invalid transcript ID"),
    projectId: z.string().uuid("Invalid project ID"),
});

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "generate-offer" });

    try {
        const supabase = await createClient();

        // Verify authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse request body
        const body = await request.json();

        const validationResult = generateOfferSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { transcriptId, projectId } = validationResult.data;

        requestLogger.info(
            { userId: user.id, transcriptId, projectId },
            "Generating offer"
        );

        // Get transcript
        const { data: transcript, error: transcriptError } = await supabase
            .from("vapi_transcripts")
            .select("*")
            .eq("id", transcriptId)
            .eq("user_id", user.id)
            .single();

        if (transcriptError || !transcript) {
            throw new ValidationError("Transcript not found");
        }

        // Generate offer with AI
        const generatedOffer = await generateWithAI<OfferGeneration>(
            createOfferGenerationPrompt({
                transcript_text: transcript.transcript_text,
                extracted_data: transcript.extracted_data,
            })
        );

        requestLogger.info(
            {
                userId: user.id,
                offerName: generatedOffer.name,
                price: generatedOffer.price,
            },
            "Offer generated successfully"
        );

        // Save offer to database with 7 P's framework
        const { data: savedOffer, error: saveError } = await supabase
            .from("offers")
            .insert({
                funnel_project_id: projectId,
                user_id: user.id,
                name: generatedOffer.name,
                tagline: generatedOffer.tagline,
                price: generatedOffer.price,
                currency: generatedOffer.currency,
                features: generatedOffer.features,
                bonuses: generatedOffer.bonuses,
                guarantee: generatedOffer.guarantee,
                // 7 P's Framework
                promise: generatedOffer.promise,
                person: generatedOffer.person,
                process: generatedOffer.process,
                purpose: generatedOffer.purpose,
                pathway: generatedOffer.pathway,
                max_features: 6,
                max_bonuses: 5,
            })
            .select()
            .single();

        if (saveError || !savedOffer) {
            requestLogger.error(
                { error: saveError },
                "Failed to save offer to database"
            );
            throw new Error("Failed to save offer to database");
        }

        requestLogger.info(
            { userId: user.id, offerId: savedOffer.id, offerName: savedOffer.name },
            "Offer saved to database successfully"
        );

        return NextResponse.json({
            success: true,
            offer: savedOffer,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate offer");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate-offer",
                endpoint: "POST /api/generate/offer",
            },
            extra: {
                transcriptId: (error as any).transcriptId,
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
            { error: "Failed to generate offer" },
            { status: 500 }
        );
    }
}
