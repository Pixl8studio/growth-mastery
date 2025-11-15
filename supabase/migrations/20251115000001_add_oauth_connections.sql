-- Migration: Add OAuth Connections Table
-- Description: Stores encrypted OAuth tokens for social media platform connections
-- Date: 2025-11-15

-- Create marketing_oauth_connections table
CREATE TABLE IF NOT EXISTS marketing_oauth_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    profile_id UUID REFERENCES marketing_profiles (id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (
        platform IN (
            'instagram',
            'facebook',
            'linkedin',
            'twitter'
        )
    ),
    -- Encrypted access token (using Supabase Vault for encryption)
    access_token_encrypted TEXT NOT NULL,
    -- Encrypted refresh token (if available)
    refresh_token_encrypted TEXT,
    -- Token metadata
    token_expires_at TIMESTAMP WITH TIME ZONE,
    token_issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Platform-specific IDs
    platform_user_id TEXT,
    platform_username TEXT,
    platform_name TEXT,
    -- Connection status
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN (
            'active',
            'expired',
            'revoked',
            'error'
        )
    ),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,
    -- Scope and permissions granted
    scopes TEXT [] DEFAULT '{}',
    -- Platform-specific metadata (page IDs, organization IDs, etc.)
    metadata JSONB DEFAULT '{}',
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraint: one connection per user per platform per profile
    UNIQUE (user_id, platform, profile_id)
);

-- Create indexes
CREATE INDEX idx_oauth_connections_user_id ON marketing_oauth_connections (user_id);

CREATE INDEX idx_oauth_connections_profile_id ON marketing_oauth_connections (profile_id);

CREATE INDEX idx_oauth_connections_platform ON marketing_oauth_connections (platform);

CREATE INDEX idx_oauth_connections_status ON marketing_oauth_connections (status);

CREATE INDEX idx_oauth_connections_expires_at ON marketing_oauth_connections (token_expires_at);

-- Add updated_at trigger
CREATE TRIGGER update_marketing_oauth_connections_updated_at BEFORE
UPDATE ON marketing_oauth_connections FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

-- Row Level Security (RLS)
ALTER TABLE marketing_oauth_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view their own OAuth connections" ON marketing_oauth_connections FOR
SELECT
    USING (auth.uid () = user_id);

-- Users can insert their own connections
CREATE POLICY "Users can insert their own OAuth connections" ON marketing_oauth_connections FOR INSERT
WITH
    CHECK (auth.uid () = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update their own OAuth connections" ON marketing_oauth_connections FOR
UPDATE USING (auth.uid () = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete their own OAuth connections" ON marketing_oauth_connections FOR DELETE USING (auth.uid () = user_id);

-- Add comment
COMMENT ON TABLE marketing_oauth_connections IS 'Stores OAuth connection tokens for social media platforms with encryption';

COMMENT ON COLUMN marketing_oauth_connections.access_token_encrypted IS 'Encrypted OAuth access token';

COMMENT ON COLUMN marketing_oauth_connections.refresh_token_encrypted IS 'Encrypted OAuth refresh token';

COMMENT ON COLUMN marketing_oauth_connections.token_expires_at IS 'When the access token expires';

COMMENT ON COLUMN marketing_oauth_connections.metadata IS 'Platform-specific data like page IDs, account IDs, etc.';

COMMENT ON COLUMN marketing_oauth_connections.scopes IS 'OAuth scopes/permissions granted';

