/**
 * Presentations API - List and Create
 * GET /api/presentations - List presentations for a project
 * POST /api/presentations - Create a new presentation
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ValidationError, NotFoundError } from "@/lib/errors";

// Zod schemas for input validation
const ListPresentationsSchema = z.object({
    projectId: z.string().uuid("projectId must be a valid UUID"),
});

const CreatePresentationSchema = z.object({
    projectId: z.string().uuid("projectId must be a valid UUID"),
    deckStructureId: z.string().uuid("deckStructureId must be a valid UUID").optional(),
    title: z.string().min(1, "title is required").max(500, "title too long"),
    customization: z.record(z.string(), z.unknown()).optional(),
});

// GET - List presentations for a project
export async function GET(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get("projectId");

        // Validate input with Zod
        const validation = ListPresentationsSchema.safeParse({ projectId });
        if (!validation.success) {
            const errorMessage = validation.error.issues
                .map((issue) => issue.message)
                .join(", ");
            throw new ValidationError(errorMessage);
        }

        const { projectId: validProjectId } = validation.data;

        // Verify user owns the project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id")
            .eq("id", validProjectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            throw new NotFoundError("Project");
        }

        // Fetch presentations
        const { data: presentations, error } = await supabase
            .from("presentations")
            .select("*")
            .eq("funnel_project_id", validProjectId)
            .order("created_at", { ascending: false });

        if (error) {
            logger.error(
                { error, projectId: validProjectId },
                "Failed to fetch presentations"
            );
            throw error;
        }

        return NextResponse.json({ presentations });
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        logger.error({ error }, "Failed to list presentations");

        Sentry.captureException(error, {
            tags: { component: "api", action: "list_presentations" },
        });

        return NextResponse.json(
            { error: "Failed to list presentations" },
            { status: 500 }
        );
    }
}

// POST - Create a new presentation
export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse and validate input with Zod
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            throw new ValidationError("Invalid JSON body");
        }

        const validation = CreatePresentationSchema.safeParse(body);
        if (!validation.success) {
            const errorMessage = validation.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join(", ");
            throw new ValidationError(errorMessage);
        }

        const { projectId, deckStructureId, title, customization } = validation.data;

        // Verify user owns the project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            throw new NotFoundError("Project");
        }

        // Create presentation
        const { data: presentation, error } = await supabase
            .from("presentations")
            .insert({
                user_id: user.id,
                funnel_project_id: projectId,
                deck_structure_id: deckStructureId || null,
                title,
                customization: customization || {},
                status: "draft",
                slides: [],
            })
            .select()
            .single();

        if (error) {
            logger.error({ error, projectId }, "Failed to create presentation");
            throw error;
        }

        logger.info(
            { userId: user.id, presentationId: presentation.id, projectId },
            "Presentation created"
        );

        return NextResponse.json({ presentation });
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        logger.error({ error }, "Failed to create presentation");

        Sentry.captureException(error, {
            tags: { component: "api", action: "create_presentation" },
        });

        return NextResponse.json(
            { error: "Failed to create presentation" },
            { status: 500 }
        );
    }
}
