-- ===========================================
-- AI Follow-Up Engine - Row Level Security
-- Migration: RLS policies and permissions
-- Created: 2025-01-26
-- GitHub Issue: #23 - Sub-Issue #1
-- ===========================================

BEGIN;

-- ===========================================
-- ENABLE ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE public.followup_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_intent_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_story_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_experiments ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- FOLLOWUP_AGENT_CONFIGS POLICIES
-- ===========================================

CREATE POLICY "Users can view own agent configs"
  ON public.followup_agent_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agent configs"
  ON public.followup_agent_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent configs"
  ON public.followup_agent_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agent configs"
  ON public.followup_agent_configs FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- FOLLOWUP_PROSPECTS POLICIES
-- ===========================================

CREATE POLICY "Users can view own prospects"
  ON public.followup_prospects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own prospects"
  ON public.followup_prospects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prospects"
  ON public.followup_prospects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prospects"
  ON public.followup_prospects FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage prospects for automation
CREATE POLICY "Service can manage prospects"
  ON public.followup_prospects FOR ALL
  USING (true);

-- ===========================================
-- FOLLOWUP_SEQUENCES POLICIES
-- ===========================================

CREATE POLICY "Users can view own sequences"
  ON public.followup_sequences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_agent_configs
      WHERE followup_agent_configs.id = followup_sequences.agent_config_id
      AND followup_agent_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own sequences"
  ON public.followup_sequences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.followup_agent_configs
      WHERE followup_agent_configs.id = agent_config_id
      AND followup_agent_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sequences"
  ON public.followup_sequences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_agent_configs
      WHERE followup_agent_configs.id = followup_sequences.agent_config_id
      AND followup_agent_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sequences"
  ON public.followup_sequences FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_agent_configs
      WHERE followup_agent_configs.id = followup_sequences.agent_config_id
      AND followup_agent_configs.user_id = auth.uid()
    )
  );

-- ===========================================
-- FOLLOWUP_MESSAGES POLICIES
-- ===========================================

CREATE POLICY "Users can view own messages"
  ON public.followup_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_sequences s
      JOIN public.followup_agent_configs c ON s.agent_config_id = c.id
      WHERE s.id = followup_messages.sequence_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own messages"
  ON public.followup_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.followup_sequences s
      JOIN public.followup_agent_configs c ON s.agent_config_id = c.id
      WHERE s.id = sequence_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages"
  ON public.followup_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_sequences s
      JOIN public.followup_agent_configs c ON s.agent_config_id = c.id
      WHERE s.id = followup_messages.sequence_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own messages"
  ON public.followup_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_sequences s
      JOIN public.followup_agent_configs c ON s.agent_config_id = c.id
      WHERE s.id = followup_messages.sequence_id
      AND c.user_id = auth.uid()
    )
  );

-- ===========================================
-- FOLLOWUP_DELIVERIES POLICIES
-- ===========================================

CREATE POLICY "Users can view own deliveries"
  ON public.followup_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_prospects
      WHERE followup_prospects.id = followup_deliveries.prospect_id
      AND followup_prospects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own deliveries"
  ON public.followup_deliveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.followup_prospects
      WHERE followup_prospects.id = prospect_id
      AND followup_prospects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own deliveries"
  ON public.followup_deliveries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_prospects
      WHERE followup_prospects.id = followup_deliveries.prospect_id
      AND followup_prospects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own deliveries"
  ON public.followup_deliveries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_prospects
      WHERE followup_prospects.id = followup_deliveries.prospect_id
      AND followup_prospects.user_id = auth.uid()
    )
  );

-- Service role can manage deliveries for automation
CREATE POLICY "Service can manage deliveries"
  ON public.followup_deliveries FOR ALL
  USING (true);

-- ===========================================
-- FOLLOWUP_EVENTS POLICIES
-- ===========================================

CREATE POLICY "Users can view own events"
  ON public.followup_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_prospects
      WHERE followup_prospects.id = followup_events.prospect_id
      AND followup_prospects.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert events"
  ON public.followup_events FOR INSERT
  WITH CHECK (true); -- Allow event tracking from automation

-- ===========================================
-- FOLLOWUP_INTENT_SCORES POLICIES
-- ===========================================

CREATE POLICY "Users can view own intent scores"
  ON public.followup_intent_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_prospects
      WHERE followup_prospects.id = followup_intent_scores.prospect_id
      AND followup_prospects.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert intent scores"
  ON public.followup_intent_scores FOR INSERT
  WITH CHECK (true); -- Allow score tracking from automation

-- ===========================================
-- FOLLOWUP_STORY_LIBRARY POLICIES
-- ===========================================

CREATE POLICY "Users can view own stories"
  ON public.followup_story_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own stories"
  ON public.followup_story_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories"
  ON public.followup_story_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
  ON public.followup_story_library FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- FOLLOWUP_EXPERIMENTS POLICIES
-- ===========================================

CREATE POLICY "Users can view own experiments"
  ON public.followup_experiments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_agent_configs
      WHERE followup_agent_configs.id = followup_experiments.agent_config_id
      AND followup_agent_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own experiments"
  ON public.followup_experiments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.followup_agent_configs
      WHERE followup_agent_configs.id = agent_config_id
      AND followup_agent_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own experiments"
  ON public.followup_experiments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_agent_configs
      WHERE followup_agent_configs.id = followup_experiments.agent_config_id
      AND followup_agent_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own experiments"
  ON public.followup_experiments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.followup_agent_configs
      WHERE followup_agent_configs.id = followup_experiments.agent_config_id
      AND followup_agent_configs.user_id = auth.uid()
    )
  );

-- Service role can manage experiments for automation
CREATE POLICY "Service can manage experiments"
  ON public.followup_experiments FOR ALL
  USING (true);

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON public.followup_agent_configs TO authenticated;
GRANT ALL ON public.followup_prospects TO authenticated;
GRANT ALL ON public.followup_sequences TO authenticated;
GRANT ALL ON public.followup_messages TO authenticated;
GRANT ALL ON public.followup_deliveries TO authenticated;
GRANT ALL ON public.followup_events TO authenticated;
GRANT ALL ON public.followup_intent_scores TO authenticated;
GRANT ALL ON public.followup_story_library TO authenticated;
GRANT ALL ON public.followup_experiments TO authenticated;

-- Grant permissions on custom types
GRANT USAGE ON TYPE public.followup_segment TO authenticated;
GRANT USAGE ON TYPE public.followup_consent_state TO authenticated;
GRANT USAGE ON TYPE public.followup_channel TO authenticated;
GRANT USAGE ON TYPE public.followup_delivery_status TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.calculate_intent_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.determine_segment TO authenticated;
GRANT EXECUTE ON FUNCTION public.determine_engagement_level TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_next_touch_time TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_intent_score_change TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prospect_engagement_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sequence_performance TO authenticated;

COMMIT;

