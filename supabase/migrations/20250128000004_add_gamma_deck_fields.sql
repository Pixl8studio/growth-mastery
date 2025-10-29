-- Add missing fields to gamma_decks table for title mapping and status tracking
-- Migration: 20250128000004_add_gamma_deck_fields
BEGIN;

-- Add title column to store the presentation name
ALTER TABLE
  public.gamma_decks
ADD COLUMN
  IF NOT EXISTS title TEXT;

-- Add settings column to store theme and generation preferences
ALTER TABLE
  public.gamma_decks
ADD COLUMN
  IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Add status column with constraint for tracking generation lifecycle
ALTER TABLE
  public.gamma_decks
ADD COLUMN
  IF NOT EXISTS status TEXT DEFAULT 'generating' CHECK (
    status IN ('generating', 'completed', 'failed')
  );

-- Create index on status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_gamma_decks_status ON public.gamma_decks (status);

-- Add comments for documentation
COMMENT ON COLUMN public.gamma_decks.title IS 'User-visible title for the presentation';

COMMENT ON COLUMN public.gamma_decks.settings IS 'Generation settings including theme, style, and length preferences';

COMMENT ON COLUMN public.gamma_decks.status IS 'Presentation generation status: generating, completed, or failed';

COMMIT;
