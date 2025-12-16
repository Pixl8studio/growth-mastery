/**
 * Presentations API - Generate Slides
 * POST /api/presentations/generate
 * Generates AI-powered slide content for a presentation
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { generatePresentation } from "@/lib/presentations/slide-generator";

// Zod schema for presentation customization
const PresentationCustomizationSchema = z.object({
    textDensity: z.enum(["minimal", "balanced", "detailed"]),
    visualStyle: z.enum(["professional", "creative", "minimal", "bold"]),
    emphasisPreference: z.enum(["text", "visuals", "balanced"]),
    animationLevel: z.enum(["none", "subtle", "moderate", "dynamic"]),
    imageStyle: z.enum(["photography", "illustration", "abstract", "icons"]),
});

// Zod schema for generate request
const GenerateRequestSchema = z.object({
    projectId: z.string().uuid("projectId must be a valid UUID"),
    deckStructureId: z.string().uuid("deckStructureId must be a valid UUID"),
    customization: PresentationCustomizationSchema.optional(),
});

// Zod schema for deck structure slides from JSONB
const DeckStructureSlideSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    section: z.string().optional(),
});

export async function POST(request: Request) {
    const startTime = Date.now();
    let presentationId: string | null = null;

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse and validate input with Zod
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            throw new ValidationError("Invalid JSON body");
        }

        const validation = GenerateRequestSchema.safeParse(body);
        if (!validation.success) {
            const errorMessage = validation.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join(", ");
            throw new ValidationError(errorMessage);
        }

        const { projectId, deckStructureId, customization } = validation.data;

        // Parallel database queries for project, deck structure, and brand design
        const [
            projectResult,
            deckStructureResult,
            brandDesignResult,
            businessProfileResult,
        ] = await Promise.all([
            supabase
                .from("funnel_projects")
                .select("id, name, user_id")
                .eq("id", projectId)
                .single(),
            supabase
                .from("deck_structures")
                .select("*")
                .eq("id", deckStructureId)
                .eq("user_id", user.id)
                .single(),
            supabase
                .from("brand_designs")
                .select("*")
                .eq("funnel_project_id", projectId)
                .maybeSingle(),
            // Direct Supabase query instead of internal HTTP call (fixes SSRF vulnerability)
            supabase
                .from("business_profiles")
                .select("*")
                .eq("funnel_project_id", projectId)
                .maybeSingle(),
        ]);

        const { data: project, error: projectError } = projectResult;
        const { data: deckStructure, error: deckError } = deckStructureResult;
        const { data: brandDesign } = brandDesignResult;
        const { data: businessProfile, error: profileError } = businessProfileResult;

        if (projectError || !project) {
            throw new NotFoundError("Project");
        }

        if (project.user_id !== user.id) {
            throw new ForbiddenError("You do not have access to this project");
        }

        if (deckError || !deckStructure) {
            throw new NotFoundError("Deck structure");
        }

        // Log if business profile fetch failed (but don't throw - it's optional)
        if (profileError) {
            logger.warn(
                { error: profileError, projectId },
                "Failed to fetch business profile - continuing without it"
            );
        }

        logger.info(
            { userId: user.id, projectId, deckStructureId },
            "Starting presentation generation"
        );

        // Validate and parse deck structure slides from JSONB
        const rawSlides = Array.isArray(deckStructure.slides)
            ? deckStructure.slides
            : [];
        const validatedSlides = rawSlides.map((slide: unknown, index: number) => {
            const parsed = DeckStructureSlideSchema.safeParse(slide);
            if (parsed.success) {
                return parsed.data;
            }
            // Log validation issue but provide fallback
            logger.warn(
                { slideIndex: index, errors: parsed.error.issues },
                "Slide validation failed, using fallback"
            );
            return { title: `Slide ${index + 1}`, description: "", section: "" };
        });

        // Create presentation record
        const { data: presentation, error: createError } = await supabase
            .from("presentations")
            .insert({
                user_id: user.id,
                funnel_project_id: projectId,
                deck_structure_id: deckStructureId,
                title: deckStructure.title || "Untitled Presentation",
                customization: customization || {},
                status: "generating",
                slides: [],
                generation_progress: 0,
            })
            .select()
            .single();

        if (createError) {
            logger.error(
                { error: createError, projectId },
                "Failed to create presentation record"
            );
            throw createError;
        }

        presentationId = presentation.id;

        // Default customization values
        const finalCustomization = customization || {
            textDensity: "balanced" as const,
            visualStyle: "professional" as const,
            emphasisPreference: "balanced" as const,
            animationLevel: "subtle" as const,
            imageStyle: "photography" as const,
        };

        // Generate slides with error handling for transaction safety
        let generatedSlides;
        try {
            generatedSlides = await generatePresentation({
                deckStructure: {
                    id: deckStructure.id,
                    title: deckStructure.title || "Presentation",
                    slideCount: validatedSlides.length,
                    slides: validatedSlides.map(
                        (s: z.infer<typeof DeckStructureSlideSchema>, i: number) => ({
                            slideNumber: i + 1,
                            title: s.title || `Slide ${i + 1}`,
                            description: s.description || "",
                            section: s.section || "",
                        })
                    ),
                },
                customization: finalCustomization,
                businessProfile: businessProfile || undefined,
                brandDesign: brandDesign || undefined,
                onSlideGenerated: async (slide, progress) => {
                    // Update progress in database
                    await supabase
                        .from("presentations")
                        .update({ generation_progress: progress })
                        .eq("id", presentation.id);
                },
            });
        } catch (generationError) {
            // Transaction safety: Mark presentation as failed if generation fails
            const errorMessage =
                generationError instanceof Error
                    ? generationError.message
                    : "Unknown generation error";

            logger.error(
                { error: generationError, presentationId: presentation.id },
                "Slide generation failed, marking presentation as failed"
            );

            await supabase
                .from("presentations")
                .update({
                    status: "failed",
                    error_message: errorMessage,
                })
                .eq("id", presentation.id);

            throw generationError;
        }

        // Update presentation with generated slides
        const { error: updateError } = await supabase
            .from("presentations")
            .update({
                slides: generatedSlides,
                status: "completed",
                generation_progress: 100,
                completed_at: new Date().toISOString(),
            })
            .eq("id", presentation.id);

        if (updateError) {
            logger.error(
                { error: updateError, presentationId: presentation.id },
                "Failed to update presentation with generated slides"
            );
            throw updateError;
        }

        const totalTime = (Date.now() - startTime) / 1000;

        logger.info(
            {
                userId: user.id,
                presentationId: presentation.id,
                slideCount: generatedSlides.length,
                totalTime,
            },
            "Presentation generation complete"
        );

        return NextResponse.json({
            success: true,
            presentationId: presentation.id,
            slides: generatedSlides,
            slideCount: generatedSlides.length,
            generationTime: totalTime,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // If we have a presentation ID and it's not already marked as failed, mark it
        if (
            presentationId &&
            !(error instanceof ValidationError) &&
            !(error instanceof NotFoundError)
        ) {
            try {
                const supabase = await createClient();
                await supabase
                    .from("presentations")
                    .update({
                        status: "failed",
                        error_message: errorMessage,
                    })
                    .eq("id", presentationId);
            } catch (updateError) {
                logger.error(
                    { error: updateError, presentationId },
                    "Failed to mark presentation as failed"
                );
            }
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        logger.error({ error }, "Presentation generation failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate_presentation",
                endpoint: "POST /api/presentations/generate",
            },
        });

        return NextResponse.json(
            { error: "Presentation generation failed", details: errorMessage },
            { status: 500 }
        );
    }
}
