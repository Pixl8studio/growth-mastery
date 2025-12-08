/**
 * Email Domains API - List and Create
 *
 * GET  - List user's email domains
 * POST - Create new email domain
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getMailgunProvider } from "@/lib/followup/providers/mailgun-provider";
import type { CreateEmailDomainRequest, EmailDomain } from "@/types/integrations";

/**
 * GET /api/email-domains
 * List user's email domains with optional funnel filter
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get query params
        const searchParams = request.nextUrl.searchParams;
        const funnelProjectId = searchParams.get("funnel_project_id");

        // Build query
        let query = supabase
            .from("email_domains")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        // Filter by funnel if specified
        if (funnelProjectId) {
            query = query.or(
                `funnel_project_id.eq.${funnelProjectId},funnel_project_id.is.null`
            );
        }

        const { data: domains, error } = await query;

        if (error) {
            throw error;
        }

        logger.info(
            { userId: user.id, count: domains?.length || 0, funnelProjectId },
            "📧 Listed email domains"
        );

        return NextResponse.json({
            success: true,
            domains: domains || [],
        });
    } catch (error) {
        logger.error({ error }, "❌ Failed to list email domains");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "list_email_domains",
                endpoint: "GET /api/email-domains",
            },
            extra: {},
        });

        return NextResponse.json(
            { success: false, error: "Failed to list email domains" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/email-domains
 * Create new email domain
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse request body
        const body: CreateEmailDomainRequest = await request.json();
        const { domain, subdomain = "mail", funnel_project_id = null } = body;

        // Validate domain
        if (!domain || !/^[a-z0-9][a-z0-9-]*\.[a-z]{2,}$/i.test(domain)) {
            return NextResponse.json(
                { success: false, error: "Invalid domain format" },
                { status: 400 }
            );
        }

        // Validate subdomain
        if (!/^[a-z0-9][a-z0-9-]*$/i.test(subdomain)) {
            return NextResponse.json(
                { success: false, error: "Invalid subdomain format" },
                { status: 400 }
            );
        }

        const fullDomain = `${subdomain}.${domain}`;

        // Check if domain already exists for this user
        const { data: existingDomain } = await supabase
            .from("email_domains")
            .select("id")
            .eq("user_id", user.id)
            .eq("full_domain", fullDomain)
            .single();

        if (existingDomain) {
            return NextResponse.json(
                { success: false, error: "Domain already exists" },
                { status: 400 }
            );
        }

        // If funnel_project_id provided, verify ownership
        if (funnel_project_id) {
            const { data: project } = await supabase
                .from("funnel_projects")
                .select("id")
                .eq("id", funnel_project_id)
                .eq("user_id", user.id)
                .single();

            if (!project) {
                return NextResponse.json(
                    { success: false, error: "Funnel not found" },
                    { status: 404 }
                );
            }
        }

        // Create domain in Mailgun
        const mailgunProvider = await getMailgunProvider(fullDomain);
        if (!mailgunProvider) {
            return NextResponse.json(
                { success: false, error: "Mailgun not configured" },
                { status: 503 }
            );
        }

        const mailgunResult = await mailgunProvider.createDomain(fullDomain);
        if (!mailgunResult) {
            return NextResponse.json(
                { success: false, error: "Failed to create domain in Mailgun" },
                { status: 500 }
            );
        }

        // Extract DNS records
        const sendingRecords = mailgunResult.sending_dns_records || [];
        const receivingRecords = mailgunResult.receiving_dns_records || [];

        const spfRecord = sendingRecords.find(
            (r) => r.record_type === "TXT" && r.value.includes("v=spf1")
        );
        const dkim1Record = sendingRecords.find(
            (r) => r.record_type === "TXT" && r.name.includes("k1")
        );
        const dkim2Record = sendingRecords.find(
            (r) => r.record_type === "TXT" && r.name.includes("k2")
        );
        const mxRecord = receivingRecords.find((r) => r.record_type === "MX");
        const trackingCname = sendingRecords.find(
            (r) => r.record_type === "CNAME" && r.name.includes("email")
        );

        // Create domain in database
        const { data: newDomain, error: insertError } = await supabase
            .from("email_domains")
            .insert({
                user_id: user.id,
                funnel_project_id: funnel_project_id,
                domain: domain,
                subdomain: subdomain,
                mailgun_domain_id: mailgunResult.domain.name,
                spf_record: spfRecord?.value || null,
                dkim1_record: dkim1Record?.value || null,
                dkim1_host: dkim1Record?.name || null,
                dkim2_record: dkim2Record?.value || null,
                dkim2_host: dkim2Record?.name || null,
                mx_record: mxRecord?.value || null,
                mx_host: mxRecord?.name || null,
                tracking_cname: trackingCname?.value || null,
                tracking_host: trackingCname?.name || null,
                verification_status: "pending",
                sender_email: `noreply@${fullDomain}`,
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        logger.info(
            { userId: user.id, domain: fullDomain, funnelProjectId: funnel_project_id },
            "✅ Email domain created"
        );

        return NextResponse.json({
            success: true,
            domain: newDomain as EmailDomain,
        });
    } catch (error) {
        logger.error({ error }, "❌ Failed to create email domain");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "create_email_domain",
                endpoint: "POST /api/email-domains",
            },
            extra: {
                // Domain info not included to avoid logging sensitive data
            },
        });

        return NextResponse.json(
            { success: false, error: "Failed to create email domain" },
            { status: 500 }
        );
    }
}
