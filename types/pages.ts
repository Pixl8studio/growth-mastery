/**
 * Type definitions for the Pages feature
 */

export type PageType = "enrollment" | "watch" | "registration";

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
