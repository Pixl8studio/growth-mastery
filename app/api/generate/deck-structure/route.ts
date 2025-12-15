/**
 * Presentation Structure Generation API
 * Generates presentation structure using various frameworks:
 * - Webinar: Universal 60-Slide Webinar Framework (15-30-15 Connect/Teach/Invite)
 * - VSL: Video Sales Letter Framework (5-10 slides)
 * - Sales Page: Pitch Video Framework
 * Supports 5-slide test mode or full deck
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTextWithAI } from "@/lib/ai/client";
import { ValidationError } from "@/lib/errors";
import { logger as pinoLogger } from "@/lib/logger";
import { z } from "zod";
import fs from "fs";
import path from "path";
import type { BusinessProfile } from "@/types/business-profile";

// Environment-aware logging: console in dev, Pino in production
const isDev = process.env.NODE_ENV === "development";
const log = isDev
    ? {
          info: (message: string, data?: any) =>
              console.log(`[INFO] ${message}`, data || ""),
          error: (message: string, data?: any) =>
              console.error(`[ERROR] ${message}`, data || ""),
      }
    : {
          info: (message: string, data?: any) => pinoLogger.info(data || {}, message),
          error: (message: string, data?: any) => pinoLogger.error(data || {}, message),
      };

const generateDeckStructureSchema = z
    .object({
        transcriptId: z.string().uuid("Invalid transcript ID").optional(),
        // TEMPORARY: Allow null businessProfileId for testing (Issue #323)
        // Original: z.string().uuid("Invalid business profile ID").optional()
        // TODO: Restore strict UUID validation when Step 3 is functional
        businessProfileId: z
            .string()
            .uuid("Invalid business profile ID")
            .optional()
            .nullable(),
        projectId: z.string().uuid("Invalid project ID"),
        slideCount: z.enum(["5", "60"]).optional().default("60"),
        presentationType: z
            .enum(["webinar", "vsl", "sales_page"])
            .optional()
            .default("webinar"),
    })
    // TEMPORARY: Relaxed validation for testing (Issue #323)
    // Original: .refine((data) => data.transcriptId || data.businessProfileId, {...})
    // TODO: Restore strict validation when Step 3 is functional
    .refine((data) => data.transcriptId || data.businessProfileId || data.projectId, {
        message: "Either transcriptId, businessProfileId, or projectId is required",
    });

/**
 * Convert business profile to transcript text format for AI generation
 */
