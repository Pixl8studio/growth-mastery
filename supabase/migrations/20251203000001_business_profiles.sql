-- ===========================================
-- Business Profiles Schema
-- Migration: AI-assisted Context Wizard with unified Business Profile
-- Created: 2025-12-03
-- ===========================================
BEGIN;

-- ===========================================
-- TABLE: business_profiles
-- Unified business profile that serves all downstream content generation
-- ===========================================
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  funnel_project_id UUID REFERENCES public.funnel_projects (id) ON DELETE CASCADE,
  -- ===========================================
  -- Section 1: Ideal Customer & Core Problem
  -- ===========================================
  section1_context TEXT, -- User's freeform input for this section
  ideal_customer TEXT,
  transformation TEXT,
  perceived_problem TEXT,
  root_cause TEXT,
  daily_pain_points TEXT,
  secret_desires TEXT,
  common_mistakes TEXT,
  limiting_beliefs TEXT,
  empowering_truths TEXT,
  -- ===========================================
  -- Section 2: Story & Signature Method
  -- ===========================================
  section2_context TEXT,
  struggle_story TEXT,
  breakthrough_moment TEXT,
  life_now TEXT,
  credibility_experience TEXT,
  signature_method TEXT,
  -- ===========================================
  -- Section 3: Offer & Proof
  -- ===========================================
  section3_context TEXT,
  offer_name TEXT,
  offer_type TEXT, -- group, 1:1, hybrid, SaaS, service, etc.
  deliverables TEXT,
  delivery_process TEXT,
  problem_solved TEXT,
  promise_outcome TEXT,
  pricing JSONB DEFAULT '{"regular": null, "webinar": null}', -- {regular: number, webinar: number}
  guarantee TEXT,
  testimonials TEXT,
  bonuses TEXT,
  -- ===========================================
  -- Section 4: Teaching Content (Belief Shifts)
  -- ===========================================
  section4_context TEXT,
  -- Vehicle Belief Shift (Old Model → New Model)
  vehicle_belief_shift JSONB DEFAULT '{
    "outdated_model": null,
    "model_flaws": null,
    "proof_data": null,
    "new_model": null,
    "key_insights": [],
    "quick_win": null,
    "myths_to_bust": null,
    "success_story": null
  }',
  -- Internal Belief Shift (Self-Doubt → Self-Belief)
  internal_belief_shift JSONB DEFAULT '{
    "limiting_belief": null,
    "perceived_lack": null,
    "fear_of_failure": null,
    "mindset_reframes": [],
    "micro_action": null,
    "beginner_success_proof": null,
    "success_story": null
  }',
  -- External Belief Shift (Resources → Resourcefulness)
  external_belief_shift JSONB DEFAULT '{
    "external_obstacles": null,
    "success_evidence": null,
    "tools_shortcuts": null,
    "fastest_path": null,
    "success_story": null,
    "resource_myths": null
  }',
  poll_questions TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- ===========================================
  -- Section 5: CTA & Objections
  -- ===========================================
  section5_context TEXT,
  call_to_action TEXT,
  incentive TEXT, -- deadline, discount, bonus, scholarship
  pricing_disclosure TEXT, -- 'masterclass', 'call_only', 'application'
  path_options TEXT, -- single path or multiple options
  top_objections JSONB DEFAULT '[]', -- Array of {objection: string, response: string}
  -- ===========================================
  -- Metadata & Tracking
  -- ===========================================
  completion_status JSONB DEFAULT '{
    "section1": 0,
    "section2": 0,
    "section3": 0,
    "section4": 0,
    "section5": 0,
    "overall": 0
  }',
  source TEXT DEFAULT 'wizard', -- 'wizard', 'voice', 'gpt_paste', 'import'
  -- Track which fields were AI-generated vs manually entered
  ai_generated_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX idx_business_profiles_user ON public.business_profiles (user_id);

CREATE INDEX idx_business_profiles_funnel ON public.business_profiles (funnel_project_id);

CREATE INDEX idx_business_profiles_source ON public.business_profiles (source);

-- Unique constraint: one business profile per funnel project
CREATE UNIQUE INDEX idx_business_profiles_unique_project ON public.business_profiles (funnel_project_id)
WHERE
  funnel_project_id IS NOT NULL;

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own business profiles
CREATE POLICY "Users can view own business profiles" ON public.business_profiles FOR
SELECT
  USING (auth.uid () = user_id);

-- Users can create their own business profiles
CREATE POLICY "Users can create own business profiles" ON public.business_profiles FOR INSERT
WITH
  CHECK (auth.uid () = user_id);

-- Users can update their own business profiles
CREATE POLICY "Users can update own business profiles" ON public.business_profiles
FOR UPDATE
  USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);

-- Users can delete their own business profiles
CREATE POLICY "Users can delete own business profiles" ON public.business_profiles FOR DELETE USING (auth.uid () = user_id);

-- ===========================================
-- TRIGGER: Auto-update updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION update_business_profiles_updated_at () RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_business_profiles_updated_at BEFORE
UPDATE ON public.business_profiles FOR EACH ROW
EXECUTE FUNCTION update_business_profiles_updated_at ();

COMMIT;
