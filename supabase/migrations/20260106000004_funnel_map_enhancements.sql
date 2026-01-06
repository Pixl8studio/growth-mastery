-- Migration: Funnel Map Step 2 Enhancements
-- Purpose: Add new tables and columns for enhanced funnel map functionality
-- Implements Issue #407 requirements
--
-- NOTE ON MANUAL CREATION:
-- This migration was manually created to introduce new schema elements per Issue #407.
-- Includes: new tables, new node types, approval workflow, industry benchmarks.
--
-- ROLLBACK PROCEDURE provided at end of file.

-- ============================================
-- 1. UPDATE NODE_TYPE CHECK CONSTRAINT
-- ============================================
-- Add new node types: registration_confirmation, call_booking_confirmation, upsell_1, upsell_2
ALTER TABLE public.funnel_node_data DROP CONSTRAINT IF EXISTS funnel_node_data_node_type_check;

ALTER TABLE public.funnel_node_data ADD CONSTRAINT funnel_node_data_node_type_check CHECK (
    node_type IN (
        'traffic_source',
        'registration',
        'registration_confirmation',
        'masterclass',
        'core_offer',
        'checkout',
        'upsells',  -- Legacy value for backward compatibility
        'upsell_1',
        'upsell_2',
        'order_bump',
        'call_booking',
        'call_booking_confirmation',
        'sales_call',
        'thank_you'
    )
);

-- ============================================
-- 2. ADD APPROVAL COLUMNS TO FUNNEL_NODE_DATA
-- ============================================
-- Explicit approval workflow: users must approve each node
ALTER TABLE public.funnel_node_data ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.funnel_node_data ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.funnel_node_data ADD COLUMN IF NOT EXISTS approved_content JSONB DEFAULT '{}';

-- Index for approval status queries
CREATE INDEX IF NOT EXISTS idx_funnel_node_data_approved ON public.funnel_node_data (funnel_project_id, is_approved);

COMMENT ON COLUMN public.funnel_node_data.is_approved IS 'Whether user has explicitly approved this node content';
COMMENT ON COLUMN public.funnel_node_data.approved_at IS 'Timestamp when node was approved';
COMMENT ON COLUMN public.funnel_node_data.approved_content IS 'Snapshot of content at time of approval';

