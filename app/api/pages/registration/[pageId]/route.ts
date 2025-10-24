/**
 * Registration Page API
 * Handles updates to registration pages including HTML content from visual editor
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ pageId: string }> }
) {
    try {
        const { pageId } = await context.params;
        const body = await request.json();
        const { html_content, headline, subheadline, is_published } = body;

        const supabase = await createClient();

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            logger.warn({ pageId }, "Unauthorized page update attempt");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user owns this page
        const { data: existingPage, error: fetchError } = await supabase
            .from("registration_pages")
            .select("user_id")
            .eq("id", pageId)
            .single();

        if (fetchError || !existingPage) {
            logger.error({ error: fetchError, pageId }, "Page not found");
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        if (existingPage.user_id !== user.id) {
            logger.warn(
                { pageId, userId: user.id, ownerId: existingPage.user_id },
                "User attempted to update page they don't own"
            );
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Prepare update data
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (html_content !== undefined) {
            updateData.html_content = html_content;
        }

        if (headline !== undefined) {
            updateData.headline = headline;
        }

        if (subheadline !== undefined) {
            updateData.subheadline = subheadline;
        }

        if (is_published !== undefined) {
            updateData.is_published = is_published;
        }

        // Update the page
        const { data: updatedPage, error: updateError } = await supabase
            .from("registration_pages")
            .update(updateData)
            .eq("id", pageId)
            .select()
            .single();

        if (updateError) {
            logger.error(
                { error: updateError, pageId },
                "Failed to update registration page"
            );
            return NextResponse.json(
                { error: "Failed to update page" },
                { status: 500 }
            );
        }

        logger.info(
            { pageId, userId: user.id, hasHtmlContent: !!html_content },
            "Registration page updated successfully"
        );

        return NextResponse.json({
            success: true,
            page: updatedPage,
        });
    } catch (error) {
        logger.error({ error }, "Error updating registration page");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ pageId: string }> }
) {
    try {
        const { pageId } = await context.params;
        const supabase = await createClient();

        const { data: page, error } = await supabase
            .from("registration_pages")
            .select("*")
            .eq("id", pageId)
            .single();

        if (error || !page) {
            logger.error({ error, pageId }, "Page not found");
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            page,
        });
    } catch (error) {
        logger.error({ error }, "Error fetching registration page");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
