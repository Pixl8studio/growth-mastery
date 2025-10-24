-- ============================================
-- Migration: Add HTML Content and Theme Support
-- ============================================
-- Purpose: Add html_content and theme columns to page tables for visual editor integration
-- Author: AI Assistant (Autonomous Developer)
-- Date: 2025-10-24
BEGIN;

-- Add html_content column to enrollment_pages
-- This stores the complete HTML with block structure for the visual editor
ALTER TABLE
  public.enrollment_pages
ADD COLUMN
  IF NOT EXISTS html_content TEXT,
ADD COLUMN
  IF NOT EXISTS theme JSONB DEFAULT '{}';

-- Add html_content column to watch_pages
ALTER TABLE
  public.watch_pages
ADD COLUMN
  IF NOT EXISTS html_content TEXT,
ADD COLUMN
  IF NOT EXISTS theme JSONB DEFAULT '{}';

-- Add html_content column to registration_pages
ALTER TABLE
  public.registration_pages
ADD COLUMN
  IF NOT EXISTS html_content TEXT,
ADD COLUMN
  IF NOT EXISTS theme JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN public.enrollment_pages.html_content IS 'Complete HTML content with editor-ready block structure (data-block-type, data-editable attributes)';

COMMENT ON COLUMN public.enrollment_pages.theme IS 'Theme configuration (primary, secondary, background, text colors) inherited from funnel project';

COMMENT ON COLUMN public.watch_pages.html_content IS 'Complete HTML content with editor-ready block structure (data-block-type, data-editable attributes)';

COMMENT ON COLUMN public.watch_pages.theme IS 'Theme configuration (primary, secondary, background, text colors) inherited from funnel project';

COMMENT ON COLUMN public.registration_pages.html_content IS 'Complete HTML content with editor-ready block structure (data-block-type, data-editable attributes)';

COMMENT ON COLUMN public.registration_pages.theme IS 'Theme configuration (primary, secondary, background, text colors) inherited from funnel project';

COMMIT;

-- ============================================
-- Rollback (if needed)
-- ============================================
-- To rollback this migration, run:
--
-- BEGIN;
-- ALTER TABLE public.enrollment_pages DROP COLUMN IF EXISTS html_content, DROP COLUMN IF EXISTS theme;
-- ALTER TABLE public.watch_pages DROP COLUMN IF EXISTS html_content, DROP COLUMN IF EXISTS theme;
-- ALTER TABLE public.registration_pages DROP COLUMN IF EXISTS html_content, DROP COLUMN IF EXISTS theme;
-- COMMIT;
