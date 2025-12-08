/**
 * Ads Metrics Sync API
 * Cron endpoint to sync ad metrics every 12 hours
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { syncAllAdMetrics } from "@/lib/ads/metrics-fetcher";

/**
 * GET /api/ads/sync
 * Sync all active ad campaigns
 * Should be called by Vercel Cron or external scheduler every 12 hours
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret (required for security)
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            logger.error({}, "CRON_SECRET not configured - endpoint disabled");
            return NextResponse.json(
                { error: "Service misconfigured" },
                { status: 500 }
            );
        }

        const authHeader = request.headers.get("authorization");
        const expectedAuth = `Bearer ${cronSecret}`;

        if (authHeader !== expectedAuth) {
            logger.warn({ authHeader }, "Unauthorized cron sync attempt");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        logger.info({}, "Starting ad metrics sync");

        const result = await syncAllAdMetrics();

        logger.info(result, "Ad metrics sync complete");

        return NextResponse.json({
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/ads/sync");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "sync_ad_metrics",
                endpoint: "GET /api/ads/sync",
            },
            extra: {
                errorType: error instanceof Error ? error.constructor.name : typeof error,
            },
        });

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
