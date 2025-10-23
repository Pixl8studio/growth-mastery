/**
 * Deck Structure Generation API
 * Generates presentation structure using Magnetic Masterclass Framework
 * Supports 5-slide test mode or full 55-slide deck
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTextWithAI } from "@/lib/ai/client";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";
import fs from "fs";
import path from "path";

// Use console logging to avoid Pino worker thread issues in API routes
const log = {
    info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ""),
    error: (message: string, data?: any) =>
        console.error(`[ERROR] ${message}`, data || ""),
};

const generateDeckStructureSchema = z.object({
    transcriptId: z.string().uuid("Invalid transcript ID"),
    projectId: z.string().uuid("Invalid project ID"),
    slideCount: z.enum(["5", "55"]).optional().default("55"),
});

interface SlideChunk {
    startSlide: number;
    endSlide: number;
    slides: string[];
}

export async function POST(request: NextRequest) {
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

        const { transcriptId, projectId, slideCount } = validationResult.data;
        const isTestMode = slideCount === "5";

        log.info("Generating deck structure with framework", {
            userId: user.id,
            transcriptId,
            projectId,
            slideCount,
            isTestMode,
        });

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

        // Load Magnetic Masterclass Framework template
        const frameworkPath = path.join(
            process.cwd(),
            "templates",
            "2.1 Magnetic Masterclass Framework - 55 Slides.md"
        );

        let frameworkContent: string;
        try {
            frameworkContent = fs.readFileSync(frameworkPath, "utf8");
            log.info("✅ Framework loaded", {
                frameworkLength: frameworkContent.length,
            });
        } catch (error) {
            log.error("❌ Failed to load framework", { error, frameworkPath });
            throw new ValidationError(
                `Framework template not found at ${frameworkPath}`
            );
        }

        // Generate deck based on mode
        let generatedSlides: any[];

        if (isTestMode) {
            // Test mode: Generate first 5 slides only
            log.info("Generating 5-slide test deck");
            const testChunk = extractTestSlides(frameworkContent);
            generatedSlides = await generateSlideChunk(
                transcript.transcript_text,
                testChunk
            );
        } else {
            // Full mode: Generate all 55 slides in chunks
            log.info("Generating full 55-slide deck");
            const slideChunks = splitFrameworkIntoChunks(frameworkContent);
            log.info("📊 Split into chunks", { totalChunks: slideChunks.length });

            const allSlides: any[] = [];
            for (let i = 0; i < slideChunks.length; i++) {
                const chunk = slideChunks[i];
                log.info("🤖 Generating chunk", {
                    chunkIndex: i + 1,
                    totalChunks: slideChunks.length,
                    slideRange: `${chunk.startSlide}-${chunk.endSlide}`,
                });

                try {
                    const chunkSlides = await generateSlideChunk(
                        transcript.transcript_text,
                        chunk
                    );
                    allSlides.push(...chunkSlides);

                    log.info("✅ Chunk completed", {
                        completedChunks: i + 1,
                        totalSlides: allSlides.length,
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
                    // Add placeholder slides for failed chunk
                    const placeholders = generatePlaceholderSlides(
                        chunk.startSlide,
                        chunk.endSlide
                    );
                    allSlides.push(...placeholders);
                }
            }
            generatedSlides = allSlides;
        }

        // Save to database
        const deckTitle = `${isTestMode ? "Test Deck" : "Magnetic Masterclass"} - ${new Date().toLocaleDateString()}`;

        const { data: savedDeck, error: saveError } = await supabase
            .from("deck_structures")
            .insert({
                funnel_project_id: projectId,
                user_id: user.id,
                template_type: isTestMode ? "5_slide_test" : "55_slide_masterclass",
                total_slides: generatedSlides.length,
                slides: generatedSlides,
                sections: {}, // Can be populated later if needed
                metadata: {
                    title: deckTitle,
                    framework: "Magnetic Masterclass",
                    generatedAt: new Date().toISOString(),
                    slideCount: generatedSlides.length,
                    mode: isTestMode ? "test" : "full",
                },
            })
            .select()
            .single();

        if (saveError || !savedDeck) {
            log.error("Failed to save deck", { error: saveError });
            throw new Error("Failed to save deck to database");
        }

        log.info("✅ Deck structure generated and saved", {
            deckId: savedDeck.id,
            slideCount: generatedSlides.length,
        });

        return NextResponse.json({
            success: true,
            deckStructure: {
                id: savedDeck.id,
                title: deckTitle,
                slides: savedDeck.slides,
                template_type: savedDeck.template_type,
                metadata: savedDeck.metadata,
                created_at: savedDeck.created_at,
            },
        });
    } catch (error) {
        log.error("Failed to generate deck structure", { error });

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

/**
 * Extract first 5 slides from framework for test mode
 */
