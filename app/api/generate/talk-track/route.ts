/**
 * Talk Track Generation API
 * Generates video script from deck structure
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import { createTalkTrackPrompt } from "@/lib/ai/prompts";
import type { TalkTrack } from "@/lib/ai/types";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

const generateTalkTrackSchema = z.object({
    deckStructureId: z.string().uuid("Invalid deck structure ID"),
});

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "generate-talk-track" });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        const validationResult = generateTalkTrackSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { deckStructureId } = validationResult.data;

        requestLogger.info(
            { userId: user.id, deckStructureId },
            "Generating talk track"
        );

        // Get deck structure
        const { data: deckStructure, error: deckError } = await supabase
            .from("deck_structures")
            .select("*")
            .eq("id", deckStructureId)
            .eq("user_id", user.id)
            .single();

        if (deckError || !deckStructure) {
            throw new ValidationError("Deck structure not found");
        }

        // Generate talk track with AI
        const talkTrack = await generateWithAI<TalkTrack>(
            createTalkTrackPrompt(deckStructure.slides)
        );

        requestLogger.info(
            { userId: user.id, totalDuration: talkTrack.totalDuration },
            "Talk track generated successfully"
        );

        return NextResponse.json({
            success: true,
            talkTrack,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate talk track");

        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate talk track" },
            { status: 500 }
        );
    }
}
