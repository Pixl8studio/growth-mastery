-- ===========================================
-- Enhanced Funnel Pages - Database Schema
-- Migration: Add Confirmation, Call Booking, Checkout, Upsell, and Thank You pages
-- Created: 2026-01-09
-- Related: GitHub Issue #425 - Enhanced Funnel Pages Feature
-- ===========================================
BEGIN;

-- ===========================================
-- UPDATE AI EDITOR PAGES PAGE_TYPE CONSTRAINT
-- Add new page types to the existing constraint
-- ===========================================
ALTER TABLE public.ai_editor_pages DROP CONSTRAINT IF EXISTS ai_editor_pages_page_type_check;
ALTER TABLE public.ai_editor_pages ADD CONSTRAINT ai_editor_pages_page_type_check CHECK (
  page_type IN ('registration', 'watch', 'enrollment', 'confirmation', 'call_booking', 'checkout', 'upsell', 'thank_you')
);

COMMENT ON COLUMN public.ai_editor_pages.page_type IS 'Type of landing page: registration, confirmation, watch, enrollment, call_booking, checkout, upsell, or thank_you';

-- ===========================================
-- CONFIRMATION PAGES TABLE
-- For registration verification and event preparation
-- ===========================================
CREATE TABLE IF NOT EXISTS public.confirmation_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vanity URL (optional)
  vanity_slug TEXT,

  -- Content
  headline TEXT NOT NULL DEFAULT 'You''re Registered!',
  subheadline TEXT,
  content_sections JSONB DEFAULT '{}',

  -- Event details
  event_config JSONB DEFAULT '{}', -- { event_date, event_time, timezone, is_live_event }

  -- Calendar integration
  calendar_config JSONB DEFAULT '{}', -- { google_calendar_link, outlook_link, ical_link }

  -- Preparation content
  preparation_items JSONB DEFAULT '[]', -- Array of preparation checklist items

  -- CTA Configuration
  cta_config JSONB DEFAULT '{}',

  -- Status
  is_published BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_confirmation_pages_project ON public.confirmation_pages(funnel_project_id);
CREATE INDEX idx_confirmation_pages_user ON public.confirmation_pages(user_id);
CREATE INDEX idx_confirmation_pages_vanity ON public.confirmation_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;
CREATE UNIQUE INDEX idx_confirmation_pages_vanity_unique ON public.confirmation_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;

-- ===========================================
-- CALL BOOKING PAGES TABLE
-- For scheduling strategy calls with prospects
-- ===========================================
CREATE TABLE IF NOT EXISTS public.call_booking_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vanity URL (optional)
  vanity_slug TEXT,

  -- Content
  headline TEXT NOT NULL DEFAULT 'Book Your Strategy Call',
  subheadline TEXT,
  content_sections JSONB DEFAULT '{}',

  -- Availability configuration
  availability_config JSONB DEFAULT '{
    "days_available": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "time_slots": [],
    "timezone": "America/Los_Angeles",
    "call_duration_minutes": 30,
    "buffer_minutes": 15,
    "advance_booking_days": 14,
    "minimum_notice_hours": 24,
    "max_calls_per_day": 8
  }',

  -- Integration settings
  calendar_integration JSONB DEFAULT '{}', -- { google_calendar_id, sync_enabled }
  meeting_integration JSONB DEFAULT '{}', -- { provider: 'zoom'|'google_meet', auto_create_link }

  -- Qualification questions
  qualification_questions JSONB DEFAULT '[]', -- Array of { question, type, required, options }

  -- Confirmation settings
  confirmation_email_enabled BOOLEAN DEFAULT true,
  reminder_schedule JSONB DEFAULT '["24h", "1h"]', -- Array of reminder times before call

  -- CTA Configuration
  cta_config JSONB DEFAULT '{}',

  -- Status
  is_published BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_booking_pages_project ON public.call_booking_pages(funnel_project_id);
CREATE INDEX idx_call_booking_pages_user ON public.call_booking_pages(user_id);
CREATE INDEX idx_call_booking_pages_vanity ON public.call_booking_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;
CREATE UNIQUE INDEX idx_call_booking_pages_vanity_unique ON public.call_booking_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;

