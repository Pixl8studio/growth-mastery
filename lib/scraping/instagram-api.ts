/**
 * Instagram Graph API Client
 * Fetches posts from Instagram Business Accounts via Facebook Graph API
 */

import { logger } from "@/lib/logger";

/**
 * Instagram post data
 */
export interface InstagramPost {
    id: string;
    caption?: string;
    media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
    media_url?: string;
    permalink: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
    engagement?: number;
}

/**
 * OAuth configuration for Instagram
 */
export interface InstagramOAuthConfig {
    appId: string;
    appSecret: string;
    redirectUri: string;
}

/**
 * Generate Instagram OAuth URL
 */
export function getInstagramOAuthUrl(config: InstagramOAuthConfig, state: string): string {
    const params = new URLSearchParams({
        client_id: config.appId,
        redirect_uri: config.redirectUri,
        scope: "instagram_basic,instagram_content_publish,pages_read_engagement",
        response_type: "code",
        state,
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeInstagramCode(
    code: string,
    config: InstagramOAuthConfig
): Promise<{ accessToken: string; expiresIn: number }> {
    try {
        const params = new URLSearchParams({
            client_id: config.appId,
            client_secret: config.appSecret,
            code,
            redirect_uri: config.redirectUri,
        });

        const response = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`
        );

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to exchange Instagram code");
            throw new Error(error.error?.message || "Failed to exchange authorization code");
        }

        const data = await response.json();

        logger.info("Successfully exchanged Instagram authorization code");

        return {
            accessToken: data.access_token,
            expiresIn: data.expires_in || 3600,
        };
    } catch (error) {
        logger.error({ error }, "Error exchanging Instagram code");
        throw error;
    }
}

/**
 * Get long-lived access token (60 days)
 */
export async function getLongLivedToken(
    shortLivedToken: string,
    config: InstagramOAuthConfig
): Promise<{ accessToken: string; expiresIn: number }> {
    try {
        const params = new URLSearchParams({
            grant_type: "fb_exchange_token",
            client_id: config.appId,
            client_secret: config.appSecret,
            fb_exchange_token: shortLivedToken,
        });

        const response = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`
        );

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to get long-lived token");
            throw new Error(error.error?.message || "Failed to get long-lived token");
        }

        const data = await response.json();

        logger.info({ expiresIn: data.expires_in }, "Got long-lived Instagram token");

        return {
            accessToken: data.access_token,
            expiresIn: data.expires_in || 5184000, // 60 days
        };
    } catch (error) {
        logger.error({ error }, "Error getting long-lived token");
        throw error;
    }
}

/**
 * Get Instagram Business Account ID from Page ID
 */
async function getInstagramAccountId(
    pageId: string,
    accessToken: string
): Promise<string | null> {
    try {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
        );

        if (!response.ok) {
            logger.warn({ pageId }, "Page does not have Instagram Business Account");
            return null;
        }

        const data = await response.json();
        return data.instagram_business_account?.id || null;
    } catch (error) {
        logger.error({ error, pageId }, "Error getting Instagram account ID");
        return null;
    }
}

/**
 * Get user's Facebook Pages
 */
export async function getFacebookPages(
    accessToken: string
): Promise<Array<{ id: string; name: string; access_token: string }>> {
    try {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
        );

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to get Facebook pages");
            throw new Error(error.error?.message || "Failed to get Facebook pages");
        }

        const data = await response.json();

        return data.data || [];
    } catch (error) {
        logger.error({ error }, "Error getting Facebook pages");
        throw error;
    }
}

/**
 * Fetch Instagram posts for a Business Account
 */
export async function fetchInstagramPosts(
    instagramAccountId: string,
    accessToken: string,
    limit: number = 20
): Promise<InstagramPost[]> {
    try {
        const fields = [
            "id",
            "caption",
            "media_type",
            "media_url",
            "permalink",
            "timestamp",
            "like_count",
            "comments_count",
        ].join(",");

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${instagramAccountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
        );

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to fetch Instagram posts");
            throw new Error(error.error?.message || "Failed to fetch Instagram posts");
        }

        const data = await response.json();
        const posts: InstagramPost[] = data.data || [];

        // Calculate engagement
        posts.forEach((post) => {
            if (post.like_count !== undefined && post.comments_count !== undefined) {
                post.engagement = post.like_count + post.comments_count;
            }
        });

        logger.info(
            { instagramAccountId, count: posts.length },
            "Fetched Instagram posts successfully"
        );

        return posts;
    } catch (error) {
        logger.error({ error, instagramAccountId }, "Error fetching Instagram posts");
        throw error;
    }
}

/**
 * Get Instagram account and posts in one call
 */
export async function getInstagramContentFromPage(
    pageId: string,
    accessToken: string,
    limit: number = 20
): Promise<{ accountId: string; posts: InstagramPost[] } | null> {
    try {
        // Get Instagram Business Account ID
        const accountId = await getInstagramAccountId(pageId, accessToken);

        if (!accountId) {
            logger.warn({ pageId }, "Page does not have Instagram Business Account");
            return null;
        }

        // Fetch posts
        const posts = await fetchInstagramPosts(accountId, accessToken, limit);

        return { accountId, posts };
    } catch (error) {
        logger.error({ error, pageId }, "Error getting Instagram content from page");
        throw error;
    }
}

/**
 * Extract text content from Instagram posts for Echo Mode analysis
 */
export function extractTextFromPosts(posts: InstagramPost[]): string[] {
    return posts
        .filter((post) => post.caption && post.caption.trim().length > 20)
        .map((post) => post.caption!)
        .slice(0, 20); // Limit to 20 posts for analysis
}

