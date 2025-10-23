/**
 * Talk Track Generation API
 * Generates video script from deck structure
 * Generates 2-4 sentences per slide in chunks for better quality
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTextWithAI } from "@/lib/ai/client";
import type { Slide } from "@/lib/ai/types";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

// Use console logging to avoid Pino worker thread issues in API routes
const log = {
    info: (message: string, data?: unknown) =>
        console.log(`[INFO] ${message}`, data || ""),
    error: (message: string, data?: unknown) =>
        console.error(`[ERROR] ${message}`, data || ""),
};

const generateTalkTrackSchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
    deckStructureId: z.string().uuid("Invalid deck structure ID"),
});

interface SlideChunk {
    startSlide: number;
    endSlide: number;
    slides: Slide[];
}

interface TalkTrackSlide {
    slideNumber: number;
    script: string;
    duration: number;
    notes: string;
}

export async function POST(request: NextRequest) {
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

        const { projectId, deckStructureId } = validationResult.data;

        log.info("🎤 Starting talk track generation", {
            userId: user.id,
            projectId,
            deckStructureId,
        });

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

        log.info("📊 Deck structure loaded", {
            slideCount: deckStructure.slides.length,
            title: deckStructure.title,
        });

        const allTalkTrackSlides: TalkTrackSlide[] = [];

        // Only chunk if more than 10 slides, otherwise generate all at once
        if (deckStructure.slides.length <= 10) {
            log.info("🚀 Generating talk track for all slides in one request", {
                slideCount: deckStructure.slides.length,
            });

            const talkTrack = await generateTalkTrackChunk(deckStructure.slides);
            allTalkTrackSlides.push(...talkTrack);

            log.info("✅ Talk track generation completed", {
                totalSlides: allTalkTrackSlides.length,
            });
        } else {
            // Split slides into chunks of 10 for better quality generation
            const slideChunks = splitSlidesIntoChunks(deckStructure.slides);
            log.info("📦 Split into chunks", { totalChunks: slideChunks.length });

            // Generate talk track for each chunk
            for (let i = 0; i < slideChunks.length; i++) {
                const chunk = slideChunks[i];
                log.info("🤖 Generating talk track chunk", {
                    chunkIndex: i + 1,
                    totalChunks: slideChunks.length,
                    slideRange: `${chunk.startSlide}-${chunk.endSlide}`,
                });

                try {
                    const chunkTalkTrack = await generateTalkTrackChunk(chunk.slides);
                    allTalkTrackSlides.push(...chunkTalkTrack);

                    log.info("✅ Chunk completed", {
                        completedChunks: i + 1,
                        totalSlides: allTalkTrackSlides.length,
                    });

                    // Add delay between chunks to avoid rate limits
                    if (i < slideChunks.length - 1) {
                        await new Promise((resolve) => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    log.error("❌ Chunk generation failed", {
                        error,
                        chunk: `${chunk.startSlide}-${chunk.endSlide}`,
                    });
                    throw error;
                }
            }
        }

        // Calculate total duration
        const totalDuration = allTalkTrackSlides.reduce(
            (sum, slide) => sum + slide.duration,
            0
        );

        // Format content as readable text
        const content = formatTalkTrackContent(allTalkTrackSlides);

        // Save to database
        const { data: savedTalkTrack, error: saveError } = await supabase
            .from("talk_tracks")
            .insert({
                funnel_project_id: projectId,
                deck_structure_id: deckStructureId,
                user_id: user.id,
                content,
                slide_timings: {
                    totalDuration: Math.round(totalDuration),
                    slides: allTalkTrackSlides.map((s) => ({
                        slideNumber: s.slideNumber,
                        duration: s.duration,
                    })),
                },
                total_duration: Math.round(totalDuration),
            })
            .select()
            .single();

        if (saveError || !savedTalkTrack) {
            log.error("❌ Failed to save talk track", { error: saveError });
            throw new Error("Failed to save talk track to database");
        }

        log.info("✅ Talk track saved successfully", {
            talkTrackId: savedTalkTrack.id,
            totalSlides: allTalkTrackSlides.length,
            totalDuration,
        });

        return NextResponse.json({
            success: true,
            talkTrack: savedTalkTrack,
        });
    } catch (error) {
        log.error("❌ Failed to generate talk track", { error });

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

/**
 * Split slides into chunks of 10 for better generation quality
 */
function splitSlidesIntoChunks(slides: Slide[]): SlideChunk[] {
    const chunks: SlideChunk[] = [];
    const slidesPerChunk = 10;

    for (let i = 0; i < slides.length; i += slidesPerChunk) {
        const chunkSlides = slides.slice(i, i + slidesPerChunk);
        chunks.push({
            startSlide: i + 1,
            endSlide: Math.min(i + slidesPerChunk, slides.length),
            slides: chunkSlides,
        });
    }

    return chunks;
}

/**
 * Generate talk track for a chunk of slides
 * Creates 2-4 sentences per slide
 */
async function generateTalkTrackChunk(slides: Slide[]): Promise<TalkTrackSlide[]> {
    const slidesDescription = slides
        .map(
            (s) =>
                `Slide ${s.slideNumber}: ${s.title}\n${s.description}\nSection: ${s.section}`
        )
        .join("\n\n");

    const response = await generateTextWithAI(
        [
            {
                role: "system",
                content: `You are a master presentation coach creating a video script for a pitch presentation.

Generate a natural, conversational script for slides. For EACH slide, provide:
- 2-4 compelling sentences that the presenter will say
- Natural transitions between slides
- Conversational language (use "you", be authentic)
- Estimated duration in seconds (15-30 seconds per slide)
- Delivery notes (tone, pacing, emphasis)

Return ONLY a JSON object with this exact structure:
{
  "slides": [
    {
      "slideNumber": 1,
      "script": "2-4 sentences of what to say for this slide",
      "duration": 25,
      "notes": "Delivery notes (tone, pacing, emphasis)"
    }
  ]
}

Each script must be exactly 2-4 sentences, conversational, and compelling.`,
            },
            {
                role: "user",
                content: `Generate a talk track for these slides:

SLIDES:
${slidesDescription}

Return ONLY the JSON object. No markdown, no explanation.`,
            },
        ],
        { maxTokens: 4000 }
    );

    // Parse the JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("Invalid AI response format");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.slides as TalkTrackSlide[];
}

/**
 * Format talk track slides into readable text content
 */
function formatTalkTrackContent(slides: TalkTrackSlide[]): string {
    let content = "# Talk Track Script\n\n";
    content += `Total Duration: ${Math.round(slides.reduce((sum, s) => sum + s.duration, 0) / 60)} minutes\n\n`;
    content += "---\n\n";

    for (const slide of slides) {
        content += `## Slide ${slide.slideNumber}\n`;
        content += `**Duration**: ${slide.duration} seconds\n\n`;
        content += `**Script**:\n${slide.script}\n\n`;
        content += `**Delivery Notes**: ${slide.notes}\n\n`;
        content += "---\n\n";
    }

    return content;
}
