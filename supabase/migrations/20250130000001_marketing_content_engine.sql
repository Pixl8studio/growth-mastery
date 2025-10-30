
-- ===========================================
-- Marketing Content Engine - Complete Schema
-- Migration: Comprehensive database structure for organic social content generation
-- Created: 2025-01-30
-- GitHub Issue: #39
-- ===========================================

BEGIN;

-- ===========================================
-- ENUMS AND TYPES
-- ===========================================

-- Social media platforms
CREATE TYPE public.marketing_platform AS ENUM (
  'instagram',
  'facebook',
  'linkedin',
  'twitter'
);

-- Content formats
CREATE TYPE public.marketing_format AS ENUM (
  'post',
  'carousel',
  'reel',
  'story',
  'article'
);

-- Story frameworks
CREATE TYPE public.marketing_story_framework AS ENUM (
  'founder_saga',
  'myth_buster',
  'philosophy_pov',
  'current_event',
  'how_to'
);

-- Publishing status
CREATE TYPE public.marketing_publish_status AS ENUM (
  'draft',
  'scheduled',
  'published',
  'failed',
  'archived'
);

-- Brief status
CREATE TYPE public.marketing_brief_status AS ENUM (
  'draft',
  'generating',
  'ready',
  'scheduled',
  'published'
);

-- ===========================================
-- TABLE: marketing_profiles
-- Brand voice and ProfileGraph (SSOT)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.marketing_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,

  -- Profile name
  name TEXT NOT NULL DEFAULT 'Main Profile',

  -- Brand voice (text guidelines)
  brand_voice TEXT,

  -- Tone settings for Echo Mode
  tone_settings JSONB DEFAULT '{
    "conversational_professional": 50,
    "warmth": 60,
    "urgency": 40,
    "empathy": 70,
    "confidence": 80
  }',

  -- Echo Mode configuration
  echo_mode_config JSONB DEFAULT '{
    "enabled": true,
    "voice_characteristics": [],
    "pacing": "moderate",
    "cadence": "balanced",
    "signature_phrases": []
  }',

  -- Story themes (preferred frameworks)
  story_themes TEXT[] DEFAULT ARRAY['founder_saga', 'myth_buster']::TEXT[],

  -- Visual preferences
  visual_preferences JSONB DEFAULT '{
    "brand_colors": [],
    "logo_url": null,
    "style_guide_url": null
  }',

  -- Business context (auto-populated from intake)
  business_context JSONB DEFAULT '{
    "business_name": "",
    "industry": "",
    "target_audience": "",
    "main_challenge": "",
    "desired_outcome": ""
  }',

  -- Product knowledge (auto-populated from offer)
  product_knowledge JSONB DEFAULT '{
    "product_name": "",
    "tagline": "",
    "promise": "",
    "features": [],
    "guarantee": ""
  }',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_calibrated_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_profiles_user ON public.marketing_profiles(user_id);
CREATE INDEX idx_marketing_profiles_funnel ON public.marketing_profiles(funnel_project_id);
CREATE INDEX idx_marketing_profiles_active ON public.marketing_profiles(is_active);

-- ===========================================
-- TABLE: marketing_platform_specs
-- Platform Knowledge Graph (PKG)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.marketing_platform_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Platform identification
  platform public.marketing_platform NOT NULL UNIQUE,

  -- Version tracking
  spec_version TEXT NOT NULL,

  -- Text constraints
  max_text_length INTEGER NOT NULL,
  max_hashtags INTEGER DEFAULT 30,

  -- Media specifications
  media_specs JSONB DEFAULT '{
    "image": {
      "max_size_mb": 10,
      "recommended_dimensions": "1080x1080",
      "formats": ["jpg", "png"]
    },
    "video": {
      "max_size_mb": 100,
      "max_duration_seconds": 60,
      "formats": ["mp4", "mov"]
    }
  }',

  -- Hashtag rules
  hashtag_rules JSONB DEFAULT '{
    "max_per_post": 30,
    "optimal_count": 10,
    "placement": "caption_or_comment"
  }',

  -- Best practices
  best_practices JSONB DEFAULT '{
    "optimal_post_length": 150,
    "cta_placement": "end",
    "link_handling": "bio_link"
  }',

  -- Accessibility requirements
  accessibility_requirements JSONB DEFAULT '{
    "alt_text_required": true,
    "caption_required": false,
    "max_reading_level": 8
  }',

  -- Timestamps
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_platform_specs_platform ON public.marketing_platform_specs(platform);

