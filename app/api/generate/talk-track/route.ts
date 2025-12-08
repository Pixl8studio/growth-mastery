/**
 * Talk Track Generation API - Job Coordinator
 * Creates background job for talk track generation via Supabase Edge Function
 * Returns immediately with job ID for status polling
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const generateTalkTrackSchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
    deckStructureId: z.string().uuid("Invalid deck structure ID"),
});

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        const validationResult = generateTalkTrackSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { projectId, deckStructureId } = validationResult.data;

        // Verify deck structure exists and belongs to user
        const { data: deckStructure, error: deckError } = await supabase
            .from("deck_structures")
            .select("id")
            .eq("id", deckStructureId)
            .eq("user_id", user.id)
            .single();

        if (deckError || !deckStructure) {
            throw new ValidationError("Deck structure not found");
        }

        // Create background job record
        const { data: job, error: jobError } = await supabase
            .from("talk_track_jobs")
            .insert({
                user_id: user.id,
                funnel_project_id: projectId,
                deck_structure_id: deckStructureId,
                status: "pending",
                progress: 0,
            })
            .select()
            .single();

        if (jobError || !job) {
            logger.error({ error: jobError, action: "create_talk_track_job" }, "Failed to create job");
            Sentry.captureException(jobError, {
                tags: { component: "api", action: "create_talk_track_job" },
            });
            throw new Error("Failed to create job");
        }

        // Invoke Supabase Edge Function (fire and forget)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        fetch(`${supabaseUrl}/functions/v1/generate-talk-track`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({ jobId: job.id }),
        }).catch((error) => {
            logger.error({ error, action: "invoke_edge_function" }, "Failed to invoke Edge Function");
            Sentry.captureException(error, {
                tags: { component: "api", action: "invoke_edge_function" },
            });
        });

        // Return job ID immediately
        return NextResponse.json({
            success: true,
            jobId: job.id,
        });
    } catch (error) {
        logger.error({ error, action: "talk_track_job" }, "Failed to create talk track job");
        Sentry.captureException(error, {
            tags: { component: "api", action: "talk_track_job" },
        });

        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: "Failed to create talk track job" },
            { status: 500 }
        );
    }
}
