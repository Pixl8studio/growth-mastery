-- Migration: Add atomic slide append RPC function
-- Prevents race conditions when multiple slides complete simultaneously
-- Related: Presentation generator save feature
-- Created: 2025-12-18
BEGIN;

-- Create RPC function to atomically append a slide to a presentation
-- Uses PostgreSQL's jsonb array concatenation to avoid read-modify-write races
CREATE OR REPLACE FUNCTION append_slide_to_presentation (
  p_presentation_id UUID,
  p_slide JSONB,
  p_progress INTEGER
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
BEGIN
    UPDATE presentations
    SET
        slides = COALESCE(slides, '[]'::jsonb) || p_slide,
        generation_progress = GREATEST(generation_progress, p_progress),
        updated_at = NOW()
    WHERE id = p_presentation_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT
EXECUTE ON FUNCTION append_slide_to_presentation (UUID, JSONB, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION append_slide_to_presentation IS 'Atomically appends a slide to a presentation''s slides array. Uses JSONB concatenation to prevent race conditions during parallel slide generation.';

COMMIT;
