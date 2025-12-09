/**
 * Rename Intake Session API
 * Updates the session_name for an intake session
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";

export async function PATCH(request: NextRequest) {
    try {
        const { intakeId, sessionName, projectId } = await request.json();

        // Validate required fields
        if (!intakeId || !sessionName) {
            throw new ValidationError("intakeId and sessionName are required");
        }

        if (!projectId) {
            throw new ValidationError("projectId is required");
        }

        // Validate session name
        const trimmedName = sessionName.trim();
        if (trimmedName.length === 0) {
            throw new ValidationError("Session name cannot be empty");
        }

        if (trimmedName.length > 255) {
            throw new ValidationError("Session name cannot exceed 255 characters");
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new AuthenticationError("User not authenticated");
        }

        // Verify intake ownership and get current session name
        const { data: intake, error: intakeError } = await supabase
            .from("vapi_transcripts")
            .select("id, user_id, funnel_project_id, session_name")
            .eq("id", intakeId)
            .eq("user_id", user.id)
            .eq("funnel_project_id", projectId)
            .single();

        if (intakeError || !intake) {
            logger.error(
                {
                    error: intakeError,
                    intakeId,
                    projectId,
                    userId: user.id,
                },
                "Intake not found or access denied"
            );
            throw new ValidationError("Intake not found or access denied");
        }

        const oldSessionName = intake.session_name;
        // Update session name
        const { data: updatedIntake, error: updateError } = await supabase
            .from("vapi_transcripts")
            .update({ session_name: trimmedName })
            .eq("id", intakeId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (updateError) {
            logger.error(
                {
                    error: updateError,
                    intakeId,
                    projectId,
                    userId: user.id,
                    sessionName: trimmedName,
                },
                "Failed to update session name"
            );
            throw new Error("Failed to update session name");
        }

        logger.info(
            {
                intakeId,
                projectId,
                userId: user.id,
                oldSessionName: oldSessionName || "unnamed",
                newSessionName: trimmedName,
            },
            "Session name updated successfully"
        );

        return NextResponse.json({
            success: true,
            intakeId: updatedIntake.id,
            sessionName: updatedIntake.session_name,
        });
    } catch (error) {
        logger.error(
            {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
            },
            "Error in PATCH /api/intake/rename"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "PATCH /api/intake/rename",
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
                : "Failed to rename session. Please try again.";

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
