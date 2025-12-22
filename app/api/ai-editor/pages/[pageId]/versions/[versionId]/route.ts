/**
 * AI Editor - Single Version Endpoint
 * GET /api/ai-editor/pages/[pageId]/versions/[versionId] - Get a specific version with HTML
 * POST /api/ai-editor/pages/[pageId]/versions/[versionId]/restore - Restore to this version
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface RouteParams {
    params: Promise<{
        pageId: string;
        versionId: string;
    }>;
}

/**
 * GET - Get a specific version with full HTML content
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const supabase = await createClient();
        const { pageId, versionId } = await params;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify page ownership
        const { data: editorPage, error: pageError } = await supabase
            .from("ai_editor_pages")
            .select("id, funnel_projects!inner(user_id)")
            .eq("id", pageId)
            .single();

        if (pageError || !editorPage) {
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        const funnelProject = editorPage.funnel_projects as unknown as {
            user_id: string;
        };
        if (funnelProject.user_id !== user.id) {
            return NextResponse.json(
                { error: "You don't have access to this page" },
                { status: 403 }
            );
        }

        // Get the version with HTML content
        const { data: version, error: versionError } = await supabase
            .from("ai_editor_versions")
            .select("*")
            .eq("id", versionId)
            .eq("page_id", pageId)
            .single();

        if (versionError || !version) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        return NextResponse.json({ version });
    } catch (error) {
        logger.error({ error }, "Failed to get version");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "get_version",
                endpoint: "GET /api/ai-editor/pages/[pageId]/versions/[versionId]",
            },
        });

        return NextResponse.json({ error: "Failed to get version" }, { status: 500 });
    }
}

/**
 * POST - Restore page to this version
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const supabase = await createClient();
        const { pageId, versionId } = await params;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify page ownership
        const { data: editorPage, error: pageError } = await supabase
            .from("ai_editor_pages")
            .select("id, version, funnel_projects!inner(user_id)")
            .eq("id", pageId)
            .single();

        if (pageError || !editorPage) {
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        const funnelProjectPost = editorPage.funnel_projects as unknown as {
            user_id: string;
        };
        if (funnelProjectPost.user_id !== user.id) {
            return NextResponse.json(
                { error: "You don't have access to this page" },
                { status: 403 }
            );
        }

        // Get the version to restore
        const { data: version, error: versionError } = await supabase
            .from("ai_editor_versions")
            .select("*")
            .eq("id", versionId)
            .eq("page_id", pageId)
            .single();

        if (versionError || !version) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        // Calculate new version number
        const newVersion = (editorPage.version || 0) + 1;

        // Update the page with the restored content
        const { data: updatedPage, error: updateError } = await supabase
            .from("ai_editor_pages")
            .update({
                html_content: version.html_content,
                version: newVersion,
                updated_at: new Date().toISOString(),
            })
            .eq("id", pageId)
            .select()
            .single();

        if (updateError) {
            logger.error({ error: updateError }, "Failed to restore version");
            return NextResponse.json(
                { error: "Failed to restore version" },
                { status: 500 }
            );
        }

        // Create a new version record for the restore
        const { error: newVersionError } = await supabase
            .from("ai_editor_versions")
            .insert({
                page_id: pageId,
                version: newVersion,
                html_content: version.html_content,
                change_description: `Restored from version ${version.version}`,
            });

        if (newVersionError) {
            logger.warn(
                { error: newVersionError },
                "Failed to create version record for restore"
            );
        }

        logger.info(
            {
                pageId,
                versionId,
                restoredFromVersion: version.version,
                userId: user.id,
            },
            "Page restored to previous version"
        );

        return NextResponse.json({
            success: true,
            page: updatedPage,
            restoredFromVersion: version.version,
        });
    } catch (error) {
        logger.error({ error }, "Failed to restore version");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "restore_version",
                endpoint: "POST /api/ai-editor/pages/[pageId]/versions/[versionId]",
            },
        });

        return NextResponse.json(
            { error: "Failed to restore version" },
            { status: 500 }
        );
    }
}
