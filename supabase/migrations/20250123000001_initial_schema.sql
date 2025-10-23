-- ===========================================
-- Genie AI - Initial Database Schema
-- Migration: Complete database structure for funnel builder
-- Created: 2025-01-23
-- ===========================================

BEGIN;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- CORE USER TABLES
-- ===========================================

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  
  -- Settings & Integrations
  onboarding_completed BOOLEAN DEFAULT false,
  crm_webhook_url TEXT,
  webhook_enabled BOOLEAN DEFAULT false,
  webhook_secret TEXT,
  
  -- Stripe Connect
  stripe_account_id TEXT,
  stripe_account_type TEXT,
  stripe_charges_enabled BOOLEAN DEFAULT false,
  stripe_payouts_enabled BOOLEAN DEFAULT false,
  stripe_connected_at TIMESTAMPTZ,
  
  -- Preferences
  preferences JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast username lookups
CREATE INDEX idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX idx_user_profiles_stripe ON public.user_profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- ===========================================
-- FUNNEL PROJECT TABLES
-- ===========================================

-- Core funnel projects
CREATE TABLE IF NOT EXISTS public.funnel_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  
  -- Project details
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  target_audience TEXT,
  business_niche TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, active, archived
  current_step INTEGER DEFAULT 1,
  
  -- Configuration
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_funnel_projects_user ON public.funnel_projects(user_id);
CREATE INDEX idx_funnel_projects_status ON public.funnel_projects(status);
CREATE INDEX idx_funnel_projects_slug ON public.funnel_projects(user_id, slug);

-- ===========================================
-- STEP 1: VAPI TRANSCRIPTS
-- ===========================================

CREATE TABLE IF NOT EXISTS public.vapi_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Call details
  call_id TEXT,
  phone_number TEXT,
  
  -- Transcript data
  transcript_text TEXT,
  extracted_data JSONB,
  
  -- Call metrics
  call_duration INTEGER, -- seconds
  call_status TEXT, -- completed, failed, in_progress
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vapi_transcripts_project ON public.vapi_transcripts(funnel_project_id);
CREATE INDEX idx_vapi_transcripts_user ON public.vapi_transcripts(user_id);
CREATE INDEX idx_vapi_transcripts_call ON public.vapi_transcripts(call_id);

-- ===========================================
-- STEP 2: OFFERS
-- ===========================================

CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Offer details
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  
  -- Pricing
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  offer_type TEXT DEFAULT 'main', -- main, upsell, downsell
  
  -- Content
  features JSONB DEFAULT '[]',
  bonuses JSONB DEFAULT '[]',
  guarantee TEXT,
  
  -- Configuration
  settings JSONB DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_project ON public.offers(funnel_project_id);
CREATE INDEX idx_offers_user ON public.offers(user_id);

-- ===========================================
-- STEP 3: DECK STRUCTURES
-- ===========================================

CREATE TABLE IF NOT EXISTS public.deck_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Structure details
  template_type TEXT DEFAULT '55_slide_promo',
  total_slides INTEGER DEFAULT 55,
  
  -- Slide data
  slides JSONB NOT NULL,
  sections JSONB DEFAULT '{}',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deck_structures_project ON public.deck_structures(funnel_project_id);
CREATE INDEX idx_deck_structures_user ON public.deck_structures(user_id);

-- ===========================================
-- STEP 4: GAMMA DECKS
-- ===========================================

