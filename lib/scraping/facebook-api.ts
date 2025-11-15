/**
 * Facebook Graph API Client
 * Fetches posts from Facebook Pages via Graph API
 */

import { logger } from "@/lib/logger";

/**
 * Facebook post data
 */
export interface FacebookPost {
    id: string;
    message?: string;
    story?: string;
    createdTime: string;
    permalinkUrl?: string;
    reactions?: {
        summary: {
            total_count: number;
        };
    };
    comments?: {
        summary: {
            total_count: number;
        };
    };
    shares?: {
        count: number;
    };
}

/**
 * OAuth configuration for Facebook
 */
export interface FacebookOAuthConfig {
    appId: string;
    appSecret: string;
    redirectUri: string;
}

/**
 * Generate Facebook OAuth URL
 */
export function getFacebookOAuthUrl(config: FacebookOAuthConfig, state: string): string {
    const params = new URLSearchParams({
        client_id: config.appId,
        redirect_uri: config.redirectUri,
        scope: "pages_read_engagement,pages_manage_posts,public_profile",
        response_type: "code",
        state,
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeFacebookCode(
    code: string,
    config: FacebookOAuthConfig
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
            logger.error({ error }, "Failed to exchange Facebook code");
            throw new Error(error.error?.message || "Failed to exchange authorization code");
        }

        const data = await response.json();

        logger.info("Successfully exchanged Facebook authorization code");

        return {
            accessToken: data.access_token,
            expiresIn: data.expires_in || 3600,
        };
    } catch (error) {
        logger.error({ error }, "Error exchanging Facebook code");
        throw error;
    }
}

/**
 * Get long-lived access token (60 days)
 */
export async function getFacebookLongLivedToken(
    shortLivedToken: string,
    config: FacebookOAuthConfig
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

        logger.info({ expiresIn: data.expires_in }, "Got long-lived Facebook token");

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
 * Fetch posts from a Facebook Page
 */
export async function fetchFacebookPosts(
    pageId: string,
    accessToken: string,
    limit: number = 20
): Promise<FacebookPost[]> {
    try {
        const fields = [
            "id",
            "message",
            "story",
            "created_time",
            "permalink_url",
            "reactions.summary(true)",
            "comments.summary(true)",
            "shares",
        ].join(",");

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}/posts?fields=${fields}&limit=${limit}&access_token=${accessToken}`
        );

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to fetch Facebook posts");
            throw new Error(error.error?.message || "Failed to fetch Facebook posts");
        }

        const data = await response.json();
        const posts: FacebookPost[] = [];

        for (const post of data.data || []) {
            posts.push({
                id: post.id,
                message: post.message,
                story: post.story,
                createdTime: post.created_time,
                permalinkUrl: post.permalink_url,
                reactions: post.reactions,
                comments: post.comments,
                shares: post.shares,
            });
        }

        logger.info({ pageId, count: posts.length }, "Fetched Facebook posts successfully");

        return posts;
    } catch (error) {
        logger.error({ error, pageId }, "Error fetching Facebook posts");
        throw error;
    }
}

/**
 * Fetch feed posts from a Facebook Page (includes both page posts and visitor posts)
 */
export async function fetchFacebookFeed(
    pageId: string,
    accessToken: string,
    limit: number = 20
): Promise<FacebookPost[]> {
    try {
        const fields = [
            "id",
            "message",
            "story",
            "created_time",
            "permalink_url",
            "reactions.summary(true)",
            "comments.summary(true)",
            "shares",
        ].join(",");

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}/feed?fields=${fields}&limit=${limit}&access_token=${accessToken}`
        );

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to fetch Facebook feed");
            throw new Error(error.error?.message || "Failed to fetch Facebook feed");
        }

        const data = await response.json();
        const posts: FacebookPost[] = [];

        for (const post of data.data || []) {
            posts.push({
                id: post.id,
                message: post.message,
                story: post.story,
                createdTime: post.created_time,
                permalinkUrl: post.permalink_url,
                reactions: post.reactions,
                comments: post.comments,
                shares: post.shares,
            });
        }

        logger.info({ pageId, count: posts.length }, "Fetched Facebook feed successfully");

        return posts;
    } catch (error) {
        logger.error({ error, pageId }, "Error fetching Facebook feed");
        throw error;
    }
}

/**
 * Extract text content from Facebook posts for Echo Mode analysis
 */
export function extractTextFromFacebookPosts(posts: FacebookPost[]): string[] {
    return posts
        .filter((post) => {
            const text = post.message || post.story || "";
            return text.trim().length > 20;
        })
        .map((post) => post.message || post.story || "")
        .slice(0, 20); // Limit to 20 posts for analysis
}

