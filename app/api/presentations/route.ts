/**
 * Presentations API - List and Create
 * GET /api/presentations - List presentations for a project
 * POST /api/presentations - Create a new presentation
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

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

        if (!projectId) {
            return NextResponse.json(
                { error: "projectId is required" },
                { status: 400 }
            );
        }

        // Verify user owns the project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Fetch presentations
        const { data: presentations, error } = await supabase
            .from("presentations")
            .select("*")
            .eq("funnel_project_id", projectId)
            .order("created_at", { ascending: false });

        if (error) {
            logger.error({ error }, "Failed to fetch presentations");
            throw error;
        }

        return NextResponse.json({ presentations });
    } catch (error) {
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

        const body = await request.json();
        const { projectId, deckStructureId, title, customization } = body;

        if (!projectId || !title) {
            return NextResponse.json(
                { error: "projectId and title are required" },
                { status: 400 }
            );
        }

        // Verify user owns the project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
            logger.error({ error }, "Failed to create presentation");
            throw error;
        }

        logger.info(
            { userId: user.id, presentationId: presentation.id },
            "Presentation created"
        );

        return NextResponse.json({ presentation });
    } catch (error) {
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
