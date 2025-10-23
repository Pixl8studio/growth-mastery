/**
 * Gamma Deck Generation API
 * Generates beautiful presentations using Gamma AI
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ValidationError, AuthenticationError } from "@/lib/errors";
import { z } from "zod";

// Use console logging to avoid Pino worker thread issues in API routes
const log = {
    info: (message: string, data?: any) =>
        console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : ""),
    error: (message: string, data?: any) =>
        console.error(`[ERROR] ${message}`, data ? JSON.stringify(data, null, 2) : ""),
};

// Gamma API configuration
const GAMMA_API_URL = "https://public-api.gamma.app/v0.2/generations";
const GAMMA_API_KEY = process.env.GAMMA_API_KEY || process.env.GAMMA_AI_API;

const generateGammaDeckSchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
    deckStructureId: z.string().uuid("Invalid deck structure ID"),
    settings: z.object({
        theme: z.string().default("nebulae"),
        style: z.string().default("professional"),
        length: z.string().default("full"),
    }),
});

interface GammaGenerationRequest {
    inputText: string;
    textMode?: string;
    format?: string;
    themeName?: string;
    numCards?: number;
    cardSplit?: string;
    additionalInstructions?: string;
    textOptions?: {
        amount?: string;
        tone?: string;
        audience?: string;
        language?: string;
    };
    imageOptions?: {
        source?: string;
        model?: string;
        style?: string;
    };
    cardOptions?: {
        dimensions?: string;
    };
}

interface GammaGenerationResponse {
    generationId: string;
}

interface GammaStatusResponse {
    status: string;
    generationId: string;
    gammaUrl?: string;
    credits?: {
        deducted: number;
        remaining: number;
    };
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verify authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new AuthenticationError("User not authenticated");
        }

        // Parse and validate request
        const body = await request.json();
        const validationResult = generateGammaDeckSchema.safeParse(body);

        if (!validationResult.success) {
            throw new ValidationError(
                `Invalid input: ${validationResult.error.issues.map((i) => i.message).join(", ")}`
            );
        }

        const { projectId, deckStructureId, settings } = validationResult.data;

        log.info("🎨 Generating Gamma deck", {
            projectId,
            deckStructureId,
            settings,
            userId: user.id,
        });

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("*")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            throw new ValidationError("Project not found or access denied");
        }

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

        // Create gamma deck record
        const deckTitle = `${project.name} - Gamma Presentation`;

        const { data: gammaDeck, error: createError } = await supabase
            .from("gamma_decks")
            .insert({
                funnel_project_id: projectId,
                deck_structure_id: deckStructureId,
                user_id: user.id,
                title: deckTitle,
                status: "generating",
                generation_status: "processing",
                theme_name: settings.theme,
                settings,
                metadata: {
                    template_type: deckStructure.template_type,
                },
            })
            .select()
            .single();

        if (createError || !gammaDeck) {
            log.error("Failed to create gamma deck record", { error: createError });
            throw new Error("Failed to create gamma deck record");
        }

        // Prepare content for Gamma
        const inputText = prepareContentForGamma(deckStructure, project, settings);

        // Build Gamma API request
        const gammaRequest = buildGammaRequest(inputText, settings, deckStructure);

        // Start Gamma generation
        log.info("🚀 Starting Gamma API generation", { deckId: gammaDeck.id });
        const generationResponse = await startGammaGeneration(gammaRequest);

        // Update with generation ID
        await supabase
            .from("gamma_decks")
            .update({
                gamma_session_id: generationResponse.generationId,
            })
            .eq("id", gammaDeck.id);

        // Poll for completion (with timeout)
        log.info("⏳ Polling for completion", {
            generationId: generationResponse.generationId,
        });

        try {
            const finalResult = await pollGammaStatus(generationResponse.generationId);

            // Update with completed status
            const { data: updatedDeck, error: updateError } = await supabase
                .from("gamma_decks")
                .update({
                    status: "completed",
                    generation_status: "completed",
                    deck_url: finalResult.gammaUrl,
                    deck_data: {
                        credits: finalResult.credits,
                        completedAt: new Date().toISOString(),
                    },
                })
                .eq("id", gammaDeck.id)
                .select()
                .single();

            if (updateError) {
                log.error("Failed to update deck with completion", {
                    error: updateError,
                });
            }

            log.info("✅ Gamma deck completed", {
                deckId: gammaDeck.id,
                url: finalResult.gammaUrl,
            });

            return NextResponse.json({
                success: true,
                gammaDeck: {
                    id: updatedDeck?.id || gammaDeck.id,
                    title: deckTitle,
                    status: "completed",
                    gamma_session_id: generationResponse.generationId,
                    deck_url: finalResult.gammaUrl,
                    settings,
                    created_at: gammaDeck.created_at,
                },
            });
        } catch (pollError) {
            // Update with failed status
            await supabase
                .from("gamma_decks")
                .update({
                    status: "failed",
                    generation_status: "failed",
                    deck_data: {
                        error:
                            pollError instanceof Error
                                ? pollError.message
                                : "Generation failed",
                        failedAt: new Date().toISOString(),
                    },
                })
                .eq("id", gammaDeck.id);

            throw pollError;
        }
    } catch (error) {
        log.error("❌ Failed to generate Gamma deck", { error });

        if (error instanceof ValidationError || error instanceof AuthenticationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate Gamma deck. Please try again." },
            { status: 500 }
        );
    }
}

/**
 * Prepare content from deck structure for Gamma
 */
