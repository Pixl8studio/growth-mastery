/**
 * Auto-Generation Orchestrator
 * Coordinates generation of all funnel content from intake data
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateEnrollmentHTML } from "./enrollment-page-generator";
import { generateRegistrationHTML } from "./registration-page-generator";
import { generateWatchPageHTML } from "./watch-page-generator";
import { initializeFromIntake } from "@/lib/marketing/intake-integration-service";
import type { Slide } from "@/lib/ai/types";

export interface GenerationProgress {
    step: number;
    stepName: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    error?: string;
    completedAt?: string;
}

export interface GenerationResult {
    success: boolean;
    completedSteps: number[];
    failedSteps: Array<{ step: number; error: string }>;
    progress: GenerationProgress[];
}

interface IntakeData {
    id: string;
    transcript_text: string;
    metadata?: Record<string, unknown>;
}

interface OfferData {
    id: string;
    name: string;
    tagline: string | null;
    description: string | null;
    price: number;
    currency: string;
    features: unknown;
    bonuses: unknown;
    guarantee: string | null;
}

interface DeckStructureData {
    id: string;
    slides: Slide[];
    metadata?: Record<string, unknown>;
    total_slides: number;
}

const DEFAULT_THEME = {
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    background: "#ffffff",
    text: "#1f2937",
};

/**
 * Main orchestrator for generating all content from intake
 * Can accept either an intakeId (string) or combined intake data (IntakeData object)
 */
