-- ===========================================
-- Self-Optimizing Ads Manager Schema
-- Migration: Extend marketing tables for paid ads support
-- Created: 2025-11-19
-- GitHub Issue: #33
-- ===========================================
BEGIN;

-- ===========================================
-- EXTEND EXISTING TABLES
-- ===========================================
-- Extend marketing_content_briefs for ad campaign data
ALTER TABLE public.marketing_content_briefs
ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'organic' CHECK (campaign_type IN ('organic', 'paid_ad')),
ADD COLUMN IF NOT EXISTS ad_objective TEXT CHECK (
  ad_objective IN ('lead_generation', 'traffic', 'engagement')
),
ADD COLUMN IF NOT EXISTS daily_budget_cents INTEGER,
ADD COLUMN IF NOT EXISTS meta_campaign_id TEXT,
ADD COLUMN IF NOT EXISTS meta_adset_id TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add indexes for ad campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_content_briefs_campaign_type ON public.marketing_content_briefs (campaign_type);

CREATE INDEX IF NOT EXISTS idx_marketing_content_briefs_meta_campaign ON public.marketing_content_briefs (meta_campaign_id)
WHERE
  meta_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_content_briefs_active ON public.marketing_content_briefs (is_active);

-- Extend marketing_post_variants for ad creative fields
ALTER TABLE public.marketing_post_variants
ADD COLUMN IF NOT EXISTS ad_creative_type TEXT DEFAULT 'organic' CHECK (
  ad_creative_type IN ('organic', 'lead_ad', 'traffic_ad')
),
ADD COLUMN IF NOT EXISTS meta_ad_id TEXT,
ADD COLUMN IF NOT EXISTS primary_text TEXT,
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS link_description TEXT,
ADD COLUMN IF NOT EXISTS ad_hooks JSONB DEFAULT '{
    "long": "",
    "short": "",
    "curiosity": ""
}',
ADD COLUMN IF NOT EXISTS call_to_action TEXT;

-- Add indexes for ad creatives
CREATE INDEX IF NOT EXISTS idx_marketing_post_variants_creative_type ON public.marketing_post_variants (ad_creative_type);

CREATE INDEX IF NOT EXISTS idx_marketing_post_variants_meta_ad ON public.marketing_post_variants (meta_ad_id)
WHERE
  meta_ad_id IS NOT NULL;

-- Extend marketing_analytics for ad-specific metrics
ALTER TABLE public.marketing_analytics
ADD COLUMN IF NOT EXISTS spend_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpc_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpm_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ctr_percent DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_rate_percent DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_lead_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_count INTEGER DEFAULT 0;

-- Add indexes for ad analytics
CREATE INDEX IF NOT EXISTS idx_marketing_analytics_spend ON public.marketing_analytics (spend_cents);

CREATE INDEX IF NOT EXISTS idx_marketing_analytics_cpl ON public.marketing_analytics (cost_per_lead_cents);

CREATE INDEX IF NOT EXISTS idx_marketing_analytics_leads ON public.marketing_analytics (leads_count);

-- ===========================================
-- NEW TABLES
-- ===========================================
-- Marketing Ad Accounts
CREATE TABLE IF NOT EXISTS public.marketing_ad_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  oauth_connection_id UUID REFERENCES public.marketing_oauth_connections (id) ON DELETE CASCADE,
  -- Meta Ad Account details
  meta_ad_account_id TEXT NOT NULL,
  account_name TEXT,
  account_status TEXT DEFAULT 'active',
  -- Account configuration
  currency TEXT DEFAULT 'USD',
  timezone TEXT,
  -- Status
  is_active BOOLEAN DEFAULT true,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, meta_ad_account_id)
);

CREATE INDEX idx_marketing_ad_accounts_user ON public.marketing_ad_accounts (user_id);

CREATE INDEX idx_marketing_ad_accounts_oauth ON public.marketing_ad_accounts (oauth_connection_id);

CREATE INDEX idx_marketing_ad_accounts_meta_id ON public.marketing_ad_accounts (meta_ad_account_id);

CREATE INDEX idx_marketing_ad_accounts_active ON public.marketing_ad_accounts (is_active);

-- Marketing Ad Audiences
CREATE TABLE IF NOT EXISTS public.marketing_ad_audiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  funnel_project_id UUID REFERENCES public.funnel_projects (id) ON DELETE CASCADE,
  -- Audience details
  name TEXT NOT NULL,
  audience_type TEXT NOT NULL CHECK (
    audience_type IN ('lookalike', 'interest', 'custom', 'saved')
  ),
  -- Meta Audience ID
  meta_audience_id TEXT,
  -- Audience configuration
  source_data JSONB DEFAULT '{}', -- customer list, interests, or lookalike source
  targeting_spec JSONB DEFAULT '{}', -- age, gender, location, interests
  -- Performance metrics
  size_estimate INTEGER,
  last_used_at TIMESTAMPTZ,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_ad_audiences_user ON public.marketing_ad_audiences (user_id);

CREATE INDEX idx_marketing_ad_audiences_funnel ON public.marketing_ad_audiences (funnel_project_id);

CREATE INDEX idx_marketing_ad_audiences_type ON public.marketing_ad_audiences (audience_type);

CREATE INDEX idx_marketing_ad_audiences_meta_id ON public.marketing_ad_audiences (meta_audience_id)
WHERE
  meta_audience_id IS NOT NULL;

