/**
 * Auto-Generate All Content API
 * Orchestrates generation of all funnel content from intake
 */

import { NextRequest, NextResponse } from "next/server";
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

        if (regenerate) {
            // Regenerate from most recent intake
            requestLogger.info("🔄 Starting regeneration");
            result = await regenerateAllFromIntake(projectId, user.id);
        } else {
            // Generate from specified intake
            if (!intakeId) {
                throw new ValidationError(
                    "intakeId is required for initial generation"
                );
            }

            // Verify intake ownership
            const { data: intake, error: intakeError } = await supabase
                .from("vapi_transcripts")
                .select("id")
                .eq("id", intakeId)
                .eq("user_id", user.id)
                .eq("funnel_project_id", projectId)
                .single();

            if (intakeError || !intake) {
                throw new ValidationError("Intake not found or access denied");
            }

            requestLogger.info("✨ Starting initial generation");
            result = await generateAllFromIntake(projectId, user.id, intakeId);
        }

        requestLogger.info(
            {
                success: result.success,
                completedSteps: result.completedSteps.length,
                failedSteps: result.failedSteps.length,
            },
            "Auto-generation completed"
        );

        return NextResponse.json({
            success: result.success,
            completedSteps: result.completedSteps,
            failedSteps: result.failedSteps,
            progress: result.progress,
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/generate/auto-generate-all");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            { error: "Failed to generate content" },
            { status: 500 }
        );
    }
}
