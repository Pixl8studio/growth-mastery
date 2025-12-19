-- ===========================================
-- Add 'paused' status to presentations table
-- Migration: Support paused generation state
-- Created: 2025-12-19
-- Related: Fix presentation status updates
-- ===========================================
BEGIN;

-- Add 'paused' to the status CHECK constraint
-- First drop the existing constraint, then recreate with new values
ALTER TABLE public.presentations
DROP CONSTRAINT IF EXISTS presentations_status_check;

ALTER TABLE public.presentations
ADD CONSTRAINT presentations_status_check CHECK (
  status IN (
    'draft',
    'generating',
    'completed',
    'failed',
    'paused'
  )
);

-- Update comment to reflect new status
COMMENT ON COLUMN public.presentations.status IS 'Generation status: draft (initial), generating (in progress), completed (all slides done), paused (user stopped mid-generation), or failed (error)';

COMMIT;
