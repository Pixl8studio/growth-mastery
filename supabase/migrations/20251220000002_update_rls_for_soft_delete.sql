-- ===========================================
-- Update RLS Policies for Soft Delete Support
-- Migration: Ensures deleted funnels are filtered at database level
-- Created: 2025-12-20
-- ===========================================

BEGIN;

-- Drop existing SELECT policy for funnel_projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.funnel_projects;

-- Create new SELECT policy that excludes soft-deleted funnels by default
-- This provides defense-in-depth alongside application-level filtering
CREATE POLICY "Users can view own active projects"
  ON public.funnel_projects FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Create separate policy for viewing deleted funnels (for trash page)
-- This allows explicit access to soft-deleted funnels when needed
CREATE POLICY "Users can view own deleted projects"
  ON public.funnel_projects FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- Update existing policies remain unchanged:
-- - "Users can insert own projects" (INSERT)
-- - "Users can update own projects" (UPDATE)
-- - "Users can delete own projects" (DELETE)

-- Add comment explaining the policy split
COMMENT ON POLICY "Users can view own active projects" ON public.funnel_projects IS
'Default SELECT policy: Returns only active (non-deleted) funnels for the authenticated user';

COMMENT ON POLICY "Users can view own deleted projects" ON public.funnel_projects IS
'Trash SELECT policy: Returns only soft-deleted funnels for the authenticated user (used by trash page)';

COMMIT;
