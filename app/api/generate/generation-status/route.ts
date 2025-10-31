/**
 * Generation Status API
 * Returns the current status of auto-generation for a project
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ValidationError, AuthenticationError } from "@/lib/errors";

export interface GenerationStatusResponse {
    isGenerating: boolean;
    currentStep: number | null;
    completedSteps: number[];
    failedSteps: Array<{ step: number; error: string }>;
    progress: Array<{
        step: number;
        stepName: string;
        status: "pending" | "in_progress" | "completed" | "failed";
        error?: string;
        completedAt?: string;
    }>;
    startedAt: string | null;
}

export async function GET(request: NextRequest) {
    const requestLogger = logger.child({ handler: "get-generation-status" });

    try {
        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get("projectId");

        if (!projectId) {
            throw new ValidationError("projectId is required");
        }

        const supabase = await createClient();

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            throw new AuthenticationError("User not authenticated");
        }

        // Get project with generation status
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id, user_id, auto_generation_status")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            throw new ValidationError("Project not found or access denied");
        }

        // Parse the auto_generation_status JSONB field
        const status =
            (project.auto_generation_status as Record<string, unknown>) || {};

        const response: GenerationStatusResponse = {
            isGenerating: Boolean(status.is_generating),
            currentStep: (status.current_step as number) || null,
            completedSteps: (status.generated_steps as number[]) || [],
            failedSteps:
                (status.generation_errors as Array<{ step: number; error: string }>) ||
                [],
            progress: (status.progress as GenerationStatusResponse["progress"]) || [],
            startedAt: (status.started_at as string) || null,
        };

        requestLogger.info(
            {
                projectId,
                isGenerating: response.isGenerating,
                completedSteps: response.completedSteps.length,
            },
            "Generation status retrieved"
        );

        return NextResponse.json(response);
    } catch (error) {
        requestLogger.error({ error }, "Failed to get generation status");

        if (error instanceof ValidationError || error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            { error: "Failed to get generation status" },
            { status: 500 }
        );
    }
}
