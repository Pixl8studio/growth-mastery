-- ===========================================
-- AI Follow-Up Engine - Core Schema
-- Migration: Complete database structure for AI-powered post-webinar follow-up
-- Created: 2025-01-26
-- GitHub Issue: #23 - Sub-Issue #1
-- ===========================================

BEGIN;

-- ===========================================
-- ENUMS AND TYPES
-- ===========================================

-- Prospect segmentation categories
CREATE TYPE public.followup_segment AS ENUM (
  'no_show',      -- Registered but didn't watch (0%)
  'skimmer',      -- Watched <25%
  'sampler',      -- Watched 25-49%
  'engaged',      -- Watched 50-89%
  'hot'           -- Watched 90%+
);

-- Consent states for compliance
CREATE TYPE public.followup_consent_state AS ENUM (
  'opt_in',       -- Explicitly opted in
  'implied',      -- Registered, implied consent
  'opted_out',    -- Unsubscribed
  'bounced',      -- Email bounced
  'complained'    -- Spam complaint
);

-- Message channels
CREATE TYPE public.followup_channel AS ENUM (
  'email',
  'sms'
);

-- Message delivery statuses
CREATE TYPE public.followup_delivery_status AS ENUM (
  'pending',      -- Scheduled, not sent yet
  'sent',         -- Successfully sent
  'delivered',    -- Confirmed delivery
  'opened',       -- Email opened
  'clicked',      -- Link clicked
  'replied',      -- User replied
  'bounced',      -- Delivery failed
  'complained',   -- Marked as spam
  'failed'        -- Send failed
);

-- ===========================================
-- TABLE: followup_agent_configs
-- AI agent configuration and knowledge base
-- ===========================================

CREATE TABLE IF NOT EXISTS public.followup_agent_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  
  -- Configuration name
  name TEXT NOT NULL,
  description TEXT,
  
  -- Voice and tone settings
  voice_config JSONB DEFAULT '{
    "tone": "conversational",
    "personality": "helpful",
    "empathy_level": "moderate",
    "urgency_level": "gentle"
  }',
  
  -- Knowledge base
  knowledge_base JSONB DEFAULT '{
    "business_context": [],
    "product_details": [],
    "common_objections": [],
    "proof_elements": [],
    "testimonials": []
  }',
  
  -- Outcome goals
  outcome_goals JSONB DEFAULT '{
    "primary": "conversion",
    "secondary": ["engagement", "nurture"],
    "kpis": []
  }',
  
  -- Segmentation rules
  segmentation_rules JSONB DEFAULT '{
    "no_show": {"watch_pct": [0, 0], "touch_count": 2, "cadence_hours": [24, 48]},
    "skimmer": {"watch_pct": [1, 24], "touch_count": 3, "cadence_hours": [12, 24, 48]},
    "sampler": {"watch_pct": [25, 49], "touch_count": 4, "cadence_hours": [6, 24, 36, 60]},
    "engaged": {"watch_pct": [50, 89], "touch_count": 5, "cadence_hours": [3, 12, 24, 48, 72]},
    "hot": {"watch_pct": [90, 100], "touch_count": 5, "cadence_hours": [1, 6, 24, 48, 72]}
  }',
  
  -- Objection handling
  objection_handling JSONB DEFAULT '{
    "price_concern": {"reframe": "", "proof_story_id": null},
    "timing_concern": {"reframe": "", "proof_story_id": null},
    "need_justification": {"reframe": "", "proof_story_id": null},
    "competitive_concern": {"reframe": "", "proof_story_id": null}
  }',
  
  -- Scoring configuration
  scoring_config JSONB DEFAULT '{
    "intent_factors": {
      "watch_percentage": 40,
      "replay_count": 10,
      "cta_clicks": 20,
      "email_engagement": 15,
      "response_speed": 15
    },
    "fit_factors": {
      "business_match": 30,
      "budget_indication": 25,
      "authority_level": 25,
      "need_urgency": 20
    }
  }',
  
  -- CRM field mappings
  crm_field_mappings JSONB DEFAULT '{}',
  
  -- Multi-channel orchestration
  channel_config JSONB DEFAULT '{
    "email": {"enabled": true, "max_per_day": 2},
    "sms": {"enabled": false, "max_per_day": 1, "requires_high_intent": true}
  }',
  
  -- A/B test configuration
  ab_test_config JSONB DEFAULT '{
    "enabled": false,
    "variants": [],
    "split_percentage": 50
  }',
  
  -- Compliance settings
  compliance_config JSONB DEFAULT '{
    "auto_stop_on_reply": true,
    "max_touches_without_engagement": 5,
    "respect_timezone": true,
    "quiet_hours_start": "21:00",
    "quiet_hours_end": "08:00"
  }',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  automation_enabled BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followup_agent_configs_user ON public.followup_agent_configs(user_id);
