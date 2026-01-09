/**
 * AI Editor - Generate Endpoint
 * POST /api/ai-editor/generate
 * Generates a new landing page using Claude Sonnet 4
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generatePage, validateGeneratedHtml } from "@/lib/ai-editor/generator";
import type { PageType } from "@/lib/ai-editor/framework-loader";

interface GenerateRequest {
    projectId: string;
    pageType: PageType;
    customPrompt?: string;
    offerId?: string;
    deckId?: string;
    templateStyle?: "urgency-convert" | "premium-elegant" | "value-focused";
}

export async function POST(request: Request) {
    const startTime = Date.now();

    try {
        const supabase = await createClient();

        // Check authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse request body
        const body: GenerateRequest = await request.json();
        const { projectId, pageType, customPrompt, offerId, deckId, templateStyle } =
            body;

        // Validate inputs
        if (!projectId || !pageType) {
            return NextResponse.json(
                { error: "projectId and pageType are required" },
                { status: 400 }
            );
        }

        if (
            ![
                "registration",
                "watch",
                "enrollment",
                "confirmation",
                "call_booking",
                "checkout",
                "upsell",
                "thank_you",
            ].includes(pageType)
        ) {
            return NextResponse.json(
                {
                    error: "pageType must be one of: registration, watch, enrollment, confirmation, call_booking, checkout, upsell, thank_you",
                },
                { status: 400 }
            );
        }

        // Verify user owns the project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id, user_id, name")
            .eq("id", projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (project.user_id !== user.id) {
            return NextResponse.json(
                { error: "You don't have access to this project" },
                { status: 403 }
            );
        }

        // Validate templateStyle if provided
        const validTemplateStyles = [
            "urgency-convert",
            "premium-elegant",
            "value-focused",
        ];
        if (templateStyle && !validTemplateStyles.includes(templateStyle)) {
            return NextResponse.json(
                { error: "Invalid templateStyle" },
                { status: 400 }
            );
        }

        // Validate offerId belongs to this project if provided
        if (offerId) {
            const { data: offer, error: offerError } = await supabase
                .from("offers")
                .select("id")
                .eq("id", offerId)
                .eq("funnel_project_id", projectId)
                .single();

            if (offerError || !offer) {
                return NextResponse.json(
                    { error: "Offer not found in this project" },
                    { status: 400 }
                );
            }
        }

        // Validate deckId belongs to this project if provided
        if (deckId) {
            const { data: deck, error: deckError } = await supabase
                .from("deck_structures")
                .select("id")
                .eq("id", deckId)
                .eq("funnel_project_id", projectId)
                .single();

            if (deckError || !deck) {
                return NextResponse.json(
                    { error: "Deck structure not found in this project" },
                    { status: 400 }
                );
            }
        }

        logger.info(
            { userId: user.id, projectId, pageType, offerId, deckId, templateStyle },
            "Starting AI page generation"
        );

        // Generate the page
        const result = await generatePage({
            projectId,
            pageType,
            customPrompt,
            offerId,
            deckId,
            templateStyle,
        });

        // Validate the generated HTML
        const validation = validateGeneratedHtml(result.html, pageType);
        if (!validation.isValid) {
            logger.warn(
                { projectId, pageType, warnings: validation.warnings },
                "Generated HTML has validation warnings"
            );
        }

        // Create the page record in database
        const { data: newPage, error: insertError } = await supabase
            .from("ai_editor_pages")
            .insert({
                user_id: user.id,
                funnel_project_id: projectId,
                page_type: pageType,
                title: result.title,
                html_content: result.html,
                status: "draft",
                version: 1,
            })
            .select()
            .single();

        if (insertError) {
            logger.error({ error: insertError }, "Failed to save generated page");
            throw new Error("Failed to save generated page");
        }

        // Create initial conversation record
        const { error: convError } = await supabase
            .from("ai_editor_conversations")
            .insert({
                page_id: newPage.id,
                messages: [],
                total_edits: 0,
            });

        if (convError) {
            logger.warn({ error: convError }, "Failed to create conversation record");
        }

        // Create initial version record
        const { error: versionError } = await supabase
            .from("ai_editor_versions")
            .insert({
                page_id: newPage.id,
                version: 1,
                html_content: result.html,
                change_description: "Initial generation",
            });

        if (versionError) {
            logger.warn({ error: versionError }, "Failed to create version record");
        }

        const totalTime = (Date.now() - startTime) / 1000;

        logger.info(
            {
                userId: user.id,
                projectId,
                pageId: newPage.id,
                pageType,
                generationTime: result.generationTime,
                totalTime,
                sectionsGenerated: result.sectionsGenerated,
                htmlLength: result.html.length,
            },
            "Page generation successful"
        );

        return NextResponse.json({
            success: true,
            pageId: newPage.id,
            html: result.html,
            title: result.title,
            generationTime: result.generationTime,
            sectionsGenerated: result.sectionsGenerated,
            validation: {
                isValid: validation.isValid,
                warnings: validation.warnings,
            },
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

        logger.error({ error, errorMessage }, "Page generation failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate_page",
                endpoint: "POST /api/ai-editor/generate",
            },
            extra: {
                errorMessage,
            },
        });

        return NextResponse.json(
            {
                error: "Page generation failed",
                details: errorMessage,
            },
            { status: 500 }
        );
    }
}
