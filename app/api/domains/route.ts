/**
 * Custom Domains API Routes
 * Manage custom domain connections via Vercel Domains API
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";

/**
 * Add a new custom domain
 */
export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const { domain, funnelProjectId } = await request.json();

        // Validate domain format
        const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
        if (!domainRegex.test(domain)) {
            throw new ValidationError("Invalid domain format");
        }

        // Validate required environment variables
        if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) {
            logger.error({}, "Vercel API credentials not configured");
            return NextResponse.json(
                { error: "Domain service not configured" },
                { status: 500 }
            );
        }

        // Add domain to Vercel
        const vercelResponse = await fetch(
            `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: domain }),
            }
        );

        if (!vercelResponse.ok) {
            const error = await vercelResponse.json();
            logger.error({ error, domain }, "Failed to add domain to Vercel");
            return NextResponse.json(
                { error: error.error?.message || "Failed to add domain" },
                { status: 400 }
            );
        }

        const vercelData = await vercelResponse.json();

        // Save to database
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("custom_domains")
            .insert({
                user_id: user.id,
                funnel_project_id: funnelProjectId,
                domain,
                is_subdomain: domain.split(".").length > 2,
                vercel_domain_id: vercelData.id,
                dns_instructions: {
                    type: "CNAME",
                    name: domain,
                    value: "cname.vercel-dns.com",
                },
            })
            .select("*, funnel_projects(id, name, slug)")
            .single();

        if (error) {
            logger.error({ error, domain }, "Failed to save domain to database");
            return NextResponse.json(
                { error: "Failed to save domain" },
                { status: 500 }
            );
        }

        logger.info({ userId: user.id, domain }, "Domain added successfully");

        return NextResponse.json({
            domain: data,
            dnsInstructions: data.dns_instructions,
        });
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        logger.error({ error }, "Failed to add domain");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "add_domain",
                endpoint: "POST /api/domains",
            },
            extra: {
                // Domain info not included to avoid logging sensitive data
            },
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Get all custom domains for the current user
 */
export async function GET() {
    try {
        const user = await requireAuth();
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("custom_domains")
            .select("*, funnel_projects(id, name, slug)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            logger.error({ error, userId: user.id }, "Failed to fetch domains");
            return NextResponse.json(
                { error: "Failed to fetch domains" },
                { status: 500 }
            );
        }

        return NextResponse.json({ domains: data });
    } catch (error) {
        logger.error({ error }, "Failed to fetch domains");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "fetch_domains",
                endpoint: "GET /api/domains",
            },
            extra: {},
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
