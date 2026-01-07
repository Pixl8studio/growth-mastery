-- Add global unique constraint on slug for ai_editor_pages
-- This prevents race conditions where two requests could claim the same slug
-- Note: The existing constraint unique_ai_editor_page_slug is per-user (user_id, slug)
-- We need a global constraint since slugs are used in public URLs like /p/{slug}
BEGIN;

-- Drop the old per-user constraint if it exists
ALTER TABLE ai_editor_pages
DROP CONSTRAINT IF EXISTS unique_ai_editor_page_slug;

-- Add a new global unique constraint on slug (excluding null values)
-- This allows multiple pages to have NULL slug but ensures non-null slugs are unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_editor_pages_unique_slug ON ai_editor_pages (slug)
WHERE
  slug IS NOT NULL;

-- Add comment explaining the constraint
COMMENT ON INDEX idx_ai_editor_pages_unique_slug IS 'Ensures globally unique slugs for public page URLs';

COMMIT;
