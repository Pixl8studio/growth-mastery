/**
 * API route to regenerate a specific field on an enrollment page
 * Uses enrollment framework-aware prompts for targeted regeneration
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateTextWithAI } from "@/lib/ai/client";
import { createEnrollmentFieldPrompt } from "@/lib/generators/enrollment-framework-prompts";
import * as cheerio from "cheerio";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    const requestLogger = logger.child({ handler: "regenerate-enrollment-field" });

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
            .from("enrollment_pages")
            .select("*, funnel_projects(*), offers(*)")
            .eq("id", pageId)
            .eq("user_id", user.id)
            .single();

        if (pageError || !page) {
            requestLogger.error({ error: pageError, pageId }, "Page not found");
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        if (!page.offers) {
            return NextResponse.json(
                { error: "Enrollment page must have an associated offer" },
                { status: 400 }
            );
        }

        // Fetch related data
        const { data: projectData, error: projectError } = await supabase
            .from("funnel_projects")
            .select("*, intake_transcripts(*)")
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

        requestLogger.info({ pageId, fieldId }, "Regenerating enrollment field");

        // Generate new field content with AI
        const prompt = createEnrollmentFieldPrompt(
            fieldId,
            fieldContext,
            {
                id: page.offers.id,
                name: page.offers.name,
                tagline: page.offers.tagline,
                description: page.offers.description,
                price: page.offers.price,
                currency: page.offers.currency,
                promise: page.offers.promise,
                person: page.offers.person,
                process: page.offers.process,
                features: page.offers.features,
                bonuses: page.offers.bonuses,
                guarantee: page.offers.guarantee,
            },
            {
                targetAudience: intakeData.targetAudience,
                businessNiche: intakeData.businessNiche || projectData.business_niche,
                desiredOutcome: intakeData.desiredOutcome,
            }
        );

        const newFieldContent = await generateTextWithAI(
            [
                {
                    role: "system",
                    content:
                        "You are an expert sales copywriter for enrollment pages. Return only the regenerated text content, no JSON, no labels, no markup.",
                },
                { role: "user", content: prompt },
            ],
            { maxTokens: 500, temperature: 0.7 }
        );

        // Update the HTML content by finding and replacing the specific field
        let updatedHtml = page.html_content;

        if (updatedHtml) {
            const $ = cheerio.load(updatedHtml);
            const element = $(`[data-field-id="${fieldId}"]`);

            if (element.length > 0) {
                element.html(newFieldContent.trim());
                updatedHtml = $.html();
            } else {
                requestLogger.warn(
                    { fieldId },
                    "Field ID not found, using text replacement"
                );
                updatedHtml = updatedHtml.replace(fieldContext, newFieldContent.trim());
            }
        }

        // Track this field as regenerated
        const regenerationMetadata = page.regeneration_metadata || {};
        const editedFields = regenerationMetadata.manually_edited_fields || [];

        if (!editedFields.includes(fieldId)) {
            editedFields.push(fieldId);
        }

        // Update the page
        const { data: updatedPage, error: updateError } = await supabase
            .from("enrollment_pages")
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

        requestLogger.info(
            { pageId, fieldId },
            "Enrollment field regenerated successfully"
        );

        return NextResponse.json({
            success: true,
            fieldId,
            newContent: newFieldContent.trim(),
            page: updatedPage,
        });
    } catch (error) {
        requestLogger.error({ error }, "Error regenerating enrollment field");
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
