/**
 * Enrollment Copy Generation API
 * Generates sales copy for enrollment pages
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import { createEnrollmentCopyPrompt } from "@/lib/ai/prompts";
import type { EnrollmentCopy } from "@/lib/ai/types";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

const generateEnrollmentCopySchema = z.object({
    offerId: z.string().uuid("Invalid offer ID"),
    transcriptId: z.string().uuid("Invalid transcript ID"),
    pageType: z.enum(["direct_purchase", "book_call"]).default("direct_purchase"),
});

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "generate-enrollment-copy" });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        const validationResult = generateEnrollmentCopySchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { offerId, transcriptId, pageType } = validationResult.data;

        requestLogger.info(
            { userId: user.id, offerId, pageType },
            "Generating enrollment copy"
        );

        // Get offer
        const { data: offer, error: offerError } = await supabase
            .from("offers")
            .select("*")
            .eq("id", offerId)
            .eq("user_id", user.id)
            .single();

        if (offerError || !offer) {
            throw new ValidationError("Offer not found");
        }

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

        // Generate copy with AI
        const copy = await generateWithAI<EnrollmentCopy>(
            createEnrollmentCopyPrompt(
                {
                    name: offer.name,
                    tagline: offer.tagline,
                    features: offer.features,
                    bonuses: offer.bonuses,
                    guarantee: offer.guarantee,
                },
                {
                    transcript_text: transcript.transcript_text,
                    extracted_data: transcript.extracted_data,
                },
                pageType
            )
        );

        requestLogger.info(
            { userId: user.id },
            "Enrollment copy generated successfully"
        );

        return NextResponse.json({
            success: true,
            copy,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate enrollment copy");

        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate enrollment copy" },
            { status: 500 }
        );
    }
}
