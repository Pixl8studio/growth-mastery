/**
 * AI Editor - Page CRUD Endpoint
 * GET /api/ai-editor/pages/[pageId] - Get a page
 * PUT /api/ai-editor/pages/[pageId] - Update a page
 * DELETE /api/ai-editor/pages/[pageId] - Delete a page
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

/**
 * GET - Retrieve a single AI editor page
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

        const { data: page, error } = await supabase
            .from("ai_editor_pages")
            .select(
                `
        *,
        funnel_projects!inner(name, user_id),
        ai_editor_conversations(messages, total_edits),
        ai_editor_versions(id, version, change_description, created_at)
      `
            )
            .eq("id", pageId)
            .single();

        if (error || !page) {
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        if (page.funnel_projects.user_id !== user.id) {
            return NextResponse.json(
                { error: "You don't have access to this page" },
                { status: 403 }
            );
        }

        return NextResponse.json({ page });
    } catch (error) {
        logger.error({ error }, "Failed to get AI editor page");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "get_page",
                endpoint: "GET /api/ai-editor/pages/[pageId]",
            },
        });

        return NextResponse.json({ error: "Failed to get page" }, { status: 500 });
    }
}

/**
 * PUT - Update an AI editor page
 */
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const supabase = await createClient();
        const { pageId } = await params;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse body
        const body = await request.json();
        const { title, html_content, status, version } = body;

        // Verify ownership
        const { data: existingPage, error: fetchError } = await supabase
            .from("ai_editor_pages")
            .select("*, funnel_projects!inner(user_id)")
            .eq("id", pageId)
            .single();

        if (fetchError || !existingPage) {
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        if (existingPage.funnel_projects.user_id !== user.id) {
            return NextResponse.json(
                { error: "You don't have access to this page" },
                { status: 403 }
            );
        }

        // Build update object
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (title !== undefined) updates.title = title;
        if (html_content !== undefined) updates.html_content = html_content;
        if (status !== undefined) updates.status = status;
        if (version !== undefined) updates.version = version;

        // Update the page
        const { data: updatedPage, error: updateError } = await supabase
            .from("ai_editor_pages")
            .update(updates)
            .eq("id", pageId)
            .select()
            .single();

        if (updateError) {
            logger.error({ error: updateError }, "Failed to update AI editor page");
            return NextResponse.json(
                { error: "Failed to update page" },
                { status: 500 }
            );
        }

        // Create version record if HTML changed
        if (html_content !== undefined && html_content !== existingPage.html_content) {
            const { error: versionError } = await supabase
                .from("ai_editor_versions")
                .insert({
                    page_id: pageId,
                    version: version || (existingPage.version || 0) + 1,
                    html_content,
                    change_description: "Manual save",
                });

            if (versionError) {
                logger.warn({ error: versionError }, "Failed to create version record");
            }
        }

        logger.info({ pageId, userId: user.id }, "AI editor page updated");

        return NextResponse.json({ page: updatedPage });
    } catch (error) {
        logger.error({ error }, "Failed to update AI editor page");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "update_page",
                endpoint: "PUT /api/ai-editor/pages/[pageId]",
            },
        });

        return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
    }
}

/**
 * DELETE - Delete an AI editor page
 */
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const supabase = await createClient();
        const { pageId } = await params;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify ownership
        const { data: existingPage, error: fetchError } = await supabase
            .from("ai_editor_pages")
            .select("*, funnel_projects!inner(user_id)")
            .eq("id", pageId)
            .single();

        if (fetchError || !existingPage) {
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        if (existingPage.funnel_projects.user_id !== user.id) {
            return NextResponse.json(
                { error: "You don't have access to this page" },
                { status: 403 }
            );
        }

        // Delete the page (cascades to versions and conversations)
        const { error: deleteError } = await supabase
            .from("ai_editor_pages")
            .delete()
            .eq("id", pageId);

        if (deleteError) {
            logger.error({ error: deleteError }, "Failed to delete AI editor page");
            return NextResponse.json(
                { error: "Failed to delete page" },
                { status: 500 }
            );
        }

        logger.info({ pageId, userId: user.id }, "AI editor page deleted");

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ error }, "Failed to delete AI editor page");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "delete_page",
                endpoint: "DELETE /api/ai-editor/pages/[pageId]",
            },
        });

        return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
    }
}
