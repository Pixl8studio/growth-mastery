/**
 * API route to regenerate a specific field on a registration page
 * Uses framework-aware prompts for targeted regeneration
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateTextWithAI } from "@/lib/ai/client";
import { createFieldRegenerationPrompt } from "@/lib/generators/registration-framework-prompts";
import type { Slide } from "@/lib/ai/types";
import * as cheerio from "cheerio";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    const requestLogger = logger.child({ handler: "regenerate-registration-field" });

    try {
        const { user } = await getCurrentUserWithProfile();
        const { pageId } = await params;
        const body = await request.json();
        const { fieldId, fieldContext } = body;

        if (!fieldId || !fieldContext) {
            return NextResponse.json(
                { error: "fieldId and fieldContext are required" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Fetch the page
        const { data: page, error: pageError } = await supabase
            .from("registration_pages")
            .select("*, funnel_projects(*)")
            .eq("id", pageId)
            .eq("user_id", user.id)
            .single();

        if (pageError || !page) {
            requestLogger.error({ error: pageError, pageId }, "Page not found");
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        // Fetch related data
        const { data: projectData, error: projectError } = await supabase
            .from("funnel_projects")
            .select("*, intake_transcripts(*), deck_structures(*)")
            .eq("id", page.funnel_project_id)
            .single();

        if (projectError || !projectData) {
            requestLogger.error(
                { error: projectError },
                "Failed to fetch project data"
            );
            return NextResponse.json(
                { error: "Failed to fetch project data" },
                { status: 500 }
            );
        }

        const intakeData = projectData.intake_transcripts?.[0]?.extracted_data || {};
        const deckStructure = projectData.deck_structures?.[0];
        const deckSlides: Slide[] = deckStructure?.slides || [];

        const { data: offer } = await supabase
            .from("offers")
            .select("*")
            .eq("funnel_project_id", page.funnel_project_id)
            .single();

        requestLogger.info({ pageId, fieldId }, "Regenerating specific field");

        // Generate new field content with AI
        const prompt = createFieldRegenerationPrompt(
            fieldId,
            fieldContext,
            {
                targetAudience: intakeData.targetAudience,
                businessNiche: intakeData.businessNiche || projectData.business_niche,
                mainProblem: intakeData.mainProblem,
                desiredOutcome: intakeData.desiredOutcome,
                industry: intakeData.industry,
                person: intakeData.person,
            },
            offer,
            deckSlides
        );

        const newFieldContent = await generateTextWithAI(
            [
                {
                    role: "system",
                    content:
                        "You are an expert conversion copywriter. Return only the regenerated text content, no JSON, no labels, no markup.",
                },
                { role: "user", content: prompt },
            ],
            { maxTokens: 500, temperature: 0.7 }
        );

        // Update the HTML content by finding and replacing the specific field
        let updatedHtml = page.html_content;

        if (updatedHtml) {
            // Load HTML with cheerio for manipulation
            const $ = cheerio.load(updatedHtml);

            // Find the element with the matching data-field-id attribute
            const element = $(`[data-field-id="${fieldId}"]`);

            if (element.length > 0) {
                // Replace the content while preserving HTML structure
                element.html(newFieldContent.trim());
                updatedHtml = $.html();
            } else {
                // Fallback: simple text replacement if field ID not found
                requestLogger.warn(
                    { fieldId },
                    "Field ID not found in HTML, using text replacement"
                );
                updatedHtml = updatedHtml.replace(fieldContext, newFieldContent.trim());
            }
        }

        // Track this field as manually edited (since it was regenerated)
        const regenerationMetadata = page.regeneration_metadata || {};
        const editedFields = regenerationMetadata.manually_edited_fields || [];

        if (!editedFields.includes(fieldId)) {
            editedFields.push(fieldId);
        }

        // Update the page
        const { data: updatedPage, error: updateError } = await supabase
            .from("registration_pages")
            .update({
                html_content: updatedHtml,
                regeneration_metadata: {
                    ...regenerationMetadata,
                    manually_edited_fields: editedFields,
                    last_field_regenerated_at: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
            })
            .eq("id", pageId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (updateError) {
            requestLogger.error({ error: updateError }, "Failed to update page");
            return NextResponse.json(
                { error: "Failed to update page" },
                { status: 500 }
            );
        }

        requestLogger.info({ pageId, fieldId }, "Field regenerated successfully");

        return NextResponse.json({
            success: true,
            fieldId,
            newContent: newFieldContent.trim(),
            page: updatedPage,
        });
    } catch (error) {
        requestLogger.error({ error }, "Error regenerating field");
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to regenerate field",
            },
            { status: 500 }
        );
    }
}