CREATE INDEX idx_followup_agent_configs_funnel ON public.followup_agent_configs(funnel_project_id);
CREATE INDEX idx_followup_agent_configs_offer ON public.followup_agent_configs(offer_id);
CREATE INDEX idx_followup_agent_configs_active ON public.followup_agent_configs(is_active);

-- ===========================================
-- TABLE: followup_prospects
-- Prospect tracking and engagement data
-- ===========================================

CREATE TABLE IF NOT EXISTS public.followup_prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  agent_config_id UUID REFERENCES public.followup_agent_configs(id) ON DELETE SET NULL,
  
  -- Prospect details (denormalized for performance)
  email TEXT NOT NULL,
  first_name TEXT,
  phone TEXT,
  
  -- Webinar watch metrics
  watch_percentage INTEGER DEFAULT 0 CHECK (watch_percentage >= 0 AND watch_percentage <= 100),
  watch_duration_seconds INTEGER DEFAULT 0,
  last_watched_at TIMESTAMPTZ,
  replay_count INTEGER DEFAULT 0,
  
  -- Conversational intake data
  challenge_notes TEXT,
  goal_notes TEXT,
  objection_hints TEXT[],
  offer_clicks INTEGER DEFAULT 0,
  
  -- Segmentation
  segment public.followup_segment DEFAULT 'no_show',
  
  -- Scoring
  intent_score INTEGER DEFAULT 0 CHECK (intent_score >= 0 AND intent_score <= 100),
  fit_score INTEGER DEFAULT 0 CHECK (fit_score >= 0 AND fit_score <= 100),
  combined_score INTEGER DEFAULT 0 CHECK (combined_score >= 0 AND combined_score <= 100),
  
  -- Engagement level (derived from scores)
  engagement_level TEXT DEFAULT 'cold', -- cold, warm, hot
  
  -- Localization
  timezone TEXT DEFAULT 'UTC',
  locale TEXT DEFAULT 'en-US',
  
  -- Consent and compliance
  consent_state public.followup_consent_state DEFAULT 'implied',
  consent_timestamp TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  opt_out_reason TEXT,
  
  -- Follow-up tracking
  total_touches INTEGER DEFAULT 0,
  last_touch_at TIMESTAMPTZ,
  next_scheduled_touch TIMESTAMPTZ,
  
  -- Conversion tracking
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  conversion_value DECIMAL(10,2),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followup_prospects_user ON public.followup_prospects(user_id);
CREATE INDEX idx_followup_prospects_funnel ON public.followup_prospects(funnel_project_id);
CREATE INDEX idx_followup_prospects_contact ON public.followup_prospects(contact_id);
CREATE INDEX idx_followup_prospects_agent_config ON public.followup_prospects(agent_config_id);
CREATE INDEX idx_followup_prospects_email ON public.followup_prospects(email);
CREATE INDEX idx_followup_prospects_segment ON public.followup_prospects(segment);
CREATE INDEX idx_followup_prospects_watch_pct ON public.followup_prospects(watch_percentage);
CREATE INDEX idx_followup_prospects_intent_score ON public.followup_prospects(intent_score);
CREATE INDEX idx_followup_prospects_consent ON public.followup_prospects(consent_state);
CREATE INDEX idx_followup_prospects_next_touch ON public.followup_prospects(next_scheduled_touch) WHERE next_scheduled_touch IS NOT NULL;
CREATE INDEX idx_followup_prospects_converted ON public.followup_prospects(converted);

