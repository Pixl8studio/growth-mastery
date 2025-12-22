-- ===========================================
-- Admin Dashboard Tables
-- Migration: Complete admin system for user support and monitoring
-- Created: 2025-12-22
-- ===========================================
BEGIN;

-- ===========================================
-- 1. Add role column to user_profiles
-- ===========================================
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (
  role IN ('user', 'support', 'admin', 'super_admin')
);

COMMENT ON COLUMN public.user_profiles.role IS 'User role for admin access. user=regular, support=view-only admin, admin=full admin, super_admin=can manage admins';

-- Index for efficient role lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role)
WHERE
  role != 'user';

-- Set initial super_admin
UPDATE public.user_profiles
SET role = 'super_admin'
WHERE
  email = 'joe@growthmastery.ai';

-- ===========================================
-- 2. Admin Audit Logs (retained forever)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'view',
      'edit',
      'impersonate',
      'admin_change',
      'email_sent',
      'action_taken'
    )
  ),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin ON public.admin_audit_logs (admin_user_id);

CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs (target_user_id);

CREATE INDEX idx_admin_audit_logs_created ON public.admin_audit_logs (created_at DESC);

CREATE INDEX idx_admin_audit_logs_action_type ON public.admin_audit_logs (action_type);

COMMENT ON TABLE public.admin_audit_logs IS 'Permanent log of all admin actions for compliance and accountability. Never deleted.';

-- ===========================================
-- 3. Admin Notifications
-- ===========================================
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (
    type IN (
      'error_spike',
      'cost_alert',
      'payment_failed',
      'user_struggling',
      'ai_suggestion',
      'new_user',
      'milestone',
      'follow_up_due',
      'nps_detractor'
    )
  ),
  priority TEXT NOT NULL CHECK (priority IN ('urgent', 'normal')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_user_id UUID REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  requires_acknowledgment BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_notifications_priority ON public.admin_notifications (priority, created_at DESC);

CREATE INDEX idx_admin_notifications_unack ON public.admin_notifications (requires_acknowledgment, acknowledged_at)
WHERE
  requires_acknowledgment = true
  AND acknowledged_at IS NULL;

CREATE INDEX idx_admin_notifications_target ON public.admin_notifications (target_user_id);

COMMENT ON TABLE public.admin_notifications IS 'Admin notification center with priority tiers and acknowledgment tracking.';

-- ===========================================
-- 4. Notification Recipients Configuration
-- ===========================================
CREATE TABLE IF NOT EXISTS public.admin_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  notification_types TEXT[] NOT NULL DEFAULT ARRAY[
    'error_spike',
    'cost_alert',
    'payment_failed',
    'user_struggling',
    'ai_suggestion',
    'new_user',
    'milestone'
  ],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (admin_user_id)
);

COMMENT ON TABLE public.admin_notification_recipients IS 'Configuration for which admins receive which notification types. Managed by super_admin.';

-- ===========================================
-- 5. API Usage Tracking
-- ===========================================
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (
    service IN (
      'openai',
      'claude',
      'stripe',
      'cloudflare',
      'email',
      'vapi',
      'gamma',
      'other'
    )
  ),
  endpoint TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_usage_logs_user ON public.api_usage_logs (user_id, created_at DESC);

CREATE INDEX idx_api_usage_logs_service ON public.api_usage_logs (service, created_at DESC);

COMMENT ON TABLE public.api_usage_logs IS 'Raw API usage logs for cost tracking. Aggregated hourly and monthly for performance.';

-- ===========================================
-- 6. Hourly Usage Aggregates
-- ===========================================
CREATE TABLE IF NOT EXISTS public.api_usage_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  hour TIMESTAMPTZ NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  UNIQUE (user_id, service, hour)
);

CREATE INDEX idx_api_usage_hourly_user ON public.api_usage_hourly (user_id, hour DESC);

COMMENT ON TABLE public.api_usage_hourly IS 'Hourly aggregated API usage for efficient querying and dashboards.';

-- ===========================================
-- 7. Monthly Usage Summaries
-- ===========================================
CREATE TABLE IF NOT EXISTS public.api_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  month DATE NOT NULL,
  service TEXT NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  UNIQUE (user_id, service, month)
);

CREATE INDEX idx_api_usage_monthly_user ON public.api_usage_monthly (user_id, month DESC);

CREATE INDEX idx_api_usage_monthly_month ON public.api_usage_monthly (month DESC);

COMMENT ON TABLE public.api_usage_monthly IS 'Monthly aggregated API usage for billing reports and cost analysis.';

-- ===========================================
-- 8. User Health Scores
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  engagement_score INTEGER CHECK (engagement_score BETWEEN 0 AND 100),
  success_score INTEGER CHECK (success_score BETWEEN 0 AND 100),
  technical_score INTEGER CHECK (technical_score BETWEEN 0 AND 100),
  billing_score INTEGER CHECK (billing_score BETWEEN 0 AND 100),
  factors JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX idx_user_health_scores_overall ON public.user_health_scores (overall_score);

