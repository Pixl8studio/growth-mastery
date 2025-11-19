/**
 * Ads Manager Types
 * Type definitions for Meta Ads functionality
 */

export type AdObjective = "lead_generation" | "traffic" | "engagement";
export type AdStatus = "active" | "paused" | "archived" | "deleted";
export type AudienceType = "lookalike" | "interest" | "custom" | "saved";
export type OptimizationType =
    | "pause_underperformer"
    | "scale_winner"
    | "audience_expansion"
    | "creative_refresh"
    | "budget_adjustment";

export interface MetaAdAccount {
    id: string;
    user_id: string;
    oauth_connection_id: string | null;
    meta_ad_account_id: string;
    account_name: string | null;
    account_status: string;
    currency: string;
    timezone: string | null;
    is_active: boolean;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface AdCampaign {
    id: string;
    content_brief_id: string;
    user_id: string;
    funnel_project_id: string;
    campaign_type: "organic" | "paid_ad";
    ad_objective: AdObjective;
    daily_budget_cents: number | null;
    meta_campaign_id: string | null;
    meta_adset_id: string | null;
    is_active: boolean;
    name: string;
    goal: string;
    target_platforms: string[];
    status: string;
    created_at: string;
    updated_at: string;
}

export interface AdCreative {
    id: string;
    content_brief_id: string;
    user_id: string;
    platform: string;
    ad_creative_type: "organic" | "lead_ad" | "traffic_ad";
    meta_ad_id: string | null;
    primary_text: string | null;
    headline: string | null;
    link_description: string | null;
    ad_hooks: {
        long: string;
        short: string;
        curiosity: string;
    };
    call_to_action: string | null;
    copy_text: string;
    media_urls: string[];
    alt_text: string | null;
    hashtags: string[];
    caption: string | null;
    created_at: string;
    updated_at: string;
}

export interface AdAudience {
    id: string;
    user_id: string;
    funnel_project_id: string | null;
    name: string;
    audience_type: AudienceType;
    meta_audience_id: string | null;
    source_data: Record<string, any>;
    targeting_spec: Record<string, any>;
    size_estimate: number | null;
    last_used_at: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface AdMetrics {
    id: string;
    post_variant_id: string;
    user_id: string;
    impressions: number;
    clicks: number;
    saves: number;
    shares: number;
    comments: number;
    likes: number;
    opt_ins: number;
    spend_cents: number;
    cpc_cents: number;
    cpm_cents: number;
    ctr_percent: number;
    conversion_rate_percent: number;
    cost_per_lead_cents: number;
    leads_count: number;
    last_synced_at: string;
    created_at: string;
    updated_at: string;
}

export interface AdSnapshot {
    id: string;
    post_variant_id: string;
    user_id: string;
    snapshot_date: string;
    impressions: number;
    clicks: number;
    spend_cents: number;
    leads: number;
    cpc_cents: number;
    cpm_cents: number;
    ctr_percent: number;
    cost_per_lead_cents: number;
    raw_metrics: Record<string, any>;
    created_at: string;
}

export interface AdOptimization {
    id: string;
    user_id: string;
    content_brief_id: string | null;
    post_variant_id: string | null;
    optimization_type: OptimizationType;
    status: "recommended" | "executed" | "dismissed" | "failed";
    reason: string;
    action_taken: string | null;
    metrics_before: Record<string, any>;
    metrics_after: Record<string, any>;
    executed_at: string | null;
    executed_by: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

// Meta API Response Types
export interface MetaAdAccountResponse {
    id: string;
    account_id: string;
    name: string;
    account_status: number;
    currency: string;
    timezone_name: string;
    balance: string;
}

export interface MetaCampaignResponse {
    id: string;
    name: string;
    objective: string;
    status: string;
    created_time: string;
    updated_time: string;
}

export interface MetaAdSetResponse {
    id: string;
    name: string;
    campaign_id: string;
    status: string;
    daily_budget: string;
    lifetime_budget?: string;
    targeting: Record<string, any>;
    billing_event: string;
    optimization_goal: string;
    bid_amount?: number;
}

export interface MetaAdResponse {
    id: string;
    name: string;
    adset_id: string;
    creative: {
        id: string;
        name: string;
    };
    status: string;
    created_time: string;
}

export interface MetaAdCreativeResponse {
    id: string;
    name: string;
    object_story_spec?: Record<string, any>;
    degrees_of_freedom_spec?: Record<string, any>;
    asset_feed_spec?: Record<string, any>;
}

export interface MetaInsightsResponse {
    data: Array<{
        impressions: string;
        clicks: string;
        spend: string;
        reach: string;
        frequency: string;
        cpc: string;
        cpm: string;
        ctr: string;
        actions?: Array<{
            action_type: string;
            value: string;
        }>;
        date_start: string;
        date_stop: string;
    }>;
    paging?: {
        cursors: {
            before: string;
            after: string;
        };
        next?: string;
    };
}

// Ad Generation Types
export interface AdVariation {
    id: string;
    variation_number: number;
    framework: string; // "plus_minus", "6_part", "hormozi", "experiment"
    primary_text: string;
    headline: string;
    link_description: string;
    hooks: {
        long: string;
        short: string;
        curiosity: string;
    };
    call_to_action: string;
    body_copy?: string;
    selected: boolean;
}

export interface AdGenerationRequest {
    funnel_project_id: string;
    offer_data: {
        product_name: string;
        tagline: string;
        promise: string;
        price: number;
        currency: string;
        guarantee?: string;
    };
    audience_data: {
        target_audience: string;
        pain_points: string[];
        desired_outcome: string;
    };
    brand_voice?: string;
    tone_settings?: Record<string, number>;
}

export interface AdGenerationResponse {
    success: boolean;
    variations: AdVariation[];
    brief_id?: string;
    error?: string;
}

// Audience Building Types
export interface AudienceTargeting {
    geo_locations: {
        countries?: string[];
        regions?: Array<{ key: string; name: string }>;
        cities?: Array<{ key: string; name: string }>;
    };
    age_min?: number;
    age_max?: number;
    genders?: number[]; // 1=male, 2=female
    interests?: Array<{ id: string; name: string }>;
    behaviors?: Array<{ id: string; name: string }>;
    custom_audiences?: string[];
    excluded_custom_audiences?: string[];
}

export interface LookalikeAudienceSpec {
    source_audience_id: string;
    country: string;
    ratio: number; // 0.01 to 0.20 (1% to 20%)
}

export interface InterestSuggestion {
    id: string;
    name: string;
    category: string;
    audience_size_lower_bound: number;
    audience_size_upper_bound: number;
    relevance_score?: number;
}
