/**
 * Type definitions for the Pages feature
 */

/**
 * All valid page types as a const tuple for runtime validation (e.g., Zod)
 * IMPORTANT: This is the single source of truth for page types.
 * Do not define PageType elsewhere.
 */
export const PAGE_TYPES = [
    "registration",
    "confirmation",
    "watch",
    "enrollment",
    "call_booking",
    "checkout",
    "upsell",
    "thank_you",
] as const;

/**
 * Page type union derived from PAGE_TYPES constant
 */
export type PageType = (typeof PAGE_TYPES)[number];

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

// Page media types
export type PageMediaType = "uploaded_image" | "ai_generated_image" | "pitch_video";

export interface PageMedia {
    id: string;
    funnel_project_id: string;
    page_id: string | null;
    user_id: string;
    media_type: PageMediaType;
    storage_path: string;
    public_url: string;
    prompt: string | null;
    metadata: {
        width?: number;
        height?: number;
        file_size?: number;
        mime_type?: string;
        original_filename?: string;
    };
    created_at: string;
    updated_at: string;
}

export interface PitchVideo {
    id: string;
    title: string;
    video_id: string;
    thumbnail_url: string | null;
    duration: number | null;
    created_at: string;
}
