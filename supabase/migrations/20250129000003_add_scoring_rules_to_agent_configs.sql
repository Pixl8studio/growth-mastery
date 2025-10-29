-- ===========================================
-- AI Follow-Up Engine Schema Fixes
-- Migration: Add scoring_rules and sender identity fields
-- Created: 2025-01-29
-- GitHub Issue: #51
-- ===========================================

BEGIN;

-- ===========================================
-- Add scoring_rules column
-- ===========================================

ALTER TABLE public.followup_agent_configs
ADD COLUMN IF NOT EXISTS scoring_rules JSONB DEFAULT '{
  "watch_weight": 45,
  "offer_click_weight": 25,
  "email_engagement_weight": 5,
  "reply_weight": 15,
  "hot_threshold": 75,
  "engaged_threshold": 50,
  "sampler_threshold": 25,
  "skimmer_threshold": 1
}'::JSONB NOT NULL;

-- ===========================================
-- Add sender identity fields
-- ===========================================

ALTER TABLE public.followup_agent_configs
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS sender_email TEXT,
ADD COLUMN IF NOT EXISTS sender_domain TEXT,
ADD COLUMN IF NOT EXISTS sender_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_sender_id TEXT,
ADD COLUMN IF NOT EXISTS sendgrid_domain_id TEXT,
ADD COLUMN IF NOT EXISTS sendgrid_dns_records JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS domain_verification_status TEXT DEFAULT 'pending' CHECK (domain_verification_status IN ('pending', 'verified', 'failed', 'not_started'));

-- Create indexes for sender fields
CREATE INDEX IF NOT EXISTS idx_followup_agent_configs_sender_verified
  ON public.followup_agent_configs (sender_verified);

CREATE INDEX IF NOT EXISTS idx_followup_agent_configs_domain_status
  ON public.followup_agent_configs (domain_verification_status);

CREATE INDEX IF NOT EXISTS idx_followup_agent_configs_sender_email
  ON public.followup_agent_configs (sender_email);

-- ===========================================
-- Comments for documentation
-- ===========================================

COMMENT ON COLUMN public.followup_agent_configs.scoring_rules IS
  'Configurable lead scoring weights and thresholds for prospect segmentation';

COMMENT ON COLUMN public.followup_agent_configs.sender_name IS
  'Display name for email sender (e.g., "John from Acme")';

COMMENT ON COLUMN public.followup_agent_configs.sender_email IS
  'Verified email address used as sender in follow-up emails';

COMMENT ON COLUMN public.followup_agent_configs.sender_domain IS
  'Extracted domain from sender_email for verification tracking';

COMMENT ON COLUMN public.followup_agent_configs.sender_verified IS
  'Whether the sender domain has been verified via DNS (SPF/DKIM/DMARC)';

COMMENT ON COLUMN public.followup_agent_configs.sms_sender_id IS
  'SMS sender name or phone number (max 11 characters)';

COMMENT ON COLUMN public.followup_agent_configs.sendgrid_domain_id IS
  'SendGrid domain authentication ID for API reference';

COMMENT ON COLUMN public.followup_agent_configs.sendgrid_dns_records IS
  'DNS records (SPF, DKIM, DMARC) provided by SendGrid for domain verification';

COMMENT ON COLUMN public.followup_agent_configs.domain_verification_status IS
  'Current status of domain verification: not_started, pending, verified, or failed';

COMMIT;
