/**
 * LinkedIn API Client
 * Fetches posts using LinkedIn UGC API
 */

import { logger } from "@/lib/logger";

/**
 * LinkedIn post data
 */
export interface LinkedInPost {
    id: string;
    text?: string;
    createdAt: string;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    visibility: string;
    author: string;
}

/**
 * OAuth configuration for LinkedIn
 */
export interface LinkedInOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

/**
 * Generate LinkedIn OAuth URL
 */
export function getLinkedInOAuthUrl(
    config: LinkedInOAuthConfig,
    state: string
): string {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        state,
        scope: "openid profile email w_member_social r_basicprofile r_organization_social",
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeLinkedInCode(
    code: string,
    config: LinkedInOAuthConfig
): Promise<{ accessToken: string; expiresIn: number }> {
    try {
        const params = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
        });

        const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to exchange LinkedIn code");
            throw new Error(
                error.error_description || "Failed to exchange authorization code"
            );
        }

        const data = await response.json();

        logger.info("Successfully exchanged LinkedIn authorization code");

        return {
            accessToken: data.access_token,
            expiresIn: data.expires_in || 3600,
        };
    } catch (error) {
        logger.error({ error }, "Error exchanging LinkedIn code");
        throw error;
    }
}

/**
 * Get user profile information
 */
export async function getLinkedInProfile(
    accessToken: string
): Promise<{ id: string; firstName: string; lastName: string; email?: string }> {
    try {
        const response = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to get LinkedIn profile");
            throw new Error(error.message || "Failed to get LinkedIn profile");
        }

        const data = await response.json();

        logger.info({ userId: data.sub }, "Got LinkedIn profile successfully");

        return {
            id: data.sub,
            firstName: data.given_name,
            lastName: data.family_name,
            email: data.email,
        };
    } catch (error) {
        logger.error({ error }, "Error getting LinkedIn profile");
        throw error;
    }
}

/**
 * Fetch user's LinkedIn posts (UGC API)
 */
export async function fetchLinkedInPosts(
    accessToken: string,
    authorId: string,
    limit: number = 10
): Promise<LinkedInPost[]> {
    try {
        // LinkedIn UGC API endpoint
        const params = new URLSearchParams({
            q: "author",
            author: `urn:li:person:${authorId}`,
            count: limit.toString(),
        });

        const response = await fetch(
            `https://api.linkedin.com/v2/ugcPosts?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            }
        );

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to fetch LinkedIn posts");
            throw new Error(error.message || "Failed to fetch LinkedIn posts");
        }

        const data = await response.json();
        const posts: LinkedInPost[] = [];

        for (const element of data.elements || []) {
            const specificContent =
                element.specificContent?.["com.linkedin.ugc.ShareContent"];
            const text = specificContent?.shareCommentary?.text || "";

            posts.push({
                id: element.id,
                text,
                createdAt: new Date(element.created?.time || Date.now()).toISOString(),
                likeCount: element.likeCount || 0,
                commentCount: element.commentCount || 0,
                shareCount: element.shareCount || 0,
                visibility: element.visibility || "PUBLIC",
                author: element.author,
            });
        }

        logger.info(
            { authorId, count: posts.length },
            "Fetched LinkedIn posts successfully"
        );

        return posts;
    } catch (error) {
        logger.error({ error, authorId }, "Error fetching LinkedIn posts");
        throw error;
    }
}

/**
 * Fetch organization posts (for company pages)
 */
export async function fetchLinkedInOrganizationPosts(
    accessToken: string,
    organizationId: string,
    limit: number = 10
): Promise<LinkedInPost[]> {
    try {
        const params = new URLSearchParams({
            q: "author",
            author: `urn:li:organization:${organizationId}`,
            count: limit.toString(),
        });

        const response = await fetch(
            `https://api.linkedin.com/v2/ugcPosts?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            }
        );

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to fetch organization posts");
            throw new Error(error.message || "Failed to fetch organization posts");
        }

        const data = await response.json();
        const posts: LinkedInPost[] = [];

        for (const element of data.elements || []) {
            const specificContent =
                element.specificContent?.["com.linkedin.ugc.ShareContent"];
            const text = specificContent?.shareCommentary?.text || "";

            posts.push({
                id: element.id,
                text,
                createdAt: new Date(element.created?.time || Date.now()).toISOString(),
                likeCount: element.likeCount || 0,
                commentCount: element.commentCount || 0,
                shareCount: element.shareCount || 0,
                visibility: element.visibility || "PUBLIC",
                author: element.author,
            });
        }

        logger.info(
            { organizationId, count: posts.length },
            "Fetched organization posts successfully"
        );

        return posts;
    } catch (error) {
        logger.error({ error, organizationId }, "Error fetching organization posts");
        throw error;
    }
}

/**
 * Extract text content from LinkedIn posts for Echo Mode analysis
 */
export function extractTextFromLinkedInPosts(posts: LinkedInPost[]): string[] {
    return posts
        .filter((post) => post.text && post.text.trim().length > 20)
        .map((post) => post.text!)
        .slice(0, 10); // Limit to 10 posts for analysis
}