CREATE TABLE IF NOT EXISTS public.gamma_decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  deck_structure_id UUID REFERENCES public.deck_structures(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Gamma details
  gamma_session_id TEXT,
  theme_id TEXT,
  theme_name TEXT,
  
  -- URLs
  deck_url TEXT,
  edit_url TEXT,
  thumbnail_url TEXT,
  
  -- Status
  generation_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  
  -- Data
  deck_data JSONB DEFAULT '{}',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gamma_decks_project ON public.gamma_decks(funnel_project_id);
CREATE INDEX idx_gamma_decks_structure ON public.gamma_decks(deck_structure_id);
CREATE INDEX idx_gamma_decks_user ON public.gamma_decks(user_id);

-- ===========================================
-- STEP 5: ENROLLMENT PAGES
-- ===========================================

CREATE TABLE IF NOT EXISTS public.enrollment_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  
  -- Page type
  page_type TEXT DEFAULT 'direct_purchase', -- direct_purchase, book_call
  
  -- Vanity URL (optional)
  vanity_slug TEXT,
  
  -- Content
  headline TEXT NOT NULL,
  subheadline TEXT,
  content_sections JSONB DEFAULT '{}',
  
  -- CTA Configuration
  cta_config JSONB DEFAULT '{}',
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrollment_pages_project ON public.enrollment_pages(funnel_project_id);
CREATE INDEX idx_enrollment_pages_user ON public.enrollment_pages(user_id);
CREATE INDEX idx_enrollment_pages_vanity ON public.enrollment_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;
CREATE UNIQUE INDEX idx_enrollment_pages_vanity_unique ON public.enrollment_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;

-- ===========================================
-- STEP 6: TALK TRACKS
-- ===========================================

CREATE TABLE IF NOT EXISTS public.talk_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  deck_structure_id UUID REFERENCES public.deck_structures(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Script content
  content TEXT NOT NULL,
  slide_timings JSONB DEFAULT '[]',
  total_duration INTEGER, -- seconds
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_talk_tracks_project ON public.talk_tracks(funnel_project_id);
CREATE INDEX idx_talk_tracks_deck ON public.talk_tracks(deck_structure_id);
CREATE INDEX idx_talk_tracks_user ON public.talk_tracks(user_id);

-- ===========================================
-- STEP 7: PITCH VIDEOS
-- ===========================================

CREATE TABLE IF NOT EXISTS public.pitch_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  talk_track_id UUID REFERENCES public.talk_tracks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Video details
  video_url TEXT NOT NULL,
  video_provider TEXT DEFAULT 'cloudflare', -- cloudflare, youtube, vimeo
  video_id TEXT,
  
  -- Media info
  video_duration INTEGER, -- seconds
  thumbnail_url TEXT,
  file_size BIGINT, -- bytes
  
  -- Processing status
  processing_status TEXT DEFAULT 'uploaded', -- uploaded, processing, ready, failed
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pitch_videos_project ON public.pitch_videos(funnel_project_id);
CREATE INDEX idx_pitch_videos_talk_track ON public.pitch_videos(talk_track_id);
CREATE INDEX idx_pitch_videos_user ON public.pitch_videos(user_id);

-- ===========================================
-- STEP 8: WATCH PAGES
-- ===========================================

CREATE TABLE IF NOT EXISTS public.watch_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pitch_video_id UUID REFERENCES public.pitch_videos(id) ON DELETE SET NULL,
  
  -- Vanity URL (optional)
  vanity_slug TEXT,
  
  -- Content
  headline TEXT NOT NULL,
  subheadline TEXT,
  content_sections JSONB DEFAULT '{}',
  
  -- CTA Configuration
  cta_config JSONB DEFAULT '{}',
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_watch_pages_project ON public.watch_pages(funnel_project_id);
CREATE INDEX idx_watch_pages_user ON public.watch_pages(user_id);
CREATE INDEX idx_watch_pages_video ON public.watch_pages(pitch_video_id);
CREATE INDEX idx_watch_pages_vanity ON public.watch_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;
CREATE UNIQUE INDEX idx_watch_pages_vanity_unique ON public.watch_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;

-- ===========================================
-- STEP 9: REGISTRATION PAGES
-- ===========================================

CREATE TABLE IF NOT EXISTS public.registration_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Vanity URL (optional)
  vanity_slug TEXT,
  
  -- Content
  headline TEXT NOT NULL,
  subheadline TEXT,
  benefit_bullets JSONB DEFAULT '[]',
  trust_statement TEXT,
  
  -- Form Configuration
  form_fields JSONB DEFAULT '{}',
  
  -- CTA Configuration
  cta_config JSONB DEFAULT '{}',
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registration_pages_project ON public.registration_pages(funnel_project_id);
CREATE INDEX idx_registration_pages_user ON public.registration_pages(user_id);
CREATE INDEX idx_registration_pages_vanity ON public.registration_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;
CREATE UNIQUE INDEX idx_registration_pages_vanity_unique ON public.registration_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;

-- ===========================================
-- STEP 10: FUNNEL FLOWS
-- ===========================================

CREATE TABLE IF NOT EXISTS public.funnel_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Flow details
  flow_name TEXT NOT NULL,
  
  -- Page references
  registration_page_id UUID REFERENCES public.registration_pages(id),
  watch_page_id UUID REFERENCES public.watch_pages(id),
  enrollment_page_id UUID REFERENCES public.enrollment_pages(id),
  
  -- Configuration
  page_sequence JSONB DEFAULT '[]',
  routing_config JSONB DEFAULT '{}',
  ab_test_config JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funnel_flows_project ON public.funnel_flows(funnel_project_id);
CREATE INDEX idx_funnel_flows_user ON public.funnel_flows(user_id);
CREATE INDEX idx_funnel_flows_active ON public.funnel_flows(is_active);

COMMIT;