function extractTestSlides(frameworkContent: string): SlideChunk {
    const lines = frameworkContent.split("\n");
    const testSlides: string[] = [];
    let slideCount = 0;

    for (const line of lines) {
        testSlides.push(line);
        const slideMatch = line.match(/^## Slide (\d+):/);
        if (slideMatch) {
            slideCount = parseInt(slideMatch[1]);
            if (slideCount >= 5) {
                break;
            }
        }
    }

    return {
        startSlide: 1,
        endSlide: 5,
        slides: testSlides,
    };
}

/**
 * Split framework into 10-slide chunks
 */
function splitFrameworkIntoChunks(frameworkContent: string): SlideChunk[] {
    const lines = frameworkContent.split("\n");
    const chunks: SlideChunk[] = [];
    let currentChunk: string[] = [];
    let slideCount = 0;
    let chunkStartSlide = 1;
    const slidesPerChunk = 10;

    for (const line of lines) {
        const slideMatch = line.match(/^## Slide (\d+):/);

        if (slideMatch) {
            const slideNumber = parseInt(slideMatch[1]);

            if (
                currentChunk.length > 0 &&
                slideNumber - chunkStartSlide >= slidesPerChunk
            ) {
                chunks.push({
                    startSlide: chunkStartSlide,
                    endSlide: slideNumber - 1,
                    slides: [...currentChunk],
                });

                currentChunk = [];
                chunkStartSlide = slideNumber;
            }

            slideCount = slideNumber;
        }

        currentChunk.push(line);
    }

    // Add final chunk
    if (currentChunk.length > 0) {
        chunks.push({
            startSlide: chunkStartSlide,
            endSlide: slideCount,
            slides: currentChunk,
        });
    }

    return chunks;
}

/**
 * Generate slides for a chunk using AI
 */
async function generateSlideChunk(
    transcript: string,
    chunk: SlideChunk
): Promise<any[]> {
    const chunkContent = chunk.slides.join("\n");

    const prompt = `You are an expert presentation strategist creating a personalized webinar deck. Create slides ${chunk.startSlide}-${chunk.endSlide} following the Magnetic Masterclass Framework exactly.

FRAMEWORK TEMPLATE SECTION FOR THESE SLIDES:
${chunkContent}

TRANSCRIPT TO EXTRACT CLIENT INFORMATION FROM:
${transcript}

CRITICAL INSTRUCTIONS:
1. Follow the Magnetic Masterclass Framework structure EXACTLY - every slide, every section, every purpose
2. Extract the client's specific details from the transcript to populate each slide:
   - Personal story and transformation journey
   - Business model, target audience, pain points
   - Solutions they provide, outcomes they deliver
   - Their unique approach and methodology
   - Credibility markers, results, testimonials
3. Use the framework's Content Strategy, Focus Areas, and Purpose for each slide
4. Match the psychological progression exactly as outlined in the framework
5. Maintain the client's authentic voice and terminology from the transcript
6. Create compelling, conversion-focused content using their real story

OUTPUT FORMAT:
Return a JSON array with objects for each slide. Each object must have:
{
  "slideNumber": 1,
  "title": "Slide title from framework",
  "description": "Content based on framework guidance + client specifics (2-3 sentences)",
  "section": "hook, problem, agitate, solution, offer, or close"
}

Generate slides ${chunk.startSlide}-${chunk.endSlide} as a JSON array. Return ONLY valid JSON, no markdown formatting or explanation.`;

    try {
        const response = await generateTextWithAI(
            [
                {
                    role: "system",
                    content:
                        "You are a presentation expert. Return ONLY valid JSON arrays with no markdown or explanation.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            { maxTokens: 4000 }
        );

        // Parse the JSON response
        const cleanedResponse = response
            .trim()
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "");
        const slides = JSON.parse(cleanedResponse);

        if (!Array.isArray(slides)) {
            throw new Error("Response is not an array");
        }

        return slides;
    } catch (error) {
        log.error("Failed to parse AI response", { error });
        throw error;
    }
}

/**
 * Generate placeholder slides for failed chunks
 */
function generatePlaceholderSlides(startSlide: number, endSlide: number): any[] {
    const slides: any[] = [];
    for (let i = startSlide; i <= endSlide; i++) {
        slides.push({
            slideNumber: i,
            title: `Slide ${i} - To Be Completed`,
            description: "This slide needs to be manually created or regenerated.",
            section: "pending",
        });
    }
    return slides;
}
