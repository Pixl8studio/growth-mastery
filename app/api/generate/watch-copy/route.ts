/**
 * Watch Page Copy Generation API
 * Generates video landing page copy
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateWithAI } from "@/lib/ai/client";
import { createWatchPageCopyPrompt } from "@/lib/ai/prompts";
import type { WatchPageCopy } from "@/lib/ai/types";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

const generateWatchCopySchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
    videoDuration: z.number().positive().optional(),
});

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "generate-watch-copy" });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        const validationResult = generateWatchCopySchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { projectId, videoDuration } = validationResult.data;

        requestLogger.info(
            { userId: user.id, projectId },
            "Generating watch page copy"
        );

        // Get project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("*")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            throw new ValidationError("Project not found");
        }

        // Generate copy with AI
        const copy = await generateWithAI<WatchPageCopy>(
            createWatchPageCopyPrompt(
                {
                    name: project.name,
                    niche: project.business_niche,
                },
                videoDuration
            )
        );

        requestLogger.info(
            { userId: user.id },
            "Watch page copy generated successfully"
        );

        return NextResponse.json({
            success: true,
            copy,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate watch page copy");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate-watch-copy",
                endpoint: "POST /api/generate/watch-copy",
            },
            extra: {
                projectId: (error as any).projectId,
                videoDuration: (error as any).videoDuration,
            },
        });

        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { error: "Failed to generate watch page copy" },
            { status: 500 }
        );
    }
}