-- Marketing Ad Snapshots (historical data every 12 hours)
CREATE TABLE IF NOT EXISTS public.marketing_ad_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  post_variant_id UUID NOT NULL REFERENCES public.marketing_post_variants (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- Snapshot timestamp
  snapshot_date TIMESTAMPTZ DEFAULT NOW(),
  -- Key metrics at snapshot time
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend_cents INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  -- Calculated metrics
  cpc_cents INTEGER DEFAULT 0,
  cpm_cents INTEGER DEFAULT 0,
  ctr_percent DECIMAL(5, 2) DEFAULT 0,
  cost_per_lead_cents INTEGER DEFAULT 0,
  -- Raw metrics from Meta API
  raw_metrics JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_ad_snapshots_variant ON public.marketing_ad_snapshots (post_variant_id);

CREATE INDEX idx_marketing_ad_snapshots_user ON public.marketing_ad_snapshots (user_id);

CREATE INDEX idx_marketing_ad_snapshots_date ON public.marketing_ad_snapshots (snapshot_date);

CREATE INDEX idx_marketing_ad_snapshots_variant_date ON public.marketing_ad_snapshots (post_variant_id, snapshot_date);

-- Marketing Ad Optimization Log
CREATE TABLE IF NOT EXISTS public.marketing_ad_optimizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content_brief_id UUID REFERENCES public.marketing_content_briefs (id) ON DELETE CASCADE,
  post_variant_id UUID REFERENCES public.marketing_post_variants (id) ON DELETE SET NULL,
  -- Optimization details
  optimization_type TEXT NOT NULL CHECK (
    optimization_type IN (
      'pause_underperformer',
      'scale_winner',
      'audience_expansion',
      'creative_refresh',
      'budget_adjustment'
    )
  ),
  -- Recommendation or execution
  status TEXT DEFAULT 'recommended' CHECK (
    status IN ('recommended', 'executed', 'dismissed', 'failed')
  ),
  -- Details
  reason TEXT NOT NULL,
  action_taken TEXT,
  metrics_before JSONB DEFAULT '{}',
  metrics_after JSONB DEFAULT '{}',
  -- Execution details
  executed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES auth.users (id),
  -- Metadata
  metadata JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_ad_optimizations_user ON public.marketing_ad_optimizations (user_id);

CREATE INDEX idx_marketing_ad_optimizations_brief ON public.marketing_ad_optimizations (content_brief_id);

CREATE INDEX idx_marketing_ad_optimizations_variant ON public.marketing_ad_optimizations (post_variant_id);

CREATE INDEX idx_marketing_ad_optimizations_type ON public.marketing_ad_optimizations (optimization_type);

CREATE INDEX idx_marketing_ad_optimizations_status ON public.marketing_ad_optimizations (status);

CREATE INDEX idx_marketing_ad_optimizations_created ON public.marketing_ad_optimizations (created_at);

-- ===========================================
-- RLS POLICIES
-- ===========================================
-- Marketing Ad Accounts RLS
ALTER TABLE public.marketing_ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ad accounts" ON public.marketing_ad_accounts FOR
SELECT
  USING (auth.uid () = user_id);

CREATE POLICY "Users can insert their own ad accounts" ON public.marketing_ad_accounts FOR INSERT
WITH
  CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update their own ad accounts" ON public.marketing_ad_accounts
FOR UPDATE
  USING (auth.uid () = user_id);

CREATE POLICY "Users can delete their own ad accounts" ON public.marketing_ad_accounts FOR DELETE USING (auth.uid () = user_id);

-- Marketing Ad Audiences RLS
ALTER TABLE public.marketing_ad_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audiences" ON public.marketing_ad_audiences FOR
SELECT
  USING (auth.uid () = user_id);

CREATE POLICY "Users can insert their own audiences" ON public.marketing_ad_audiences FOR INSERT
WITH
  CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update their own audiences" ON public.marketing_ad_audiences
FOR UPDATE
  USING (auth.uid () = user_id);

CREATE POLICY "Users can delete their own audiences" ON public.marketing_ad_audiences FOR DELETE USING (auth.uid () = user_id);

-- Marketing Ad Snapshots RLS
ALTER TABLE public.marketing_ad_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ad snapshots" ON public.marketing_ad_snapshots FOR
SELECT
  USING (auth.uid () = user_id);

CREATE POLICY "Users can insert their own ad snapshots" ON public.marketing_ad_snapshots FOR INSERT
WITH
  CHECK (auth.uid () = user_id);

-- Marketing Ad Optimizations RLS
ALTER TABLE public.marketing_ad_optimizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own optimizations" ON public.marketing_ad_optimizations FOR
SELECT
  USING (auth.uid () = user_id);

CREATE POLICY "Users can insert their own optimizations" ON public.marketing_ad_optimizations FOR INSERT
WITH
  CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update their own optimizations" ON public.marketing_ad_optimizations
FOR UPDATE
  USING (auth.uid () = user_id);

-- ===========================================
-- TRIGGERS
-- ===========================================
-- Add updated_at triggers for new tables
CREATE TRIGGER update_marketing_ad_accounts_updated_at BEFORE
UPDATE ON public.marketing_ad_accounts FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TRIGGER update_marketing_ad_audiences_updated_at BEFORE
UPDATE ON public.marketing_ad_audiences FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TRIGGER update_marketing_ad_optimizations_updated_at BEFORE
UPDATE ON public.marketing_ad_optimizations FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON TABLE public.marketing_ad_accounts IS 'Meta Ad Account connections for paid advertising';

COMMENT ON TABLE public.marketing_ad_audiences IS 'Saved audience configurations for ad targeting';

COMMENT ON TABLE public.marketing_ad_snapshots IS 'Historical snapshots of ad performance (taken every 12 hours)';

COMMENT ON TABLE public.marketing_ad_optimizations IS 'AI-generated optimization recommendations and execution log';

COMMIT;
