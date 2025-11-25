/**
 * Email Domain Status API
 *
 * GET - Get current domain verification status from Mailgun
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { getMailgunProvider } from "@/lib/followup/providers/mailgun-provider";

/**
 * GET /api/email-domains/[domainId]/status
 * Get current domain verification status
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

        // Get current status from Mailgun
        const mailgunProvider = await getMailgunProvider(domain.full_domain);
        if (!mailgunProvider) {
            return NextResponse.json(
                { success: false, error: "Mailgun not configured" },
                { status: 503 }
            );
        }

        const domainInfo = await mailgunProvider.getDomainInfo(domain.full_domain);
        if (!domainInfo) {
            return NextResponse.json(
                { success: false, error: "Failed to get domain status" },
                { status: 500 }
            );
        }

        // Parse DNS records and their validity
        const sendingRecords = domainInfo.sending_dns_records || [];
        const receivingRecords = domainInfo.receiving_dns_records || [];
        const allRecords = [...sendingRecords, ...receivingRecords];

        const verified = allRecords.every(
            (record) => record.valid === "valid" || record.valid === "true"
        );

        // Update last checked timestamp
        await supabase
            .from("email_domains")
            .update({
                last_checked_at: new Date().toISOString(),
            })
            .eq("id", domainId)
            .eq("user_id", user.id);

        logger.info(
            { userId: user.id, domainId, domain: domain.full_domain, verified },
            "📊 Email domain status checked"
        );

        return NextResponse.json({
            success: true,
            domain: domain.full_domain,
            verification_status: domain.verification_status,
            verified,
            dns_records: allRecords.map((record) => ({
                type: record.record_type,
                name: record.name,
                value: record.value,
                valid: record.valid === "valid" || record.valid === "true",
            })),
            mailgun_state: domainInfo.domain.state,
        });
    } catch (error) {
        logger.error({ error }, "❌ Failed to get email domain status");
        Sentry.captureException(error, {
            tags: { component: "api", action: "get_email_domain_status" },
        });

        return NextResponse.json(
            { success: false, error: "Failed to get email domain status" },
            { status: 500 }
        );
    }
}
