-- ===========================================
-- Brand Color Rationale - Issue #334
-- Migration: Add color_rationale field to brand_designs table
-- Created: 2025-12-18
-- ===========================================
BEGIN;

-- Add color_rationale field for AI explanation of color choices
ALTER TABLE public.brand_designs
ADD COLUMN IF NOT EXISTS color_rationale TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.brand_designs.color_rationale IS 'AI-generated explanation of why these colors were chosen for the brand';

COMMIT;
