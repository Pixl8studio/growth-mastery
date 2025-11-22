/**
 * API route to regenerate a specific field on an enrollment page
 * Uses enrollment framework-aware prompts for targeted regeneration
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateTextWithAI, generateWithAI } from "@/lib/ai/client";
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
        const {
            fieldId,
            fieldContext,
            generateMultiple = false,
            count = 3,
            lengthPreference = "match",
        } = body;

        if (!fieldId || !fieldContext) {
            return NextResponse.json(
                { error: "fieldId and fieldContext are required" },
                { status: 400 }
            );
        }

        // Calculate current text metrics
        const currentWordCount = fieldContext.trim().split(/\s+/).length;
        const currentCharCount = fieldContext.length;

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

        // Fetch project and ALL intake data
        const { data: projectData, error: projectError } = await supabase
            .from("funnel_projects")
            .select("*")
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

        // Fetch ALL intake sessions for this project (all vapi_transcripts)
        const { data: allIntakeSessions, error: intakeError } = await supabase
            .from("vapi_transcripts")
            .select("extracted_data, transcript_text, intake_method, session_name, created_at")
            .eq("funnel_project_id", page.funnel_project_id)
            .order("created_at", { ascending: false });

        if (intakeError) {
            requestLogger.warn(
                { error: intakeError },
                "Failed to fetch intake sessions, will use empty context"
            );
        }

        // Aggregate and CONDENSE all intake data from all sessions
        const intakeData: any = {};
        let condensedIntakeContext = "";

        if (allIntakeSessions && allIntakeSessions.length > 0) {
            requestLogger.info(
                { sessionCount: allIntakeSessions.length },
                "Aggregating data from all intake sessions"
            );

            // Merge extracted_data from all sessions, with newer sessions taking precedence
            allIntakeSessions.reverse().forEach((session) => {
                if (session.extracted_data) {
                    Object.assign(intakeData, session.extracted_data);
                }
            });

            // Create CONDENSED summary of key intake data (not full transcripts)
            const keyFields = [
                "targetAudience",
                "businessNiche",
                "desiredOutcome",
                "painPoints",
                "uniqueValue",
                "mainProblem",
                "currentSolution",
                "transformationGoal",
            ];

            const condensedData: string[] = [];
            keyFields.forEach((field) => {
                if (intakeData[field]) {
                    condensedData.push(`${field}: ${intakeData[field]}`);
                }
            });

            condensedIntakeContext = condensedData.join("\n");

            requestLogger.info(
                { originalSessions: allIntakeSessions.length, condensedLength: condensedIntakeContext.length },
                "Condensed intake data for AI processing"
            );
        } else {
            requestLogger.warn("No intake sessions found for project");
        }

        // Determine length target based on preference
        let lengthInstruction = "";
        switch (lengthPreference) {
            case "shorter":
                lengthInstruction = `Keep it CONCISE - aim for ${Math.floor(currentWordCount * 0.7)}-${Math.floor(currentWordCount * 0.8)} words (current is ${currentWordCount} words).`;
                break;
            case "longer":
                lengthInstruction = `Expand with MORE DETAIL - aim for ${Math.floor(currentWordCount * 1.3)}-${Math.floor(currentWordCount * 1.5)} words (current is ${currentWordCount} words).`;
                break;
            case "match":
            default:
                lengthInstruction = `MATCH THE CURRENT LENGTH closely - aim for ${Math.floor(currentWordCount * 0.9)}-${Math.floor(currentWordCount * 1.1)} words (current is ${currentWordCount} words).`;
                break;
        }

        requestLogger.info(
            { pageId, fieldId, generateMultiple, count, lengthPreference, currentWordCount },
            "Regenerating enrollment field"
        );

        // Generate prompt for field content
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
                features: page.offers.features as any,
                bonuses: page.offers.bonuses as any,
                guarantee: page.offers.guarantee,
            },
            {
                targetAudience: intakeData.targetAudience,
                businessNiche: intakeData.businessNiche || projectData.business_niche,
                desiredOutcome: intakeData.desiredOutcome,
                // Include all aggregated intake data
                ...intakeData,
            }
        );

        // If generating multiple options, return array without updating page
        if (generateMultiple) {
            requestLogger.info({ count, lengthPreference }, "Generating multiple content options in ONE request");

            const enhancedPrompt = `${prompt}

CURRENT TEXT: "${fieldContext}"

LENGTH REQUIREMENT: ${lengthInstruction}

INTAKE DATA SUMMARY:
${condensedIntakeContext}

INSTRUCTIONS:
1. Generate exactly 3 unique variations of the text
2. ${lengthInstruction}
3. Use the current text as a style guide
4. Incorporate insights from the intake data
5. Each variation should be PLAIN TEXT ONLY - no markdown, no **, no formatting
6. Make each variation compelling and benefit-driven
7. Make each variation UNIQUE from the others in approach and wording`;

            // Single AI call that returns 3 variations as JSON
            const result = await generateWithAI<{ variations: string[] }>(
                [
                    {
                        role: "system",
                        content: `You are an expert sales copywriter for enrollment pages. Generate exactly 3 unique content variations and return them as a JSON object with a "variations" array. Each variation should be plain text only - no markdown formatting, no **, no special characters. Match the requested length precisely. Use the current text as a style reference and incorporate the intake data naturally.

Return format:
{
  "variations": [
    "First variation here...",
    "Second variation here...",
    "Third variation here..."
  ]
}`,
                    },
                    { role: "user", content: enhancedPrompt },
                ],
                { maxTokens: 1500, temperature: 0.75 }
            );

            // Clean each variation by stripping any markdown that might have slipped through
            const cleanOptions = result.variations.map((variation) =>
                variation
                    .trim()
                    .replace(/\*\*/g, "") // Remove bold markers
                    .replace(/\*/g, "") // Remove italic markers
                    .replace(/#+\s/g, "") // Remove heading markers
                    .replace(/`/g, "") // Remove code markers
                    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Convert links to plain text
                    .replace(/^[-*+]\s/gm, "") // Remove list markers
                    .replace(/^\d+\.\s/gm, "") // Remove numbered list markers
            );

            requestLogger.info(
                { optionCount: cleanOptions.length },
                "Multiple options generated successfully in ONE request"
            );

            return NextResponse.json({
                success: true,
                fieldId,
                options: cleanOptions,
            });
        }

        // Single regeneration - generate and update page
        const enhancedPromptSingle = `${prompt}

CURRENT TEXT: "${fieldContext}"

LENGTH REQUIREMENT: ${lengthInstruction}

INTAKE DATA SUMMARY:
${condensedIntakeContext}

INSTRUCTIONS:
1. ${lengthInstruction}
2. Use the current text as a style guide
3. Incorporate insights from the intake data
4. Return PLAIN TEXT ONLY - no markdown, no **, no formatting`;

        const rawFieldContent = await generateTextWithAI(
            [
                {
                    role: "system",
                    content:
                        "You are an expert sales copywriter for enrollment pages. Return ONLY plain text content - no markdown formatting, no **, no JSON, no labels. Match the requested length precisely. Use insights from ALL intake sessions to create highly personalized, relevant copy.",
                },
                { role: "user", content: enhancedPromptSingle },
            ],
            { maxTokens: 600, temperature: 0.7 }
        );

        // Strip all markdown formatting
        const newFieldContent = rawFieldContent
            .trim()
            .replace(/\*\*/g, "") // Remove bold markers
            .replace(/\*/g, "") // Remove italic markers
            .replace(/#+\s/g, "") // Remove heading markers
            .replace(/`/g, "") // Remove code markers
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Convert links to plain text
            .replace(/^[-*+]\s/gm, "") // Remove list markers
            .replace(/^\d+\.\s/gm, ""); // Remove numbered list markers

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