-- ===========================================
-- CALL BOOKINGS TABLE
-- Individual booking records
-- ===========================================
CREATE TABLE IF NOT EXISTS public.call_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_booking_page_id UUID NOT NULL REFERENCES public.call_booking_pages(id) ON DELETE CASCADE,
  funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- The funnel owner
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,

  -- Prospect information
  prospect_name TEXT NOT NULL,
  prospect_email TEXT NOT NULL,
  prospect_phone TEXT,

  -- Booking details
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  timezone TEXT NOT NULL,

  -- Meeting link
  meeting_url TEXT,
  meeting_provider TEXT, -- 'zoom', 'google_meet', 'manual'

  -- Qualification answers
  qualification_answers JSONB DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled')
  ),

  -- Outcome tracking
  outcome TEXT, -- 'qualified', 'not_qualified', 'follow_up', 'closed_won', 'closed_lost'
  notes TEXT,

  -- Reminder tracking
  reminders_sent JSONB DEFAULT '[]', -- Array of { sent_at, type }

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_bookings_page ON public.call_bookings(call_booking_page_id);
CREATE INDEX idx_call_bookings_project ON public.call_bookings(funnel_project_id);
CREATE INDEX idx_call_bookings_user ON public.call_bookings(user_id);
CREATE INDEX idx_call_bookings_contact ON public.call_bookings(contact_id);
CREATE INDEX idx_call_bookings_scheduled ON public.call_bookings(scheduled_at);
CREATE INDEX idx_call_bookings_status ON public.call_bookings(status);
CREATE INDEX idx_call_bookings_prospect_email ON public.call_bookings(prospect_email);

-- ===========================================
-- CHECKOUT PAGES TABLE
-- For processing purchases with Stripe
-- ===========================================
CREATE TABLE IF NOT EXISTS public.checkout_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,

  -- Vanity URL (optional)
  vanity_slug TEXT,

  -- Content
  headline TEXT NOT NULL DEFAULT 'Complete Your Order',
  subheadline TEXT,
  content_sections JSONB DEFAULT '{}',

  -- Order summary configuration
  order_summary_config JSONB DEFAULT '{}', -- { show_product_image, show_description }

  -- Order bump configuration
  order_bump_config JSONB DEFAULT '{}', -- { enabled, offer_id, headline, description, price }

  -- Payment configuration
  payment_config JSONB DEFAULT '{
    "accepted_methods": ["card"],
    "apple_pay_enabled": false,
    "google_pay_enabled": false,
    "klarna_enabled": false,
    "afterpay_enabled": false,
    "affirm_enabled": false
  }',

  -- Trust elements
  trust_elements JSONB DEFAULT '{
    "show_guarantee": true,
    "show_security_badges": true,
    "show_testimonial": false,
    "guarantee_text": null,
    "testimonial_id": null
  }',

  -- Redirect configuration
  success_redirect_url TEXT, -- Custom URL or null for default flow

  -- CTA Configuration
  cta_config JSONB DEFAULT '{}',

  -- Status
  is_published BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkout_pages_project ON public.checkout_pages(funnel_project_id);
CREATE INDEX idx_checkout_pages_user ON public.checkout_pages(user_id);
CREATE INDEX idx_checkout_pages_offer ON public.checkout_pages(offer_id);
CREATE INDEX idx_checkout_pages_vanity ON public.checkout_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;
CREATE UNIQUE INDEX idx_checkout_pages_vanity_unique ON public.checkout_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;

-- ===========================================
-- UPSELL PAGES TABLE
-- For post-purchase upgrade offers with one-click charging
-- ===========================================
CREATE TABLE IF NOT EXISTS public.upsell_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL, -- The upsell offer

  -- Vanity URL (optional)
  vanity_slug TEXT,

  -- Upsell sequence position
  upsell_number INTEGER NOT NULL DEFAULT 1 CHECK (upsell_number IN (1, 2)),

  -- Content
  headline TEXT NOT NULL DEFAULT 'Wait! Special One-Time Offer',
  subheadline TEXT,
  content_sections JSONB DEFAULT '{}',

  -- Offer presentation
  offer_presentation JSONB DEFAULT '{}', -- { benefits, value_stack, urgency_message }

  -- Pricing
  price_cents INTEGER NOT NULL DEFAULT 0,
  compare_at_price_cents INTEGER, -- Optional "was" price for anchoring

  -- Downsell configuration (for upsell 2)
  is_downsell BOOLEAN DEFAULT false, -- If true, only show when upsell 1 declined

  -- Button configuration
  accept_button_text TEXT DEFAULT 'Yes! Add This To My Order',
  decline_button_text TEXT DEFAULT 'No Thanks, Continue',

  -- Next step configuration
  accept_redirect_url TEXT, -- null means go to next upsell or thank you
  decline_redirect_url TEXT, -- null means go to next upsell or thank you

  -- CTA Configuration
  cta_config JSONB DEFAULT '{}',

  -- Status
  is_published BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upsell_pages_project ON public.upsell_pages(funnel_project_id);
