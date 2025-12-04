-- ===========================================
-- Email Domains for Mailgun Integration
-- Migration: Add email_domains table for white-label email sending
-- Created: 2025-11-25
-- Issue: #53
-- ===========================================
BEGIN;

-- ===========================================
-- EMAIL DOMAINS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.email_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  funnel_project_id UUID REFERENCES public.funnel_projects (id) ON DELETE CASCADE,
  -- Domain details
  domain TEXT NOT NULL,
  subdomain TEXT NOT NULL,
  full_domain TEXT GENERATED ALWAYS AS (subdomain || '.' || domain) STORED,
  -- Mailgun integration
  mailgun_domain_id TEXT,
  -- DNS records for verification
  spf_record TEXT,
  dkim1_record TEXT,
  dkim1_host TEXT,
  dkim2_record TEXT,
  dkim2_host TEXT,
  mx_record TEXT,
  mx_host TEXT,
  tracking_cname TEXT,
  tracking_host TEXT,
  -- Verification status
  verification_status TEXT DEFAULT 'pending', -- pending, verified, failed
  verified_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  error_message TEXT,
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  sender_email TEXT, -- Default sender email for this domain (e.g., noreply@mail.domain.com)
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraints
  UNIQUE (user_id, full_domain),
  CHECK (
    verification_status IN ('pending', 'verified', 'failed')
  )
);

-- Indexes for fast lookups
CREATE INDEX idx_email_domains_user ON public.email_domains (user_id);

CREATE INDEX idx_email_domains_funnel ON public.email_domains (funnel_project_id)
WHERE
  funnel_project_id IS NOT NULL;

CREATE INDEX idx_email_domains_status ON public.email_domains (verification_status, is_active);

CREATE INDEX idx_email_domains_full_domain ON public.email_domains (full_domain);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_email_domains_updated_at () RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_domains_updated_at BEFORE
UPDATE ON public.email_domains FOR EACH ROW
EXECUTE FUNCTION update_email_domains_updated_at ();

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================
ALTER TABLE public.email_domains ENABLE ROW LEVEL SECURITY;

-- Users can view their own email domains
CREATE POLICY "Users can view own email domains" ON public.email_domains FOR
SELECT
  USING (auth.uid () = user_id);

-- Users can create their own email domains
CREATE POLICY "Users can create own email domains" ON public.email_domains FOR INSERT
WITH
  CHECK (auth.uid () = user_id);

-- Users can update their own email domains
CREATE POLICY "Users can update own email domains" ON public.email_domains
FOR UPDATE
  USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);

-- Users can delete their own email domains
CREATE POLICY "Users can delete own email domains" ON public.email_domains FOR DELETE USING (auth.uid () = user_id);

COMMIT;
