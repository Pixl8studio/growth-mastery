/**
 * VAPI Call Initiation API
 * Starts an AI intake call
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { createCall } from "@/lib/vapi/client";
import { ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "initiate-vapi-call" });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { projectId } = body;

        if (!projectId) {
            throw new ValidationError("Missing projectId");
        }

        requestLogger.info({ userId: user.id, projectId }, "Initiating VAPI call");

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("*")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            throw new ValidationError("Project not found");
        }

        // Create VAPI call
        const { callId } = await createCall({
            metadata: {
                userId: user.id,
                funnelProjectId: projectId,
                projectName: project.name,
            },
        });

        // Create transcript record with pending status
        const { error: transcriptError } = await supabase
            .from("vapi_transcripts")
            .insert({
                funnel_project_id: projectId,
                user_id: user.id,
                call_id: callId,
                call_status: "in_progress",
                transcript_text: "",
            });

        if (transcriptError) {
            requestLogger.error(
                { error: transcriptError },
                "Failed to create transcript record"
            );
        }

        requestLogger.info({ callId }, "VAPI call initiated successfully");

        return NextResponse.json({
            success: true,
            callId,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to initiate VAPI call");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "initiate-vapi-call",
                endpoint: "POST /api/vapi/initiate-call",
            },
            extra: {
                isValidationError: error instanceof ValidationError,
            },
        });

        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
    }
}
