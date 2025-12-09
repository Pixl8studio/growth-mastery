/**
 * Instagram Basic Display API Client
 *
 * Handles Instagram account connections via Facebook.
 */

import * as Sentry from "@sentry/nextjs";
import type { InstagramAccountInfo } from "@/types/integrations";

const FACEBOOK_GRAPH_API = "https://graph.facebook.com/v18.0";

export async function getInstagramAccounts(
    facebookPageId: string,
    pageAccessToken: string
): Promise<InstagramAccountInfo[]> {
    const response = await fetch(
        `${FACEBOOK_GRAPH_API}/${facebookPageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Failed to fetch Instagram account: ${error.error?.message || "Unknown error"}`
        );
    }

    const data = await response.json();

    if (!data.instagram_business_account) {
        return [];
    }

    const igAccountId = data.instagram_business_account.id;
    return getInstagramAccountDetails(igAccountId, pageAccessToken);
}

export async function getInstagramAccountDetails(
    accountId: string,
    accessToken: string
): Promise<InstagramAccountInfo[]> {
    const response = await fetch(
        `${FACEBOOK_GRAPH_API}/${accountId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${accessToken}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            `Failed to fetch Instagram details: ${error.error?.message || "Unknown error"}`
        );
    }

    const data = await response.json();
    return [data];
}

export async function verifyInstagramAccess(
    accountId: string,
    accessToken: string
): Promise<boolean> {
    try {
        const response = await fetch(
            `${FACEBOOK_GRAPH_API}/${accountId}?fields=id&access_token=${accessToken}`
        );
        return response.ok;
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                service: "integrations",
                provider: "instagram",
                operation: "verify_access",
            },
            extra: {
                accountId,
            },
        });
        return false;
    }
}
