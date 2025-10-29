/**
 * Integration Types and Interfaces
 *
 * Type definitions for social media, calendar, and domain integrations.
 */

export type SocialProvider = "facebook" | "instagram" | "twitter" | "gmail";
export type CalendarProvider = "google" | "outlook" | "caldav";
export type IntegrationStatus = "connected" | "disconnected" | "expired" | "error";

export interface SocialConnection {
    id: string;
    funnel_project_id: string;
    user_id: string;
    provider: SocialProvider;
    account_id: string;
    account_name: string | null;
    account_email: string | null;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: string | null;
    scopes: string[] | null;
    profile_data: Record<string, any>;
    is_active: boolean;
    connected_at: string;
    last_verified_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CalendarConnection {
    id: string;
    funnel_project_id: string;
    user_id: string;
    provider: CalendarProvider;
    account_email: string;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: string | null;
    calendar_id: string;
    calendar_name: string | null;
    is_active: boolean;
    connected_at: string;
    last_synced_at: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface OAuthTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type: string;
    scope?: string;
}

export interface FacebookPageInfo {
    id: string;
    name: string;
    access_token: string;
    category?: string;
    tasks?: string[];
}

export interface InstagramAccountInfo {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
}

export interface TwitterUserInfo {
    id: string;
    username: string;
    name: string;
    profile_image_url?: string;
    verified?: boolean;
}

export interface GmailUserInfo {
    email: string;
    name?: string;
    picture?: string;
    verified_email?: boolean;
}

export interface GoogleCalendarInfo {
    id: string;
    summary: string;
    description?: string;
    timezone?: string;
    primary?: boolean;
}

export interface IntegrationConnectionState {
    status: IntegrationStatus;
    connected: boolean;
    account_info: string | null;
    connected_at: string | null;
    needs_reconnection: boolean;
    error_message?: string;
}
