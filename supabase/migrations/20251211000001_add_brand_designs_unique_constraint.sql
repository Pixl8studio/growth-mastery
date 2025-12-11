-- ===========================================
-- Brand Designs Unique Constraint Fix - Issue #273
-- Migration: Add unique constraint on funnel_project_id for upsert support
-- Created: 2025-12-11
-- ===========================================
-- The brand_designs table was created with an index on funnel_project_id,
-- but the API uses upsert with onConflict: "funnel_project_id" which requires
-- a unique constraint, not just an index. This migration fixes the issue.
-- ===========================================
BEGIN;

-- Remove duplicate entries first (keep the most recent one by updated_at)
-- This ensures the unique constraint can be added without conflicts
DELETE FROM public.brand_designs a USING public.brand_designs b
WHERE
  a.funnel_project_id = b.funnel_project_id
  AND a.funnel_project_id IS NOT NULL
  AND a.updated_at < b.updated_at;

-- Drop the existing non-unique index (we'll replace it with a unique constraint)
DROP INDEX IF EXISTS idx_brand_designs_project;

-- Add unique constraint on funnel_project_id
-- This enables upsert operations with onConflict: "funnel_project_id"
ALTER TABLE public.brand_designs
ADD CONSTRAINT brand_designs_funnel_project_id_unique UNIQUE (funnel_project_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT brand_designs_funnel_project_id_unique ON public.brand_designs IS 'Ensures one brand design per funnel project, enabling upsert operations';

COMMIT;