function businessProfileToTranscriptText(profile: BusinessProfile): string {
    const sections: string[] = [];

    // Section 1: Ideal Customer & Problem
    if (profile.ideal_customer || profile.transformation || profile.perceived_problem) {
        sections.push(`## Ideal Customer & Core Problem`);
        if (profile.ideal_customer)
            sections.push(`Ideal Customer: ${profile.ideal_customer}`);
        if (profile.transformation)
            sections.push(`Transformation: ${profile.transformation}`);
        if (profile.perceived_problem)
            sections.push(`Perceived Problem: ${profile.perceived_problem}`);
        if (profile.root_cause) sections.push(`Root Cause: ${profile.root_cause}`);
        if (profile.daily_pain_points)
            sections.push(`Daily Pain Points: ${profile.daily_pain_points}`);
        if (profile.secret_desires)
            sections.push(`Secret Desires: ${profile.secret_desires}`);
        if (profile.common_mistakes)
            sections.push(`Common Mistakes: ${profile.common_mistakes}`);
    }

    // Section 2: Story & Method
    if (profile.struggle_story || profile.signature_method) {
        sections.push(`\n## Your Story & Signature Method`);
        if (profile.struggle_story)
            sections.push(`Struggle Story: ${profile.struggle_story}`);
        if (profile.breakthrough_moment)
            sections.push(`Breakthrough Moment: ${profile.breakthrough_moment}`);
        if (profile.life_now) sections.push(`Life Now: ${profile.life_now}`);
        if (profile.credibility_experience)
            sections.push(`Credibility: ${profile.credibility_experience}`);
        if (profile.signature_method)
            sections.push(`Signature Method: ${profile.signature_method}`);
    }

    // Section 3: Offer & Proof
    if (profile.offer_name || profile.deliverables) {
        sections.push(`\n## Your Offer & Proof`);
        if (profile.offer_name) sections.push(`Offer Name: ${profile.offer_name}`);
        if (profile.offer_type) sections.push(`Offer Type: ${profile.offer_type}`);
        if (profile.deliverables)
            sections.push(`Deliverables: ${profile.deliverables}`);
        if (profile.delivery_process)
            sections.push(`Delivery Process: ${profile.delivery_process}`);
        if (profile.problem_solved)
            sections.push(`Problem Solved: ${profile.problem_solved}`);
        if (profile.promise_outcome)
            sections.push(`Promise/Outcome: ${profile.promise_outcome}`);
        if (profile.guarantee) sections.push(`Guarantee: ${profile.guarantee}`);
        if (profile.testimonials)
            sections.push(`Testimonials: ${profile.testimonials}`);
        if (profile.bonuses) sections.push(`Bonuses: ${profile.bonuses}`);
    }

    // Section 4: CTA & Objections
    if (profile.call_to_action || profile.top_objections?.length) {
        sections.push(`\n## Call to Action & Objections`);
        if (profile.call_to_action)
            sections.push(`Call to Action: ${profile.call_to_action}`);
        if (profile.incentive) sections.push(`Incentive: ${profile.incentive}`);
        if (profile.top_objections?.length) {
            sections.push(`Top Objections:`);
            profile.top_objections.forEach((obj, i) => {
                sections.push(
                    `  ${i + 1}. ${obj.objection} - Response: ${obj.response}`
                );
            });
        }
    }

    // Section 5: Pricing
    if (profile.pricing?.regular || profile.pricing?.webinar) {
        sections.push(`\n## Pricing`);
        if (profile.pricing.regular)
            sections.push(`Regular Price: $${profile.pricing.regular}`);
        if (profile.pricing.webinar)
            sections.push(`Webinar Special: $${profile.pricing.webinar}`);
    }

    return sections.join("\n");
}

interface SlideChunk {
    startSlide: number;
    endSlide: number;
    slides: string[];
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verify authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse request body
        const body = await request.json();

        const validationResult = generateDeckStructureSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const {
            transcriptId,
            businessProfileId,
            projectId,
            slideCount,
            presentationType,
        } = validationResult.data;
        const isTestMode = slideCount === "5";

        log.info("Generating presentation structure", {
            userId: user.id,
            transcriptId,
            businessProfileId,
            projectId,
            slideCount,
            presentationType,
            isTestMode,
        });

        // Get context text from either transcript or business profile
        let contextText: string;

