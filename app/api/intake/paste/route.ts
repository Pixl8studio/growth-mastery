/**
 * Paste Content Intake API
 * Accepts raw text content pasted by the user
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { validateIntakeContent } from "@/lib/intake/processors";

export async function POST(request: NextRequest) {
    try {
        const { projectId, userId, content, sessionName } = await request.json();

        if (!projectId || !userId || !content) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate content
        const validation = validateIntakeContent(content);
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.reason || "Invalid content" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Save to database
        const { data: intakeRecord, error } = await supabase
            .from("vapi_transcripts")
            .insert({
                funnel_project_id: projectId,
                user_id: userId,
                intake_method: "paste",
                raw_content: content,
                transcript_text: content, // Use as transcript for compatibility
                call_status: "completed",
                call_duration: 0,
                session_name: sessionName || "Pasted Content",
                metadata: {
                    character_count: content.length,
                    word_count: content.split(/\s+/).length,
                },
            })
            .select()
            .single();

        if (error) {
            logger.error(
                {
                    error,
                    projectId,
                    errorMessage:
                        error instanceof Error ? error.message : String(error),
                    errorCode: (error as { code?: string })?.code,
                },
                "Failed to save pasted content"
            );
            return NextResponse.json(
                { error: "Failed to save content. Please try again." },
                { status: 500 }
            );
        }

        logger.info(
            { intakeId: intakeRecord.id, projectId, contentLength: content.length },
            "Pasted content saved successfully"
        );

        return NextResponse.json({
            success: true,
            intakeId: intakeRecord.id,
            method: "paste",
        });
    } catch (error) {
        logger.error({ error }, "Error in paste intake endpoint");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/intake/paste",
            },
        });

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
