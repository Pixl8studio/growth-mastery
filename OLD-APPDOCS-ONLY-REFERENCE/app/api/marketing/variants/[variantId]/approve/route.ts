/**
 * Marketing Variant Approval API
 * Approve a variant for publishing
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface RouteContext {
    params: Promise<{
        variantId: string;
    }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
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

        const { variantId } = await context.params;
        const body = await request.json();

        logger.info({ userId: user.id, variantId }, "Variant approval requested");

        // Update variant approval status
        const { data: variant, error } = await supabase
            .from("marketing_post_variants")
            .update({
                approval_status: "approved",
                approved_by: user.id,
                approved_at: new Date().toISOString(),
                approval_notes: body.notes || "",
            })
            .eq("id", variantId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            variant,
        });
    } catch (error) {
        logger.error({ error }, "Variant approval failed");

        return NextResponse.json(
            {
                success: false,
                error: "Failed to approve variant",
            },
            { status: 500 }
        );
    }
}