CREATE INDEX idx_upsell_pages_user ON public.upsell_pages(user_id);
CREATE INDEX idx_upsell_pages_offer ON public.upsell_pages(offer_id);
CREATE INDEX idx_upsell_pages_number ON public.upsell_pages(funnel_project_id, upsell_number);
CREATE INDEX idx_upsell_pages_vanity ON public.upsell_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;
CREATE UNIQUE INDEX idx_upsell_pages_vanity_unique ON public.upsell_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;

-- ===========================================
-- THANK YOU PAGES TABLE
-- For purchase confirmation and access instructions
-- ===========================================
CREATE TABLE IF NOT EXISTS public.thank_you_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vanity URL (optional)
  vanity_slug TEXT,

  -- Content
  headline TEXT NOT NULL DEFAULT 'Welcome! Your Purchase is Complete',
  subheadline TEXT,
  content_sections JSONB DEFAULT '{}',

  -- Dynamic content blocks (show/hide based on purchase)
  content_blocks JSONB DEFAULT '{
    "core_offer": { "enabled": true, "access_instructions": null },
    "order_bump": { "enabled": true, "access_instructions": null },
    "upsell_1": { "enabled": true, "access_instructions": null },
    "upsell_2": { "enabled": true, "access_instructions": null }
  }',

  -- Order summary configuration
  show_order_summary BOOLEAN DEFAULT true,

  -- Next steps
  next_steps JSONB DEFAULT '[]', -- Array of { title, description, action_url }

  -- Community integration
  community_config JSONB DEFAULT '{}', -- { enabled, platform, invite_url, welcome_message }

  -- Social sharing
  social_sharing_config JSONB DEFAULT '{}', -- { enabled, message, platforms }

  -- CTA Configuration
  cta_config JSONB DEFAULT '{}',

  -- Status
  is_published BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_thank_you_pages_project ON public.thank_you_pages(funnel_project_id);
CREATE INDEX idx_thank_you_pages_user ON public.thank_you_pages(user_id);
CREATE INDEX idx_thank_you_pages_vanity ON public.thank_you_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;
CREATE UNIQUE INDEX idx_thank_you_pages_vanity_unique ON public.thank_you_pages(user_id, vanity_slug) WHERE vanity_slug IS NOT NULL;

-- ===========================================
-- ORDERS TABLE
-- Tracks all purchases through checkout pages
-- ===========================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- The funnel owner
  checkout_page_id UUID REFERENCES public.checkout_pages(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,

  -- Customer information
  customer_email TEXT NOT NULL,
  customer_name TEXT,

  -- Stripe identifiers
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,

  -- Payment method storage (for one-click upsells)
  stripe_payment_method_id TEXT,
  payment_method_stored BOOLEAN DEFAULT false,

  -- Order totals (in cents)
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,

  -- Currency
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded')
  ),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_project ON public.orders(funnel_project_id);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_checkout_page ON public.orders(checkout_page_id);
CREATE INDEX idx_orders_contact ON public.orders(contact_id);
CREATE INDEX idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX idx_orders_stripe_customer ON public.orders(stripe_customer_id);
CREATE INDEX idx_orders_stripe_session ON public.orders(stripe_checkout_session_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

-- ===========================================
-- ORDER ITEMS TABLE
-- Individual items within an order
-- ===========================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,

  -- Item type
  item_type TEXT NOT NULL CHECK (
    item_type IN ('core_offer', 'order_bump', 'upsell_1', 'upsell_2')
  ),

  -- Item details
  name TEXT NOT NULL,
  description TEXT,

  -- Pricing (in cents)
  price_cents INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Payment status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'refunded')
  ),

  -- Stripe identifiers (for upsells charged separately)
  stripe_payment_intent_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_offer ON public.order_items(offer_id);
CREATE INDEX idx_order_items_type ON public.order_items(item_type);
CREATE INDEX idx_order_items_status ON public.order_items(status);

-- ===========================================
-- STRIPE CONNECT ACCOUNTS TABLE
-- Track user's connected Stripe accounts
-- ===========================================
CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Stripe account details
  stripe_account_id TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'express'

  -- Account status
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,

  -- Onboarding
  onboarding_complete BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stripe_connect_user ON public.stripe_connect_accounts(user_id);
CREATE INDEX idx_stripe_connect_account ON public.stripe_connect_accounts(stripe_account_id);

