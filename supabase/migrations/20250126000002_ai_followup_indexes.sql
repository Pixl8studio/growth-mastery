-- ===========================================
-- AI Follow-Up Engine - Performance Indexes
-- Migration: Additional indexes for query optimization
-- Created: 2025-01-26
-- GitHub Issue: #23 - Sub-Issue #1
-- ===========================================

BEGIN;

-- ===========================================
-- JSONB INDEXES for Frequently Queried Fields
-- ===========================================

-- Agent configs: Query by voice settings and segmentation rules
CREATE INDEX idx_followup_agent_configs_voice_tone 
  ON public.followup_agent_configs((voice_config->>'tone'));

CREATE INDEX idx_followup_agent_configs_automation 
  ON public.followup_agent_configs(automation_enabled, is_active);

-- Prospects: Query by metadata fields
CREATE INDEX idx_followup_prospects_metadata_gin 
  ON public.followup_prospects USING GIN(metadata);

-- Sequences: Query by branching rules
CREATE INDEX idx_followup_sequences_branching_gin 
  ON public.followup_sequences USING GIN(branching_rules);

CREATE INDEX idx_followup_sequences_target_segments_gin 
  ON public.followup_sequences USING GIN(target_segments);

-- Messages: Query by personalization rules
CREATE INDEX idx_followup_messages_personalization_gin 
  ON public.followup_messages USING GIN(personalization_rules);

-- Deliveries: Query by personalized CTA
CREATE INDEX idx_followup_deliveries_cta_gin 
  ON public.followup_deliveries USING GIN(personalized_cta);

-- Events: Query by event data
CREATE INDEX idx_followup_events_data_gin 
  ON public.followup_events USING GIN(event_data);

-- Intent scores: Query by score factors
CREATE INDEX idx_followup_intent_scores_factors_gin 
  ON public.followup_intent_scores USING GIN(score_factors);

-- ===========================================
-- COMPOSITE INDEXES for Common Query Patterns
-- ===========================================

-- Find prospects ready for next touch (scheduler query)
CREATE INDEX idx_followup_prospects_next_touch_composite 
  ON public.followup_prospects(next_scheduled_touch, consent_state, converted) 
  WHERE next_scheduled_touch IS NOT NULL 
    AND consent_state = 'opt_in' 
    AND converted = false;

-- Find high-value unconverted prospects
CREATE INDEX idx_followup_prospects_high_value 
  ON public.followup_prospects(combined_score DESC, converted) 
  WHERE converted = false AND consent_state IN ('opt_in', 'implied');

-- Find prospects by segment and engagement
CREATE INDEX idx_followup_prospects_segment_engagement 
  ON public.followup_prospects(segment, engagement_level, last_touch_at);

-- Find deliveries needing status updates
CREATE INDEX idx_followup_deliveries_status_updates 
  ON public.followup_deliveries(delivery_status, actual_sent_at) 
  WHERE delivery_status IN ('sent', 'delivered');

-- Find scheduled messages to send
CREATE INDEX idx_followup_deliveries_send_queue 
  ON public.followup_deliveries(scheduled_send_at, delivery_status) 
  WHERE delivery_status = 'pending';

-- Find recent events for a prospect
CREATE INDEX idx_followup_events_prospect_recent 
  ON public.followup_events(prospect_id, created_at DESC);

-- Find story library content by multiple dimensions
CREATE INDEX idx_followup_story_library_lookup 
  ON public.followup_story_library(objection_category, price_band, story_type);

-- ===========================================
-- PARTIAL INDEXES for Active Records
-- ===========================================

-- Only index active agent configs
CREATE INDEX idx_followup_agent_configs_active_funnel 
  ON public.followup_agent_configs(funnel_project_id, is_active) 
  WHERE is_active = true;

-- Only index automated sequences
CREATE INDEX idx_followup_sequences_automated 
  ON public.followup_sequences(agent_config_id, is_automated, is_active) 
  WHERE is_automated = true AND is_active = true;

-- Only index prospects with pending touches
CREATE INDEX idx_followup_prospects_pending_touches 
  ON public.followup_prospects(user_id, next_scheduled_touch) 
  WHERE next_scheduled_touch IS NOT NULL AND converted = false;

-- Only index running experiments
CREATE INDEX idx_followup_experiments_running 
  ON public.followup_experiments(agent_config_id, status) 
  WHERE status = 'running';

-- ===========================================
-- TEXT SEARCH INDEXES
-- ===========================================

-- Full-text search on story library content
CREATE INDEX idx_followup_story_library_content_search 
  ON public.followup_story_library USING GIN(to_tsvector('english', content));

CREATE INDEX idx_followup_story_library_title_search 
  ON public.followup_story_library USING GIN(to_tsvector('english', title));

-- Full-text search on message content
CREATE INDEX idx_followup_messages_body_search 
  ON public.followup_messages USING GIN(to_tsvector('english', body_content));

-- ===========================================
-- UNIQUE INDEXES for Data Integrity
-- ===========================================

-- Ensure one active config per funnel/offer combo
CREATE UNIQUE INDEX idx_followup_agent_configs_unique_active 
  ON public.followup_agent_configs(funnel_project_id, offer_id) 
  WHERE is_active = true AND offer_id IS NOT NULL;

-- Ensure unique prospect per contact/config combo
CREATE UNIQUE INDEX idx_followup_prospects_unique_contact_config 
  ON public.followup_prospects(contact_id, agent_config_id) 
  WHERE contact_id IS NOT NULL AND agent_config_id IS NOT NULL;

-- ===========================================
-- COVERING INDEXES for Query Performance
-- ===========================================

-- Covering index for prospect list queries
CREATE INDEX idx_followup_prospects_list_covering 
  ON public.followup_prospects(
    user_id, 
    funnel_project_id, 
    segment, 
    intent_score, 
    converted, 
    created_at DESC
  ) INCLUDE (email, first_name, watch_percentage, total_touches);

-- Covering index for delivery tracking queries
CREATE INDEX idx_followup_deliveries_tracking_covering 
  ON public.followup_deliveries(
    prospect_id, 
    created_at DESC
  ) INCLUDE (channel, delivery_status, opened_at, first_click_at);

COMMIT;