-- ===========================================
-- TABLE: marketing_content_briefs
-- Content generation requests
-- ===========================================

CREATE TABLE IF NOT EXISTS public.marketing_content_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  marketing_profile_id UUID REFERENCES public.marketing_profiles(id) ON DELETE SET NULL,

  -- Brief details
  name TEXT NOT NULL,
  goal TEXT NOT NULL, -- "drive_registrations", "build_awareness", "nurture_leads"

  -- Funnel integration
  funnel_entry_point TEXT DEFAULT 'step_1_registration', -- Which step to optimize for

  -- Content parameters
  topic TEXT NOT NULL,
  icp_description TEXT,
  tone_constraints TEXT,
  transformation_focus TEXT,

  -- Platform targeting
  target_platforms public.marketing_platform[] DEFAULT ARRAY['instagram', 'facebook', 'linkedin', 'twitter']::public.marketing_platform[],

  -- Story framework preference
  preferred_framework public.marketing_story_framework DEFAULT 'founder_saga',

  -- Generation configuration
  generation_config JSONB DEFAULT '{
    "generate_variants": true,
    "variant_count": 3,
    "include_media_suggestions": true,
    "apply_echo_mode": true
  }',

  -- Status
  status public.marketing_brief_status DEFAULT 'draft',

  -- Space (sandbox vs production)
  space TEXT DEFAULT 'sandbox', -- 'sandbox' or 'production'

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_content_briefs_user ON public.marketing_content_briefs(user_id);
CREATE INDEX idx_marketing_content_briefs_funnel ON public.marketing_content_briefs(funnel_project_id);
CREATE INDEX idx_marketing_content_briefs_profile ON public.marketing_content_briefs(marketing_profile_id);
CREATE INDEX idx_marketing_content_briefs_status ON public.marketing_content_briefs(status);
CREATE INDEX idx_marketing_content_briefs_space ON public.marketing_content_briefs(space);

-- ===========================================
-- TABLE: marketing_post_variants
-- Generated content per platform
-- ===========================================

CREATE TABLE IF NOT EXISTS public.marketing_post_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_brief_id UUID NOT NULL REFERENCES public.marketing_content_briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Platform and format
  platform public.marketing_platform NOT NULL,
  format_type public.marketing_format DEFAULT 'post',

  -- Content
  copy_text TEXT NOT NULL,

  -- Media (URLs to user uploads or AI-generated images)
  media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  alt_text TEXT, -- Required for accessibility

  -- Hashtags and captions
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  caption TEXT,

  -- CTA configuration
  cta_config JSONB DEFAULT '{
    "text": "Learn More",
    "type": "bio_link",
    "url": null,
    "dm_keyword": null,
    "comment_trigger": null
  }',

  -- Link strategy
  link_strategy JSONB DEFAULT '{
    "primary_url": null,
    "utm_parameters": {
      "utm_source": "social",
      "utm_medium": "organic",
      "utm_campaign": "",
      "utm_content": ""
    },
    "tracking_enabled": true
  }',

  -- Story framework used
  story_framework public.marketing_story_framework,
  story_angle TEXT, -- "Founder", "Myth-Buster", "Industry POV"

  -- Approval workflow
  approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approval_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  -- Preflight validation results
  preflight_status JSONB DEFAULT '{
    "passed": false,
    "compliance_check": "pending",
    "accessibility_check": "pending",
    "brand_voice_check": "pending",
    "character_limit_check": "pending",
    "issues": []
  }',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_post_variants_brief ON public.marketing_post_variants(content_brief_id);
CREATE INDEX idx_marketing_post_variants_user ON public.marketing_post_variants(user_id);
CREATE INDEX idx_marketing_post_variants_platform ON public.marketing_post_variants(platform);
CREATE INDEX idx_marketing_post_variants_approval ON public.marketing_post_variants(approval_status);

-- ===========================================
-- TABLE: marketing_content_calendar
-- Scheduling and organization
-- ===========================================

CREATE TABLE IF NOT EXISTS public.marketing_content_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_variant_id UUID NOT NULL REFERENCES public.marketing_post_variants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Scheduling
  scheduled_publish_at TIMESTAMPTZ NOT NULL,
  actual_published_at TIMESTAMPTZ,

  -- Publishing status
  publish_status public.marketing_publish_status DEFAULT 'draft',

  -- Platform-specific post ID (after publishing)
  provider_post_id TEXT,

  -- Space
  space TEXT DEFAULT 'sandbox', -- 'sandbox' or 'production'

  -- Auto-retry configuration
  retry_config JSONB DEFAULT '{
    "enabled": true,
    "max_attempts": 3,
    "attempt_count": 0,
    "last_error": null
  }',

  -- Publishing notes
  publish_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_content_calendar_variant ON public.marketing_content_calendar(post_variant_id);
