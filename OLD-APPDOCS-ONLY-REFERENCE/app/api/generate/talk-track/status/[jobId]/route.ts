/**
 * Talk Track Job Status API
 * Polls status of background talk track generation job
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

        // Fetch job status
        const { data: job, error } = await supabase
            .from("talk_track_jobs")
            .select(
                "id, status, progress, current_chunk, total_chunks, error_message, talk_track_id"
            )
            .eq("id", jobId)
            .eq("user_id", user.id)
            .single();

        if (error || !job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json({ job });
    } catch (error) {
        console.error("Failed to fetch job status:", error);
        return NextResponse.json(
            { error: "Failed to fetch job status" },
            { status: 500 }
        );
    }
}
