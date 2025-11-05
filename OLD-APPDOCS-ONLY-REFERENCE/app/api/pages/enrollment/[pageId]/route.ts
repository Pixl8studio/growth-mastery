/**
 * API route to update enrollment page details
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const { user } = await getCurrentUserWithProfile();
        const { pageId } = await params;
        const body = await request.json();
        const { vanity_slug } = body;

        const supabase = await createClient();

        // Check if slug already exists for another page
        if (vanity_slug) {
            const { data: existingPage } = await supabase
                .from("enrollment_pages")
                .select("id")
                .eq("user_id", user.id)
                .eq("vanity_slug", vanity_slug)
                .neq("id", pageId)
                .single();

            if (existingPage) {
                return NextResponse.json(
                    { error: "Slug already in use" },
                    { status: 400 }
                );
            }
        }

        const { data: page, error } = await supabase
            .from("enrollment_pages")
            .update({ vanity_slug, updated_at: new Date().toISOString() })
            .eq("id", pageId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            logger.error(
                { error, pageId, userId: user.id },
                "Failed to update enrollment page"
            );
            return NextResponse.json(
                { error: "Failed to update page" },
                { status: 500 }
            );
        }

        logger.info(
            { pageId, vanity_slug, userId: user.id },
            "Enrollment page updated successfully"
        );

        return NextResponse.json({ success: true, page });
    } catch (error) {
        logger.error({ error }, "Error in enrollment page update route");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const { user } = await getCurrentUserWithProfile();
        const { pageId } = await params;
        const body = await request.json();
        const { html_content } = body;

        if (!html_content) {
            return NextResponse.json(
                { error: "html_content is required" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        const { data: page, error } = await supabase
            .from("enrollment_pages")
            .update({ html_content, updated_at: new Date().toISOString() })
            .eq("id", pageId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            logger.error(
                { error, pageId },
                "Failed to update enrollment page HTML content"
            );
            return NextResponse.json(
                { error: "Failed to update page" },
                { status: 500 }
            );
        }

        logger.info(
            { pageId, userId: user.id },
            "Enrollment page HTML content updated"
        );

        return NextResponse.json({ success: true, page });
    } catch (error) {
        logger.error({ error }, "Error updating enrollment page HTML content");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
