/**
 * Presentations API - Generate Slides
 * POST /api/presentations/generate
 * Generates AI-powered slide content for a presentation
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
    generatePresentation,
    type PresentationCustomization,
} from "@/lib/presentations/slide-generator";

interface GenerateRequest {
    projectId: string;
    deckStructureId: string;
    customization: PresentationCustomization;
}

export async function POST(request: Request) {
    const startTime = Date.now();

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: GenerateRequest = await request.json();
        const { projectId, deckStructureId, customization } = body;

        if (!projectId || !deckStructureId) {
            return NextResponse.json(
                { error: "projectId and deckStructureId are required" },
                { status: 400 }
            );
        }

        // Verify user owns the project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id, name, user_id")
            .eq("id", projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (project.user_id !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch deck structure
        const { data: deckStructure, error: deckError } = await supabase
            .from("deck_structures")
            .select("*")
            .eq("id", deckStructureId)
            .eq("user_id", user.id)
            .single();

        if (deckError || !deckStructure) {
            return NextResponse.json(
                { error: "Deck structure not found" },
                { status: 404 }
            );
        }

        logger.info(
            { userId: user.id, projectId, deckStructureId },
            "Starting presentation generation"
        );

        // Fetch business profile (optional)
        let businessProfile = null;
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/marketing/profiles?projectId=${projectId}`,
                {
                    headers: {
                        Cookie: request.headers.get("Cookie") || "",
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                if (data.profile) {
                    businessProfile = data.profile;
                }
            }
        } catch {
            logger.warn("Failed to fetch business profile");
        }

        // Fetch brand design
        const { data: brandDesign } = await supabase
            .from("brand_designs")
            .select("*")
            .eq("funnel_project_id", projectId)
            .maybeSingle();

        // Parse deck structure slides
        const slides = Array.isArray(deckStructure.slides) ? deckStructure.slides : [];

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
            logger.error({ error: createError }, "Failed to create presentation");
            throw createError;
        }

        // Generate slides
        const generatedSlides = await generatePresentation({
            deckStructure: {
                id: deckStructure.id,
                title: deckStructure.title || "Presentation",
                slideCount: slides.length,
                slides: slides.map(
                    (
                        s: { title?: string; description?: string; section?: string },
                        i: number
                    ) => ({
                        slideNumber: i + 1,
                        title: s.title || `Slide ${i + 1}`,
                        description: s.description || "",
                        section: s.section || "",
                    })
                ),
            },
            customization: customization || {
                textDensity: "balanced",
                visualStyle: "professional",
                emphasisPreference: "balanced",
                animationLevel: "subtle",
                imageStyle: "photography",
            },
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
            logger.error({ error: updateError }, "Failed to update presentation");
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