CREATE INDEX idx_marketing_content_calendar_user ON public.marketing_content_calendar(user_id);
CREATE INDEX idx_marketing_content_calendar_scheduled ON public.marketing_content_calendar(scheduled_publish_at);
CREATE INDEX idx_marketing_content_calendar_status ON public.marketing_content_calendar(publish_status);
CREATE INDEX idx_marketing_content_calendar_space ON public.marketing_content_calendar(space);

-- ===========================================
-- TABLE: marketing_trend_signals
-- Trend Scanner data
-- ===========================================

CREATE TABLE IF NOT EXISTS public.marketing_trend_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Trend details
  topic TEXT NOT NULL,
  source TEXT NOT NULL, -- Whitelisted source URL or name

  -- Relevance scoring
  relevance_score INTEGER DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),

  -- Niche matching
  matched_niches TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Suggested angles
  suggested_angles JSONB DEFAULT '{
    "founder_perspective": "",
    "myth_buster": "",
    "industry_pov": ""
  }',

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'used', 'dismissed'
  dismissed_by UUID REFERENCES auth.users(id),
  dismissed_at TIMESTAMPTZ,

  -- Usage tracking
  times_used INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Trends are time-sensitive
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_trend_signals_user ON public.marketing_trend_signals(user_id);
CREATE INDEX idx_marketing_trend_signals_relevance ON public.marketing_trend_signals(relevance_score);
CREATE INDEX idx_marketing_trend_signals_status ON public.marketing_trend_signals(status);
CREATE INDEX idx_marketing_trend_signals_discovered ON public.marketing_trend_signals(discovered_at);

-- ===========================================
-- TABLE: marketing_niche_models
-- Niche Conversion Model (NCM)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.marketing_niche_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Niche identification
  niche TEXT NOT NULL,

  -- Best performing formats
  best_formats JSONB DEFAULT '{
    "post": {"conversion_rate": 0, "sample_size": 0},
    "carousel": {"conversion_rate": 0, "sample_size": 0},
    "reel": {"conversion_rate": 0, "sample_size": 0},
    "story": {"conversion_rate": 0, "sample_size": 0},
    "article": {"conversion_rate": 0, "sample_size": 0}
  }',

  -- Best times to post per platform
  best_times JSONB DEFAULT '{
    "instagram": [],
    "facebook": [],
    "linkedin": [],
    "twitter": []
  }',

  -- Conversion rates by story framework
  conversion_rates JSONB DEFAULT '{
    "founder_saga": 0,
    "myth_buster": 0,
    "philosophy_pov": 0,
    "current_event": 0,
    "how_to": 0
  }',

  -- Platform-specific insights
  platform_insights JSONB DEFAULT '{
    "instagram": {},
    "facebook": {},
    "linkedin": {},
    "twitter": {}
  }',

  -- Bandit allocation (70/30 split)
  bandit_allocation JSONB DEFAULT '{
    "top_performers": [],
    "experiments": [],
    "top_percentage": 70,
    "experiment_percentage": 30
  }',

  -- Learning metrics
  total_posts INTEGER DEFAULT 0,
  total_opt_ins INTEGER DEFAULT 0,
  overall_oi_1000 DECIMAL(10,2) DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  last_trained_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, niche)
);

CREATE INDEX idx_marketing_niche_models_user ON public.marketing_niche_models(user_id);
CREATE INDEX idx_marketing_niche_models_niche ON public.marketing_niche_models(niche);
CREATE INDEX idx_marketing_niche_models_trained ON public.marketing_niche_models(last_trained_at);

-- ===========================================
-- TABLE: marketing_analytics
-- Performance tracking
-- ===========================================

