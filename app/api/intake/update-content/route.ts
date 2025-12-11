/**
 * Update Intake Content API
 * Updates the transcript_text for an intake session
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";

export async function PATCH(request: NextRequest) {
    try {
        const { intakeId, transcriptText } = await request.json();

        // Validate required fields
        if (!intakeId) {
            throw new ValidationError("intakeId is required");
        }

        if (transcriptText === undefined) {
            throw new ValidationError("transcriptText is required");
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new AuthenticationError("User not authenticated");
        }

        // Verify intake ownership
        const { data: intake, error: intakeError } = await supabase
            .from("vapi_transcripts")
            .select("id, user_id, funnel_project_id")
            .eq("id", intakeId)
            .eq("user_id", user.id)
            .single();

        if (intakeError || !intake) {
            logger.error(
                {
                    error: intakeError,
                    intakeId,
                    userId: user.id,
                },
                "Intake not found or access denied"
            );
            throw new ValidationError("Intake not found or access denied");
        }

        // Update transcript content
        const { data: updatedIntake, error: updateError } = await supabase
            .from("vapi_transcripts")
            .update({ transcript_text: transcriptText })
            .eq("id", intakeId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (updateError) {
            logger.error(
                {
                    error: updateError,
                    intakeId,
                    userId: user.id,
                },
                "Failed to update intake content"
            );
            throw new Error("Failed to update intake content");
        }

        logger.info(
            {
                intakeId,
                projectId: intake.funnel_project_id,
                userId: user.id,
                contentLength: transcriptText.length,
            },
            "Intake content updated successfully"
        );

        return NextResponse.json({
            success: true,
            intakeId: updatedIntake.id,
        });
    } catch (error) {
        logger.error(
            {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
            },
            "Error in PATCH /api/intake/update-content"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "PATCH /api/intake/update-content",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const errorMessage =
            error instanceof Error
                ? error.message
                : "Failed to update content. Please try again.";

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
