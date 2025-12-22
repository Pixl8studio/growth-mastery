/**
 * AI Editor - Version History Endpoint
 * GET /api/ai-editor/pages/[pageId]/versions - List all versions for a page
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface RouteParams {
    params: Promise<{
        pageId: string;
    }>;
}

const PAGE_SIZE = 20;

/**
 * GET - List versions for a page with pagination
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const supabase = await createClient();
        const { pageId } = await params;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse query params for pagination
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const offset = (page - 1) * PAGE_SIZE;

        // Verify page ownership
        const { data: editorPage, error: pageError } = await supabase
            .from("ai_editor_pages")
            .select("id, funnel_projects!inner(user_id)")
            .eq("id", pageId)
            .single();

        if (pageError || !editorPage) {
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        // TypeScript infers funnel_projects as array due to !inner, but single() gives us one object
        const funnelProject = editorPage.funnel_projects as unknown as {
            user_id: string;
        };
        if (funnelProject.user_id !== user.id) {
            return NextResponse.json(
                { error: "You don't have access to this page" },
                { status: 403 }
            );
        }

        // Get total count
        const { count } = await supabase
            .from("ai_editor_versions")
            .select("*", { count: "exact", head: true })
            .eq("page_id", pageId);

        // Get versions (excluding html_content for list view)
        const { data: versions, error: versionsError } = await supabase
            .from("ai_editor_versions")
            .select("id, version, change_description, created_at")
            .eq("page_id", pageId)
            .order("version", { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);

        if (versionsError) {
            logger.error({ error: versionsError }, "Failed to fetch versions");
            return NextResponse.json(
                { error: "Failed to fetch versions" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            versions: versions || [],
            pagination: {
                page,
                pageSize: PAGE_SIZE,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / PAGE_SIZE),
            },
        });
    } catch (error) {
        logger.error({ error }, "Failed to list versions");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "list_versions",
                endpoint: "GET /api/ai-editor/pages/[pageId]/versions",
            },
        });

        return NextResponse.json({ error: "Failed to list versions" }, { status: 500 });
    }
}
