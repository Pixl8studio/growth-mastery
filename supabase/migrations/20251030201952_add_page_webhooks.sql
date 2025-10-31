
-- ===========================================
-- Add Page-Level Webhook Configuration
-- Migration: Move webhooks from global to page-level
-- Created: 2025-10-30
-- ===========================================

BEGIN;

-- ===========================================
-- ADD WEBHOOK FIELDS TO REGISTRATION PAGES
-- ===========================================

ALTER TABLE public.registration_pages
  ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS webhook_inherit_global BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.registration_pages.webhook_enabled IS 'NULL = inherit from global, true/false = page-specific override';
COMMENT ON COLUMN public.registration_pages.webhook_url IS 'Page-specific webhook URL (overrides global if set)';
COMMENT ON COLUMN public.registration_pages.webhook_secret IS 'Page-specific webhook secret for HMAC signatures';
COMMENT ON COLUMN public.registration_pages.webhook_inherit_global IS 'Whether to use global webhook settings as fallback';

-- ===========================================
-- ADD WEBHOOK FIELDS TO ENROLLMENT PAGES
-- ===========================================

ALTER TABLE public.enrollment_pages
  ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS webhook_inherit_global BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.enrollment_pages.webhook_enabled IS 'NULL = inherit from global, true/false = page-specific override';
COMMENT ON COLUMN public.enrollment_pages.webhook_url IS 'Page-specific webhook URL (overrides global if set)';
COMMENT ON COLUMN public.enrollment_pages.webhook_secret IS 'Page-specific webhook secret for HMAC signatures';
COMMENT ON COLUMN public.enrollment_pages.webhook_inherit_global IS 'Whether to use global webhook settings as fallback';

-- ===========================================
-- ADD WEBHOOK FIELDS TO WATCH PAGES
-- ===========================================

ALTER TABLE public.watch_pages
  ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS webhook_inherit_global BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.watch_pages.webhook_enabled IS 'NULL = inherit from global, true/false = page-specific override';
COMMENT ON COLUMN public.watch_pages.webhook_url IS 'Page-specific webhook URL (overrides global if set)';
COMMENT ON COLUMN public.watch_pages.webhook_secret IS 'Page-specific webhook secret for HMAC signatures';
COMMENT ON COLUMN public.watch_pages.webhook_inherit_global IS 'Whether to use global webhook settings as fallback';

-- ===========================================
-- CREATE INDEXES FOR WEBHOOK QUERIES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_registration_pages_webhook ON public.registration_pages (webhook_enabled)
WHERE
  webhook_enabled IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollment_pages_webhook ON public.enrollment_pages (webhook_enabled)
WHERE
  webhook_enabled IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_watch_pages_webhook ON public.watch_pages (webhook_enabled)
WHERE
  webhook_enabled IS NOT NULL;

COMMIT;
