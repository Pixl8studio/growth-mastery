/**
 * Publisher Service
 * Handles publishing to social media platforms
 * Manages scheduling, retries, and platform-specific posting logic
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { decryptToken } from "@/lib/integrations/crypto";
import type {
    PostVariant,
    MarketingPlatform,
    ContentCalendar,
} from "@/types/marketing";

interface PublishResult {
    success: boolean;
    providerPostId?: string;
    error?: string;
    platformUrl?: string;
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
                result = await publishToInstagram(variant as any, connection);
                break;
            case "facebook":
                result = await publishToFacebook(variant as any, connection);
                break;
            case "linkedin":
                result = await publishToLinkedIn(variant as any, connection);
                break;
            case "twitter":
                result = await publishToTwitter(variant as any, connection);
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
    connection: any
): Promise<PublishResult> {
    try {
        const accessToken = decryptToken(connection.access_token);
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
    connection: any
): Promise<PublishResult> {
    try {
        const accessToken = decryptToken(connection.access_token);
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
    connection: any
): Promise<PublishResult> {
    try {
        const accessToken = decryptToken(connection.access_token);
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
    connection: any
): Promise<PublishResult> {
    try {
        const accessToken = decryptToken(connection.access_token);

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

        // Check retry config
        const retryConfig = entry.retry_config as any;
        if (retryConfig.attempt_count >= retryConfig.max_attempts) {
            return { success: false, error: "Max retry attempts reached" };
        }

        // Get variant
        const variant = (entry as any).marketing_post_variants;
        if (!variant) {
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

        return { success: true, entries: (entries as any) || [] };
    } catch (error) {
        logger.error({ error }, "Error getting publishing queue");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
