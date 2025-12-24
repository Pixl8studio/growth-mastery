-- ===========================================
-- Custom Domains for Vercel Integration
-- Migration: Add custom_domains table for branded funnel URLs
-- Created: 2025-12-22
-- Issue: #379
-- ===========================================
BEGIN;

-- ===========================================
-- CUSTOM DOMAINS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.custom_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  funnel_project_id UUID REFERENCES public.funnel_projects (id) ON DELETE SET NULL,
  -- Domain details
  domain TEXT NOT NULL,
  is_subdomain BOOLEAN DEFAULT false,
  -- Vercel integration
  vercel_domain_id TEXT,
  -- DNS configuration
  dns_instructions JSONB DEFAULT '{}',
  -- Verification status
  verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending', -- pending, verified, failed
  verification_error TEXT,
  verified_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  -- SSL status
  ssl_status TEXT DEFAULT 'pending', -- pending, active, error
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraints
  UNIQUE (domain),
  CHECK (
    verification_status IN ('pending', 'verified', 'failed')
  ),
  CHECK (ssl_status IN ('pending', 'active', 'error'))
);

-- Indexes for fast lookups
CREATE INDEX idx_custom_domains_user ON public.custom_domains (user_id);

CREATE INDEX idx_custom_domains_funnel ON public.custom_domains (funnel_project_id)
WHERE
  funnel_project_id IS NOT NULL;

CREATE INDEX idx_custom_domains_domain ON public.custom_domains (domain);

CREATE INDEX idx_custom_domains_status ON public.custom_domains (verification_status, verified);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_custom_domains_updated_at () RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_custom_domains_updated_at BEFORE
UPDATE ON public.custom_domains FOR EACH ROW
EXECUTE FUNCTION update_custom_domains_updated_at ();

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- Users can view their own custom domains
CREATE POLICY "Users can view own custom domains" ON public.custom_domains FOR
SELECT
  USING (auth.uid () = user_id);

-- Users can create their own custom domains
CREATE POLICY "Users can create own custom domains" ON public.custom_domains FOR INSERT
WITH
  CHECK (auth.uid () = user_id);

-- Users can update their own custom domains
CREATE POLICY "Users can update own custom domains" ON public.custom_domains
FOR UPDATE
  USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);

-- Users can delete their own custom domains
CREATE POLICY "Users can delete own custom domains" ON public.custom_domains FOR DELETE USING (auth.uid () = user_id);

COMMIT;
