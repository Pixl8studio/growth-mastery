/**
 * Type definitions for the Pages feature
 */

export type PageType = "enrollment" | "watch" | "registration";

export interface PageWebhookConfig {
    webhook_enabled: boolean | null;
    webhook_url: string | null;
    webhook_secret: string | null;
    webhook_inherit_global: boolean;
}

export interface EffectiveWebhookConfig {
    enabled: boolean;
    url: string | null;
    secret: string | null;
    isInherited: boolean;
}

export interface PageListItem {
    id: string;
    type: PageType;
    headline: string;
    funnel_name: string;
    funnel_id: string;
    is_published: boolean;
    vanity_slug: string | null;
    created_at: string;
    updated_at: string;
    webhook_enabled?: boolean | null;
    webhook_url?: string | null;
    webhook_secret?: string | null;
    webhook_inherit_global?: boolean;
}

export interface PageFilters {
    funnel_id?: string;
    page_type?: PageType | "all";
    is_published?: "true" | "false" | "all";
    search?: string;
}

export interface FunnelOption {
    id: string;
    name: string;
}
