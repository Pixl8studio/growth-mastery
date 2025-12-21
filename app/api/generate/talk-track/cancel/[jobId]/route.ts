/**
 * Talk Track Job Cancel API
 * Cancels an in-progress talk track generation job
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { jobId } = await params;

        // Verify job exists and belongs to user
        const { data: job, error: fetchError } = await supabase
            .from("talk_track_jobs")
            .select("id, status")
            .eq("id", jobId)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Only allow cancellation of pending or processing jobs
        if (job.status !== "pending" && job.status !== "processing") {
            return NextResponse.json(
                { error: "Job cannot be cancelled - already completed or failed" },
                { status: 400 }
            );
        }

        // Update job status to cancelled
        const { error: updateError } = await supabase
            .from("talk_track_jobs")
            .update({
                status: "cancelled",
                error_message: "Cancelled by user",
            })
            .eq("id", jobId)
            .eq("user_id", user.id);

        if (updateError) {
            logger.error(
                { error: updateError, jobId, action: "cancel_job" },
                "Failed to cancel job"
            );
            Sentry.captureException(updateError, {
                tags: { component: "api", action: "cancel_talk_track_job" },
                extra: { jobId },
            });
            return NextResponse.json(
                { error: "Failed to cancel job" },
                { status: 500 }
            );
        }

        logger.info({ jobId, userId: user.id }, "Talk track job cancelled by user");

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error(
            { error, action: "cancel_talk_track_job" },
            "Failed to cancel talk track job"
        );
        Sentry.captureException(error, {
            tags: { component: "api", action: "cancel_talk_track_job" },
        });
        return NextResponse.json({ error: "Failed to cancel job" }, { status: 500 });
    }
}
