-- Migration: Add Brand Data to Vapi Transcripts
-- Description: Adds brand_data JSONB column for storing extracted brand information from scraping
-- Date: 2025-11-15
-- Add brand_data column to vapi_transcripts table
ALTER TABLE vapi_transcripts
ADD COLUMN IF NOT EXISTS brand_data JSONB DEFAULT NULL;

-- Create GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_vapi_transcripts_brand_data ON vapi_transcripts USING GIN (brand_data);

-- Add comment
COMMENT ON COLUMN vapi_transcripts.brand_data IS 'Extracted brand information including colors, fonts, and style from scraped websites';

-- Example brand_data structure:
-- {
--   "colors": {
--     "primary": "#3B82F6",
--     "secondary": "#8B5CF6",
--     "accent": "#EC4899",
--     "background": "#FFFFFF",
--     "text": "#1F2937"
--   },
--   "fonts": {
--     "primary": "Inter",
--     "secondary": "Poppins",
--     "weights": ["400", "600", "700"]
--   },
--   "style": {
--     "borderRadius": "8px",
--     "shadows": true,
--     "gradients": false
--   },
--   "confidence": {
--     "colors": 85,
--     "fonts": 75,
--     "overall": 80
--   },
--   "source_url": "https://example.com",
--   "extracted_at": "2025-11-15T10:30:00Z"
-- }
