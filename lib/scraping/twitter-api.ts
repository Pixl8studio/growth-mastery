/**
 * Twitter API v2 Client
 * Fetches tweets using Twitter API v2
 */

import { logger } from "@/lib/logger";

/**
 * Tweet data
 */
export interface Tweet {
    id: string;
    text: string;
    createdAt: string;
    authorId: string;
    publicMetrics?: {
        retweetCount: number;
        replyCount: number;
        likeCount: number;
        quoteCount: number;
        impressionCount?: number;
    };
    entities?: {
        hashtags?: Array<{ tag: string }>;
        mentions?: Array<{ username: string }>;
        urls?: Array<{ url: string; expanded_url: string }>;
    };
}

/**
 * OAuth configuration for Twitter
 */
export interface TwitterOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

/**
 * Generate Twitter OAuth 2.0 URL (PKCE flow)
 */
export function getTwitterOAuthUrl(
    config: TwitterOAuthConfig,
    state: string,
    codeChallenge: string
): string {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: "tweet.read users.read offline.access",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
    });

    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

/**
 * Generate PKCE code verifier and challenge
 * Uses proper SHA256 hashing as required by OAuth 2.0 PKCE specification
 */
export async function generatePKCE(): Promise<{
    codeVerifier: string;
    codeChallenge: string;
}> {
    // Generate random code verifier (43-128 characters, base64url encoded)
    const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .substring(0, 128);

    // Create SHA256 hash of the code verifier
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    // Convert to base64url encoding (required for PKCE)
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const base64 = btoa(String.fromCharCode(...hashArray));
    const codeChallenge = base64
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

    return { codeVerifier, codeChallenge };
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeTwitterCode(
    code: string,
    codeVerifier: string,
    config: TwitterOAuthConfig
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
        const params = new URLSearchParams({
            code,
            grant_type: "authorization_code",
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            code_verifier: codeVerifier,
        });

        const response = await fetch("https://api.twitter.com/2/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to exchange Twitter code");
            throw new Error(
                error.error_description || "Failed to exchange authorization code"
            );
        }

        const data = await response.json();

        logger.info("Successfully exchanged Twitter authorization code");

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in || 7200,
        };
    } catch (error) {
        logger.error({ error }, "Error exchanging Twitter code");
        throw error;
    }
}

/**
 * Refresh access token
 */
export async function refreshTwitterToken(
    refreshToken: string,
    config: TwitterOAuthConfig
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
        const params = new URLSearchParams({
            refresh_token: refreshToken,
            grant_type: "refresh_token",
            client_id: config.clientId,
        });

        const response = await fetch("https://api.twitter.com/2/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to refresh Twitter token");
            throw new Error(error.error_description || "Failed to refresh token");
        }

        const data = await response.json();

        logger.info("Successfully refreshed Twitter token");

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken, // Use old if not provided
            expiresIn: data.expires_in || 7200,
        };
    } catch (error) {
        logger.error({ error }, "Error refreshing Twitter token");
        throw error;
    }
}

/**
 * Get authenticated user's information
 */
export async function getTwitterUser(
    accessToken: string
): Promise<{ id: string; username: string; name: string }> {
    try {
        const response = await fetch("https://api.twitter.com/2/users/me", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to get Twitter user");
            throw new Error(error.detail || "Failed to get Twitter user");
        }

        const data = await response.json();

        logger.info({ userId: data.data.id }, "Got Twitter user successfully");

        return {
            id: data.data.id,
            username: data.data.username,
            name: data.data.name,
        };
    } catch (error) {
        logger.error({ error }, "Error getting Twitter user");
        throw error;
    }
}

/**
 * Fetch user's tweets
 */
export async function fetchTweets(
    userId: string,
    accessToken: string,
    limit: number = 50
): Promise<Tweet[]> {
    try {
        const params = new URLSearchParams({
            max_results: Math.min(limit, 100).toString(),
            "tweet.fields":
                "created_at,public_metrics,entities,referenced_tweets,conversation_id",
            exclude: "retweets,replies", // Only get original tweets
        });

        const response = await fetch(
            `https://api.twitter.com/2/users/${userId}/tweets?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            const error = await response.json();
            logger.error({ error }, "Failed to fetch tweets");
            throw new Error(error.detail || "Failed to fetch tweets");
        }

        const data = await response.json();
        const tweets: Tweet[] = [];

        for (const tweet of data.data || []) {
            tweets.push({
                id: tweet.id,
                text: tweet.text,
                createdAt: tweet.created_at,
                authorId: userId,
                publicMetrics: tweet.public_metrics
                    ? {
                          retweetCount: tweet.public_metrics.retweet_count || 0,
                          replyCount: tweet.public_metrics.reply_count || 0,
                          likeCount: tweet.public_metrics.like_count || 0,
                          quoteCount: tweet.public_metrics.quote_count || 0,
                          impressionCount: tweet.public_metrics.impression_count,
                      }
                    : undefined,
                entities: tweet.entities,
            });
        }

        logger.info({ userId, count: tweets.length }, "Fetched tweets successfully");

        return tweets;
    } catch (error) {
        logger.error({ error, userId }, "Error fetching tweets");
        throw error;
    }
}

/**
 * Fetch user's tweets by username (public endpoint, no auth required but rate limited)
 */
export async function fetchTweetsByUsername(
    username: string,
    bearerToken: string,
    limit: number = 50
): Promise<Tweet[]> {
    try {
        // First, get user ID from username
        const userResponse = await fetch(
            `https://api.twitter.com/2/users/by/username/${username}`,
            {
                headers: {
                    Authorization: `Bearer ${bearerToken}`,
                },
            }
        );

        if (!userResponse.ok) {
            const error = await userResponse.json();
            logger.error({ error }, "Failed to get user by username");
            throw new Error(error.detail || "Failed to get user");
        }

        const userData = await userResponse.json();
        const userId = userData.data.id;

        // Now fetch tweets
        return fetchTweets(userId, bearerToken, limit);
    } catch (error) {
        logger.error({ error, username }, "Error fetching tweets by username");
        throw error;
    }
}

/**
 * Extract text content from tweets for Echo Mode analysis
 */
export function extractTextFromTweets(tweets: Tweet[]): string[] {
    return tweets
        .filter((tweet) => tweet.text && tweet.text.trim().length > 20)
        .map((tweet) => tweet.text)
        .slice(0, 50); // Limit to 50 tweets for analysis
}
