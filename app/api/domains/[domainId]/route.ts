/**
 * Domain Management API Route
 * Delete a custom domain
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ domainId: string }> }
) {
    try {
        const user = await requireAuth();
        const { domainId } = await params;
        const supabase = await createClient();

        // Get domain from database
        const { data: domainRecord, error: fetchError } = await supabase
            .from("custom_domains")
            .select("*")
            .eq("id", domainId)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !domainRecord) {
            return NextResponse.json({ error: "Domain not found" }, { status: 404 });
        }

        // Remove from Vercel (if configured)
        if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
            const vercelResponse = await fetch(
                `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domainRecord.domain}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
                    },
                }
            );

            if (!vercelResponse.ok) {
                logger.error(
                    { domain: domainRecord.domain },
                    "Failed to remove domain from Vercel"
                );
                // Continue with database deletion even if Vercel deletion fails
            }
        }

        // Delete from database
        const { error: deleteError } = await supabase
            .from("custom_domains")
            .delete()
            .eq("id", domainId);

        if (deleteError) {
            logger.error(
                { error: deleteError },
                "Failed to delete domain from database"
            );
            return NextResponse.json(
                { error: "Failed to delete domain" },
                { status: 500 }
            );
        }

        logger.info(
            { userId: user.id, domain: domainRecord.domain },
            "Domain deleted successfully"
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ error }, "Failed to delete domain");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "delete_domain",
                endpoint: "DELETE /api/domains/[domainId]",
            },
            extra: {},
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
