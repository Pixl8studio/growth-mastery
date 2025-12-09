/**
 * Marketing Variant Rejection API
 * Reject a variant
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
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

        logger.info({ userId: user.id, variantId }, "Variant rejection requested");

        // Update variant approval status
        const { data: variant, error } = await supabase
            .from("marketing_post_variants")
            .update({
                approval_status: "rejected",
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
        logger.error({ error }, "Variant rejection failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/marketing/variants/[variantId]/reject",
            },
        });

        return NextResponse.json(
            {
                success: false,
                error: "Failed to reject variant",
            },
            { status: 500 }
        );
    }
}
