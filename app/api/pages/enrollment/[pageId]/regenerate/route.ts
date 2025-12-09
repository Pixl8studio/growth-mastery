/**
 * API route to regenerate entire enrollment page content using AI
 * Uses Enrollment Page Universal Framework (bottom-of-funnel focus)
 */

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateTextWithAI } from "@/lib/ai/client";
import { createFullPageEnrollmentPrompt } from "@/lib/generators/enrollment-framework-prompts";
import { generateEnrollmentHTML } from "@/lib/generators/enrollment-page-generator";
import type { Slide } from "@/lib/ai/types";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    const requestLogger = logger.child({ handler: "regenerate-enrollment-page" });

    try {
        const { user } = await getCurrentUserWithProfile();
        const { pageId } = await params;
        const body = await request.json();
        const { preserveEditedFields = false } = body;

        const supabase = await createClient();

        // Fetch the page with all related data
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
            requestLogger.error({ pageId }, "No offer associated with enrollment page");
            return NextResponse.json(
                { error: "Enrollment page must have an associated offer" },
                { status: 400 }
            );
        }

        // Fetch funnel project details
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

        requestLogger.info(
            { pageId, preserveEditedFields, offerId: page.offers.id },
            "Starting enrollment page regeneration"
        );

        // Generate new content with AI using enrollment framework prompts
        const prompt = createFullPageEnrollmentPrompt(
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
                features: page.offers.features as any,
                bonuses: page.offers.bonuses as any,
                guarantee: page.offers.guarantee,
            },
            {
                targetAudience: intakeData.targetAudience,
                businessNiche: intakeData.businessNiche || projectData.business_niche,
                desiredOutcome: intakeData.desiredOutcome,
            },
            deckSlides
        );

        const aiResponse = await generateTextWithAI(
            [
                {
                    role: "system",
                    content:
                        "You are an expert sales copywriter specializing in high-converting enrollment pages. Always return valid JSON.",
                },
                { role: "user", content: prompt },
            ],
            { maxTokens: 4000, temperature: 0.7 }
        );

        // Parse AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Invalid AI response format");
        }

        const generatedContent = JSON.parse(jsonMatch[0]);

        // Generate new HTML using the HTML generator with AI-generated content
        const newHtml = generateEnrollmentHTML({
            projectId: page.funnel_project_id,
            offer: {
                id: page.offers.id,
                name: generatedContent.heroHeadline || page.offers.name,
                tagline: generatedContent.heroTagline || page.offers.tagline,
                description: page.offers.description,
                price: page.offers.price,
                currency: page.offers.currency,
                features: generatedContent.features || page.offers.features,
            },
            deckStructure: {
                id: deckStructure?.id || "",
                slides: deckSlides,
                metadata: deckStructure?.metadata,
                total_slides: deckSlides.length,
            },
            theme: page.theme || {
                primary: "#2563eb",
                secondary: "#10b981",
                background: "#ffffff",
                text: "#1f2937",
            },
            templateType: "urgency-convert",
        });

        // Handle preserving edited fields if requested
        const finalHtml = newHtml;
        if (
            preserveEditedFields &&
            page.regeneration_metadata?.manually_edited_fields
        ) {
            requestLogger.info("Field preservation requested but not yet implemented");
        }

        // Update regeneration metadata
        const regenerationMetadata = {
            last_regenerated_at: new Date().toISOString(),
            regeneration_count:
                (page.regeneration_metadata?.regeneration_count || 0) + 1,
            framework_version: "enrollment-v1",
            manually_edited_fields:
                page.regeneration_metadata?.manually_edited_fields || [],
        };

        // Update the page with new HTML
        const { data: updatedPage, error: updateError } = await supabase
            .from("enrollment_pages")
            .update({
                html_content: finalHtml,
                headline: generatedContent.heroHeadline || page.offers.name,
                subheadline: generatedContent.heroTagline || page.offers.tagline,
                regeneration_metadata: regenerationMetadata,
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
            { pageId, regenerationCount: regenerationMetadata.regeneration_count },
            "Enrollment page regenerated successfully"
        );

        return NextResponse.json({
            success: true,
            page: updatedPage,
            generatedContent,
        });
    } catch (error) {
        requestLogger.error({ error }, "Error regenerating enrollment page");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/pages/enrollment/[pageId]/regenerate",
            },
        });

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to regenerate page",
            },
            { status: 500 }
        );
    }
}
