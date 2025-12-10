/**
 * Brand Design Generation API
 * Generates brand colors and personality with AI from VAPI transcript or business profile
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import { createBrandDesignPrompt } from "@/lib/ai/prompts";
import type { BrandDesignGeneration } from "@/lib/ai/types";
import type { TranscriptData } from "@/lib/ai/types";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";
import type { BusinessProfile } from "@/types/business-profile";

const generateBrandDesignSchema = z
    .object({
        projectId: z.string().uuid("Invalid project ID"),
        transcriptId: z.string().uuid("Invalid transcript ID").optional(),
        businessProfileId: z.string().uuid("Invalid business profile ID").optional(),
    })
    .refine((data) => data.transcriptId || data.businessProfileId, {
        message: "Either transcriptId or businessProfileId is required",
    });

/**
 * Convert business profile to transcript data format for AI generation
 */
function businessProfileToTranscriptData(profile: BusinessProfile): TranscriptData {
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

    // Section 5: CTA & Objections
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

    return {
        transcript_text: sections.join("\n"),
    };
}

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "generate-brand-design" });

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

        const validationResult = generateBrandDesignSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { transcriptId, businessProfileId, projectId } = validationResult.data;

        requestLogger.info(
            { userId: user.id, transcriptId, businessProfileId, projectId },
            "Generating brand design"
        );

        // Get data from either transcript or business profile
        let transcriptData: TranscriptData;

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

            // Convert business profile to transcript data format
            transcriptData = businessProfileToTranscriptData(
                profile as BusinessProfile
            );

            requestLogger.info(
                { userId: user.id, businessProfileId, profileSource: profile.source },
                "Using business profile for brand design generation"
            );
        } else if (transcriptId) {
            // Load transcript
            const { data: transcript, error: transcriptError } = await supabase
                .from("vapi_transcripts")
                .select("*")
                .eq("id", transcriptId)
                .eq("user_id", user.id)
                .single();

            if (transcriptError || !transcript) {
                throw new ValidationError("Transcript not found");
            }

            transcriptData = {
                transcript_text: transcript.transcript_text,
                extracted_data: transcript.extracted_data,
            };

            requestLogger.info(
                { userId: user.id, transcriptId },
                "Using transcript for brand design generation"
            );
        } else {
            throw new ValidationError(
                "Either transcriptId or businessProfileId is required"
            );
        }

        // Generate brand design with AI
        const generatedDesign = await generateWithAI<BrandDesignGeneration>(
            createBrandDesignPrompt(transcriptData)
        );

        requestLogger.info(
            {
                userId: user.id,
                designStyle: generatedDesign.design_style,
                primaryColor: generatedDesign.primary_color,
            },
            "Brand design generated successfully"
        );

        // Save brand design to database
        const { data: savedDesign, error: saveError } = await supabase
            .from("brand_designs")
            .upsert(
                {
                    funnel_project_id: projectId,
                    user_id: user.id,
                    primary_color: generatedDesign.primary_color,
                    secondary_color: generatedDesign.secondary_color,
                    accent_color: generatedDesign.accent_color,
                    background_color: generatedDesign.background_color,
                    text_color: generatedDesign.text_color,
                    design_style: generatedDesign.design_style,
                    personality_traits: generatedDesign.personality_traits,
                    is_ai_generated: true,
                },
                {
                    onConflict: "funnel_project_id",
                }
            )
            .select()
            .single();

        if (saveError || !savedDesign) {
            requestLogger.error(
                { error: saveError },
                "Failed to save brand design to database"
            );
            throw new Error("Failed to save brand design to database");
        }

        requestLogger.info(
            { userId: user.id, brandDesignId: savedDesign.id, projectId },
            "Brand design saved to database successfully"
        );

        return NextResponse.json({
            success: true,
            ...savedDesign,
            rationale: generatedDesign.rationale,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate brand design");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate-brand-design",
                endpoint: "POST /api/generate/brand-design",
            },
        });

        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate brand design" },
            { status: 500 }
        );
    }
}