        if (businessProfileId) {
            // Load business profile
            const { data: profile, error: profileError } = await supabase
                .from("business_profiles")
                .select("*")
                .eq("id", businessProfileId)
                .eq("user_id", user.id)
                .single();

            if (profileError || !profile) {
                throw new ValidationError("Business profile not found");
            }

            // Convert business profile to transcript text format
            contextText = businessProfileToTranscriptText(profile as BusinessProfile);

            log.info("Using business profile for deck generation", {
                userId: user.id,
                businessProfileId,
                profileSource: profile.source,
                contextLength: contextText.length,
            });
        } else if (transcriptId) {
            // Get transcript
            const { data: transcript, error: transcriptError } = await supabase
                .from("vapi_transcripts")
                .select("*")
                .eq("id", transcriptId)
                .eq("user_id", user.id)
                .single();

            if (transcriptError || !transcript) {
                throw new ValidationError("Transcript not found");
            }

            contextText = transcript.transcript_text;

            log.info("Using transcript for deck generation", {
                userId: user.id,
                transcriptId,
                contextLength: contextText.length,
            });
        } else {
            // TEMPORARY: Generate placeholder content for testing (Issue #323)
            // This allows testing Step 4 without a business profile
            // TODO: Remove this fallback when Step 3 is functional
            log.info("Using placeholder content for testing (Issue #323)", {
                userId: user.id,
                projectId,
            });

            contextText = `## Testing Mode - Placeholder Business Profile

This is a placeholder business profile for testing the presentation generation workflow.

## Ideal Customer & Core Problem
Ideal Customer: Small business owners and entrepreneurs
Transformation: From struggling to thriving in their business
Perceived Problem: Lack of clear marketing strategy
Root Cause: No systematic approach to customer acquisition
Daily Pain Points: Inconsistent revenue, unclear messaging, scattered marketing efforts
Secret Desires: Financial freedom, more time with family, business that runs without them
Common Mistakes: Trying to do everything at once, not focusing on one channel

## Your Story & Signature Method
Struggle Story: Started with nothing, made every mistake possible
Breakthrough Moment: Discovered a simple framework that changed everything
Life Now: Running a successful business with consistent growth
Credibility: Helped hundreds of entrepreneurs achieve their goals
Signature Method: The 3-Step Growth Framework

## Your Offer & Proof
Offer Name: Business Growth Accelerator
Offer Type: Online course and coaching program
Deliverables: Video training, templates, weekly coaching calls
Problem Solved: Creates a clear path from confusion to clarity
Promise/Outcome: Double your revenue in 90 days
Guarantee: 30-day money-back guarantee
Testimonials: "This program changed my business" - Happy Customer

## Call to Action & Objections
Call to Action: Schedule a free strategy call
Incentive: Free bonus training for early action takers
Top Objections:
  1. I don't have time - Response: The program is designed for busy entrepreneurs
  2. It's too expensive - Response: The ROI far exceeds the investment
  3. Will it work for me? - Response: Our framework works for any industry

## Pricing
Regular Price: $2,997
Webinar Special: $997`;
        }

        // Load framework template based on presentation type
        let frameworkPath: string;

        if (presentationType === "vsl") {
            frameworkPath = path.join(process.cwd(), "templates", "vsl-framework.md");
        } else if (presentationType === "sales_page") {
            frameworkPath = path.join(
                process.cwd(),
                "templates",
                "sales-page-pitch-framework.md"
            );
        } else {
            // Default to webinar (Universal 60-Slide Webinar Framework)
            frameworkPath = path.join(
                process.cwd(),
                "templates",
                "60-Slide-Webinar-Framework.md"
            );
        }

        let frameworkContent: string;
        try {
            frameworkContent = fs.readFileSync(frameworkPath, "utf8");
            log.info("✅ Framework loaded", {
                presentationType,
                frameworkLength: frameworkContent.length,
            });
        } catch (error) {
            log.error("❌ Failed to load framework", { error, frameworkPath });
            throw new ValidationError(
                `Framework template not found at ${frameworkPath}`
            );
        }

        // Generate deck based on mode
        let generatedSlides: any[];

