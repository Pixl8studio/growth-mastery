/**
 * Domain Verification API Route
 * Check domain verification status with Vercel
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ domainId: string }> }
) {
    try {
        const user = await requireAuth();
        const { domainId } = await params;
        const supabase = await createClient();

        // Validate environment variables
        if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) {
            logger.error({}, "Vercel API credentials not configured");
            return NextResponse.json(
                { error: "Domain service not configured" },
                { status: 500 }
            );
        }

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

        // Check verification status with Vercel
        const vercelResponse = await fetch(
            `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domainRecord.domain}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
                },
            }
        );

        if (!vercelResponse.ok) {
            logger.error(
                { domain: domainRecord.domain },
                "Failed to check domain status"
            );
            return NextResponse.json(
                { error: "Failed to check verification status" },
                { status: 500 }
            );
        }

        const vercelData = await vercelResponse.json();

        // Check if domain is properly configured
        // Vercel returns verified=true when domain is added, but we need to check configuration
        const isConfigured =
            vercelData.verified &&
            vercelData.configuration &&
            (vercelData.configuration.configuredBy === "CNAME" ||
                vercelData.configuration.configuredBy === "A");

        logger.info(
            {
                userId: user.id,
                domain: domainRecord.domain,
                vercelVerified: vercelData.verified,
                configuredBy: vercelData.configuration?.configuredBy,
                isConfigured,
            },
            "Domain verification checked"
        );

        // Update database with verification status
        const { error: updateError } = await supabase
            .from("custom_domains")
            .update({
                verified: isConfigured,
                verification_status: isConfigured ? "verified" : "pending",
            })
            .eq("id", domainId);

        if (updateError) {
            logger.error(
                { error: updateError },
                "Failed to update domain verification"
            );
            return NextResponse.json(
                { error: "Failed to update verification" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            verified: isConfigured,
            status: isConfigured ? "verified" : "pending",
            configuration: vercelData.configuration,
        });
    } catch (error) {
        logger.error({ error }, "Failed to verify domain");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "verify_domain",
                endpoint: "POST /api/domains/[domainId]/verify",
            },
            extra: {},
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
