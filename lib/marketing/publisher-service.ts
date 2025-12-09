/**
 * Publisher Service
 * Handles publishing to social media platforms
 * Manages scheduling, retries, and platform-specific posting logic
 */

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { decryptToken } from "@/lib/integrations/crypto";
import type {
    PostVariant,
    MarketingPlatform,
    ContentCalendar,
} from "@/types/marketing";
import type { SocialConnection } from "@/types/integrations";

interface PublishResult {
    success: boolean;
    providerPostId?: string;
    error?: string;
    platformUrl?: string;
}

interface RetryConfig {
    attempt_count: number;
    max_attempts: number;
    last_error?: string | null;
}

interface CalendarEntryWithVariant {
    id: string;
    user_id: string;
    retry_config: RetryConfig | null;
    marketing_post_variants: PostVariant | PostVariant[] | null;
}

/**
 * Publish content immediately to a platform
 */
export async function publishNow(
    variantId: string,
    platform: MarketingPlatform,
    userId: string
): Promise<PublishResult> {
    try {
        const supabase = await createClient();

        // Get variant
        const { data: variant, error: variantError } = await supabase
            .from("marketing_post_variants")
            .select("*")
            .eq("id", variantId)
            .single();

        if (variantError || !variant) {
            return { success: false, error: "Variant not found" };
        }

        // Get social connection for this platform
        const { data: connection, error: connectionError } = await supabase
            .from("funnel_social_connections")
            .select("*")
            .eq("user_id", userId)
            .eq("provider", platform)
            .eq("is_active", true)
            .single();

        if (connectionError || !connection) {
            return {
                success: false,
                error: `No active ${platform} connection found. Please connect your account.`,
            };
        }

        // Publish to platform
        let result: PublishResult;

        switch (platform) {
            case "instagram":
                result = await publishToInstagram(
                    variant as PostVariant,
                    connection as SocialConnection
                );
                break;
            case "facebook":
                result = await publishToFacebook(
                    variant as PostVariant,
                    connection as SocialConnection
                );
                break;
            case "linkedin":
                result = await publishToLinkedIn(
                    variant as PostVariant,
                    connection as SocialConnection
                );
                break;
            case "twitter":
                result = await publishToTwitter(
                    variant as PostVariant,
                    connection as SocialConnection
                );
                break;
            default:
                return { success: false, error: `Unsupported platform: ${platform}` };
        }

        // Create calendar entry
        if (result.success) {
            await supabase.from("marketing_content_calendar").insert({
                post_variant_id: variantId,
                user_id: userId,
                scheduled_publish_at: new Date().toISOString(),
                actual_published_at: new Date().toISOString(),
                publish_status: "published",
                provider_post_id: result.providerPostId,
                space: "production",
            });

            logger.info(
                { variantId, platform, providerPostId: result.providerPostId },
                "Content published successfully"
            );
        }

        return result;
    } catch (error) {
        logger.error({ error, variantId, platform }, "Error publishing content");

        Sentry.captureException(error, {
            tags: {
                service: "marketing",
                operation: "publish_now",
            },
            extra: {
                variantId,
                platform,
                userId,
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Schedule content for future publishing
 */
export async function schedulePost(
    variantId: string,
    scheduledAt: Date,
    userId: string,
    space: "sandbox" | "production" = "sandbox"
): Promise<{ success: boolean; calendarId?: string; error?: string }> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("marketing_content_calendar")
            .insert({
                post_variant_id: variantId,
                user_id: userId,
                scheduled_publish_at: scheduledAt.toISOString(),
                publish_status: "scheduled",
                space,
            })
            .select("id")
            .single();

        if (error || !data) {
            logger.error({ error, variantId }, "Failed to schedule post");
            return { success: false, error: error?.message || "Failed to schedule" };
        }

        logger.info(
            { variantId, calendarId: data.id, scheduledAt, space },
            "Post scheduled"
        );

        return { success: true, calendarId: data.id };
    } catch (error) {
        logger.error({ error, variantId }, "Error scheduling post");

        Sentry.captureException(error, {
            tags: {
                service: "marketing",
                operation: "schedule_post",
            },
            extra: {
                variantId,
                userId,
                scheduledAt: scheduledAt.toISOString(),
                space,
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Publish to Instagram via Facebook Graph API
 */
async function publishToInstagram(
    variant: PostVariant,
    connection: SocialConnection
): Promise<PublishResult> {
    try {
        const _accessToken = decryptToken(connection.access_token);
        const accountId = connection.account_id;

        // Instagram API endpoint (via Facebook Graph API)
        // In production, this would use the Instagram Content Publishing API
        // https://developers.facebook.com/docs/instagram-api/guides/content-publishing

        logger.info({ accountId }, "Instagram publishing - placeholder");

        // Placeholder for actual Instagram API call
        // Real implementation would:
        // 1. Create a container (media object)
        // 2. Publish the container
        // 3. Return the media ID

        return {
            success: true,
            providerPostId: `ig_placeholder_${Date.now()}`,
            platformUrl: `https://www.instagram.com/p/placeholder/`,
        };
    } catch (error) {
        logger.error({ error }, "Instagram publishing error");

        Sentry.captureException(error, {
            tags: {
                service: "marketing",
                operation: "publish_to_instagram",
            },
            extra: {
                variantId: variant.id,
                accountId: connection.account_id,
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Instagram publish failed",
        };
    }
}

/**
 * Publish to Facebook via Graph API
 */
async function publishToFacebook(
    variant: PostVariant,
    connection: SocialConnection
): Promise<PublishResult> {
    try {
        const _accessToken = decryptToken(connection.access_token);
        const pageId = connection.account_id;

        // Facebook Graph API endpoint
        // https://developers.facebook.com/docs/graph-api/reference/v18.0/page/feed

        logger.info({ pageId }, "Facebook publishing - placeholder");

        // Placeholder for actual Facebook API call
        // Real implementation would POST to:
        // `/${pageId}/feed` with message and access_token

        return {
            success: true,
            providerPostId: `fb_placeholder_${Date.now()}`,
            platformUrl: `https://www.facebook.com/permalink_placeholder`,
        };
    } catch (error) {
        logger.error({ error }, "Facebook publishing error");

        Sentry.captureException(error, {
            tags: {
                service: "marketing",
                operation: "publish_to_facebook",
            },
            extra: {
                variantId: variant.id,
                pageId: connection.account_id,
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Facebook publish failed",
        };
    }
}

/**
 * Publish to LinkedIn via LinkedIn API
 */
async function publishToLinkedIn(
    variant: PostVariant,
    connection: SocialConnection
): Promise<PublishResult> {
    try {
        const _accessToken = decryptToken(connection.access_token);
        const personUrn = connection.account_id; // LinkedIn person URN

        // LinkedIn API endpoint
        // https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api

        logger.info({ personUrn }, "LinkedIn publishing - placeholder");

        // Placeholder for actual LinkedIn API call
        // Real implementation would POST to:
        // /ugcPosts with proper share payload

        return {
            success: true,
            providerPostId: `li_placeholder_${Date.now()}`,
            platformUrl: `https://www.linkedin.com/feed/update/placeholder`,
        };
    } catch (error) {
        logger.error({ error }, "LinkedIn publishing error");

        Sentry.captureException(error, {
            tags: {
                service: "marketing",
                operation: "publish_to_linkedin",
            },
            extra: {
                variantId: variant.id,
                personUrn: connection.account_id,
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "LinkedIn publish failed",
        };
    }
}

/**
 * Publish to Twitter (X) via Twitter API v2
 */
async function publishToTwitter(
    variant: PostVariant,
    connection: SocialConnection
): Promise<PublishResult> {
    try {
        const _accessToken = decryptToken(connection.access_token);

        // Twitter API v2 endpoint
        // https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets

        logger.info({}, "Twitter publishing - placeholder");

        // Placeholder for actual Twitter API call
        // Real implementation would POST to:
        // /2/tweets with text payload

        return {
            success: true,
            providerPostId: `tw_placeholder_${Date.now()}`,
            platformUrl: `https://twitter.com/user/status/placeholder`,
        };
    } catch (error) {
        logger.error({ error }, "Twitter publishing error");

        Sentry.captureException(error, {
            tags: {
                service: "marketing",
                operation: "publish_to_twitter",
            },
            extra: {
                variantId: variant.id,
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Twitter publish failed",
        };
    }
}

/**
 * Retry a failed publish
 */
export async function retryFailedPost(
    calendarId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        // Get calendar entry
        const { data: entry, error: entryError } = await supabase
            .from("marketing_content_calendar")
            .select("*, marketing_post_variants(*)")
            .eq("id", calendarId)
            .single();

        if (entryError || !entry) {
            return { success: false, error: "Calendar entry not found" };
        }

        const entryWithVariant = entry as unknown as CalendarEntryWithVariant;

        // Check retry config
        const retryConfig = (entryWithVariant.retry_config as RetryConfig | null) || {
            attempt_count: 0,
            max_attempts: 3,
        };
        if (retryConfig.attempt_count >= retryConfig.max_attempts) {
            return { success: false, error: "Max retry attempts reached" };
        }

        // Get variant
        const variantData = entryWithVariant.marketing_post_variants;
        const variant = Array.isArray(variantData) ? variantData[0] : variantData;
        if (!variant || !variant.id || !variant.platform) {
            return { success: false, error: "Variant not found" };
        }

        // Attempt publish
        const result = await publishNow(variant.id, variant.platform, entry.user_id);

        // Update retry config
        const updatedRetryConfig = {
            ...retryConfig,
            attempt_count: retryConfig.attempt_count + 1,
            last_error: result.error || null,
        };

        await supabase
            .from("marketing_content_calendar")
            .update({
                retry_config: updatedRetryConfig,
                publish_status: result.success ? "published" : "failed",
                actual_published_at: result.success ? new Date().toISOString() : null,
                provider_post_id: result.providerPostId || null,
            })
            .eq("id", calendarId);

        logger.info(
            {
                calendarId,
                success: result.success,
                attempt: updatedRetryConfig.attempt_count,
            },
            "Retry attempt completed"
        );

        return { success: result.success, error: result.error };
    } catch (error) {
        logger.error({ error, calendarId }, "Error retrying failed post");

        Sentry.captureException(error, {
            tags: {
                service: "marketing",
                operation: "retry_failed_post",
            },
            extra: {
                calendarId,
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Cancel a scheduled post
 */
export async function cancelScheduledPost(
    calendarId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("marketing_content_calendar")
            .delete()
            .eq("id", calendarId)
            .eq("user_id", userId)
            .eq("publish_status", "scheduled");

        if (error) {
            logger.error({ error, calendarId }, "Failed to cancel post");
            return { success: false, error: error.message };
        }

        logger.info({ calendarId, userId }, "Scheduled post cancelled");

        return { success: true };
    } catch (error) {
        logger.error({ error, calendarId }, "Error cancelling post");

        Sentry.captureException(error, {
            tags: {
                service: "marketing",
                operation: "cancel_scheduled_post",
            },
            extra: {
                calendarId,
                userId,
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Promote post from sandbox to production
 */
export async function promoteToProduction(
    calendarId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("marketing_content_calendar")
            .update({ space: "production" })
            .eq("id", calendarId)
            .eq("user_id", userId)
            .eq("space", "sandbox");

        if (error) {
            logger.error({ error, calendarId }, "Failed to promote to production");
            return { success: false, error: error.message };
        }

        logger.info({ calendarId, userId }, "Post promoted to production");

        return { success: true };
    } catch (error) {
        logger.error({ error, calendarId }, "Error promoting to production");

        Sentry.captureException(error, {
            tags: {
                service: "marketing",
                operation: "promote_to_production",
            },
            extra: {
                calendarId,
                userId,
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get publishing queue (posts ready to publish)
 * Used by the publishing worker
 */
export async function getPublishingQueue(): Promise<{
    success: boolean;
    entries?: ContentCalendar[];
    error?: string;
}> {
    try {
        const supabase = await createClient();

        const now = new Date().toISOString();

        const { data: entries, error } = await supabase
            .from("marketing_content_calendar")
            .select("*, marketing_post_variants(*)")
            .eq("publish_status", "scheduled")
            .eq("space", "production")
            .lte("scheduled_publish_at", now)
            .order("scheduled_publish_at", { ascending: true })
            .limit(50); // Process 50 at a time

        if (error) {
            logger.error({ error }, "Failed to fetch publishing queue");
            return { success: false, error: error.message };
        }

        return { success: true, entries: (entries as ContentCalendar[]) || [] };
    } catch (error) {
        logger.error({ error }, "Error getting publishing queue");

        Sentry.captureException(error, {
            tags: {
                service: "marketing",
                operation: "get_publishing_queue",
            },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