        if (isTestMode) {
            // Test mode: Generate first 5 slides only
            log.info("Generating 5-slide test deck");
            const testChunk = extractTestSlides(frameworkContent);
            generatedSlides = await generateSlideChunk(contextText, testChunk);
        } else {
            // Full mode: Generate all 60 slides in chunks
            log.info("Generating full 60-slide deck");
            const slideChunks = splitFrameworkIntoChunks(frameworkContent);
            log.info("📊 Split into chunks", { totalChunks: slideChunks.length });

            const allSlides: any[] = [];
            for (let i = 0; i < slideChunks.length; i++) {
                const chunk = slideChunks[i];
                log.info("🤖 Generating chunk", {
                    chunkIndex: i + 1,
                    totalChunks: slideChunks.length,
                    slideRange: `${chunk.startSlide}-${chunk.endSlide}`,
                });

                try {
                    const chunkSlides = await generateSlideChunk(contextText, chunk);
                    allSlides.push(...chunkSlides);

                    log.info("✅ Chunk completed", {
                        completedChunks: i + 1,
                        totalSlides: allSlides.length,
                    });

                    // Add delay between chunks to avoid rate limits
                    if (i < slideChunks.length - 1) {
                        await new Promise((resolve) => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    log.error("❌ Chunk generation failed", {
                        error,
                        chunk: `${chunk.startSlide}-${chunk.endSlide}`,
                    });
                    // Add placeholder slides for failed chunk
                    const placeholders = generatePlaceholderSlides(
                        chunk.startSlide,
                        chunk.endSlide
                    );
                    allSlides.push(...placeholders);
                }
            }
            generatedSlides = allSlides;
        }

        // Save to database
        const frameworkNames = {
            webinar: "60-Slide Webinar",
            vsl: "VSL",
            sales_page: "Sales Page Pitch",
        };

        const deckTitle = `${isTestMode ? "Test" : frameworkNames[presentationType]} - ${new Date().toLocaleDateString()}`;

        const { data: savedDeck, error: saveError } = await supabase
            .from("deck_structures")
            .insert({
                funnel_project_id: projectId,
                user_id: user.id,
                template_type: isTestMode ? "5_slide_test" : `${presentationType}_full`,
                total_slides: generatedSlides.length,
                slides: generatedSlides,
                sections: {}, // Can be populated later if needed
                presentation_type: presentationType,
                metadata: {
                    title: deckTitle,
                    framework: frameworkNames[presentationType],
                    generatedAt: new Date().toISOString(),
                    slideCount: generatedSlides.length,
                    mode: isTestMode ? "test" : "full",
                },
            })
            .select()
            .single();

        if (saveError || !savedDeck) {
            log.error("Failed to save deck", { error: saveError });
            throw new Error("Failed to save deck to database");
        }

        log.info("✅ Presentation structure generated and saved", {
            deckId: savedDeck.id,
            slideCount: generatedSlides.length,
            presentationType,
        });

        return NextResponse.json({
            success: true,
            deckStructure: {
                id: savedDeck.id,
                title: deckTitle,
                slides: savedDeck.slides,
                template_type: savedDeck.template_type,
                presentation_type: savedDeck.presentation_type,
                sections: savedDeck.sections,
                metadata: savedDeck.metadata,
                created_at: savedDeck.created_at,
            },
        });
    } catch (error) {
        log.error("Failed to generate deck structure", { error });
        Sentry.captureException(error, {
            tags: { component: "api", action: "generate_deck_structure" },
        });

        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate deck structure" },
            { status: 500 }
        );
    }
}

/**
 * Extract first 5 slides from framework for test mode
 */
