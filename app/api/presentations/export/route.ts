/**
 * Presentations API - Export to PPTX
 * POST /api/presentations/export
 * Exports a presentation to PowerPoint format
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ValidationError, NotFoundError } from "@/lib/errors";
import {
    generatePptx,
    SlideDataSchema,
    type SlideData,
} from "@/lib/presentations/pptx-generator";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/middleware/rate-limit";

// Zod schema for export request
const ExportRequestSchema = z.object({
    presentationId: z.string().uuid("presentationId must be a valid UUID"),
});

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limiting - 20 requests per minute for export
        const rateLimitIdentifier = getRateLimitIdentifier(request, user.id);
        const rateLimitResponse = await checkRateLimit(
            rateLimitIdentifier,
            "presentation-export"
        );
        if (rateLimitResponse) {
            logger.warn(
                { userId: user.id, endpoint: "presentation-export" },
                "Rate limit exceeded for presentation export"
            );
            return rateLimitResponse;
        }

        // Parse and validate input with Zod
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            throw new ValidationError("Invalid JSON body");
        }

        const validation = ExportRequestSchema.safeParse(body);
        if (!validation.success) {
            const errorMessage = validation.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join(", ");
            throw new ValidationError(errorMessage);
        }

        const { presentationId } = validation.data;

        // Fetch presentation
        const { data: presentation, error: presentationError } = await supabase
            .from("presentations")
            .select("*")
            .eq("id", presentationId)
            .eq("user_id", user.id)
            .single();

        if (presentationError || !presentation) {
            throw new NotFoundError("Presentation");
        }

        if (!presentation.slides || presentation.slides.length === 0) {
            throw new ValidationError("Presentation has no slides to export");
        }

        // Validate slides from JSONB
        const validatedSlides: SlideData[] = [];
        for (let i = 0; i < presentation.slides.length; i++) {
            const slideValidation = SlideDataSchema.safeParse(presentation.slides[i]);
            if (slideValidation.success) {
                validatedSlides.push(slideValidation.data);
            } else {
                logger.warn(
                    {
                        slideIndex: i,
                        errors: slideValidation.error.issues,
                        presentationId,
                    },
                    "Slide validation failed, using fallback structure"
                );
                // Provide fallback for malformed slide data
                const rawSlide = presentation.slides[i] as Record<string, unknown>;
                validatedSlides.push({
                    slideNumber: i + 1,
                    title: String(rawSlide?.title || `Slide ${i + 1}`),
                    content: Array.isArray(rawSlide?.content)
                        ? rawSlide.content.map(String)
                        : ["Content unavailable"],
                    speakerNotes: String(rawSlide?.speakerNotes || ""),
                    layoutType: "bullets",
                    section: String(rawSlide?.section || ""),
                });
            }
        }

        logger.info(
            {
                userId: user.id,
                presentationId,
                slideCount: validatedSlides.length,
            },
            "Starting PPTX export"
        );

        // Fetch brand design for colors
        const { data: brandDesign } = await supabase
            .from("brand_designs")
            .select("*")
            .eq("funnel_project_id", presentation.funnel_project_id)
            .maybeSingle();

        // Generate PPTX
        const pptxBlob = await generatePptx({
            title: presentation.title,
            slides: validatedSlides,
            brandName: brandDesign?.brand_name || "Presentation",
            brandColors: brandDesign
                ? {
                      primary: brandDesign.primary_color || "#1a365d",
                      secondary: brandDesign.secondary_color || "#2b6cb0",
                      accent: brandDesign.accent_color || "#4299e1",
                      background: brandDesign.background_color || "#ffffff",
                      text: brandDesign.text_color || "#2d3748",
                  }
                : undefined,
        });

        const totalTime = (Date.now() - startTime) / 1000;

        logger.info(
            { presentationId, totalTime, fileSize: pptxBlob.size },
            "PPTX export complete"
        );

        // Return the PPTX file
        const arrayBuffer = await pptxBlob.arrayBuffer();

        return new NextResponse(arrayBuffer, {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "Content-Disposition": `attachment; filename="${encodeURIComponent(presentation.title)}.pptx"`,
                "Content-Length": pptxBlob.size.toString(),
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        logger.error({ error }, "PPTX export failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "export_pptx",
                endpoint: "POST /api/presentations/export",
            },
        });

        return NextResponse.json(
            { error: "PPTX export failed", details: errorMessage },
            { status: 500 }
        );
    }
}
