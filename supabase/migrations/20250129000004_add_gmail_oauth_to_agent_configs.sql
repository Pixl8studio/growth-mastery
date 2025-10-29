-- AI Follow-Up Engine: Gmail OAuth Support
-- Add Gmail OAuth token fields
BEGIN;

ALTER TABLE public.followup_agent_configs
  ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
  ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS gmail_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gmail_user_email TEXT,
  ADD COLUMN IF NOT EXISTS gmail_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_provider_type TEXT DEFAULT 'sendgrid' 
    CHECK (email_provider_type IN ('sendgrid', 'gmail', 'console'));

CREATE INDEX IF NOT EXISTS idx_followup_agent_configs_gmail_email 
  ON public.followup_agent_configs (gmail_user_email);

CREATE INDEX IF NOT EXISTS idx_followup_agent_configs_provider_type 
  ON public.followup_agent_configs (email_provider_type);

COMMENT ON COLUMN public.followup_agent_configs.gmail_access_token IS 
  'Encrypted Gmail OAuth access token for sending emails';

COMMENT ON COLUMN public.followup_agent_configs.gmail_refresh_token IS 
  'Encrypted Gmail OAuth refresh token for renewing access';

COMMENT ON COLUMN public.followup_agent_configs.gmail_token_expires_at IS 
  'Timestamp when the Gmail access token expires';

COMMENT ON COLUMN public.followup_agent_configs.gmail_user_email IS 
  'Email address of the Gmail account connected via OAuth';

COMMENT ON COLUMN public.followup_agent_configs.gmail_connected_at IS 
  'Timestamp when Gmail was connected via OAuth';

COMMENT ON COLUMN public.followup_agent_configs.email_provider_type IS 
  'Email provider: sendgrid (custom domain), gmail (OAuth), or console (dev mode)';

COMMIT;
