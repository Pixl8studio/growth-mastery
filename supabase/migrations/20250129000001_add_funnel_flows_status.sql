-- Add presentation_type to deck_structures table
-- Migration: 20250129000001_add_presentation_type
BEGIN;

-- Add presentation_type column with enum constraint
ALTER TABLE public.deck_structures
ADD COLUMN IF NOT EXISTS presentation_type TEXT DEFAULT 'webinar' CHECK (
  presentation_type IN ('webinar', 'vsl', 'sales_page')
);

-- Set default for existing records
UPDATE public.deck_structures
SET
  presentation_type = 'webinar'
WHERE
  presentation_type IS NULL;

-- Add index for filtering by presentation type
CREATE INDEX IF NOT EXISTS idx_deck_structures_presentation_type ON public.deck_structures (presentation_type);

-- Add comment for documentation
COMMENT ON COLUMN public.deck_structures.presentation_type IS 'Type of presentation: webinar (55 slides), vsl (5-10 slides), or sales_page (pitch video)';

COMMIT;
