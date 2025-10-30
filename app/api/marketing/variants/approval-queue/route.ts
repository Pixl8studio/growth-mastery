/**
 * Marketing Variants Approval Queue API
 * Get variants awaiting approval
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const funnelProjectId = searchParams.get("funnel_project_id");
        const approvalStatus = searchParams.get("approval_status") || "pending";
        const platform = searchParams.get("platform");

        logger.info(
            { userId: user.id, funnelProjectId, approvalStatus },
            "Approval queue requested"
        );

        // Query variants with approval status
        let query = supabase
            .from("marketing_post_variants")
            .select("*")
            .eq("user_id", user.id)
            .eq("approval_status", approvalStatus);

        if (funnelProjectId) {
            // Join with content_brief to filter by funnel project
            query = query.eq("content_brief_id", funnelProjectId);
        }

        if (platform) {
            query = query.eq("platform", platform);
        }

        const { data: variants, error } = await query.order("created_at", {
            ascending: false,
        });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            variants: variants || [],
        });
    } catch (error) {
        logger.error({ error }, "Failed to retrieve approval queue");

        return NextResponse.json(
            {
                success: false,
                error: "Failed to retrieve approval queue",
            },
            { status: 500 }
        );
    }
}
