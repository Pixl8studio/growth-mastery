-- ===========================================
-- User Settings and Support Interactions
-- Migration: Add user settings and support tracking
-- Created: 2025-01-29
-- ===========================================

BEGIN;

-- ===========================================
-- USER SETTINGS
-- ===========================================

-- User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Company/Business Settings
  company_name TEXT,
  support_email TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  
  -- Feature Toggles
  beta_followup_engine_enabled BOOLEAN DEFAULT false,
  beta_analytics_modules_enabled BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user ON public.user_settings(user_id);

-- ===========================================
-- SUPPORT INTERACTIONS
-- ===========================================

-- Support Interactions Table
CREATE TABLE IF NOT EXISTS public.support_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Interaction Details
  interaction_type TEXT NOT NULL,
  context_page TEXT,
  assistant_thread_id TEXT,
  
  -- Content
  initial_message TEXT,
  conversation_summary TEXT,
  resolved BOOLEAN DEFAULT false,
  satisfaction_rating INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_user ON public.support_interactions(user_id);
CREATE INDEX idx_support_type ON public.support_interactions(interaction_type);
CREATE INDEX idx_support_thread ON public.support_interactions(assistant_thread_id);
CREATE INDEX idx_support_created ON public.support_interactions(created_at);

-- ===========================================
-- RLS POLICIES
-- ===========================================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_interactions ENABLE ROW LEVEL SECURITY;

-- User Settings Policies
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Support Interactions Policies
CREATE POLICY "Users can view own support interactions"
  ON public.support_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own support interactions"
  ON public.support_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMIT;