COMMENT ON TABLE public.user_health_scores IS 'Calculated user health scores. Updated hourly for engagement, real-time for critical events.';

-- ===========================================
-- 9. AI Email Drafts
-- ===========================================
CREATE TABLE IF NOT EXISTS public.admin_email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  trigger_reason TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'sent', 'rejected')
  ),
  approved_by UUID REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_email_drafts_status ON public.admin_email_drafts (status, created_at DESC);

CREATE INDEX idx_admin_email_drafts_target ON public.admin_email_drafts (target_user_id);

COMMENT ON TABLE public.admin_email_drafts IS 'AI-drafted emails for admin approval before sending to users.';

-- ===========================================
-- 10. Admin User Notes with Follow-ups
-- ===========================================
CREATE TABLE IF NOT EXISTS public.admin_user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_completed_by UUID REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  follow_up_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_user_notes_user ON public.admin_user_notes (user_id, created_at DESC);

CREATE INDEX idx_admin_user_notes_follow_up ON public.admin_user_notes (follow_up_date)
WHERE
  follow_up_date IS NOT NULL
  AND follow_up_completed = false;

COMMENT ON TABLE public.admin_user_notes IS 'Internal team notes on users with optional follow-up reminders.';

-- ===========================================
-- 11. Support Interactions for SLA Tracking
-- ===========================================
CREATE TABLE IF NOT EXISTS public.admin_support_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (
    type IN (
      'error_response',
      'outreach',
      'ticket_response',
      'proactive_support'
    )
  ),
  trigger_notification_id UUID REFERENCES public.admin_notifications (id) ON DELETE SET NULL,
  issue_detected_at TIMESTAMPTZ NOT NULL,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  response_time_minutes INTEGER,
  resolution_time_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_support_interactions_user ON public.admin_support_interactions (user_id);

CREATE INDEX idx_admin_support_interactions_admin ON public.admin_support_interactions (admin_user_id);

CREATE INDEX idx_admin_support_interactions_unresolved ON public.admin_support_interactions (resolved_at)
WHERE
  resolved_at IS NULL;

COMMENT ON TABLE public.admin_support_interactions IS 'Support interactions for SLA tracking and response time metrics.';

-- ===========================================
-- 12. Daily SLA Aggregates
-- ===========================================
CREATE TABLE IF NOT EXISTS public.admin_sla_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  interactions_count INTEGER DEFAULT 0,
  avg_response_time_minutes NUMERIC,
  avg_resolution_time_minutes NUMERIC,
  issues_unresolved INTEGER DEFAULT 0,
  UNIQUE (admin_user_id, date)
);

CREATE INDEX idx_admin_sla_daily_date ON public.admin_sla_daily (date DESC);

COMMENT ON TABLE public.admin_sla_daily IS 'Daily aggregated SLA metrics per admin for trend analysis.';

-- ===========================================
-- 13. NPS Survey Responses
-- ===========================================
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
  feedback TEXT,
  survey_type TEXT NOT NULL CHECK (
    survey_type IN ('quarterly', 'milestone', 'churn_prevention')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nps_responses_user ON public.nps_responses (user_id, created_at DESC);

CREATE INDEX idx_nps_responses_score ON public.nps_responses (score, created_at DESC);

COMMENT ON TABLE public.nps_responses IS 'NPS survey responses for customer satisfaction tracking.';

-- ===========================================
-- 14. Post-Support Feedback
-- ===========================================
CREATE TABLE IF NOT EXISTS public.support_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  interaction_id UUID REFERENCES public.admin_support_interactions (id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_feedback_user ON public.support_feedback (user_id);

CREATE INDEX idx_support_feedback_rating ON public.support_feedback (rating);

COMMENT ON TABLE public.support_feedback IS 'Post-support interaction feedback ratings from users.';

-- ===========================================
-- 15. Admin Settings (Global Configuration)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO
  public.admin_settings (setting_key, setting_value)
VALUES
  ('cost_alert_threshold_cents', '5000'::jsonb),
  (
    'health_score_weights',
    '{"engagement": 25, "success": 30, "technical": 25, "billing": 20}'::jsonb
  ),
  ('error_spike_threshold', '5'::jsonb),
  ('nps_survey_interval_days', '90'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE public.admin_settings IS 'Global admin configuration settings. Managed by super_admins.';

-- ===========================================
-- Row Level Security Policies
-- ===========================================
-- Admin audit logs: admins can insert, super_admins can view all
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_audit_insert ON public.admin_audit_logs FOR INSERT TO authenticated
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('support', 'admin', 'super_admin')
    )
  );

CREATE POLICY admin_audit_select ON public.admin_audit_logs FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role = 'super_admin'
    )
  );