function extractTestSlides(frameworkContent: string): SlideChunk {
    const lines = frameworkContent.split("\n");
    const testSlides: string[] = [];
    let slideCount = 0;

    for (const line of lines) {
        testSlides.push(line);
        const slideMatch = line.match(/^## Slide (\d+):/);
        if (slideMatch) {
            slideCount = parseInt(slideMatch[1]);
            if (slideCount >= 5) {
                break;
            }
        }
    }

    return {
        startSlide: 1,
        endSlide: 5,
        slides: testSlides,
    };
}

/**
 * Split framework into 10-slide chunks
 */
function splitFrameworkIntoChunks(frameworkContent: string): SlideChunk[] {
    const lines = frameworkContent.split("\n");
    const chunks: SlideChunk[] = [];
    let currentChunk: string[] = [];
    let slideCount = 0;
    let chunkStartSlide = 1;
    const slidesPerChunk = 10;

    for (const line of lines) {
        const slideMatch = line.match(/^## Slide (\d+):/);

        if (slideMatch) {
            const slideNumber = parseInt(slideMatch[1]);

            if (
                currentChunk.length > 0 &&
                slideNumber - chunkStartSlide >= slidesPerChunk
            ) {
                chunks.push({
                    startSlide: chunkStartSlide,
                    endSlide: slideNumber - 1,
                    slides: [...currentChunk],
                });

                currentChunk = [];
                chunkStartSlide = slideNumber;
            }

            slideCount = slideNumber;
        }

        currentChunk.push(line);
    }

    // Add final chunk
    if (currentChunk.length > 0) {
        chunks.push({
            startSlide: chunkStartSlide,
            endSlide: slideCount,
            slides: currentChunk,
        });
    }

    return chunks;
}

/**
 * Generate slides for a chunk using AI
 */
async function generateSlideChunk(
    contextText: string,
    chunk: SlideChunk
): Promise<any[]> {
    const chunkContent = chunk.slides.join("\n");

    const prompt = `You are an expert presentation strategist creating a personalized webinar deck. Create slides ${chunk.startSlide}-${chunk.endSlide} following the Universal 60-Slide Webinar Framework exactly.

FRAMEWORK TEMPLATE SECTION FOR THESE SLIDES:
${chunkContent}

BUSINESS CONTEXT TO EXTRACT CLIENT INFORMATION FROM:
${contextText}

CRITICAL INSTRUCTIONS:
1. Follow the 60-Slide Webinar Framework structure EXACTLY - every slide, every section, every purpose
2. The framework uses a 15-30-15 structure:
   - Connect (Slides 1-15): Build rapport, share story, create emotional connection
   - Teach (Slides 16-45): Deliver value, demonstrate expertise, build belief
   - Invite (Slides 46-60): Present offer, handle objections, guide decision
3. Extract the client's specific details from the business context to populate each slide:
   - Personal story and transformation journey
   - Business model, target audience, pain points
   - Solutions they provide, outcomes they deliver
   - Their unique approach and methodology
   - Credibility markers, results, testimonials
4. Use the framework's Content Strategy, Focus Areas, and Purpose for each slide
5. Match the psychological progression exactly as outlined in the framework
6. Maintain the client's authentic voice and terminology from the context
7. Create compelling, conversion-focused content using their real story

SLIDE TITLE REQUIREMENTS - CRITICAL:
- Create CUSTOMER-FACING titles that would appear on actual presentation slides
- Titles should be engaging, clear, and speak directly to the audience
- DO NOT use meta-level or placeholder titles like "Pain", "Problem", "Agitate", "Hook", "Pain Pattern Recognition", or "Transformation"
- Instead, create specific, compelling titles based on the business context
- Examples of GOOD titles: "What If You Could Double Your Income Working Half the Hours?", "The Hidden Reason 90% of Entrepreneurs Burn Out", "Meet Sarah: From Overwhelmed to 6-Figure Success"
- Examples of BAD titles: "Pain Point", "Agitate", "Social Proof", "Objection Handler"

OUTPUT FORMAT:
Return a JSON array with objects for each slide. Each object must have:
{
  "slideNumber": 1,
  "title": "Customer-facing slide title (engaging and specific)",
  "description": "Content based on framework guidance + client specifics (2-3 sentences)",
  "section": "connect, teach, or invite"
}

Generate slides ${chunk.startSlide}-${chunk.endSlide} as a JSON array. Return ONLY valid JSON, no markdown formatting or explanation.`;

    try {
        const response = await generateTextWithAI(
            [
                {
                    role: "system",
                    content:
                        "You are a presentation expert. Return ONLY valid JSON arrays with no markdown or explanation.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            { maxTokens: 4000 }
        );

        // Parse the JSON response
        const cleanedResponse = response
            .trim()
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "");
        const slides = JSON.parse(cleanedResponse);

        if (!Array.isArray(slides)) {
            throw new Error("Response is not an array");
        }

        return slides;
    } catch (error) {
        log.error("Failed to parse AI response", { error });
        throw error;
    }
}

/**
 * Generate placeholder slides for failed chunks
 */
function generatePlaceholderSlides(startSlide: number, endSlide: number): any[] {
    const slides: any[] = [];
    for (let i = startSlide; i <= endSlide; i++) {
        slides.push({
            slideNumber: i,
            title: `Slide ${i} - To Be Completed`,
            description: "This slide needs to be manually created or regenerated.",
            section: "pending",
        });
    }
    return slides;
}
