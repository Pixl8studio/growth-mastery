#!/usr/bin/env tsx
/**
 * Marketing Daily Jobs
 * Automated maintenance tasks for Marketing Content Engine
 *
 * Runs daily via cron to:
 * - Update platform specifications (PKG)
 * - Scan for trending topics
 * - Collect analytics from platforms
 * - Update niche conversion models
 */

import { logger } from "@/lib/logger";
import { updatePlatformSpecs } from "@/lib/marketing/platform-knowledge-service";
import { cleanupExpiredTrends } from "@/lib/marketing/trend-scanner-service";
import { collectDailyAnalytics } from "@/lib/marketing/analytics-collector-service";

async function runDailyJobs() {
    logger.info({}, "🚀 Starting marketing daily jobs");

    const results = {
        platformSpecs: false,
        trendCleanup: false,
        analyticsCollection: false,
        totalDuration: 0,
    };

    const startTime = Date.now();

    try {
        // Job 1: Update Platform Specifications
        logger.info({}, "📋 Updating platform specifications...");
        const specsResult = await updatePlatformSpecs();

        if (specsResult.success) {
            results.platformSpecs = true;
            logger.info({ updated: specsResult.updated }, "✅ Platform specs updated");
        } else {
            logger.error(
                { error: specsResult.error },
                "❌ Platform specs update failed"
            );
        }

        // Job 2: Cleanup expired trends
        logger.info({}, "🧹 Cleaning up expired trends...");
        const cleanupResult = await cleanupExpiredTrends();

        if (cleanupResult.success) {
            results.trendCleanup = true;
            logger.info(
                { deleted: cleanupResult.deleted },
                "✅ Expired trends cleaned up"
            );
        } else {
            logger.error({ error: cleanupResult.error }, "❌ Trend cleanup failed");
        }

        // Job 3: Collect analytics from platforms
        logger.info({}, "📊 Collecting platform analytics...");
        const analyticsResult = await collectDailyAnalytics();

        if (analyticsResult.success) {
            results.analyticsCollection = true;
            logger.info(
                { processed: analyticsResult.processed },
                "✅ Analytics collected"
            );
        } else {
            logger.error(
                { error: analyticsResult.error },
                "❌ Analytics collection failed"
            );
        }

        // Calculate total duration
        results.totalDuration = Date.now() - startTime;

        logger.info(
            {
                results,
                duration: `${results.totalDuration}ms`,
            },
            "✅ Marketing daily jobs complete"
        );

        return results;
    } catch (error) {
        logger.error({ error }, "❌ Fatal error in daily jobs");
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    runDailyJobs()
        .then((results) => {
            console.log("Daily jobs completed:", results);
            process.exit(0);
        })
        .catch((error) => {
            console.error("Daily jobs failed:", error);
            process.exit(1);
        });
}

export { runDailyJobs };
