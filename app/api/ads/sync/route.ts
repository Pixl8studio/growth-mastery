/**
 * Ads Metrics Sync API
 * Cron endpoint to sync ad metrics every 12 hours
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { syncAllAdMetrics } from "@/lib/ads/metrics-fetcher";

/**
 * GET /api/ads/sync
 * Sync all active ad campaigns
 * Should be called by Vercel Cron or external scheduler every 12 hours
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret (if using Vercel Cron)
        const authHeader = request.headers.get("authorization");
        const expectedAuth = process.env.CRON_SECRET
            ? `Bearer ${process.env.CRON_SECRET}`
            : null;

        if (expectedAuth && authHeader !== expectedAuth) {
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
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
