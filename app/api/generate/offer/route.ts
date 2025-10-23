/**
 * Offer Generation API
 * Generates offer with AI from VAPI transcript
 */

import { NextRequest, NextResponse } from "next/server";
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
        const offer = await generateWithAI<OfferGeneration>(
            createOfferGenerationPrompt({
                transcript_text: transcript.transcript_text,
                extracted_data: transcript.extracted_data,
            })
        );

        requestLogger.info(
            { userId: user.id, offerName: offer.name, price: offer.price },
            "Offer generated successfully"
        );

        return NextResponse.json({
            success: true,
            offer,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate offer");

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
