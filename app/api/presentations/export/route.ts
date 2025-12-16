/**
 * Presentations API - Export to PPTX
 * POST /api/presentations/export
 * Exports a presentation to PowerPoint format
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generatePptx, type SlideData } from "@/lib/presentations/pptx-generator";

interface ExportRequest {
    presentationId: string;
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

        const body: ExportRequest = await request.json();
        const { presentationId } = body;

        if (!presentationId) {
            return NextResponse.json(
                { error: "presentationId is required" },
                { status: 400 }
            );
        }

        // Fetch presentation
        const { data: presentation, error: presentationError } = await supabase
            .from("presentations")
            .select("*")
            .eq("id", presentationId)
            .eq("user_id", user.id)
            .single();

        if (presentationError || !presentation) {
            return NextResponse.json(
                { error: "Presentation not found" },
                { status: 404 }
            );
        }

        if (!presentation.slides || presentation.slides.length === 0) {
            return NextResponse.json(
                { error: "Presentation has no slides" },
                { status: 400 }
            );
        }

        logger.info(
            { userId: user.id, presentationId, slideCount: presentation.slides.length },
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
            slides: presentation.slides as SlideData[],
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
