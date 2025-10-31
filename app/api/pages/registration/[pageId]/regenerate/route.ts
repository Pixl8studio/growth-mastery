/**
 * API route to regenerate entire registration page content using AI
 * Uses Universal Webinar Registration Landing Page Framework
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateTextWithAI } from "@/lib/ai/client";
import { createFullPageRegenerationPrompt } from "@/lib/generators/registration-framework-prompts";
import { generateRegistrationHTML } from "@/lib/generators/registration-page-generator";
import type { Slide } from "@/lib/ai/types";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    const requestLogger = logger.child({ handler: "regenerate-registration-page" });

    try {
        const { user } = await getCurrentUserWithProfile();
        const { pageId } = await params;
        const body = await request.json();
        const { preserveEditedFields = false } = body;

        const supabase = await createClient();

        // Fetch the page with all related data
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

        // Fetch funnel project details including intake data
        const { data: projectData, error: projectError } = await supabase
            .from("funnel_projects")
            .select("*, intake_transcripts(*), deck_structures(*)")
            .eq("id", page.funnel_project_id)
            .single();

        if (projectError || !projectData) {
            requestLogger.error(
                { error: projectError, projectId: page.funnel_project_id },
                "Failed to fetch project data"
            );
            return NextResponse.json(
                { error: "Failed to fetch project data" },
                { status: 500 }
            );
        }

        // Extract intake data from transcript
        const intakeData = projectData.intake_transcripts?.[0]?.extracted_data || {};

        // Get deck structure with slides
        const deckStructure = projectData.deck_structures?.[0];
        const deckSlides: Slide[] = deckStructure?.slides || [];

        // Get offer data (if available)
        const { data: offer } = await supabase
            .from("offers")
            .select("*")
            .eq("funnel_project_id", page.funnel_project_id)
            .single();

        requestLogger.info(
            { pageId, preserveEditedFields },
            "Starting registration page regeneration"
        );

        // Generate new content with AI using framework prompts
        const prompt = createFullPageRegenerationPrompt(
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

        const aiResponse = await generateTextWithAI(
            [
                {
                    role: "system",
                    content:
                        "You are an expert conversion copywriter specializing in webinar registration pages. Always return valid JSON.",
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
        const newHtml = generateRegistrationHTML({
            projectId: page.funnel_project_id,
            deckStructure: {
                id: deckStructure?.id || "",
                slides: deckSlides,
                metadata: deckStructure?.metadata,
                total_slides: deckSlides.length,
            },
            headline: generatedContent.heroHeadline,
            subheadline: generatedContent.heroSubheadline,
            theme: page.theme || {
                primary: "#2563eb",
                secondary: "#10b981",
                background: "#ffffff",
                text: "#1f2937",
            },
            intakeData: {
                targetAudience: intakeData.targetAudience,
                businessNiche: intakeData.businessNiche,
                mainProblem: intakeData.mainProblem,
                desiredOutcome: intakeData.desiredOutcome,
            },
            offerData: offer
                ? {
                      id: offer.id,
                      name: offer.name,
                      tagline: offer.tagline,
                      description: offer.description,
                      price: offer.price,
                      currency: offer.currency,
                      features: offer.features,
                      bonuses: offer.bonuses,
                      guarantee: offer.guarantee,
                      promise: offer.promise,
                      person: offer.person,
                      process: offer.process,
                      purpose: offer.purpose,
                  }
                : null,
        });

        // Handle preserving edited fields if requested
        const finalHtml = newHtml;
        if (
            preserveEditedFields &&
            page.regeneration_metadata?.manually_edited_fields
        ) {
            // TODO: Implement field preservation logic
            // For now, we regenerate everything
            requestLogger.info("Field preservation requested but not yet implemented");
        }

        // Update regeneration metadata
        const regenerationMetadata = {
            last_regenerated_at: new Date().toISOString(),
            regeneration_count:
                (page.regeneration_metadata?.regeneration_count || 0) + 1,
            framework_version: "universal-v1",
            manually_edited_fields:
                page.regeneration_metadata?.manually_edited_fields || [],
        };

        // Update the page with new HTML
        const { data: updatedPage, error: updateError } = await supabase
            .from("registration_pages")
            .update({
                html_content: finalHtml,
                headline: generatedContent.heroHeadline,
                subheadline: generatedContent.heroSubheadline,
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
            "Registration page regenerated successfully"
        );

        return NextResponse.json({
            success: true,
            page: updatedPage,
            generatedContent,
        });
    } catch (error) {
        requestLogger.error({ error }, "Error regenerating registration page");
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