-- ===========================================
-- TRIGGERS FOR UPDATED_AT
-- ===========================================
CREATE TRIGGER set_confirmation_pages_updated_at BEFORE UPDATE ON public.confirmation_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_call_booking_pages_updated_at BEFORE UPDATE ON public.call_booking_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_call_bookings_updated_at BEFORE UPDATE ON public.call_bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_checkout_pages_updated_at BEFORE UPDATE ON public.checkout_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_upsell_pages_updated_at BEFORE UPDATE ON public.upsell_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_thank_you_pages_updated_at BEFORE UPDATE ON public.thank_you_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_stripe_connect_accounts_updated_at BEFORE UPDATE ON public.stripe_connect_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all new tables
ALTER TABLE public.confirmation_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_booking_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thank_you_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- Confirmation Pages Policies
CREATE POLICY "Users can view their own confirmation pages" ON public.confirmation_pages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own confirmation pages" ON public.confirmation_pages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own confirmation pages" ON public.confirmation_pages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own confirmation pages" ON public.confirmation_pages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Call Booking Pages Policies
CREATE POLICY "Users can view their own call booking pages" ON public.call_booking_pages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own call booking pages" ON public.call_booking_pages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own call booking pages" ON public.call_booking_pages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own call booking pages" ON public.call_booking_pages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Call Bookings Policies
CREATE POLICY "Users can view their own call bookings" ON public.call_bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create call bookings for their pages" ON public.call_bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own call bookings" ON public.call_bookings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own call bookings" ON public.call_bookings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Allow anonymous booking creation for prospects
CREATE POLICY "Anyone can create call bookings" ON public.call_bookings
  FOR INSERT TO anon WITH CHECK (true);

-- Checkout Pages Policies
CREATE POLICY "Users can view their own checkout pages" ON public.checkout_pages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own checkout pages" ON public.checkout_pages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own checkout pages" ON public.checkout_pages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own checkout pages" ON public.checkout_pages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Upsell Pages Policies
CREATE POLICY "Users can view their own upsell pages" ON public.upsell_pages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own upsell pages" ON public.upsell_pages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own upsell pages" ON public.upsell_pages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own upsell pages" ON public.upsell_pages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Thank You Pages Policies
CREATE POLICY "Users can view their own thank you pages" ON public.thank_you_pages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own thank you pages" ON public.thank_you_pages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own thank you pages" ON public.thank_you_pages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own thank you pages" ON public.thank_you_pages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Orders Policies
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders for their funnels" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Allow anonymous order creation for customers
CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT TO anon WITH CHECK (true);

-- Order Items Policies (access through order ownership)
CREATE POLICY "Users can view items for their orders" ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );
CREATE POLICY "Users can create items for their orders" ON public.order_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );
CREATE POLICY "Users can update items for their orders" ON public.order_items
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );
-- Allow anonymous order item creation
CREATE POLICY "Anyone can create order items" ON public.order_items
  FOR INSERT TO anon WITH CHECK (true);

-- Stripe Connect Accounts Policies
CREATE POLICY "Users can view their own Stripe account" ON public.stripe_connect_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own Stripe account" ON public.stripe_connect_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own Stripe account" ON public.stripe_connect_accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- UPDATE ENROLLMENT PAGES - REMOVE book_call TYPE
-- Call Booking now has its own dedicated page type
-- ===========================================
-- Note: We keep the column for backwards compatibility but new funnels should use call_booking_pages
COMMENT ON COLUMN public.enrollment_pages.page_type IS 'Page type: direct_purchase (book_call is deprecated, use call_booking_pages instead)';

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================
COMMENT ON TABLE public.confirmation_pages IS 'Registration confirmation pages with event details and calendar integration';
COMMENT ON TABLE public.call_booking_pages IS 'Strategy call booking pages with native calendar and meeting integration';
COMMENT ON TABLE public.call_bookings IS 'Individual call booking records with prospect information';
COMMENT ON TABLE public.checkout_pages IS 'Stripe-powered checkout pages with order bump support';
COMMENT ON TABLE public.upsell_pages IS 'Post-purchase upsell pages with one-click charging capability';
COMMENT ON TABLE public.thank_you_pages IS 'Dynamic purchase confirmation pages with conditional content blocks';
COMMENT ON TABLE public.orders IS 'Order records for all purchases through checkout pages';
COMMENT ON TABLE public.order_items IS 'Individual items within orders (core offer, bumps, upsells)';
COMMENT ON TABLE public.stripe_connect_accounts IS 'User Stripe Connect account connections for receiving payments';

COMMIT;
