/**
 * API route to update registration page details
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
                .from("registration_pages")
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
            .from("registration_pages")
            .update({ vanity_slug, updated_at: new Date().toISOString() })
            .eq("id", pageId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            logger.error(
                { error, pageId, userId: user.id },
                "Failed to update registration page"
            );
            return NextResponse.json(
                { error: "Failed to update page" },
                { status: 500 }
            );
        }

        logger.info(
            { pageId, vanity_slug, userId: user.id },
            "Registration page updated successfully"
        );

        return NextResponse.json({ success: true, page });
    } catch (error) {
        logger.error({ error }, "Error in registration page update route");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
