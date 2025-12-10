-- ===========================================
-- Brand Guidelines Enhancement - Issue #258
-- Migration: Extend brand_designs table for comprehensive brand guidelines
-- Created: 2025-12-10
-- ===========================================
BEGIN;

-- ===========================================
-- ALTER TABLE: brand_designs - Add comprehensive guidelines fields
-- ===========================================
-- Input method tracking
ALTER TABLE public.brand_designs
ADD COLUMN IF NOT EXISTS input_method TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS wizard_progress JSONB DEFAULT '{}';

-- Visual Identity - Extended
ALTER TABLE public.brand_designs
ADD COLUMN IF NOT EXISTS fonts JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sizing_hierarchy JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS design_preferences JSONB DEFAULT '{}';

-- Brand Voice & Tone
ALTER TABLE public.brand_designs
ADD COLUMN IF NOT EXISTS brand_voice JSONB DEFAULT '{}';

-- Messaging Framework
ALTER TABLE public.brand_designs
ADD COLUMN IF NOT EXISTS messaging_framework JSONB DEFAULT '{}';

-- Brand Application Guidelines
ALTER TABLE public.brand_designs
ADD COLUMN IF NOT EXISTS brand_application JSONB DEFAULT '{}';

-- AI Generation tracking
ALTER TABLE public.brand_designs
ADD COLUMN IF NOT EXISTS generation_source TEXT,
ADD COLUMN IF NOT EXISTS last_regenerated_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.brand_designs.input_method IS 'Method used to create guidelines: wizard, website, or manual';

COMMENT ON COLUMN public.brand_designs.wizard_progress IS 'Tracks wizard step completion: { currentStep, completedSteps, responses }';

COMMENT ON COLUMN public.brand_designs.fonts IS 'Typography: { primary_font, secondary_font, font_sizes: { h1, h2, h3, body, small } }';

COMMENT ON COLUMN public.brand_designs.sizing_hierarchy IS 'Sizing system: { spacing, border_radius, breakpoints }';

COMMENT ON COLUMN public.brand_designs.design_preferences IS 'Visual preferences: { imagery_style, icon_style, layout_preferences }';

COMMENT ON COLUMN public.brand_designs.brand_voice IS 'Voice & tone: { personality_descriptors, archetypes, tone_spectrums, writing_guidelines, word_lists }';

COMMENT ON COLUMN public.brand_designs.messaging_framework IS 'Messaging: { positioning_statement, tagline, elevator_pitch, value_propositions, customer_journey_messages }';

COMMENT ON COLUMN public.brand_designs.brand_application IS 'Application guidelines: { logo_usage, photography_style, illustration_style, icon_style, dos_and_donts }';

COMMENT ON COLUMN public.brand_designs.generation_source IS 'Source data used for AI generation: transcript, business_profile, or website_url';

COMMENT ON COLUMN public.brand_designs.last_regenerated_at IS 'Timestamp of last AI regeneration';

-- Index for input method queries
CREATE INDEX IF NOT EXISTS idx_brand_designs_input_method ON public.brand_designs (input_method);

COMMIT;