function prepareContentForGamma(
    deckStructure: any,
    project: any,
    settings: any
): string {
    log.info("📝 Preparing content for Gamma API");

    const title =
        deckStructure.metadata?.title || project.name || "Masterclass Presentation";
    const slides = deckStructure.slides || [];

    let inputText = `# ${title}\n\n`;

    // Build content from slides
    if (slides.length > 0) {
        for (const slide of slides) {
            if (slide.title) {
                inputText += `## ${slide.title}\n`;
            }
            if (slide.description) {
                inputText += `${slide.description}\n\n`;
            }
        }
    } else {
        // Fallback content
        inputText += `## Introduction
Welcome to this transformative presentation.

## Overview
Discover the key concepts that will change everything.

## The Framework
A proven system for achieving remarkable results.

## Implementation
Step-by-step guidance for success.

## Results
Real outcomes from real applications.

## Next Steps
How to get started today.`;
    }

    log.info("✅ Content prepared", {
        length: inputText.length,
        slideCount: slides.length,
    });
    return inputText;
}

/**
 * Build Gamma API request
 */
function buildGammaRequest(
    inputText: string,
    settings: any,
    deckStructure: any
): GammaGenerationRequest {
    log.info("🔧 Building Gamma API request");

    // Determine slide count based on template type
    const isTestMode = deckStructure.template_type === "5_slide_test";
    const slideCount = isTestMode ? 5 : 55;

    // Map styles to tone
    const toneMap: { [key: string]: string } = {
        professional: "professional, authoritative",
        creative: "creative, engaging, dynamic",
        minimal: "clean, concise, focused",
        dynamic: "energetic, inspiring, motivational",
    };

    const tone = toneMap[settings.style] || "professional, engaging";

    return {
        inputText,
        textMode: "generate",
        format: "presentation",
        themeName: settings.theme,
        numCards: slideCount,
        cardSplit: "auto",
        additionalInstructions: `Create a compelling ${slideCount}-slide business presentation. Make each slide engaging with clear headings and actionable content.`,
        textOptions: {
            amount: isTestMode ? "medium" : "detailed",
            tone,
            audience: "business professionals, entrepreneurs",
            language: "en",
        },
        imageOptions: {
            source: "aiGenerated",
            model: "flux-1-pro",
            style: "professional, modern, business-focused",
        },
        cardOptions: {
            dimensions: "fluid",
        },
    };
}

/**
 * Start Gamma generation
 */
async function startGammaGeneration(
    request: GammaGenerationRequest
): Promise<GammaGenerationResponse> {
    if (!GAMMA_API_KEY) {
        throw new Error("GAMMA_API_KEY not configured in environment variables");
    }

    log.info("🚀 Calling Gamma API to start generation");

    const response = await fetch(GAMMA_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": GAMMA_API_KEY,
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorText = await response.text();
        log.error("❌ Gamma API error", { status: response.status, error: errorText });
        throw new Error(`Gamma API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    log.info("✅ Gamma generation started", { generationId: result.generationId });
    return result;
}

/**
 * Poll Gamma status until completion
 */
async function pollGammaStatus(
    generationId: string,
    maxWaitTime = 300000
): Promise<GammaStatusResponse> {
    log.info("⏳ Polling Gamma status", { generationId });

    const startTime = Date.now();
    const pollInterval = 5000; // Poll every 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
        const response = await fetch(`${GAMMA_API_URL}/${generationId}`, {
            method: "GET",
            headers: {
                "X-API-KEY": GAMMA_API_KEY!,
                accept: "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Gamma status check error: ${response.status} - ${errorText}`
            );
        }

        const status: GammaStatusResponse = await response.json();
        log.info("📊 Gamma status check", { status: status.status });

        if (status.status === "completed") {
            log.info("🎉 Gamma generation completed", { url: status.gammaUrl });
            return status;
        }

        if (status.status === "failed") {
            log.error("❌ Gamma generation failed", { status });
            throw new Error("Gamma generation failed");
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error("Gamma generation timed out after 5 minutes");
}

// GET handler for testing
export async function GET() {
    return NextResponse.json({
        message: "Gamma deck generation endpoint",
        usage: "POST with projectId, deckStructureId, and settings",
        status: GAMMA_API_KEY ? "ready" : "missing API key",
    });
}
