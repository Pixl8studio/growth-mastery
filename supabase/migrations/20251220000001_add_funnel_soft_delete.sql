-- ===========================================
-- Add Soft Delete Support for Funnels
-- Migration: Add deleted_at column for trash/recovery functionality
-- Created: 2025-12-20
-- ===========================================

BEGIN;

-- Add deleted_at column to funnel_projects
ALTER TABLE public.funnel_projects
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for efficient filtering of soft-deleted funnels
CREATE INDEX IF NOT EXISTS idx_funnel_projects_deleted_at
ON public.funnel_projects(deleted_at)
WHERE deleted_at IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.funnel_projects.deleted_at IS
'Timestamp when funnel was soft-deleted. NULL means active. After 30 days, eligible for permanent deletion.';

COMMIT;