-- ============================================
-- 3. MASTERCLASS DEFINITIONS TABLE
-- ============================================
-- Stores structured masterclass content using Perfect Webinar Framework
CREATE TABLE IF NOT EXISTS public.masterclass_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
    funnel_node_data_id UUID REFERENCES public.funnel_node_data(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Perfect Webinar Framework fields
    title TEXT NOT NULL,
    promise TEXT,
    big_idea TEXT,

    -- Story Arc
    origin_story TEXT,
    vehicle_story TEXT,
    internal_story TEXT,
    external_story TEXT,

    -- 3 Key Steps/Secrets
    key_step_1 JSONB DEFAULT '{}',
    key_step_2 JSONB DEFAULT '{}',
    key_step_3 JSONB DEFAULT '{}',

    -- Poll Questions (from Step 1)
    poll_questions TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Transition to offer
    stack_introduction TEXT,
    offer_reveal TEXT,

    -- Metadata
    framework_version TEXT DEFAULT '1.0',
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_masterclass_definitions_project ON public.masterclass_definitions(funnel_project_id);
CREATE INDEX IF NOT EXISTS idx_masterclass_definitions_user ON public.masterclass_definitions(user_id);

-- RLS
ALTER TABLE public.masterclass_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own masterclass definitions" ON public.masterclass_definitions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own masterclass definitions" ON public.masterclass_definitions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own masterclass definitions" ON public.masterclass_definitions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own masterclass definitions" ON public.masterclass_definitions FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.masterclass_definitions IS 'Structured masterclass content using Perfect Webinar Framework';

-- ============================================
-- 4. REGISTRATION CONFIGS TABLE
-- ============================================
-- Stores registration page configuration including access type
CREATE TABLE IF NOT EXISTS public.registration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_project_id UUID NOT NULL UNIQUE REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
    funnel_node_data_id UUID REFERENCES public.funnel_node_data(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Access type determines if confirmation page shows
    access_type TEXT NOT NULL DEFAULT 'immediate' CHECK (access_type IN ('immediate', 'live', 'scheduled')),

    -- Event datetime (for live/scheduled)
    event_datetime TIMESTAMPTZ,
    event_timezone TEXT DEFAULT 'UTC',

    -- Registration page content
    headline TEXT,
    subheadline TEXT,
    bullet_points TEXT[] DEFAULT ARRAY[]::TEXT[],
    cta_text TEXT DEFAULT 'Register Now',

    -- Confirmation settings (when access_type != 'immediate')
    confirmation_headline TEXT,
    confirmation_message TEXT,
    calendar_integration JSONB DEFAULT '{}',

    -- Styling
    theme_overrides JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_registration_configs_project ON public.registration_configs(funnel_project_id);
CREATE INDEX IF NOT EXISTS idx_registration_configs_user ON public.registration_configs(user_id);

-- RLS
ALTER TABLE public.registration_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own registration configs" ON public.registration_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own registration configs" ON public.registration_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own registration configs" ON public.registration_configs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own registration configs" ON public.registration_configs FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.registration_configs IS 'Registration page configuration including access type and confirmation settings';

-- ============================================
-- 5. OFFER DEFINITIONS TABLE (7 Ps Framework)
-- ============================================
-- Structured offer content using 7 Ps Framework
CREATE TABLE IF NOT EXISTS public.offer_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
    funnel_node_data_id UUID REFERENCES public.funnel_node_data(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Offer type
    offer_type TEXT NOT NULL DEFAULT 'core' CHECK (offer_type IN ('core', 'upsell_1', 'upsell_2', 'order_bump', 'downsell')),

    -- 7 Ps Framework (with rebranded labels)
    promise TEXT,           -- "What outcome do you guarantee?"
    person TEXT,            -- "Who is this specifically for?"
    problem TEXT,           -- "What painful problem does this solve?"
    product TEXT,           -- "What exactly do they get?"
    process TEXT,           -- "How does the transformation work?"
    proof TEXT,             -- "What results have others achieved?"
    price_amount DECIMAL(10,2),
    price_currency TEXT DEFAULT 'USD',

    -- Additional offer details
    name TEXT,
    tagline TEXT,
    guarantee TEXT,
    urgency_element TEXT,
    scarcity_element TEXT,

    -- Bonuses and features
    features JSONB DEFAULT '[]',
    bonuses JSONB DEFAULT '[]',

    -- Discount configuration
    discount_type TEXT CHECK (discount_type IN ('none', 'percentage', 'fixed', 'payment_plan')),
    discount_value DECIMAL(10,2),
    payment_plan_options JSONB DEFAULT '[]',

    -- Display order for multiple offers
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offer_definitions_project ON public.offer_definitions(funnel_project_id);
CREATE INDEX IF NOT EXISTS idx_offer_definitions_user ON public.offer_definitions(user_id);
CREATE INDEX IF NOT EXISTS idx_offer_definitions_type ON public.offer_definitions(funnel_project_id, offer_type);

-- RLS
ALTER TABLE public.offer_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own offer definitions" ON public.offer_definitions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own offer definitions" ON public.offer_definitions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own offer definitions" ON public.offer_definitions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own offer definitions" ON public.offer_definitions FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.offer_definitions IS 'Structured offer content using 7 Ps Framework';

-- ============================================
-- 6. CHECKOUT CONFIGS TABLE
-- ============================================
-- Checkout page configuration
CREATE TABLE IF NOT EXISTS public.checkout_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_project_id UUID NOT NULL UNIQUE REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
    funnel_node_data_id UUID REFERENCES public.funnel_node_data(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Checkout content
    headline TEXT,
    order_summary_text TEXT,
    guarantee_reminder TEXT,
    urgency_element TEXT,

    -- Payment options
    payment_methods JSONB DEFAULT '["card"]',
    show_payment_plans BOOLEAN DEFAULT FALSE,

    -- Trust elements
    trust_badges JSONB DEFAULT '[]',
    testimonials JSONB DEFAULT '[]',

    -- Order bump configuration
    order_bump_enabled BOOLEAN DEFAULT TRUE,
    order_bump_headline TEXT,
    order_bump_description TEXT,

    -- Styling
    theme_overrides JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkout_configs_project ON public.checkout_configs(funnel_project_id);
CREATE INDEX IF NOT EXISTS idx_checkout_configs_user ON public.checkout_configs(user_id);

-- RLS
ALTER TABLE public.checkout_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own checkout configs" ON public.checkout_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own checkout configs" ON public.checkout_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own checkout configs" ON public.checkout_configs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own checkout configs" ON public.checkout_configs FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.checkout_configs IS 'Checkout page configuration including order bumps and payment options';

-- ============================================
-- 7. CALL BOOKING CONFIGS TABLE
-- ============================================
-- Call booking page and sales call configuration
CREATE TABLE IF NOT EXISTS public.call_booking_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_project_id UUID NOT NULL UNIQUE REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
    funnel_node_data_id UUID REFERENCES public.funnel_node_data(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Call booking page
    booking_headline TEXT,
    call_description TEXT,
    call_duration_minutes INTEGER DEFAULT 30,

    -- Pre-call qualification
    qualification_questions TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Sales call script
    call_script_outline TEXT,
    objection_handlers JSONB DEFAULT '[]',
    close_technique TEXT,

    -- Confirmation page content
    confirmation_headline TEXT,
    confirmation_message TEXT,
    next_steps TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Calendar integration
    calendar_type TEXT DEFAULT 'calendly',
    calendar_url TEXT,
    calendar_settings JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_booking_configs_project ON public.call_booking_configs(funnel_project_id);
CREATE INDEX IF NOT EXISTS idx_call_booking_configs_user ON public.call_booking_configs(user_id);

-- RLS
ALTER TABLE public.call_booking_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own call booking configs" ON public.call_booking_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own call booking configs" ON public.call_booking_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own call booking configs" ON public.call_booking_configs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own call booking configs" ON public.call_booking_configs FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.call_booking_configs IS 'Call booking and sales call configuration for high-ticket pathway';

-- ============================================
-- 8. FUNNEL MAP NODE BENCHMARKS TABLE
-- ============================================
-- Industry benchmarks for conversion rates
CREATE TABLE IF NOT EXISTS public.funnel_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Benchmark identification
    node_type TEXT NOT NULL,
    pathway_type TEXT NOT NULL CHECK (pathway_type IN ('direct_purchase', 'book_call', 'all')),
    industry TEXT DEFAULT 'general',

    -- Conversion benchmarks
    conversion_rate_low DECIMAL(5,2),      -- Low end of typical range
    conversion_rate_median DECIMAL(5,2),    -- Median/typical rate
    conversion_rate_high DECIMAL(5,2),      -- High performers
    conversion_rate_elite DECIMAL(5,2),     -- Top 10% performers

    -- Benchmark descriptions
    metric_name TEXT NOT NULL,
    metric_description TEXT,

    -- Source and validity
    source TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for benchmark lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_benchmarks_lookup ON public.funnel_benchmarks(node_type, pathway_type, industry, metric_name);

COMMENT ON TABLE public.funnel_benchmarks IS 'Industry benchmark conversion rates for funnel nodes';

-- RLS for funnel_benchmarks (reference data - public read)
ALTER TABLE public.funnel_benchmarks ENABLE ROW LEVEL SECURITY;

-- Anyone can read benchmarks (they're reference data)
CREATE POLICY "Anyone can view benchmarks" ON public.funnel_benchmarks FOR SELECT USING (true);

-- ============================================
-- 9. INSERT DEFAULT BENCHMARKS
-- ============================================
-- Insert hardcoded industry benchmarks
INSERT INTO public.funnel_benchmarks (node_type, pathway_type, industry, metric_name, metric_description, conversion_rate_low, conversion_rate_median, conversion_rate_high, conversion_rate_elite, source) VALUES
    -- Traffic to Registration
    ('registration', 'all', 'general', 'landing_page_conversion', 'Visitors who register for masterclass', 15.00, 25.00, 40.00, 55.00, 'Industry Average'),

    -- Registration to Watch
    ('masterclass', 'all', 'general', 'show_up_rate', 'Registrants who watch masterclass', 20.00, 35.00, 50.00, 70.00, 'Industry Average'),

    -- Watch to Core Offer
    ('core_offer', 'direct_purchase', 'general', 'offer_click_rate', 'Viewers who click to offer page', 10.00, 20.00, 35.00, 50.00, 'Industry Average'),
    ('core_offer', 'book_call', 'general', 'offer_click_rate', 'Viewers who click to book call', 5.00, 12.00, 22.00, 35.00, 'Industry Average'),

    -- Core Offer to Checkout/Call
    ('checkout', 'direct_purchase', 'general', 'sales_conversion', 'Offer viewers who purchase', 2.00, 5.00, 10.00, 18.00, 'Industry Average'),
    ('call_booking', 'book_call', 'general', 'booking_rate', 'Offer viewers who book a call', 8.00, 15.00, 25.00, 40.00, 'Industry Average'),

    -- Call to Close
    ('sales_call', 'book_call', 'general', 'close_rate', 'Booked calls that close', 15.00, 25.00, 40.00, 60.00, 'Industry Average'),

    -- Upsell Rates
    ('upsell_1', 'all', 'general', 'upsell_take_rate', 'Buyers who accept upsell 1', 10.00, 20.00, 35.00, 50.00, 'Industry Average'),
    ('upsell_2', 'all', 'general', 'upsell_take_rate', 'Upsell 1 buyers who accept upsell 2', 8.00, 15.00, 25.00, 40.00, 'Industry Average'),

    -- Order Bump
    ('order_bump', 'all', 'general', 'bump_take_rate', 'Checkout visitors who add order bump', 20.00, 35.00, 50.00, 65.00, 'Industry Average')
ON CONFLICT (node_type, pathway_type, industry, metric_name) DO NOTHING;

-- ============================================
-- 10. EXTEND OFFERS TABLE
-- ============================================
-- Add funnel_map_id and discount fields to existing offers table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS funnel_map_id UUID REFERENCES public.funnel_map_config(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS offer_definition_id UUID REFERENCES public.offer_definitions(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('none', 'percentage', 'fixed', 'payment_plan'));
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2);
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2);

-- Index for funnel map lookup
CREATE INDEX IF NOT EXISTS idx_offers_funnel_map ON public.offers(funnel_map_id);
CREATE INDEX IF NOT EXISTS idx_offers_definition ON public.offers(offer_definition_id);

COMMENT ON COLUMN public.offers.funnel_map_id IS 'Link to funnel map configuration for Step 2 integration';
COMMENT ON COLUMN public.offers.offer_definition_id IS 'Link to detailed offer definition from funnel map';
COMMENT ON COLUMN public.offers.discount_type IS 'Type of discount applied (none, percentage, fixed, payment_plan)';
COMMENT ON COLUMN public.offers.discount_value IS 'Discount amount (percentage or fixed amount)';
COMMENT ON COLUMN public.offers.original_price IS 'Original price before discount';

-- ============================================
-- 11. ADD FUNNEL MAP APPROVAL TRACKING
-- ============================================
-- Update funnel_map_config with approval tracking
ALTER TABLE public.funnel_map_config ADD COLUMN IF NOT EXISTS nodes_approved_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.funnel_map_config ADD COLUMN IF NOT EXISTS total_nodes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.funnel_map_config ADD COLUMN IF NOT EXISTS all_nodes_approved BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.funnel_map_config.nodes_approved_count IS 'Number of nodes that have been explicitly approved';
COMMENT ON COLUMN public.funnel_map_config.total_nodes_count IS 'Total number of nodes in the funnel for this pathway';
COMMENT ON COLUMN public.funnel_map_config.all_nodes_approved IS 'Whether all nodes have been approved (enables downstream steps)';

-- ============================================
-- 12. UPDATE TIMESTAMP TRIGGERS
-- ============================================
-- Add triggers for new tables
CREATE TRIGGER trigger_update_masterclass_definitions_updated_at
    BEFORE UPDATE ON public.masterclass_definitions
    FOR EACH ROW EXECUTE FUNCTION update_funnel_node_data_updated_at();

CREATE TRIGGER trigger_update_registration_configs_updated_at
    BEFORE UPDATE ON public.registration_configs
    FOR EACH ROW EXECUTE FUNCTION update_funnel_node_data_updated_at();

CREATE TRIGGER trigger_update_offer_definitions_updated_at
    BEFORE UPDATE ON public.offer_definitions
    FOR EACH ROW EXECUTE FUNCTION update_funnel_node_data_updated_at();

CREATE TRIGGER trigger_update_checkout_configs_updated_at
    BEFORE UPDATE ON public.checkout_configs
    FOR EACH ROW EXECUTE FUNCTION update_funnel_node_data_updated_at();

CREATE TRIGGER trigger_update_call_booking_configs_updated_at
    BEFORE UPDATE ON public.call_booking_configs
    FOR EACH ROW EXECUTE FUNCTION update_funnel_node_data_updated_at();

-- ============================================
-- ROLLBACK PROCEDURE
-- ============================================
-- To rollback this migration, run the following in reverse order:
--
-- -- Drop triggers
-- DROP TRIGGER IF EXISTS trigger_update_call_booking_configs_updated_at ON public.call_booking_configs;
-- DROP TRIGGER IF EXISTS trigger_update_checkout_configs_updated_at ON public.checkout_configs;
-- DROP TRIGGER IF EXISTS trigger_update_offer_definitions_updated_at ON public.offer_definitions;
-- DROP TRIGGER IF EXISTS trigger_update_registration_configs_updated_at ON public.registration_configs;
-- DROP TRIGGER IF EXISTS trigger_update_masterclass_definitions_updated_at ON public.masterclass_definitions;
--
-- -- Drop new columns from funnel_map_config
-- ALTER TABLE public.funnel_map_config DROP COLUMN IF EXISTS nodes_approved_count;
-- ALTER TABLE public.funnel_map_config DROP COLUMN IF EXISTS total_nodes_count;
-- ALTER TABLE public.funnel_map_config DROP COLUMN IF EXISTS all_nodes_approved;
--
-- -- Drop new columns from offers
-- ALTER TABLE public.offers DROP COLUMN IF EXISTS funnel_map_id;
-- ALTER TABLE public.offers DROP COLUMN IF EXISTS offer_definition_id;
-- ALTER TABLE public.offers DROP COLUMN IF EXISTS discount_type;
-- ALTER TABLE public.offers DROP COLUMN IF EXISTS discount_value;
-- ALTER TABLE public.offers DROP COLUMN IF EXISTS original_price;
--
-- -- Drop new tables
-- DROP TABLE IF EXISTS public.funnel_benchmarks;
-- DROP TABLE IF EXISTS public.call_booking_configs;
-- DROP TABLE IF EXISTS public.checkout_configs;
-- DROP TABLE IF EXISTS public.offer_definitions;
-- DROP TABLE IF EXISTS public.registration_configs;
-- DROP TABLE IF EXISTS public.masterclass_definitions;
--
-- -- Drop new columns from funnel_node_data
-- ALTER TABLE public.funnel_node_data DROP COLUMN IF EXISTS is_approved;
-- ALTER TABLE public.funnel_node_data DROP COLUMN IF EXISTS approved_at;
-- ALTER TABLE public.funnel_node_data DROP COLUMN IF EXISTS approved_content;
--
-- -- Restore original node_type constraint
-- ALTER TABLE public.funnel_node_data DROP CONSTRAINT IF EXISTS funnel_node_data_node_type_check;
-- ALTER TABLE public.funnel_node_data ADD CONSTRAINT funnel_node_data_node_type_check CHECK (
--     node_type IN ('traffic_source', 'registration', 'masterclass', 'core_offer', 'checkout', 'upsells', 'call_booking', 'sales_call', 'thank_you')
-- );
