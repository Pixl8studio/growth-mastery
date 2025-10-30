#!/usr/bin/env tsx
/**
 * Marketing Publishing Worker
 * Processes scheduled posts and publishes them at the right time
 *
 * Runs every 5 minutes via cron to:
 * - Check for posts ready to publish
 * - Execute publishing to platforms
 * - Handle retries for failed posts
 * - Update status and tracking
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
    getPublishingQueue,
    publishNow,
    retryFailedPost,
} from "@/lib/marketing/publisher-service";

async function processPublishingQueue() {
    logger.info({}, "🔄 Processing publishing queue");

    const results = {
        processed: 0,
        published: 0,
        failed: 0,
        retried: 0,
    };

    try {
        // Get posts ready to publish
        const queueResult = await getPublishingQueue();

        if (!queueResult.success || !queueResult.entries) {
            logger.warn({ error: queueResult.error }, "No entries in queue");
            return results;
        }

        const entries = queueResult.entries;
        logger.info({ count: entries.length }, "📬 Found posts ready to publish");

        // Process each entry
        for (const entry of entries) {
            results.processed++;

            try {
                const variant = (entry as any).marketing_post_variants;

                if (!variant) {
                    logger.error({ entryId: entry.id }, "No variant found for entry");
                    continue;
                }

                // Publish the post
                const publishResult = await publishNow(
                    entry.post_variant_id,
                    variant.platform,
                    entry.user_id
                );

                if (publishResult.success) {
                    results.published++;
                    logger.info(
                        {
                            entryId: entry.id,
                            platform: variant.platform,
                            providerPostId: publishResult.providerPostId,
                        },
                        "✅ Post published successfully"
                    );
                } else {
                    results.failed++;
                    logger.error(
                        {
                            entryId: entry.id,
                            platform: variant.platform,
                            error: publishResult.error,
                        },
                        "❌ Post publishing failed"
                    );

                    // Check if we should retry
                    const retryConfig = entry.retry_config as any;
                    if (
                        retryConfig.enabled &&
                        retryConfig.attempt_count < retryConfig.max_attempts
                    ) {
                        logger.info(
                            {
                                entryId: entry.id,
                                attempt: retryConfig.attempt_count + 1,
                            },
                            "🔄 Scheduling retry"
                        );
                        // Retry will happen on next run
                    }
                }
            } catch (error) {
                results.failed++;
                logger.error({ error, entryId: entry.id }, "❌ Error processing entry");
            }
        }

        // Process retries for previously failed posts
        const supabase = await createClient();

        const { data: failedEntries } = await supabase
            .from("marketing_content_calendar")
            .select("*")
            .eq("publish_status", "failed")
            .eq("space", "production")
            .limit(10);

        if (failedEntries && failedEntries.length > 0) {
            logger.info({ count: failedEntries.length }, "🔄 Processing retries");

            for (const entry of failedEntries) {
                const retryConfig = entry.retry_config as any;

                if (
                    retryConfig.enabled &&
                    retryConfig.attempt_count < retryConfig.max_attempts
                ) {
                    const retryResult = await retryFailedPost(entry.id);

                    if (retryResult.success) {
                        results.retried++;
                        logger.info({ entryId: entry.id }, "✅ Retry successful");
                    }
                }
            }
        }

        logger.info(
            {
                results,
            },
            "✅ Publishing queue processing complete"
        );

        return results;
    } catch (error) {
        logger.error({ error }, "❌ Fatal error in publishing worker");
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    processPublishingQueue()
        .then((results) => {
            console.log("Publishing worker completed:", results);
            process.exit(0);
        })
        .catch((error) => {
            console.error("Publishing worker failed:", error);
            process.exit(1);
        });
}

export { processPublishingQueue };
