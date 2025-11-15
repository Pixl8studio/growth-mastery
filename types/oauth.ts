/**
 * OAuth Connection Types
 * Shared types for social media OAuth connections
 */

/**
 * OAuth connection metadata stored in JSONB
 * Platform-specific data like page IDs, account IDs, etc.
 */
export interface OAuthConnectionMetadata {
    page_id?: string; // Facebook page ID
    user_id?: string; // Platform-specific user ID
    account_id?: string; // Instagram/LinkedIn business account ID
    organization_id?: string; // LinkedIn organization ID
    profile_url?: string; // Public profile URL
    [key: string]: unknown; // Allow additional platform-specific fields
}

/**
 * OAuth connection record from database
 */
export interface OAuthConnection {
    id: string;
    user_id: string;
    profile_id: string | null;
    platform: "instagram" | "facebook" | "linkedin" | "twitter";
    access_token_encrypted: string;
    refresh_token_encrypted: string | null;
    token_expires_at: string | null;
    token_issued_at: string;
    platform_user_id: string | null;
    platform_username: string | null;
    platform_name: string | null;
    status: "active" | "expired" | "revoked" | "error";
    last_synced_at: string | null;
    sync_error: string | null;
    scopes: string[];
    metadata: OAuthConnectionMetadata;
    created_at: string;
    updated_at: string;
}

/**
 * OAuth connection with decrypted tokens (used in application code)
 */
export interface OAuthConnectionWithTokens
    extends Omit<
        OAuthConnection,
        "access_token_encrypted" | "refresh_token_encrypted"
    > {
    access_token: string;
    refresh_token: string | null;
}