-- ===========================================
-- TABLE: followup_sequences
-- Message sequence definitions
-- ===========================================

CREATE TABLE IF NOT EXISTS public.followup_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_config_id UUID NOT NULL REFERENCES public.followup_agent_configs(id) ON DELETE CASCADE,
  
  -- Sequence details
  name TEXT NOT NULL,
  description TEXT,
  sequence_type TEXT DEFAULT '3_day_discount', -- 3_day_discount, nurture, reengagement
  
  -- Triggering
  trigger_event TEXT NOT NULL, -- webinar_end, registration, specific_engagement
  trigger_delay_hours INTEGER DEFAULT 0,
  
  -- Timing
  deadline_hours INTEGER DEFAULT 72, -- Hours from trigger (3 days = 72)
  total_messages INTEGER DEFAULT 5,
  
  -- Targeting
  target_segments public.followup_segment[] DEFAULT ARRAY['no_show', 'skimmer', 'sampler', 'engaged', 'hot']::public.followup_segment[],
  min_intent_score INTEGER DEFAULT 0,
  max_intent_score INTEGER DEFAULT 100,
  
  -- Branching logic
  branching_rules JSONB DEFAULT '{
    "high_engagement_branch": {"condition": "intent_score > 70", "sequence_override": null},
    "conversion_branch": {"condition": "converted = true", "action": "stop"},
    "opt_out_branch": {"condition": "consent_state = opted_out", "action": "stop"}
  }',
  
  -- Stop conditions
  stop_on_reply BOOLEAN DEFAULT true,
  stop_on_conversion BOOLEAN DEFAULT true,
  stop_on_high_engagement BOOLEAN DEFAULT false,
  max_touches_without_engagement INTEGER DEFAULT 5,
  
  -- Automation
  requires_manual_approval BOOLEAN DEFAULT true,
  is_automated BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followup_sequences_agent_config ON public.followup_sequences(agent_config_id);
CREATE INDEX idx_followup_sequences_active ON public.followup_sequences(is_active);
CREATE INDEX idx_followup_sequences_type ON public.followup_sequences(sequence_type);

-- ===========================================
-- TABLE: followup_messages
-- Individual message templates
-- ===========================================

CREATE TABLE IF NOT EXISTS public.followup_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES public.followup_sequences(id) ON DELETE CASCADE,
  
  -- Message details
  name TEXT NOT NULL,
  message_order INTEGER NOT NULL, -- 1, 2, 3, 4, 5
  
  -- Channel
  channel public.followup_channel NOT NULL DEFAULT 'email',
  
  -- Timing (hours from sequence start)
  send_delay_hours INTEGER NOT NULL,
  
  -- Content (with tokens)
  subject_line TEXT, -- For email only
  body_content TEXT NOT NULL,
  
  -- Available tokens: {first_name}, {watch_pct}, {minutes}, {challenge_notes}, 
  -- {goal_notes}, {objection_hint}, {offer_click}, {timezone}, {replay_link}, {next_step}
  
  -- Personalization rules per segment
  personalization_rules JSONB DEFAULT '{
    "no_show": {"tone": "gentle_reminder", "cta": "watch_replay"},
    "skimmer": {"tone": "curiosity_building", "cta": "key_moments"},
    "sampler": {"tone": "value_reinforcement", "cta": "complete_watch"},
    "engaged": {"tone": "conversion_focused", "cta": "book_call"},
    "hot": {"tone": "urgency_driven", "cta": "claim_offer"}
  }',
  
  -- A/B test variants
  ab_test_variant TEXT, -- null, 'a', 'b', 'c'
  variant_weight INTEGER DEFAULT 100, -- Percentage of traffic
  
  -- Call to action
  primary_cta JSONB DEFAULT '{
    "text": "Take action",
    "url": "",
    "tracking_enabled": true
  }',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(sequence_id, message_order, ab_test_variant)
);

