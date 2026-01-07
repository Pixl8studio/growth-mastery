/**
 * Offer Generation API
 * Generates offer with AI from VAPI transcript or business profile
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import { createOfferGenerationPrompt } from "@/lib/ai/prompts";
import type { OfferGeneration } from "@/lib/ai/types";
import type { TranscriptData } from "@/lib/ai/types";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";
import type { BusinessProfile } from "@/types/business-profile";

const generateOfferSchema = z
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

    // Build extracted data with pricing
    const extractedData: TranscriptData["extracted_data"] = {};

    if (profile.pricing?.regular || profile.pricing?.webinar) {
        extractedData.pricing = [];
        if (profile.pricing.regular) {
            extractedData.pricing.push({
                amount: profile.pricing.regular,
                currency: "USD",
                context: "Regular price",
                confidence: "high" as const,
            });
        }
        if (profile.pricing.webinar) {
            extractedData.pricing.push({
                amount: profile.pricing.webinar,
                currency: "USD",
                context: "Webinar special price",
                confidence: "high" as const,
            });
        }
    }

    return {
        transcript_text: sections.join("\n"),
        extracted_data:
            Object.keys(extractedData).length > 0 ? extractedData : undefined,
    };
}

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "generate-offer" });

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

        const validationResult = generateOfferSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { transcriptId, businessProfileId, projectId } = validationResult.data;

        requestLogger.info(
            { userId: user.id, transcriptId, businessProfileId, projectId },
            "Generating offer"
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
                "Using business profile for offer generation"
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
                "Using transcript for offer generation"
            );
        } else {
            throw new ValidationError(
                "Either transcriptId or businessProfileId is required"
            );
        }

        // Generate offer with AI
        const generatedOffer = await generateWithAI<OfferGeneration>(
            createOfferGenerationPrompt(transcriptData)
        );

        requestLogger.info(
            {
                userId: user.id,
                offerName: generatedOffer.name,
                price: generatedOffer.price,
            },
            "Offer generated successfully"
        );

        // Save offer to database with Irresistible Offer Framework
        const { data: savedOffer, error: saveError } = await supabase
            .from("offers")
            .insert({
                funnel_project_id: projectId,
                user_id: user.id,
                name: generatedOffer.name,
                tagline: generatedOffer.tagline,
                price: generatedOffer.price,
                currency: generatedOffer.currency,
                features: generatedOffer.features,
                bonuses: generatedOffer.bonuses,
                guarantee: generatedOffer.guarantee,
                // Irresistible Offer Framework
                promise: generatedOffer.promise,
                person: generatedOffer.person,
                process: generatedOffer.process,
                purpose: generatedOffer.purpose,
                pathway: generatedOffer.pathway,
                max_features: 6,
                max_bonuses: 5,
            })
            .select()
            .single();

        if (saveError || !savedOffer) {
            requestLogger.error(
                { error: saveError },
                "Failed to save offer to database"
            );
            throw new Error("Failed to save offer to database");
        }

        requestLogger.info(
            { userId: user.id, offerId: savedOffer.id, offerName: savedOffer.name },
            "Offer saved to database successfully"
        );

        return NextResponse.json({
            success: true,
            offer: savedOffer,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate offer");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate-offer",
                endpoint: "POST /api/generate/offer",
            },
            extra: {
                transcriptId: (error as any).transcriptId,
                projectId: (error as any).projectId,
            },
        });

        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate offer" },
            { status: 500 }
        );
    }
}
