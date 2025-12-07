/**
 * AI Editor - Pages List Endpoint
 * GET /api/ai-editor/pages - List all AI editor pages for a project
 * POST /api/ai-editor/pages - Create a new AI editor page
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generatePage } from "@/lib/ai-editor/generator";

/**
 * GET - List all AI editor pages for a project
 */
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const url = new URL(request.url);
        const projectId = url.searchParams.get("projectId");

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Build query
        let query = supabase
            .from("ai_editor_pages")
            .select(
                `
        id,
        title,
        page_type,
        status,
        version,
        created_at,
        updated_at,
        funnel_project_id,
        funnel_projects!inner(name, user_id)
      `
            )
            .eq("funnel_projects.user_id", user.id)
            .order("updated_at", { ascending: false });

        if (projectId) {
            query = query.eq("funnel_project_id", projectId);
        }

        const { data: pages, error } = await query;

        if (error) {
            logger.error({ error }, "Failed to list AI editor pages");
            return NextResponse.json(
                { error: "Failed to list pages" },
                { status: 500 }
            );
        }

        return NextResponse.json({ pages });
    } catch (error) {
        logger.error({ error }, "Failed to list AI editor pages");
        return NextResponse.json({ error: "Failed to list pages" }, { status: 500 });
    }
}

/**
 * POST - Create a new AI editor page (with optional generation)
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse body
        const body = await request.json();
        const {
            projectId,
            pageType,
            title,
            generateInitial = true,
            customPrompt,
        } = body;

        // Validate inputs
        if (!projectId || !pageType) {
            return NextResponse.json(
                { error: "projectId and pageType are required" },
                { status: 400 }
            );
        }

        if (!["registration", "watch", "enrollment"].includes(pageType)) {
            return NextResponse.json(
                { error: "pageType must be 'registration', 'watch', or 'enrollment'" },
                { status: 400 }
            );
        }

        // Verify user owns the project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id, user_id, name")
            .eq("id", projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (project.user_id !== user.id) {
            return NextResponse.json(
                { error: "You don't have access to this project" },
                { status: 403 }
            );
        }

        logger.info(
            { userId: user.id, projectId, pageType, generateInitial },
            "Creating new AI editor page"
        );

        let htmlContent = "";
        let pageTitle = title || `${pageType} Page`;
        let sectionsGenerated: string[] = [];

        // Generate initial content if requested
        if (generateInitial) {
            try {
                const result = await generatePage({
                    projectId,
                    pageType,
                    customPrompt,
                });
                htmlContent = result.html;
                pageTitle = result.title || pageTitle;
                sectionsGenerated = result.sectionsGenerated;
            } catch (error) {
                logger.error({ error }, "Failed to generate initial page content");
                // Continue with empty HTML - user can regenerate later
            }
        }

        // Create the page
        const { data: newPage, error: insertError } = await supabase
            .from("ai_editor_pages")
            .insert({
                user_id: user.id,
                funnel_project_id: projectId,
                page_type: pageType,
                title: pageTitle,
                html_content: htmlContent,
                status: "draft",
                version: 1,
            })
            .select()
            .single();

        if (insertError) {
            logger.error({ error: insertError }, "Failed to create AI editor page");
            return NextResponse.json(
                { error: "Failed to create page" },
                { status: 500 }
            );
        }

        // Create conversation record
        const { error: convError } = await supabase
            .from("ai_editor_conversations")
            .insert({
                page_id: newPage.id,
                messages: [],
                total_edits: 0,
            });

        if (convError) {
            logger.warn({ error: convError }, "Failed to create conversation record");
        }

        // Create initial version
        if (htmlContent) {
            const { error: versionError } = await supabase
                .from("ai_editor_versions")
                .insert({
                    page_id: newPage.id,
                    version: 1,
                    html_content: htmlContent,
                    change_description: "Initial generation",
                });

            if (versionError) {
                logger.warn({ error: versionError }, "Failed to create version record");
            }
        }

        logger.info(
            { pageId: newPage.id, projectId, pageType, generated: !!htmlContent },
            "AI editor page created"
        );

        return NextResponse.json({
            success: true,
            page: newPage,
            sectionsGenerated,
        });
    } catch (error) {
        logger.error({ error }, "Failed to create AI editor page");
        return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
    }
}
