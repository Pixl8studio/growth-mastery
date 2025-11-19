/**
 * Meta Marketing API Client
 * Handles Meta Ads Manager API for campaign, ad set, and ad creative management
 *
 * SECURITY: All API calls use Authorization headers per RFC 6750 OAuth 2.0 Bearer Token Usage
 * Access tokens are NEVER passed in URL query parameters to prevent exposure in logs
 */

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type {
    MetaAdAccountResponse,
    MetaCampaignResponse,
    MetaAdSetResponse,
    MetaAdResponse,
    MetaAdCreativeResponse,
    MetaInsightsResponse,
    AudienceTargeting,
    LookalikeAudienceSpec,
    InterestSuggestion,
} from "@/types/ads";

const META_GRAPH_API = "https://graph.facebook.com/v21.0";
const META_API_VERSION = "v21.0";

/**
 * Create secure headers with Authorization bearer token
 */
function createAuthHeaders(accessToken: string): HeadersInit {
    return {
        Authorization: `Bearer ${accessToken}`,
    };
}

/**
 * Get all ad accounts accessible to the user
 */
export async function getAdAccounts(
    accessToken: string
): Promise<MetaAdAccountResponse[]> {
    try {
        const response = await fetch(
            `${META_GRAPH_API}/me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_name,balance`,
            {
                headers: createAuthHeaders(accessToken),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to fetch ad accounts: ${error.error?.message || "Unknown error"}`
            );
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        logger.error({ error }, "Error fetching Meta ad accounts");
        throw error;
    }
}

/**
 * Get specific ad account details
 */
export async function getAdAccount(
    adAccountId: string,
    accessToken: string
): Promise<MetaAdAccountResponse> {
    try {
        const response = await fetch(
            `${META_GRAPH_API}/${adAccountId}?fields=id,account_id,name,account_status,currency,timezone_name,balance`,
            {
                headers: createAuthHeaders(accessToken),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to fetch ad account: ${error.error?.message || "Unknown error"}`
            );
        }

        return await response.json();
    } catch (error) {
        logger.error({ error, adAccountId }, "Error fetching ad account details");
        throw error;
    }
}

/**
 * Create a new campaign
 */
