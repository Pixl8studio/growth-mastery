-- ===========================================
-- PowerPoint Presentation Generator - Database Schema
-- Migration: Tables for AI-generated presentations
-- Created: 2025-12-16
-- Related: GitHub Issue #325 - Replace Gamma with in-house solution
-- ===========================================
BEGIN;

-- ===========================================
-- PRESENTATIONS TABLE
-- Stores AI-generated presentations with slide data
-- ===========================================
CREATE TABLE IF NOT EXISTS public.presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects (id) ON DELETE CASCADE,
  deck_structure_id UUID REFERENCES public.deck_structures (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  customization JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'generating', 'completed', 'failed')
  ),
  pptx_url TEXT,
  generation_progress INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_presentations_user_id ON public.presentations (user_id);

CREATE INDEX IF NOT EXISTS idx_presentations_funnel_project_id ON public.presentations (funnel_project_id);

CREATE INDEX IF NOT EXISTS idx_presentations_deck_structure_id ON public.presentations (deck_structure_id);

CREATE INDEX IF NOT EXISTS idx_presentations_status ON public.presentations (status);

CREATE INDEX IF NOT EXISTS idx_presentations_created_at ON public.presentations (created_at DESC);

-- ===========================================
-- TRIGGER FOR UPDATED_AT
-- ===========================================
CREATE TRIGGER set_presentations_updated_at BEFORE
UPDATE ON public.presentations FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at ();

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- Ensure users can only access their own presentations
-- ===========================================
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

-- Presentations Policies
CREATE POLICY "Users can view their own presentations" ON public.presentations FOR
SELECT
  TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "Users can create their own presentations" ON public.presentations FOR INSERT TO authenticated
WITH
  CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update their own presentations" ON public.presentations
FOR UPDATE
  TO authenticated USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);

CREATE POLICY "Users can delete their own presentations" ON public.presentations FOR DELETE TO authenticated USING (auth.uid () = user_id);

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================
COMMENT ON TABLE public.presentations IS 'Stores AI-generated PowerPoint presentations with slide data';

COMMENT ON COLUMN public.presentations.slides IS 'JSON array of slide objects with title, content, speakerNotes, layoutType, etc.';

COMMENT ON COLUMN public.presentations.customization IS 'JSON object with presentation customization settings (textDensity, visualStyle, etc.)';

COMMENT ON COLUMN public.presentations.status IS 'Generation status: draft, generating, completed, or failed';

COMMENT ON COLUMN public.presentations.pptx_url IS 'URL to the generated PPTX file (if exported)';

COMMENT ON COLUMN public.presentations.generation_progress IS 'Progress percentage during generation (0-100)';

COMMIT;
