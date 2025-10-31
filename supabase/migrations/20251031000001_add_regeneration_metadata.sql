
-- ===========================================
-- Add Regeneration Metadata to Pages
-- Migration: Track AI regeneration history and edited fields
-- Created: 2025-10-31
-- ===========================================

BEGIN;

-- ===========================================
-- ADD REGENERATION METADATA TO REGISTRATION PAGES
-- ===========================================

ALTER TABLE public.registration_pages
  ADD COLUMN IF NOT EXISTS regeneration_metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN public.registration_pages.regeneration_metadata IS 'Tracks AI regeneration history: last_regenerated_at, manually_edited_fields[], regeneration_count, framework_version';

-- ===========================================
-- ADD REGENERATION METADATA TO ENROLLMENT PAGES
-- ===========================================

ALTER TABLE public.enrollment_pages
  ADD COLUMN IF NOT EXISTS regeneration_metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN public.enrollment_pages.regeneration_metadata IS 'Tracks AI regeneration history: last_regenerated_at, manually_edited_fields[], regeneration_count, framework_version';

-- ===========================================
-- ADD REGENERATION METADATA TO WATCH PAGES
-- ===========================================

ALTER TABLE public.watch_pages
  ADD COLUMN IF NOT EXISTS regeneration_metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN public.watch_pages.regeneration_metadata IS 'Tracks AI regeneration history: last_regenerated_at, manually_edited_fields[], regeneration_count, framework_version';

COMMIT;

-- ===========================================
-- Rollback (if needed)
-- ===========================================
-- ALTER TABLE public.registration_pages DROP COLUMN IF EXISTS regeneration_metadata;
-- ALTER TABLE public.enrollment_pages DROP COLUMN IF EXISTS regeneration_metadata;
-- ALTER TABLE public.watch_pages DROP COLUMN IF EXISTS regeneration_metadata;

