-- Migration: Add total_expected_slides column for resume capability
-- Related: Presentation generator save feature - allows resuming partial generations
-- Created: 2025-12-18
BEGIN;

-- Add total_expected_slides column to track how many slides should be generated
-- This enables showing progress like "7 of 60 slides" even for incomplete presentations
ALTER TABLE public.presentations
ADD COLUMN IF NOT EXISTS total_expected_slides INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN public.presentations.total_expected_slides IS 'Total number of slides expected for this presentation. Used for resume capability and progress display.';

COMMIT;
