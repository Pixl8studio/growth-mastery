-- ===========================================
-- Brand Design Step - New Step 3
-- Migration: Add brand_designs table for visual identity
-- Created: 2025-02-14
-- ===========================================

BEGIN;

-- ===========================================
-- TABLE: brand_designs (Step 3)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.brand_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Brand Identity
  brand_name TEXT,

  -- Color Palette
  primary_color TEXT NOT NULL,
  secondary_color TEXT,
  accent_color TEXT,
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1f2937',

  -- Source Information
  scraped_url TEXT, -- If colors were scraped from a website
  is_ai_generated BOOLEAN DEFAULT false,
  generation_prompt TEXT, -- Prompt used for AI generation

  -- Brand Personality
  design_style TEXT, -- modern, classic, minimal, bold, vibrant, elegant, etc.
  personality_traits JSONB DEFAULT '{}', -- { tone, mood, energy, values }

  -- Questionnaire Responses
  questionnaire_responses JSONB DEFAULT '{}', -- Stores user's questionnaire answers

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brand_designs_project ON public.brand_designs(funnel_project_id);
CREATE INDEX idx_brand_designs_user ON public.brand_designs(user_id);
CREATE INDEX idx_brand_designs_ai_generated ON public.brand_designs(is_ai_generated);

-- ===========================================
-- RLS POLICIES
-- ===========================================

-- Enable RLS
ALTER TABLE public.brand_designs ENABLE ROW LEVEL SECURITY;

-- Users can view their own brand designs
CREATE POLICY "Users can view own brand designs"
  ON public.brand_designs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own brand designs
CREATE POLICY "Users can create own brand designs"
  ON public.brand_designs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own brand designs
CREATE POLICY "Users can update own brand designs"
  ON public.brand_designs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own brand designs
CREATE POLICY "Users can delete own brand designs"
  ON public.brand_designs
  FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- TRIGGER: Auto-update timestamps
-- ===========================================

CREATE TRIGGER update_brand_designs_updated_at
  BEFORE UPDATE ON public.brand_designs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMIT;

