/**
 * Deck Structure Generation API
 * Generates 55-slide presentation structure with AI
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import { createDeckStructurePrompt } from "@/lib/ai/prompts";
import type { DeckStructure } from "@/lib/ai/types";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

const generateDeckStructureSchema = z.object({
    transcriptId: z.string().uuid("Invalid transcript ID"),
    projectId: z.string().uuid("Invalid project ID"),
});

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "generate-deck-structure" });

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

        const validationResult = generateDeckStructureSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { transcriptId, projectId } = validationResult.data;

        requestLogger.info(
            { userId: user.id, transcriptId, projectId },
            "Generating deck structure"
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

        // Generate deck structure with AI
        const deckStructure = await generateWithAI<DeckStructure>(
            createDeckStructurePrompt({
                transcript_text: transcript.transcript_text,
                extracted_data: transcript.extracted_data,
            })
        );

        requestLogger.info(
            {
                userId: user.id,
                totalSlides: deckStructure.slides.length,
                sections: deckStructure.sections,
            },
            "Deck structure generated successfully"
        );

        return NextResponse.json({
            success: true,
            deckStructure,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate deck structure");

        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate deck structure" },
            { status: 500 }
        );
    }
}