-- Admin notifications: all admins can view and update
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_notifications_select ON public.admin_notifications FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('support', 'admin', 'super_admin')
    )
  );

CREATE POLICY admin_notifications_insert ON public.admin_notifications FOR INSERT TO authenticated
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY admin_notifications_update ON public.admin_notifications
FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('admin', 'super_admin')
    )
  );

-- Notification recipients: super_admin only
ALTER TABLE public.admin_notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_notification_recipients_all ON public.admin_notification_recipients FOR ALL TO authenticated USING (
  EXISTS (
    SELECT
      1
    FROM
      public.user_profiles
    WHERE
      id = auth.uid ()
      AND role = 'super_admin'
  )
);

-- API usage logs: admins can view all, system can insert
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_usage_logs_select ON public.api_usage_logs FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('support', 'admin', 'super_admin')
    )
    OR user_id = auth.uid ()
  );

CREATE POLICY api_usage_logs_insert ON public.api_usage_logs FOR INSERT TO authenticated
WITH
  CHECK (user_id = auth.uid ());

-- Hourly and monthly aggregates: admins can view all
ALTER TABLE public.api_usage_hourly ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.api_usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_usage_hourly_select ON public.api_usage_hourly FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('support', 'admin', 'super_admin')
    )
    OR user_id = auth.uid ()
  );

CREATE POLICY api_usage_monthly_select ON public.api_usage_monthly FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('support', 'admin', 'super_admin')
    )
    OR user_id = auth.uid ()
  );

-- Health scores: admins can view all, users can view own
ALTER TABLE public.user_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_health_scores_select ON public.user_health_scores FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('support', 'admin', 'super_admin')
    )
    OR user_id = auth.uid ()
  );

CREATE POLICY user_health_scores_upsert ON public.user_health_scores FOR ALL TO authenticated USING (
  EXISTS (
    SELECT
      1
    FROM
      public.user_profiles
    WHERE
      id = auth.uid ()
      AND role IN ('admin', 'super_admin')
  )
);

-- Email drafts: admins can view and manage
ALTER TABLE public.admin_email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_email_drafts_all ON public.admin_email_drafts FOR ALL TO authenticated USING (
  EXISTS (
    SELECT
      1
    FROM
      public.user_profiles
    WHERE
      id = auth.uid ()
      AND role IN ('admin', 'super_admin')
  )
);

-- User notes: all admins can view, admins can write
ALTER TABLE public.admin_user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_user_notes_select ON public.admin_user_notes FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('support', 'admin', 'super_admin')
    )
  );

CREATE POLICY admin_user_notes_insert ON public.admin_user_notes FOR INSERT TO authenticated
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY admin_user_notes_update ON public.admin_user_notes
FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('admin', 'super_admin')
    )
  );

-- Support interactions: admins can view and manage
ALTER TABLE public.admin_support_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_support_interactions_all ON public.admin_support_interactions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT
      1
    FROM
      public.user_profiles
    WHERE
      id = auth.uid ()
      AND role IN ('support', 'admin', 'super_admin')
  )
);

-- SLA daily: admins can view
ALTER TABLE public.admin_sla_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_sla_daily_select ON public.admin_sla_daily FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('support', 'admin', 'super_admin')
    )
  );

-- NPS responses: admins can view all, users can insert own
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY nps_responses_select ON public.nps_responses FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('support', 'admin', 'super_admin')
    )
    OR user_id = auth.uid ()
  );

CREATE POLICY nps_responses_insert ON public.nps_responses FOR INSERT TO authenticated
WITH
  CHECK (user_id = auth.uid ());

-- Support feedback: admins can view, users can insert own
ALTER TABLE public.support_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_feedback_select ON public.support_feedback FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('support', 'admin', 'super_admin')
    )
    OR user_id = auth.uid ()
  );

CREATE POLICY support_feedback_insert ON public.support_feedback FOR INSERT TO authenticated
WITH
  CHECK (user_id = auth.uid ());

-- Admin settings: super_admin only
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_settings_select ON public.admin_settings FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role IN ('support', 'admin', 'super_admin')
    )
  );

CREATE POLICY admin_settings_update ON public.admin_settings
FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_profiles
      WHERE
        id = auth.uid ()
        AND role = 'super_admin'
    )
  );

-- ===========================================
-- Triggers for updated_at timestamps
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column () RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_admin_notification_recipients_updated_at BEFORE
UPDATE ON public.admin_notification_recipients FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TRIGGER trigger_admin_user_notes_updated_at BEFORE
UPDATE ON public.admin_user_notes FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TRIGGER trigger_admin_settings_updated_at BEFORE
UPDATE ON public.admin_settings FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

COMMIT;
