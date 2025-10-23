-- ===========================================
-- Genie AI - Contacts, Analytics & Webhooks
-- Migration: Contact management, analytics, and webhook tracking
-- Created: 2025-01-23
-- ===========================================

BEGIN;

-- ===========================================
-- CONTACTS (CRM)
-- ===========================================

-- Main contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE SET NULL,
  
  -- Contact info
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  
  -- Funnel tracking
  registration_page_id UUID REFERENCES public.registration_pages(id),
  watch_page_id UUID REFERENCES public.watch_pages(id),
  enrollment_page_id UUID REFERENCES public.enrollment_pages(id),
  
  -- Progression tracking
  current_stage TEXT NOT NULL DEFAULT 'registered', -- registered, watched, enrolled, purchased
  stages_completed JSONB DEFAULT '[]',
  
  -- Video engagement
  video_watch_percentage INTEGER DEFAULT 0, -- 0-100
  video_watch_duration INTEGER, -- seconds watched
  video_watched_at TIMESTAMPTZ,
  video_completion_events JSONB DEFAULT '[]', -- [25, 50, 75, 100]
  replay_count INTEGER DEFAULT 0,
  
  -- Engagement metadata
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  total_page_views INTEGER DEFAULT 1,
  visitor_id TEXT,
  
  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  
  -- Technical
  user_agent TEXT,
  ip_address INET,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  tags JSONB DEFAULT '[]',
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, email, funnel_project_id)
);

CREATE INDEX idx_contacts_user ON public.contacts(user_id);
CREATE INDEX idx_contacts_funnel ON public.contacts(funnel_project_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_stage ON public.contacts(current_stage);
CREATE INDEX idx_contacts_created ON public.contacts(created_at);
CREATE INDEX idx_contacts_last_activity ON public.contacts(last_activity_at);
CREATE INDEX idx_contacts_visitor ON public.contacts(visitor_id);

-- Contact events (detailed activity tracking)
CREATE TABLE IF NOT EXISTS public.contact_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE SET NULL,
  
  -- Event details
  event_type TEXT NOT NULL, -- page_view, video_start, video_progress, video_complete, cta_click, form_submit
  page_type TEXT, -- registration, watch, enrollment
  page_id UUID,
  
  -- Event data
  event_data JSONB DEFAULT '{}',
  
  -- Context
  session_id TEXT,
  visitor_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_events_contact ON public.contact_events(contact_id);
CREATE INDEX idx_contact_events_type ON public.contact_events(event_type);
CREATE INDEX idx_contact_events_page_type ON public.contact_events(page_type);
CREATE INDEX idx_contact_events_created ON public.contact_events(created_at);
CREATE INDEX idx_contact_events_session ON public.contact_events(session_id);

-- ===========================================
-- ANALYTICS
-- ===========================================

-- Funnel analytics events
CREATE TABLE IF NOT EXISTS public.funnel_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Event details
  event_type TEXT NOT NULL, -- page_view, video_play, video_progress, cta_click, form_submit, purchase
  page_type TEXT, -- registration, watch, enrollment
  page_id UUID,
  
  -- Visitor tracking
  visitor_id TEXT,
  session_id TEXT,
  
  -- Event data
  event_data JSONB DEFAULT '{}',
  
  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  
  -- Technical
  user_agent TEXT,
  ip_address INET,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_project ON public.funnel_analytics(funnel_project_id);
CREATE INDEX idx_analytics_user ON public.funnel_analytics(user_id);
CREATE INDEX idx_analytics_event_type ON public.funnel_analytics(event_type);
CREATE INDEX idx_analytics_page_type ON public.funnel_analytics(page_type);
CREATE INDEX idx_analytics_visitor ON public.funnel_analytics(visitor_id);
CREATE INDEX idx_analytics_session ON public.funnel_analytics(session_id);
CREATE INDEX idx_analytics_created ON public.funnel_analytics(created_at);

-- ===========================================
-- WEBHOOK TRACKING
-- ===========================================

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL, -- registration.submitted, video.watched, enrollment.viewed, etc.
  payload JSONB NOT NULL,
  
  -- Webhook details
  webhook_url TEXT NOT NULL,
  
  -- Response
  status_code INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Timestamps
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_user ON public.webhook_logs(user_id);
CREATE INDEX idx_webhook_logs_success ON public.webhook_logs(success);
CREATE INDEX idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_created ON public.webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_retry ON public.webhook_logs(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- ===========================================
-- STRIPE / PAYMENT TRACKING
-- ===========================================

-- Payment transactions
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funnel_project_id UUID REFERENCES public.funnel_projects(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  
  -- Stripe details
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_customer_id TEXT,
  
  -- Transaction details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL, -- pending, succeeded, failed, refunded
  
  -- Platform fee (our cut)
  platform_fee_amount DECIMAL(10,2),
  platform_fee_percent DECIMAL(5,2),
  
  -- Seller payout
  seller_amount DECIMAL(10,2),
  seller_stripe_account_id TEXT,
  payout_status TEXT DEFAULT 'pending', -- pending, paid, failed
  payout_date TIMESTAMPTZ,
  
  -- Customer info
  customer_email TEXT,
  customer_name TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX idx_transactions_project ON public.payment_transactions(funnel_project_id);
CREATE INDEX idx_transactions_offer ON public.payment_transactions(offer_id);
CREATE INDEX idx_transactions_contact ON public.payment_transactions(contact_id);
CREATE INDEX idx_transactions_stripe_pi ON public.payment_transactions(stripe_payment_intent_id);
CREATE INDEX idx_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_transactions_payout_status ON public.payment_transactions(payout_status);
CREATE INDEX idx_transactions_seller ON public.payment_transactions(seller_stripe_account_id);

-- Stripe Connect accounts
CREATE TABLE IF NOT EXISTS public.stripe_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe details
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_type TEXT, -- standard, express, custom
  
  -- Capabilities
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  
  -- Account info
  business_name TEXT,
  business_type TEXT,
  country TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stripe_accounts_user ON public.stripe_accounts(user_id);
CREATE INDEX idx_stripe_accounts_stripe_id ON public.stripe_accounts(stripe_account_id);

COMMIT;