export async function createCampaign(
    adAccountId: string,
    name: string,
    objective: "LEAD_GENERATION" | "LINK_CLICKS" | "REACH",
    status: "PAUSED" | "ACTIVE",
    accessToken: string
): Promise<MetaCampaignResponse> {
    try {
        const params = new URLSearchParams({
            name,
            objective,
            status,
            special_ad_categories: JSON.stringify([]), // Required for some objectives
        });

        const response = await fetch(`${META_GRAPH_API}/${adAccountId}/campaigns`, {
            method: "POST",
            headers: {
                ...createAuthHeaders(accessToken),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to create campaign: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        logger.info({ campaignId: result.id, name }, "Campaign created successfully");
        return result;
    } catch (error) {
        logger.error({ error, adAccountId, name }, "Error creating campaign");
        throw error;
    }
}

/**
 * Update campaign status (pause/activate)
 */
export async function updateCampaignStatus(
    campaignId: string,
    status: "PAUSED" | "ACTIVE" | "ARCHIVED",
    accessToken: string
): Promise<{ success: boolean }> {
    try {
        const params = new URLSearchParams({
            status,
        });

        const response = await fetch(`${META_GRAPH_API}/${campaignId}`, {
            method: "POST",
            headers: {
                ...createAuthHeaders(accessToken),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to update campaign: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        logger.info({ campaignId, status }, "Campaign status updated");
        return result;
    } catch (error) {
        logger.error({ error, campaignId, status }, "Error updating campaign status");
        throw error;
    }
}

/**
 * Create an ad set within a campaign
 */
export async function createAdSet(
    campaignId: string,
    name: string,
    targeting: AudienceTargeting,
    dailyBudget: number, // in cents
    billingEvent: "IMPRESSIONS" | "LINK_CLICKS",
    optimizationGoal: "LEAD_GENERATION" | "LINK_CLICKS" | "REACH",
    bidStrategy: "LOWEST_COST_WITHOUT_CAP" | "LOWEST_COST_WITH_BID_CAP",
    status: "PAUSED" | "ACTIVE",
    accessToken: string
): Promise<MetaAdSetResponse> {
    try {
        const params: Record<string, string> = {
            name,
            campaign_id: campaignId,
            daily_budget: dailyBudget.toString(),
            billing_event: billingEvent,
            optimization_goal: optimizationGoal,
            bid_strategy: bidStrategy,
            targeting: JSON.stringify(targeting),
            status,
        };

        const response = await fetch(`${META_GRAPH_API}/${campaignId}/adsets`, {
            method: "POST",
            headers: {
                ...createAuthHeaders(accessToken),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(params).toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to create ad set: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        logger.info({ adSetId: result.id, name }, "Ad set created successfully");
        return result;
    } catch (error) {
        logger.error({ error, campaignId, name }, "Error creating ad set");
        throw error;
    }
}

/**
 * Create ad creative for lead generation
 */
export async function createLeadAdCreative(
    adAccountId: string,
    name: string,
    pageId: string,
    imageHash: string,
    primaryText: string,
    headline: string,
    linkDescription: string,
    callToAction: "LEARN_MORE" | "SIGN_UP" | "APPLY_NOW",
    formId: string,
    accessToken: string
): Promise<MetaAdCreativeResponse> {
    try {
        const objectStorySpec = {
            page_id: pageId,
            link_data: {
                image_hash: imageHash,
                link: `https://www.facebook.com/${pageId}`, // Required but not used for lead ads
                message: primaryText,
                name: headline,
                description: linkDescription,
                call_to_action: {
                    type: callToAction,
                },
            },
        };

        const params = new URLSearchParams({
            name,
            object_story_spec: JSON.stringify(objectStorySpec),
        });

        const response = await fetch(`${META_GRAPH_API}/${adAccountId}/adcreatives`, {
            method: "POST",
            headers: {
                ...createAuthHeaders(accessToken),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to create ad creative: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        logger.info(
            { creativeId: result.id, name },
            "Ad creative created successfully"
        );
        return result;
    } catch (error) {
        logger.error({ error, adAccountId, name }, "Error creating ad creative");
        throw error;
    }
}

/**
 * Create an ad using existing creative
 */
export async function createAd(
    adSetId: string,
    name: string,
    creativeId: string,
    status: "PAUSED" | "ACTIVE",
    accessToken: string
): Promise<MetaAdResponse> {
    try {
        const params = new URLSearchParams({
            name,
            adset_id: adSetId,
            creative: JSON.stringify({ creative_id: creativeId }),
            status,
        });

        const response = await fetch(`${META_GRAPH_API}/${adSetId}/ads`, {
            method: "POST",
            headers: {
                ...createAuthHeaders(accessToken),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to create ad: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        logger.info({ adId: result.id, name }, "Ad created successfully");
        return result;
    } catch (error) {
        logger.error({ error, adSetId, name }, "Error creating ad");
        throw error;
    }
}

/**
 * Update ad status
 */
export async function updateAdStatus(
    adId: string,
    status: "PAUSED" | "ACTIVE" | "ARCHIVED",
    accessToken: string
): Promise<{ success: boolean }> {
    try {
        const params = new URLSearchParams({
            status,
        });

        const response = await fetch(`${META_GRAPH_API}/${adId}`, {
            method: "POST",
            headers: {
                ...createAuthHeaders(accessToken),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to update ad: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        logger.info({ adId, status }, "Ad status updated");
        return result;
    } catch (error) {
        logger.error({ error, adId, status }, "Error updating ad status");
        throw error;
    }
}

/**
 * Get ad insights (performance metrics)
 */
export async function getAdInsights(
    adId: string,
    datePreset:
        | "today"
        | "yesterday"
        | "last_7d"
        | "last_14d"
        | "last_30d"
        | "lifetime",
    fields: string[],
    accessToken: string
): Promise<MetaInsightsResponse> {
    try {
        const fieldsParam = fields.join(",");
        const response = await fetch(
            `${META_GRAPH_API}/${adId}/insights?date_preset=${datePreset}&fields=${fieldsParam}`,
            {
                headers: createAuthHeaders(accessToken),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to fetch ad insights: ${error.error?.message || "Unknown error"}`
            );
        }

        return await response.json();
    } catch (error) {
        logger.error({ error, adId, datePreset }, "Error fetching ad insights");
        throw error;
    }
}

/**
 * Get campaign insights
 */
export async function getCampaignInsights(
    campaignId: string,
    datePreset:
        | "today"
        | "yesterday"
        | "last_7d"
        | "last_14d"
        | "last_30d"
        | "lifetime",
    accessToken: string
): Promise<MetaInsightsResponse> {
    const fields = [
        "impressions",
        "clicks",
        "spend",
        "reach",
        "frequency",
        "cpc",
        "cpm",
        "ctr",
        "actions",
    ];

    return getAdInsights(campaignId, datePreset, fields, accessToken);
}

/**
 * Upload image for ad creative
 */
export async function uploadAdImage(
    adAccountId: string,
    imageUrl: string,
    accessToken: string
): Promise<{ hash: string }> {
    try {
        const params = new URLSearchParams({
            url: imageUrl,
        });

        const response = await fetch(`${META_GRAPH_API}/${adAccountId}/adimages`, {
            method: "POST",
            headers: {
                ...createAuthHeaders(accessToken),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to upload ad image: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        const imageKey = Object.keys(result.images)[0];
        return { hash: result.images[imageKey].hash };
    } catch (error) {
        logger.error({ error, adAccountId }, "Error uploading ad image");
        throw error;
    }
}

/**
 * Create custom audience from customer list
 */
export async function createCustomAudience(
    adAccountId: string,
    name: string,
    description: string,
    accessToken: string
): Promise<{ id: string }> {
    try {
        const params = new URLSearchParams({
            name,
            description,
            subtype: "CUSTOM",
            customer_file_source: "USER_PROVIDED_ONLY",
        });

        const response = await fetch(
            `${META_GRAPH_API}/${adAccountId}/customaudiences`,
            {
                method: "POST",
                headers: {
                    ...createAuthHeaders(accessToken),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to create custom audience: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        logger.info({ audienceId: result.id, name }, "Custom audience created");
        return result;
    } catch (error) {
        logger.error({ error, adAccountId, name }, "Error creating custom audience");
        throw error;
    }
}

/**
 * Create lookalike audience
 */
export async function createLookalikeAudience(
    adAccountId: string,
    name: string,
    spec: LookalikeAudienceSpec,
    accessToken: string
): Promise<{ id: string }> {
    try {
        const params = new URLSearchParams({
            name,
            subtype: "LOOKALIKE",
            lookalike_spec: JSON.stringify({
                origin: [{ id: spec.source_audience_id, type: "custom_audience" }],
                starting_ratio: spec.ratio,
                country: spec.country,
            }),
        });

        const response = await fetch(
            `${META_GRAPH_API}/${adAccountId}/customaudiences`,
            {
                method: "POST",
                headers: {
                    ...createAuthHeaders(accessToken),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to create lookalike audience: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        logger.info({ audienceId: result.id, name }, "Lookalike audience created");
        return result;
    } catch (error) {
        logger.error({ error, adAccountId, name }, "Error creating lookalike audience");
        throw error;
    }
}

/**
 * Search for interest targeting suggestions
 */
export async function searchInterests(
    query: string,
    accessToken: string
): Promise<InterestSuggestion[]> {
    try {
        const params = new URLSearchParams({
            q: query,
            type: "adinterest",
        });

        const response = await fetch(`${META_GRAPH_API}/search?${params.toString()}`, {
            headers: createAuthHeaders(accessToken),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to search interests: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        return result.data || [];
    } catch (error) {
        logger.error({ error, query }, "Error searching interests");
        throw error;
    }
}

/**
 * Get delivery estimate for targeting spec
 */
export async function getDeliveryEstimate(
    adAccountId: string,
    targeting: AudienceTargeting,
    optimizationGoal: string,
    accessToken: string
): Promise<{
    estimate_ready: boolean;
    users_lower_bound: number;
    users_upper_bound: number;
}> {
    try {
        const params = new URLSearchParams({
            targeting_spec: JSON.stringify(targeting),
            optimization_goal: optimizationGoal,
        });

        const response = await fetch(
            `${META_GRAPH_API}/${adAccountId}/delivery_estimate?${params.toString()}`,
            {
                headers: createAuthHeaders(accessToken),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to get delivery estimate: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        return (
            result.data?.[0] || {
                estimate_ready: false,
                users_lower_bound: 0,
                users_upper_bound: 0,
            }
        );
    } catch (error) {
        logger.error({ error, adAccountId }, "Error getting delivery estimate");
        throw error;
    }
}

/**
 * Send conversion event to Meta Conversions API
 */
export async function sendConversionEvent(
    pixelId: string,
    accessToken: string,
    eventData: {
        event_name: string;
        event_time: number;
        user_data: {
            em?: string; // hashed email
            ph?: string; // hashed phone
            client_ip_address?: string;
            client_user_agent?: string;
            fbc?: string; // Facebook click ID
            fbp?: string; // Facebook browser ID
        };
        custom_data?: Record<string, any>;
        action_source: "website" | "email" | "app";
    }
): Promise<{ success: boolean }> {
    try {
        const params = new URLSearchParams({
            data: JSON.stringify([eventData]),
        });

        const response = await fetch(`${META_GRAPH_API}/${pixelId}/events`, {
            method: "POST",
            headers: {
                ...createAuthHeaders(accessToken),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to send conversion event: ${error.error?.message || "Unknown error"}`
            );
        }

        const result = await response.json();
        logger.info(
            { pixelId, eventName: eventData.event_name },
            "Conversion event sent"
        );
        return { success: true };
    } catch (error) {
        logger.error({ error, pixelId }, "Error sending conversion event");
        throw error;
    }
}