CREATE TABLE IF NOT EXISTS public.marketing_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_variant_id UUID NOT NULL REFERENCES public.marketing_post_variants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Engagement metrics
  impressions INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,

  -- Advanced metrics
  dm_triggers INTEGER DEFAULT 0, -- DMs received after post
  watch_through_pct DECIMAL(5,2) DEFAULT 0, -- For video content

  -- Conversion tracking
  opt_ins INTEGER DEFAULT 0,
  time_to_opt_in INTEGER[], -- Array of minutes from post to opt-in

  -- North-star metric: Opt-ins per 1,000 impressions
  oi_1000 DECIMAL(10,2) DEFAULT 0,

  -- Click tracking
  link_clicks INTEGER DEFAULT 0,
  cta_clicks INTEGER DEFAULT 0,

  -- Revenue attribution (if applicable)
  attributed_revenue DECIMAL(10,2) DEFAULT 0,

  -- Platform-specific metrics
  platform_metrics JSONB DEFAULT '{}',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_analytics_variant ON public.marketing_analytics(post_variant_id);
CREATE INDEX idx_marketing_analytics_user ON public.marketing_analytics(user_id);
CREATE INDEX idx_marketing_analytics_oi_1000 ON public.marketing_analytics(oi_1000);
CREATE INDEX idx_marketing_analytics_opt_ins ON public.marketing_analytics(opt_ins);

-- ===========================================
-- TABLE: marketing_experiments
-- A/B testing and experimentation
-- ===========================================

CREATE TABLE IF NOT EXISTS public.marketing_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_brief_id UUID REFERENCES public.marketing_content_briefs(id) ON DELETE CASCADE,

  -- Experiment details
  name TEXT NOT NULL,
  hypothesis TEXT,
  experiment_type TEXT NOT NULL, -- 'story_framework', 'cta_variant', 'timing', 'platform'

  -- Variant post IDs
  variant_post_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Traffic allocation
  traffic_split JSONB DEFAULT '{
    "control": 50,
    "variant_a": 50
  }',

  -- Results
  results JSONB DEFAULT '{
    "control": {
      "impressions": 0,
      "opt_ins": 0,
      "oi_1000": 0
    },
    "variant_a": {
      "impressions": 0,
      "opt_ins": 0,
      "oi_1000": 0
    }
  }',

  -- Statistical significance
  confidence_level DECIMAL(5,2),
  is_significant BOOLEAN DEFAULT false,
  winner_variant TEXT,

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'running', 'completed', 'paused'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Auto-scaling configuration
  auto_scale_config JSONB DEFAULT '{
    "enabled": true,
    "scale_winners": true,
    "pause_losers": true,
    "min_sample_size": 100
  }',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_experiments_user ON public.marketing_experiments(user_id);
CREATE INDEX idx_marketing_experiments_brief ON public.marketing_experiments(content_brief_id);
CREATE INDEX idx_marketing_experiments_status ON public.marketing_experiments(status);
CREATE INDEX idx_marketing_experiments_type ON public.marketing_experiments(experiment_type);

-- ===========================================
-- SEED DATA: Platform Specifications
-- ===========================================

-- Instagram specs
INSERT INTO public.marketing_platform_specs (
  platform,
  spec_version,
  max_text_length,
  max_hashtags,
  media_specs,
  hashtag_rules,
  best_practices,
  accessibility_requirements
) VALUES (
  'instagram',
  '1.0.0',
  2200,
  30,
  '{
    "image": {
      "max_size_mb": 10,
      "recommended_dimensions": "1080x1080",
      "formats": ["jpg", "png"]
    },
    "video": {
      "max_size_mb": 100,
      "max_duration_seconds": 60,
      "formats": ["mp4"]
    }
  }',
  '{
    "max_per_post": 30,
    "optimal_count": 10,
    "placement": "caption"
  }',
  '{
    "optimal_post_length": 150,
    "cta_placement": "end",
    "link_handling": "bio_link"
  }',
  '{
    "alt_text_required": true,
    "caption_required": false,
    "max_reading_level": 8
  }'
) ON CONFLICT (platform) DO NOTHING;

-- Facebook specs
INSERT INTO public.marketing_platform_specs (
  platform,
  spec_version,
  max_text_length,
  max_hashtags
) VALUES (
  'facebook',
  '1.0.0',
  63206,
  30
) ON CONFLICT (platform) DO NOTHING;

-- LinkedIn specs
INSERT INTO public.marketing_platform_specs (
  platform,
  spec_version,
  max_text_length,
  max_hashtags
) VALUES (
  'linkedin',
  '1.0.0',
  3000,
  3
) ON CONFLICT (platform) DO NOTHING;

-- Twitter specs
INSERT INTO public.marketing_platform_specs (
  platform,
  spec_version,
  max_text_length,
  max_hashtags
) VALUES (
  'twitter',
  '1.0.0',
  280,
  10
) ON CONFLICT (platform) DO NOTHING;

COMMIT;