CREATE INDEX idx_followup_messages_sequence ON public.followup_messages(sequence_id);
CREATE INDEX idx_followup_messages_order ON public.followup_messages(message_order);
CREATE INDEX idx_followup_messages_channel ON public.followup_messages(channel);
CREATE INDEX idx_followup_messages_variant ON public.followup_messages(ab_test_variant);

-- ===========================================
-- TABLE: followup_deliveries
-- Actual message sends and tracking
-- ===========================================

CREATE TABLE IF NOT EXISTS public.followup_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES public.followup_prospects(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.followup_messages(id) ON DELETE CASCADE,
  
  -- Delivery details
  channel public.followup_channel NOT NULL,
  
  -- Personalized content (as actually sent)
  personalized_subject TEXT,
  personalized_body TEXT NOT NULL,
  personalized_cta JSONB,
  
  -- Scheduling
  scheduled_send_at TIMESTAMPTZ NOT NULL,
  actual_sent_at TIMESTAMPTZ,
  
  -- Status tracking
  delivery_status public.followup_delivery_status DEFAULT 'pending',
  
  -- Engagement tracking
  opened_at TIMESTAMPTZ,
  first_click_at TIMESTAMPTZ,
  total_clicks INTEGER DEFAULT 0,
  replied_at TIMESTAMPTZ,
  
  -- Delivery metadata
  email_provider_id TEXT, -- External ID from email service
  sms_provider_id TEXT, -- External ID from SMS service
  
  -- Error tracking
  bounce_type TEXT, -- hard, soft
  bounce_reason TEXT,
  error_message TEXT,
  
  -- A/B test tracking
  ab_test_variant TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followup_deliveries_prospect ON public.followup_deliveries(prospect_id);
CREATE INDEX idx_followup_deliveries_message ON public.followup_deliveries(message_id);
CREATE INDEX idx_followup_deliveries_status ON public.followup_deliveries(delivery_status);
CREATE INDEX idx_followup_deliveries_scheduled ON public.followup_deliveries(scheduled_send_at);
CREATE INDEX idx_followup_deliveries_sent ON public.followup_deliveries(actual_sent_at);
CREATE INDEX idx_followup_deliveries_channel ON public.followup_deliveries(channel);

-- ===========================================
-- TABLE: followup_events
-- Prospect engagement event stream
-- ===========================================

CREATE TABLE IF NOT EXISTS public.followup_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES public.followup_prospects(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES public.followup_deliveries(id) ON DELETE SET NULL,
  
  -- Event details
  event_type TEXT NOT NULL, -- email_open, link_click, reply, conversion, score_change, segment_change
  event_subtype TEXT, -- Specific action like "cta_click", "replay_click"
  
  -- Event data
  event_data JSONB DEFAULT '{}',
  
  -- Context
  user_agent TEXT,
  ip_address INET,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followup_events_prospect ON public.followup_events(prospect_id);
CREATE INDEX idx_followup_events_delivery ON public.followup_events(delivery_id);
CREATE INDEX idx_followup_events_type ON public.followup_events(event_type);
CREATE INDEX idx_followup_events_created ON public.followup_events(created_at);

-- ===========================================
-- TABLE: followup_intent_scores
-- Intent scoring history
-- ===========================================

CREATE TABLE IF NOT EXISTS public.followup_intent_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES public.followup_prospects(id) ON DELETE CASCADE,
  
  -- Score values
  intent_score INTEGER NOT NULL CHECK (intent_score >= 0 AND intent_score <= 100),
  fit_score INTEGER NOT NULL CHECK (fit_score >= 0 AND fit_score <= 100),
  combined_score INTEGER NOT NULL CHECK (combined_score >= 0 AND combined_score <= 100),
  
  -- Score breakdown (factors contributing to this score)
  score_factors JSONB NOT NULL DEFAULT '{
    "watch_percentage_contribution": 0,
    "replay_count_contribution": 0,
    "cta_clicks_contribution": 0,
    "email_engagement_contribution": 0,
    "response_speed_contribution": 0
  }',
  
  -- Reason for score change
  change_reason TEXT, -- "video_watched", "email_opened", "link_clicked", "replied"
  change_delta INTEGER, -- How much the score changed
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followup_intent_scores_prospect ON public.followup_intent_scores(prospect_id);
CREATE INDEX idx_followup_intent_scores_created ON public.followup_intent_scores(created_at);
CREATE INDEX idx_followup_intent_scores_combined ON public.followup_intent_scores(combined_score);

-- ===========================================
-- TABLE: followup_story_library
-- Proof/story content library
-- ===========================================

CREATE TABLE IF NOT EXISTS public.followup_story_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_config_id UUID REFERENCES public.followup_agent_configs(id) ON DELETE SET NULL,
  
  -- Story details
  title TEXT NOT NULL,
  story_type TEXT NOT NULL, -- micro_story, proof_element, testimonial, case_study
  
  -- Content
  content TEXT NOT NULL,
  
  -- Indexing dimensions
  objection_category TEXT NOT NULL, -- price_concern, timing_concern, need_justification, competitive_concern
  business_niche TEXT[], -- Array to support multiple niches
  price_band TEXT, -- low (0-1k), mid (1k-5k), high (5k+)
  
  -- Persona matching
  persona_match TEXT[], -- Array of persona descriptors
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  effectiveness_score DECIMAL(5,2), -- Based on conversion rates when used
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followup_story_library_user ON public.followup_story_library(user_id);
CREATE INDEX idx_followup_story_library_agent_config ON public.followup_story_library(agent_config_id);
CREATE INDEX idx_followup_story_library_objection ON public.followup_story_library(objection_category);
CREATE INDEX idx_followup_story_library_niche ON public.followup_story_library USING GIN(business_niche);
CREATE INDEX idx_followup_story_library_price_band ON public.followup_story_library(price_band);
CREATE INDEX idx_followup_story_library_type ON public.followup_story_library(story_type);

-- ===========================================
-- TABLE: followup_experiments
-- A/B testing and experimentation
-- ===========================================

CREATE TABLE IF NOT EXISTS public.followup_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_config_id UUID NOT NULL REFERENCES public.followup_agent_configs(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.followup_sequences(id) ON DELETE CASCADE,
  
  -- Experiment details
  name TEXT NOT NULL,
  hypothesis TEXT,
  experiment_type TEXT NOT NULL, -- subject_line, body_content, send_timing, cta_variant
  
  -- Variants
  variants JSONB NOT NULL DEFAULT '{
    "control": {"name": "Original", "config": {}},
    "variant_a": {"name": "Variant A", "config": {}},
    "variant_b": {"name": "Variant B", "config": {}}
  }',
  
  -- Traffic split
  traffic_split JSONB DEFAULT '{
    "control": 34,
    "variant_a": 33,
    "variant_b": 33
  }',
  
  -- Results tracking
  results JSONB DEFAULT '{
    "control": {"sends": 0, "opens": 0, "clicks": 0, "conversions": 0},
    "variant_a": {"sends": 0, "opens": 0, "clicks": 0, "conversions": 0},
    "variant_b": {"sends": 0, "opens": 0, "clicks": 0, "conversions": 0}
  }',
  
  -- Statistical significance
  confidence_level DECIMAL(5,2), -- 95.0, 99.0, etc.
  is_significant BOOLEAN DEFAULT false,
  winner_variant TEXT, -- control, variant_a, variant_b
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, running, completed, paused
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followup_experiments_agent_config ON public.followup_experiments(agent_config_id);
CREATE INDEX idx_followup_experiments_sequence ON public.followup_experiments(sequence_id);
CREATE INDEX idx_followup_experiments_status ON public.followup_experiments(status);
CREATE INDEX idx_followup_experiments_type ON public.followup_experiments(experiment_type);

COMMIT;

