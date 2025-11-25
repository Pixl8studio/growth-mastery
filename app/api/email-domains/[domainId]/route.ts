/**
 * Email Domain API - Single Domain Operations
 *
 * GET    - Get domain details
 * DELETE - Delete domain
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { getMailgunProvider } from "@/lib/followup/providers/mailgun-provider";

/**
 * GET /api/email-domains/[domainId]
 * Get email domain details
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domainId: string }> }
) {
    try {
        const { domainId } = await params;
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get domain
        const { data: domain, error } = await supabase
            .from("email_domains")
            .select("*")
            .eq("id", domainId)
            .eq("user_id", user.id)
            .single();

        if (error || !domain) {
            return NextResponse.json(
                { success: false, error: "Domain not found" },
                { status: 404 }
            );
        }

        logger.info(
            { userId: user.id, domainId, domain: domain.full_domain },
            "📧 Got email domain"
        );

        return NextResponse.json({
            success: true,
            domain,
        });
    } catch (error) {
        logger.error({ error }, "❌ Failed to get email domain");
        Sentry.captureException(error, {
            tags: { component: "api", action: "get_email_domain" },
        });

        return NextResponse.json(
            { success: false, error: "Failed to get email domain" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/email-domains/[domainId]
 * Delete email domain
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ domainId: string }> }
) {
    try {
        const { domainId } = await params;
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get domain
        const { data: domain, error: fetchError } = await supabase
            .from("email_domains")
            .select("*")
            .eq("id", domainId)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !domain) {
            return NextResponse.json(
                { success: false, error: "Domain not found" },
                { status: 404 }
            );
        }

        // Delete from Mailgun
        const mailgunProvider = await getMailgunProvider(domain.full_domain);
        if (mailgunProvider) {
            await mailgunProvider.deleteDomain(domain.full_domain);
        }

        // Delete from database
        const { error: deleteError } = await supabase
            .from("email_domains")
            .delete()
            .eq("id", domainId)
            .eq("user_id", user.id);

        if (deleteError) {
            throw deleteError;
        }

        logger.info(
            { userId: user.id, domainId, domain: domain.full_domain },
            "🗑️  Email domain deleted"
        );

        Sentry.addBreadcrumb({
            category: "email_domain",
            message: `Deleted email domain ${domain.full_domain}`,
            level: "info",
            data: { userId: user.id, domain: domain.full_domain },
        });

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        logger.error({ error }, "❌ Failed to delete email domain");
        Sentry.captureException(error, {
            tags: { component: "api", action: "delete_email_domain" },
        });

        return NextResponse.json(
            { success: false, error: "Failed to delete email domain" },
            { status: 500 }
        );
    }
}