export async function generateAllFromIntake(
    projectId: string,
    userId: string,
    intakeIdOrData: string | IntakeData
): Promise<GenerationResult> {
    const requestLogger = logger.child({
        handler: "generate-all-from-intake",
        projectId,
        userId,
        intakeIdOrData:
            typeof intakeIdOrData === "string" ? intakeIdOrData : intakeIdOrData.id,
    });

    requestLogger.info("🎨 Starting auto-generation from intake");

    const progress: GenerationProgress[] = [
        { step: 2, stepName: "Offer", status: "pending" },
        { step: 3, stepName: "Deck Structure", status: "pending" },
        { step: 5, stepName: "Enrollment Pages", status: "pending" },
        { step: 8, stepName: "Watch Pages", status: "pending" },
        { step: 9, stepName: "Registration Pages", status: "pending" },
        { step: 11, stepName: "AI Followup", status: "pending" },
        { step: 0, stepName: "Marketing Profile", status: "pending" },
    ];

    const completedSteps: number[] = [];
    const failedSteps: Array<{ step: number; error: string }> = [];

    try {
        const supabase = await createClient();

        // Determine if we received an intakeId (string) or combined intake data (object)
        let intakeData: IntakeData;
        const intakeId =
            typeof intakeIdOrData === "string" ? intakeIdOrData : intakeIdOrData.id;

        if (typeof intakeIdOrData === "string") {
            // Fetch intake data from database
            // Update generation status
            await updateGenerationStatus(supabase, projectId, {
                is_generating: true,
                intake_id_used: intakeId,
                current_step: null,
                progress,
                started_at: new Date().toISOString(),
            });

            const { data: fetchedIntakeData, error: intakeError } = await supabase
                .from("vapi_transcripts")
                .select("*")
                .eq("id", intakeId)
                .eq("user_id", userId)
                .single();

            if (intakeError || !fetchedIntakeData) {
                requestLogger.error(
                    { error: intakeError },
                    "Failed to fetch intake data"
                );
                throw new Error("Failed to fetch intake data");
            }

            intakeData = fetchedIntakeData;
        } else {
            // Use the provided combined intake data
            // Update generation status
            await updateGenerationStatus(supabase, projectId, {
                is_generating: true,
                intake_id_used: intakeId,
                current_step: null,
                progress,
                started_at: new Date().toISOString(),
            });

            intakeData = intakeIdOrData;

            // Log that we're using combined intake data
            const combinedCount =
                (intakeData.metadata as { combined_from_count?: number })
                    ?.combined_from_count || 1;
            requestLogger.info(
                {
                    intakeId,
                    combinedCount,
                    combinedTextLength: intakeData.transcript_text?.length || 0,
                },
                "Using combined intake data from multiple sessions"
            );
        }

        // Step 2: Generate Offer
        try {
            progress[0].status = "in_progress";
            await updateGenerationStatus(supabase, projectId, {
                current_step: 2,
                progress,
            });
            requestLogger.info("Generating offer...");

            const offerResult = await generateOffer(
                supabase,
                projectId,
                userId,
                intakeData
            );
            if (offerResult) {
                progress[0].status = "completed";
                progress[0].completedAt = new Date().toISOString();
                completedSteps.push(2);
                await updateGenerationStatus(supabase, projectId, {
                    progress,
                    generated_steps: completedSteps,
                });
                requestLogger.info({ offerId: offerResult.id }, "✅ Offer generated");
            } else {
                throw new Error("Offer generation returned no result");
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error occurred";
            const errorStack = error instanceof Error ? error.stack : undefined;

            progress[0].status = "failed";
            progress[0].error = errorMessage;
            failedSteps.push({ step: 2, error: errorMessage });

            await updateGenerationStatus(supabase, projectId, {
                progress,
                generation_errors: failedSteps,
            });

            requestLogger.error(
                {
                    error,
                    errorMessage,
                    errorStack,
                    step: 2,
                    stepName: "Offer",
                    projectId,
                    userId,
                    intakeId,
                },
                "❌ Failed to generate offer"
            );
        }

        // Step 3: Generate Deck Structure
        try {
            progress[1].status = "in_progress";
            await updateGenerationStatus(supabase, projectId, {
                current_step: 3,
                progress,
            });
            requestLogger.info("Generating deck structure...");

            const deckResult = await generateDeckStructure(
                supabase,
                projectId,
                userId,
                intakeData
            );
            if (deckResult) {
                progress[1].status = "completed";
                progress[1].completedAt = new Date().toISOString();
                completedSteps.push(3);
                await updateGenerationStatus(supabase, projectId, {
                    progress,
                    generated_steps: completedSteps,
                });
                requestLogger.info(
                    { deckId: deckResult.id },
                    "✅ Deck structure generated"
                );
            } else {
                throw new Error("Deck structure generation returned no result");
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error occurred";
            const errorStack = error instanceof Error ? error.stack : undefined;

            progress[1].status = "failed";
            progress[1].error = errorMessage;
            failedSteps.push({ step: 3, error: errorMessage });

            await updateGenerationStatus(supabase, projectId, {
                progress,
                generation_errors: failedSteps,
            });

            requestLogger.error(
                {
                    error,
                    errorMessage,
                    errorStack,
                    step: 3,
                    stepName: "Deck Structure",
                    projectId,
                    userId,
                    intakeId,
                },
                "❌ Failed to generate deck structure"
            );
        }

        // Fetch the generated offer and deck for subsequent steps
        const { data: offer } = await supabase
            .from("offers")
            .select("*")
            .eq("funnel_project_id", projectId)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        const { data: deckStructure } = await supabase
            .from("deck_structures")
            .select("*")
            .eq("funnel_project_id", projectId)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        // Step 5: Generate Enrollment Pages (requires offer + deck)
        if (offer && deckStructure) {
            try {
                progress[2].status = "in_progress";
                await updateGenerationStatus(supabase, projectId, {
                    current_step: 5,
                    progress,
                });
                requestLogger.info("Generating enrollment page...");

                await generateEnrollmentPage(
                    supabase,
                    projectId,
                    userId,
                    offer,
                    deckStructure
                );
                progress[2].status = "completed";
                progress[2].completedAt = new Date().toISOString();
                completedSteps.push(5);
                await updateGenerationStatus(supabase, projectId, {
                    progress,
                    generated_steps: completedSteps,
                });
                requestLogger.info("✅ Enrollment page generated");
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error occurred";
                const errorStack = error instanceof Error ? error.stack : undefined;

                progress[2].status = "failed";
                progress[2].error = errorMessage;
                failedSteps.push({ step: 5, error: errorMessage });

                await updateGenerationStatus(supabase, projectId, {
                    progress,
                    generation_errors: failedSteps,
                });

                requestLogger.error(
                    {
                        error,
                        errorMessage,
                        errorStack,
                        step: 5,
                        stepName: "Enrollment Page",
                        projectId,
                        userId,
                        intakeId,
                    },
                    "❌ Failed to generate enrollment page"
                );
            }
        } else {
            const errorMessage =
                "Missing offer or deck structure (prerequisites not met)";
            progress[2].status = "failed";
            progress[2].error = errorMessage;
            failedSteps.push({ step: 5, error: errorMessage });
            await updateGenerationStatus(supabase, projectId, {
                progress,
                generation_errors: failedSteps,
            });
            requestLogger.warn(
                { step: 5, stepName: "Enrollment Page", projectId, userId },
                "Skipped enrollment page generation: missing prerequisites"
            );
        }

        // Step 8: Generate Watch Pages (requires deck)
        if (deckStructure) {
            try {
                progress[3].status = "in_progress";
                await updateGenerationStatus(supabase, projectId, {
                    current_step: 8,
                    progress,
                });
                requestLogger.info("Generating watch page...");

                await generateWatchPage(supabase, projectId, userId, deckStructure);
                progress[3].status = "completed";
                progress[3].completedAt = new Date().toISOString();
                completedSteps.push(8);
                await updateGenerationStatus(supabase, projectId, {
                    progress,
                    generated_steps: completedSteps,
                });
                requestLogger.info("✅ Watch page generated");
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error occurred";
                const errorStack = error instanceof Error ? error.stack : undefined;

                progress[3].status = "failed";
                progress[3].error = errorMessage;
                failedSteps.push({ step: 8, error: errorMessage });

                await updateGenerationStatus(supabase, projectId, {
                    progress,
                    generation_errors: failedSteps,
                });

                requestLogger.error(
                    {
                        error,
                        errorMessage,
                        errorStack,
                        step: 8,
                        stepName: "Watch Page",
                        projectId,
                        userId,
                        intakeId,
                    },
                    "❌ Failed to generate watch page"
                );
            }
        } else {
            const errorMessage = "Missing deck structure (prerequisite not met)";
            progress[3].status = "failed";
            progress[3].error = errorMessage;
            failedSteps.push({ step: 8, error: errorMessage });
            await updateGenerationStatus(supabase, projectId, {
                progress,
                generation_errors: failedSteps,
            });
            requestLogger.warn(
                { step: 8, stepName: "Watch Page", projectId, userId },
                "Skipped watch page generation: missing deck structure"
            );
        }

        // Step 9: Generate Registration Pages (requires deck + intake)
        if (deckStructure) {
            try {
                progress[4].status = "in_progress";
                await updateGenerationStatus(supabase, projectId, {
                    current_step: 9,
                    progress,
                });
                requestLogger.info("Generating registration page...");

                await generateRegistrationPage(
                    supabase,
                    projectId,
                    userId,
                    deckStructure,
                    intakeData,
                    offer
                );
                progress[4].status = "completed";
                progress[4].completedAt = new Date().toISOString();
                completedSteps.push(9);
                await updateGenerationStatus(supabase, projectId, {
                    progress,
                    generated_steps: completedSteps,
                });
                requestLogger.info("✅ Registration page generated");
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error occurred";
                const errorStack = error instanceof Error ? error.stack : undefined;

                progress[4].status = "failed";
                progress[4].error = errorMessage;
                failedSteps.push({ step: 9, error: errorMessage });

                await updateGenerationStatus(supabase, projectId, {
                    progress,
                    generation_errors: failedSteps,
                });

                requestLogger.error(
                    {
                        error,
                        errorMessage,
                        errorStack,
                        step: 9,
                        stepName: "Registration Page",
                        projectId,
                        userId,
                        intakeId,
                    },
                    "❌ Failed to generate registration page"
                );
            }
        } else {
            const errorMessage = "Missing deck structure (prerequisite not met)";
            progress[4].status = "failed";
            progress[4].error = errorMessage;
            failedSteps.push({ step: 9, error: errorMessage });
            await updateGenerationStatus(supabase, projectId, {
                progress,
                generation_errors: failedSteps,
            });
            requestLogger.warn(
                { step: 9, stepName: "Registration Page", projectId, userId },
                "Skipped registration page generation: missing deck structure"
            );
        }

        // Step 11: Generate AI Followup (requires offer)
        if (offer) {
            try {
                progress[5].status = "in_progress";
                await updateGenerationStatus(supabase, projectId, {
                    current_step: 11,
                    progress,
                });
                requestLogger.info("Generating AI followup sequence...");

                await generateFollowupSequence(supabase, projectId, userId, offer);
                progress[5].status = "completed";
                progress[5].completedAt = new Date().toISOString();
                completedSteps.push(11);
                await updateGenerationStatus(supabase, projectId, {
                    progress,
                    generated_steps: completedSteps,
                });
                requestLogger.info("✅ AI followup sequence generated");
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error occurred";
                const errorStack = error instanceof Error ? error.stack : undefined;

                progress[5].status = "failed";
                progress[5].error = errorMessage;
                failedSteps.push({ step: 11, error: errorMessage });

                await updateGenerationStatus(supabase, projectId, {
                    progress,
                    generation_errors: failedSteps,
                });

                requestLogger.error(
                    {
                        error,
                        errorMessage,
                        errorStack,
                        step: 11,
                        stepName: "AI Followup",
                        projectId,
                        userId,
                        intakeId,
                    },
                    "❌ Failed to generate followup sequence"
                );
            }
        } else {
            const errorMessage = "Missing offer (prerequisite not met)";
            progress[5].status = "failed";
            progress[5].error = errorMessage;
            failedSteps.push({ step: 11, error: errorMessage });
            await updateGenerationStatus(supabase, projectId, {
                progress,
                generation_errors: failedSteps,
            });
            requestLogger.warn(
                { step: 11, stepName: "AI Followup", projectId, userId },
                "Skipped followup sequence generation: missing offer"
            );
        }

        // Marketing Profile: Initialize from intake
        try {
            progress[6].status = "in_progress";
            await updateGenerationStatus(supabase, projectId, {
                current_step: 0,
                progress,
            });
            requestLogger.info("Initializing marketing profile...");

            const marketingResult = await initializeFromIntake(
                userId,
                projectId,
                intakeData.id
            );

            if (marketingResult.success) {
                progress[6].status = "completed";
                progress[6].completedAt = new Date().toISOString();
                await updateGenerationStatus(supabase, projectId, {
                    progress,
                });
                requestLogger.info(
                    { profileId: marketingResult.profileId },
                    "✅ Marketing profile initialized"
                );
            } else {
                throw new Error(
                    marketingResult.error || "Failed to initialize marketing"
                );
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error occurred";
            const errorStack = error instanceof Error ? error.stack : undefined;

            progress[6].status = "failed";
            progress[6].error = errorMessage;
            await updateGenerationStatus(supabase, projectId, {
                progress,
            });
            // Don't add to failedSteps - marketing is optional
            requestLogger.error(
                {
                    error,
                    errorMessage,
                    errorStack,
                    step: 0,
                    stepName: "Marketing Profile",
                    projectId,
                    userId,
                    intakeId,
                },
                "❌ Failed to initialize marketing profile"
            );
        }

        // Update final generation status
        await updateGenerationStatus(supabase, projectId, {
            is_generating: false,
            current_step: null,
            last_generated_at: new Date().toISOString(),
            generated_steps: completedSteps,
            generation_errors: failedSteps,
            regeneration_count: 0,
            progress,
        });

        requestLogger.info(
            {
                completedSteps: completedSteps.length,
                failedSteps: failedSteps.length,
            },
            "🎉 Auto-generation completed"
        );

        return {
            success: completedSteps.length > 0,
            completedSteps,
            failedSteps,
            progress,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
        const errorStack = error instanceof Error ? error.stack : undefined;

        requestLogger.error(
            {
                error,
                errorMessage,
                errorStack,
                projectId,
                userId,
                intakeId,
                completedSteps: completedSteps.length,
                failedSteps: failedSteps.length,
            },
            "Fatal error in auto-generation"
        );

        // Update generation status with error
        try {
            const supabase = await createClient();
            await updateGenerationStatus(supabase, projectId, {
                is_generating: false,
                generation_errors: [
                    {
                        step: 0,
                        error: errorMessage,
                    },
                ],
            });
        } catch (updateError) {
            requestLogger.error(
                {
                    error: updateError,
                    errorMessage:
                        updateError instanceof Error
                            ? updateError.message
                            : String(updateError),
                    projectId,
                    userId,
                },
                "Failed to update error status"
            );
        }

        return {
            success: false,
            completedSteps,
            failedSteps: [
                {
                    step: 0,
                    error: errorMessage,
                },
            ],
            progress,
        };
    }
}

/**
 * Regenerate all content from intake (overwrites existing)
 */
export async function regenerateAllFromIntake(
    projectId: string,
    userId: string
): Promise<GenerationResult> {
    const requestLogger = logger.child({
        handler: "regenerate-all-from-intake",
        projectId,
        userId,
    });

    requestLogger.info("🔄 Starting regeneration from intake");

    try {
        const supabase = await createClient();

        // Get the most recent intake
        const { data: intakeData, error: intakeError } = await supabase
            .from("vapi_transcripts")
            .select("*")
            .eq("funnel_project_id", projectId)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (intakeError || !intakeData) {
            requestLogger.error(
                { error: intakeError },
                "No intake found for regeneration"
            );
            throw new Error("No intake found for regeneration");
        }

        // Get current regeneration count
        const { data: projectData } = await supabase
            .from("funnel_projects")
            .select("auto_generation_status")
            .eq("id", projectId)
            .single();

        const currentCount =
            (projectData?.auto_generation_status as { regeneration_count?: number })
                ?.regeneration_count ?? 0;

        // Update regeneration count
        await updateGenerationStatus(supabase, projectId, {
            regeneration_count: currentCount + 1,
        });

        // Use the main generation function
        return await generateAllFromIntake(projectId, userId, intakeData.id);
    } catch (error) {
        requestLogger.error({ error }, "Failed to regenerate content");
        throw error;
    }
}

/**
 * Helper: Update generation status in database
 */
async function updateGenerationStatus(
    supabase: Awaited<ReturnType<typeof createClient>>,
    projectId: string,
    updates: Partial<{
        is_generating: boolean;
        last_generated_at: string;
        intake_id_used: string;
        generated_steps: number[];
        regeneration_count: number;
        generation_errors: Array<{ step: number; error: string }>;
        current_step: number | null;
        progress: GenerationProgress[];
        started_at: string;
    }>
) {
    // Get current status to merge with updates
    const { data: currentProject } = await supabase
        .from("funnel_projects")
        .select("auto_generation_status")
        .eq("id", projectId)
        .single();

    const currentStatus =
        (currentProject?.auto_generation_status as Record<string, unknown>) || {};

    // Merge updates with current status
    const mergedStatus = {
        ...currentStatus,
        ...updates,
    };

    const { error } = await supabase
        .from("funnel_projects")
        .update({
            auto_generation_status: mergedStatus as unknown as Record<string, unknown>,
        })
        .eq("id", projectId);

    if (error) {
        logger.error({ error, projectId }, "Failed to update generation status");
    }
}

/**
 * Generate offer from intake
 */
async function generateOffer(
    supabase: Awaited<ReturnType<typeof createClient>>,
    projectId: string,
    userId: string,
    intakeData: IntakeData
): Promise<OfferData | null> {
    // Call the offer generation API
    const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/generate/offer`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                transcriptId: intakeData.id,
                projectId,
            }),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to generate offer");
    }

    const { offer } = await response.json();

    // Save to database
    const { data, error } = await supabase
        .from("offers")
        .insert({
            funnel_project_id: projectId,
            user_id: userId,
            name: offer.name,
            tagline: offer.tagline,
            description: offer.description,
            price: offer.price,
            currency: offer.currency || "USD",
            features: offer.features,
            bonuses: offer.bonuses,
            guarantee: offer.guarantee,
        })
        .select()
        .single();

    if (error) {
        logger.error({ error }, "Failed to save offer");
        throw error;
    }

    return data;
}

/**
 * Generate deck structure from intake
 */
async function generateDeckStructure(
    supabase: Awaited<ReturnType<typeof createClient>>,
    projectId: string,
    userId: string,
    intakeData: IntakeData
): Promise<DeckStructureData | null> {
    // Call the deck generation API
    const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/generate/deck-structure`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                transcriptId: intakeData.id,
                projectId,
            }),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to generate deck structure");
    }

    const { deckStructure } = await response.json();

    // Save to database
    const { data, error } = await supabase
        .from("deck_structures")
        .insert({
            funnel_project_id: projectId,
            user_id: userId,
            slides: deckStructure.slides,
            metadata: deckStructure.metadata,
            total_slides: deckStructure.slides.length,
        })
        .select()
        .single();

    if (error) {
        logger.error({ error }, "Failed to save deck structure");
        throw error;
    }

    // Cast slides from database to Slide[]
    return {
        ...data,
        slides: data.slides as unknown as Slide[],
    };
}

/**
 * Generate enrollment page
 */
async function generateEnrollmentPage(
    supabase: Awaited<ReturnType<typeof createClient>>,
    projectId: string,
    userId: string,
    offer: OfferData,
    deckStructure: DeckStructureData
): Promise<void> {
    const htmlContent = generateEnrollmentHTML({
        projectId,
        offer: {
            id: offer.id,
            name: offer.name,
            tagline: offer.tagline,
            description: offer.description,
            price: offer.price,
            currency: offer.currency,
            features: offer.features as Array<{
                title: string;
                description: string;
                value?: string;
            }>,
        },
        deckStructure: {
            id: deckStructure.id,
            slides: deckStructure.slides,
            metadata: deckStructure.metadata,
            total_slides: deckStructure.total_slides,
        },
        theme: DEFAULT_THEME,
        templateType: "urgency-convert",
    });

    const { error } = await supabase.from("enrollment_pages").insert({
        funnel_project_id: projectId,
        user_id: userId,
        offer_id: offer.id,
        headline: `Get ${offer.name} Now`,
        subheadline: offer.tagline || "Transform your business today",
        html_content: htmlContent,
        theme: DEFAULT_THEME,
        page_type: "direct_purchase",
        is_published: false,
    });

    if (error) {
        logger.error({ error }, "Failed to save enrollment page");
        throw error;
    }
}

/**
 * Generate watch page
 */
async function generateWatchPage(
    supabase: Awaited<ReturnType<typeof createClient>>,
    projectId: string,
    userId: string,
    deckStructure: DeckStructureData
): Promise<void> {
    const htmlContent = generateWatchPageHTML({
        projectId,
        deckStructure: {
            id: deckStructure.id,
            slides: deckStructure.slides,
            metadata: deckStructure.metadata,
            total_slides: deckStructure.total_slides,
        },
        videoUrl: "https://www.youtube.com/embed/placeholder",
        headline:
            (deckStructure.metadata?.title as string) ||
            "Watch This Exclusive Training",
        theme: DEFAULT_THEME,
    });

    const { error } = await supabase.from("watch_pages").insert({
        funnel_project_id: projectId,
        user_id: userId,
        headline:
            (deckStructure.metadata?.title as string) ||
            "Watch This Exclusive Training",
        subheadline: "Transform your business with this powerful training",
        html_content: htmlContent,
        theme: DEFAULT_THEME,
        is_published: false,
    });

    if (error) {
        logger.error({ error }, "Failed to save watch page");
        throw error;
    }
}

/**
 * Generate registration page
 */
async function generateRegistrationPage(
    supabase: Awaited<ReturnType<typeof createClient>>,
    projectId: string,
    userId: string,
    deckStructure: DeckStructureData,
    intakeData: IntakeData,
    offer: OfferData | null
): Promise<void> {
    const htmlContent = generateRegistrationHTML({
        projectId,
        deckStructure,
        headline: "Register for Free Training",
        subheadline:
            offer?.tagline || "Discover the secrets to transforming your business",
        theme: DEFAULT_THEME,
        intakeData: intakeData.metadata as Record<string, unknown>,
        offerData: offer
            ? ({
                  id: offer.id,
                  name: offer.name,
                  tagline: offer.tagline,
                  description: offer.description,
                  price: offer.price,
                  currency: offer.currency,
                  promise: offer.description,
                  features: offer.features,
                  bonuses: offer.bonuses,
                  guarantee: offer.guarantee,
              } as unknown as OfferData)
            : undefined,
    });

    const { error } = await supabase.from("registration_pages").insert({
        funnel_project_id: projectId,
        user_id: userId,
        headline: "Register for Free Training",
        subheadline:
            offer?.tagline || "Discover the secrets to transforming your business",
        html_content: htmlContent,
        theme: DEFAULT_THEME,
        is_published: false,
    });

    if (error) {
        logger.error({ error }, "Failed to save registration page");
        throw error;
    }
}

/**
 * Generate AI followup sequence
 */
async function generateFollowupSequence(
    supabase: Awaited<ReturnType<typeof createClient>>,
    projectId: string,
    userId: string,
    offer: OfferData
): Promise<void> {
    // Call the create-default followup API
    const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/followup/sequences/create-default`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                funnelProjectId: projectId,
                offerId: offer.id,
            }),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to generate followup sequence");
    }

    logger.info({ projectId, offerId: offer.id }, "Followup sequence created");
}
