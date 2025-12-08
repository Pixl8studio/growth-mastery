/**
 * Email Domain Verification API
 *
 * POST - Trigger domain verification
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getMailgunProvider } from "@/lib/followup/providers/mailgun-provider";

/**
 * POST /api/email-domains/[domainId]/verify
 * Trigger domain verification and update status
 */
export async function POST(
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

        // Verify domain with Mailgun
        const mailgunProvider = await getMailgunProvider(domain.full_domain);
        if (!mailgunProvider) {
            return NextResponse.json(
                { success: false, error: "Mailgun not configured" },
                { status: 503 }
            );
        }

        const verificationResult = await mailgunProvider.verifyDomain(
            domain.full_domain
        );
        if (!verificationResult) {
            return NextResponse.json(
                { success: false, error: "Failed to verify domain" },
                { status: 500 }
            );
        }

        // Update domain status in database
        const newStatus = verificationResult.verified ? "verified" : "pending";
        const { data: updatedDomain, error: updateError } = await supabase
            .from("email_domains")
            .update({
                verification_status: newStatus,
                verified_at: verificationResult.verified
                    ? new Date().toISOString()
                    : null,
                last_checked_at: new Date().toISOString(),
                error_message: null,
            })
            .eq("id", domainId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        logger.info(
            {
                userId: user.id,
                domainId,
                domain: domain.full_domain,
                verified: verificationResult.verified,
            },
            "🔍 Email domain verification checked"
        );

        return NextResponse.json({
            success: true,
            domain: updatedDomain,
            verification: {
                verified: verificationResult.verified,
                dns_records: verificationResult.dns_records,
            },
        });
    } catch (error) {
        logger.error({ error }, "❌ Failed to verify email domain");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "verify_email_domain",
                endpoint: "POST /api/email-domains/[domainId]/verify",
            },
            extra: {},
        });

        return NextResponse.json(
            { success: false, error: "Failed to verify email domain" },
            { status: 500 }
        );
    }
}
