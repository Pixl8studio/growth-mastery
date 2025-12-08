/**
 * Auto-Generate All Content API
 * Orchestrates generation of all funnel content from intake
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import {
    generateAllFromIntake,
    regenerateAllFromIntake,
} from "@/lib/generators/auto-generation-orchestrator";

export async function POST(request: NextRequest) {
    try {
        const { projectId, intakeId, regenerate } = await request.json();

        // Validate required fields
        if (!projectId) {
            throw new ValidationError("projectId is required");
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new AuthenticationError("User not authenticated");
        }

        const requestLogger = logger.child({
            handler: "auto-generate-all",
            projectId,
            userId: user.id,
            intakeId,
            regenerate,
        });

        requestLogger.info("🎨 Auto-generation request received");

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            throw new ValidationError("Project not found or access denied");
        }

        // Check if already generating
        const { data: projectStatus } = await supabase
            .from("funnel_projects")
            .select("auto_generation_status")
            .eq("id", projectId)
            .single();

        const isGenerating = (
            projectStatus?.auto_generation_status as { is_generating?: boolean }
        )?.is_generating;

        if (isGenerating) {
            return NextResponse.json(
                { error: "Generation already in progress" },
                { status: 409 }
            );
        }

        let result;

        try {
            if (regenerate) {
                // Regenerate from most recent intake
                requestLogger.info("🔄 Starting regeneration");
                result = await regenerateAllFromIntake(projectId, user.id);
            } else {
                // Generate from all intake records for the project
                // Fetch all intake records for this project
                const { data: allIntakes, error: intakesError } = await supabase
                    .from("vapi_transcripts")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .eq("user_id", user.id)
                    .eq("call_status", "completed")
                    .order("created_at", { ascending: false });

                if (intakesError) {
                    requestLogger.error(
                        {
                            error: intakesError,
                            projectId,
                            userId: user.id,
                        },
                        "Failed to fetch intake records"
                    );
                    throw new ValidationError("Failed to fetch intake records");
                }

                if (!allIntakes || allIntakes.length === 0) {
                    requestLogger.error(
                        { projectId, userId: user.id },
                        "No intake records found"
                    );
                    throw new ValidationError(
                        "No intake records found. Please complete at least one intake session first."
                    );
                }

                // Combine all intake transcript_text into a single aggregated text
                const combinedTranscript = allIntakes
                    .map((intake) => {
                        if (!intake.transcript_text) return "";
                        // Add a separator and session info for each intake
                        const sessionInfo = intake.session_name
                            ? `\n\n--- ${intake.session_name} (${intake.intake_method || "unknown"}) ---\n\n`
                            : `\n\n--- Intake from ${new Date(intake.created_at).toLocaleDateString()} (${intake.intake_method || "unknown"}) ---\n\n`;
                        return sessionInfo + intake.transcript_text;
                    })
                    .filter(Boolean)
                    .join("\n\n");

                // Create a combined intake data object using the most recent intake as base
                const mostRecentIntake = allIntakes[0];
                const combinedIntakeData = {
                    ...mostRecentIntake,
                    transcript_text: combinedTranscript,
                    id: mostRecentIntake.id, // Use most recent intake ID for tracking
                    metadata: {
                        ...mostRecentIntake.metadata,
                        combined_from_count: allIntakes.length,
                        combined_from_ids: allIntakes.map((i) => i.id),
                        combined_at: new Date().toISOString(),
                    },
                };

                requestLogger.info(
                    {
                        projectId,
                        userId: user.id,
                        intakeCount: allIntakes.length,
                        combinedTextLength: combinedTranscript.length,
                        intakeMethods: allIntakes.map((i) => i.intake_method),
                    },
                    "✨ Starting initial generation from combined intake sessions"
                );

                // Pass the combined intake data to the orchestrator
                // We'll modify generateAllFromIntake to accept combined intake data directly
                result = await generateAllFromIntake(
                    projectId,
                    user.id,
                    combinedIntakeData
                );
            }

            requestLogger.info(
                {
                    success: result.success,
                    completedSteps: result.completedSteps.length,
                    failedSteps: result.failedSteps.length,
                    progressSteps: result.progress.length,
                },
                "Auto-generation completed"
            );

            // Check if there were any failed steps
            if (result.failedSteps.length > 0) {
                requestLogger.warn(
                    {
                        failedSteps: result.failedSteps,
                        completedSteps: result.completedSteps,
                    },
                    "Auto-generation completed with some failed steps"
                );
            }

            return NextResponse.json({
                success: result.success,
                completedSteps: result.completedSteps,
                failedSteps: result.failedSteps,
                progress: result.progress,
            });
        } catch (error) {
            // Re-throw AuthenticationError and ValidationError to be handled below
            if (
                error instanceof AuthenticationError ||
                error instanceof ValidationError
            ) {
                throw error;
            }

            // Log detailed error information
            requestLogger.error(
                {
                    error,
                    errorMessage:
                        error instanceof Error ? error.message : String(error),
                    errorStack: error instanceof Error ? error.stack : undefined,
                    projectId,
                    userId: user.id,
                    intakeId,
                    regenerate,
                },
                "Error during auto-generation"
            );

            Sentry.captureException(error, {
                tags: {
                    component: "api",
                    action: "auto-generate-all-inner",
                    endpoint: "POST /api/generate/auto-generate-all",
                },
                extra: {
                    projectId,
                    userId: user.id,
                    intakeId,
                    regenerate,
                },
            });

            // Wrap unknown errors in a user-friendly message
            throw new Error(
                `Failed to generate content: ${error instanceof Error ? error.message : "Unknown error occurred"}`
            );
        }
    } catch (error) {
        logger.error(
            {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
            },
            "Error in POST /api/generate/auto-generate-all"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "auto-generate-all",
                endpoint: "POST /api/generate/auto-generate-all",
            },
            extra: {
                errorType:
                    error instanceof AuthenticationError
                        ? "authentication"
                        : error instanceof ValidationError
                          ? "validation"
                          : "unknown",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Return detailed error message if available
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Failed to generate content. Please try again or contact support if the issue persists.";

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
