-- ===========================================
-- AI Follow-Up Engine - Functions and Triggers
-- Migration: Helper functions, triggers, and automation
-- Created: 2025-01-26
-- GitHub Issue: #23 - Sub-Issue #1
-- ===========================================

BEGIN;

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Calculate intent score based on engagement factors
CREATE OR REPLACE FUNCTION public.calculate_intent_score(
  p_watch_percentage INTEGER,
  p_replay_count INTEGER,
  p_offer_clicks INTEGER,
  p_email_opens INTEGER,
  p_email_clicks INTEGER,
  p_response_speed_hours INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_watch_score INTEGER;
  v_replay_score INTEGER;
  v_cta_score INTEGER;
  v_email_score INTEGER;
  v_speed_score INTEGER;
BEGIN
  -- Watch percentage contribution (40 points max)
  v_watch_score := LEAST(40, (p_watch_percentage * 40) / 100);
  
  -- Replay count contribution (10 points max)
  v_replay_score := LEAST(10, p_replay_count * 5);
  
  -- CTA clicks contribution (20 points max)
  v_cta_score := LEAST(20, p_offer_clicks * 10);
  
  -- Email engagement contribution (15 points max)
  v_email_score := LEAST(15, (p_email_opens * 5) + (p_email_clicks * 10));
  
  -- Response speed contribution (15 points max)
  -- Faster response = higher score
  v_speed_score := CASE
    WHEN p_response_speed_hours <= 1 THEN 15
    WHEN p_response_speed_hours <= 6 THEN 12
    WHEN p_response_speed_hours <= 24 THEN 8
    WHEN p_response_speed_hours <= 48 THEN 4
    ELSE 0
  END;
  
  v_score := v_watch_score + v_replay_score + v_cta_score + v_email_score + v_speed_score;
  
  RETURN LEAST(100, v_score);
END;
$$ LANGUAGE plpgsql;

-- Determine segment based on watch percentage
CREATE OR REPLACE FUNCTION public.determine_segment(
  p_watch_percentage INTEGER
) RETURNS public.followup_segment AS $$
BEGIN
  RETURN CASE
    WHEN p_watch_percentage = 0 THEN 'no_show'::public.followup_segment
    WHEN p_watch_percentage BETWEEN 1 AND 24 THEN 'skimmer'::public.followup_segment
    WHEN p_watch_percentage BETWEEN 25 AND 49 THEN 'sampler'::public.followup_segment
    WHEN p_watch_percentage BETWEEN 50 AND 89 THEN 'engaged'::public.followup_segment
    WHEN p_watch_percentage >= 90 THEN 'hot'::public.followup_segment
    ELSE 'no_show'::public.followup_segment
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Determine engagement level based on combined score
CREATE OR REPLACE FUNCTION public.determine_engagement_level(
  p_combined_score INTEGER
) RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN p_combined_score >= 70 THEN 'hot'
    WHEN p_combined_score >= 40 THEN 'warm'
    ELSE 'cold'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get next touch timing based on segment and agent config
CREATE OR REPLACE FUNCTION public.calculate_next_touch_time(
  p_segment public.followup_segment,
  p_last_touch_at TIMESTAMPTZ,
  p_touch_number INTEGER,
  p_segmentation_rules JSONB
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_cadence_hours INTEGER[];
  v_next_delay_hours INTEGER;
BEGIN
  -- Get cadence hours array for this segment
  v_cadence_hours := ARRAY(
    SELECT jsonb_array_elements_text(p_segmentation_rules->p_segment::TEXT->'cadence_hours')::INTEGER
  );
  
  -- If no more scheduled touches, return NULL
  IF p_touch_number > array_length(v_cadence_hours, 1) THEN
    RETURN NULL;
  END IF;
  
  -- Get delay for this touch number
  v_next_delay_hours := v_cadence_hours[p_touch_number];
  
  -- Calculate next touch time
  RETURN p_last_touch_at + (v_next_delay_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Record intent score change
CREATE OR REPLACE FUNCTION public.record_intent_score_change(
  p_prospect_id UUID,
  p_new_intent_score INTEGER,
  p_new_fit_score INTEGER,
  p_new_combined_score INTEGER,
  p_change_reason TEXT,
  p_score_factors JSONB
) RETURNS VOID AS $$
DECLARE
  v_old_combined_score INTEGER;
  v_delta INTEGER;
BEGIN
  -- Get old score
  SELECT combined_score INTO v_old_combined_score
  FROM public.followup_prospects
  WHERE id = p_prospect_id;
  
  -- Calculate delta
  v_delta := p_new_combined_score - COALESCE(v_old_combined_score, 0);
  
  -- Insert score history record
  INSERT INTO public.followup_intent_scores (
    prospect_id,
    intent_score,
    fit_score,
    combined_score,
    score_factors,
    change_reason,
    change_delta
  ) VALUES (
    p_prospect_id,
    p_new_intent_score,
    p_new_fit_score,
    p_new_combined_score,
    p_score_factors,
    p_change_reason,
    v_delta
  );
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGER FUNCTIONS
-- ===========================================

-- Auto-update segment when watch_percentage changes
CREATE OR REPLACE FUNCTION public.update_prospect_segment()
RETURNS TRIGGER AS $$
BEGIN
  NEW.segment := public.determine_segment(NEW.watch_percentage);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prospect_segment
  BEFORE INSERT OR UPDATE OF watch_percentage
  ON public.followup_prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prospect_segment();

-- Auto-update engagement_level when combined_score changes
CREATE OR REPLACE FUNCTION public.update_prospect_engagement_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_level := public.determine_engagement_level(NEW.combined_score);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prospect_engagement_level
  BEFORE INSERT OR UPDATE OF combined_score
  ON public.followup_prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prospect_engagement_level();

-- Auto-update updated_at timestamp
CREATE TRIGGER trigger_followup_agent_configs_updated_at
  BEFORE UPDATE ON public.followup_agent_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_followup_prospects_updated_at
  BEFORE UPDATE ON public.followup_prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_followup_sequences_updated_at
  BEFORE UPDATE ON public.followup_sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_followup_messages_updated_at
  BEFORE UPDATE ON public.followup_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_followup_deliveries_updated_at
  BEFORE UPDATE ON public.followup_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_followup_story_library_updated_at
  BEFORE UPDATE ON public.followup_story_library
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_followup_experiments_updated_at
  BEFORE UPDATE ON public.followup_experiments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Track delivery status changes as events
CREATE OR REPLACE FUNCTION public.track_delivery_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track meaningful status changes
  IF OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN
    INSERT INTO public.followup_events (
      prospect_id,
      delivery_id,
      event_type,
      event_subtype,
      event_data
    ) VALUES (
      NEW.prospect_id,
      NEW.id,
      'delivery_status_change',
      NEW.delivery_status::TEXT,
      jsonb_build_object(
        'old_status', OLD.delivery_status::TEXT,
        'new_status', NEW.delivery_status::TEXT,
        'channel', NEW.channel::TEXT
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_delivery_status_change
  AFTER UPDATE OF delivery_status
  ON public.followup_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.track_delivery_status_change();

-- Track email opens
CREATE OR REPLACE FUNCTION public.track_email_open()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.opened_at IS NULL AND NEW.opened_at IS NOT NULL THEN
    INSERT INTO public.followup_events (
      prospect_id,
      delivery_id,
      event_type,
      event_data
    ) VALUES (
      NEW.prospect_id,
      NEW.id,
      'email_open',
      jsonb_build_object(
        'opened_at', NEW.opened_at,
        'channel', NEW.channel::TEXT
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_email_open
  AFTER UPDATE OF opened_at
  ON public.followup_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.track_email_open();

-- Track link clicks
CREATE OR REPLACE FUNCTION public.track_link_click()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_clicks > OLD.total_clicks THEN
    INSERT INTO public.followup_events (
      prospect_id,
      delivery_id,
      event_type,
      event_data
    ) VALUES (
      NEW.prospect_id,
      NEW.id,
      'link_click',
      jsonb_build_object(
        'click_count', NEW.total_clicks,
        'first_click_at', NEW.first_click_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_link_click
  AFTER UPDATE OF total_clicks
  ON public.followup_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.track_link_click();

-- Auto-stop sequence when prospect opts out
CREATE OR REPLACE FUNCTION public.handle_prospect_opt_out()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.consent_state IN ('opted_out', 'complained') 
     AND OLD.consent_state NOT IN ('opted_out', 'complained') THEN
    
    -- Cancel all pending deliveries
    UPDATE public.followup_deliveries
    SET delivery_status = 'failed',
        error_message = 'Prospect opted out'
    WHERE prospect_id = NEW.id
      AND delivery_status = 'pending';
    
    -- Clear next scheduled touch
    NEW.next_scheduled_touch := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_prospect_opt_out
  BEFORE UPDATE OF consent_state
  ON public.followup_prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_prospect_opt_out();

-- Update story effectiveness when used
CREATE OR REPLACE FUNCTION public.update_story_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be called when a delivery references a story
  -- For now, it's a placeholder for future implementation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- UTILITY FUNCTIONS
-- ===========================================

-- Get prospect engagement summary
CREATE OR REPLACE FUNCTION public.get_prospect_engagement_summary(
  p_prospect_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_deliveries', COUNT(*),
    'total_opens', COUNT(*) FILTER (WHERE opened_at IS NOT NULL),
    'total_clicks', SUM(total_clicks),
    'last_engagement', MAX(GREATEST(opened_at, first_click_at)),
    'channels_used', jsonb_agg(DISTINCT channel),
    'open_rate', ROUND(
      (COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
      2
    ),
    'click_rate', ROUND(
      (COUNT(*) FILTER (WHERE total_clicks > 0)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
      2
    )
  ) INTO v_summary
  FROM public.followup_deliveries
  WHERE prospect_id = p_prospect_id
    AND delivery_status IN ('sent', 'delivered', 'opened', 'clicked');
  
  RETURN COALESCE(v_summary, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Get sequence performance metrics
CREATE OR REPLACE FUNCTION public.get_sequence_performance(
  p_sequence_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_metrics JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_prospects', COUNT(DISTINCT d.prospect_id),
    'total_sends', COUNT(*),
    'total_opens', COUNT(*) FILTER (WHERE d.opened_at IS NOT NULL),
    'total_clicks', SUM(d.total_clicks),
    'total_replies', COUNT(*) FILTER (WHERE d.replied_at IS NOT NULL),
    'total_conversions', COUNT(DISTINCT d.prospect_id) FILTER (WHERE p.converted = true),
    'open_rate', ROUND(
      (COUNT(*) FILTER (WHERE d.opened_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
      2
    ),
    'click_rate', ROUND(
      (COUNT(*) FILTER (WHERE d.total_clicks > 0)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
      2
    ),
    'conversion_rate', ROUND(
      (COUNT(DISTINCT d.prospect_id) FILTER (WHERE p.converted = true)::DECIMAL / 
       NULLIF(COUNT(DISTINCT d.prospect_id), 0)) * 100,
      2
    )
  ) INTO v_metrics
  FROM public.followup_deliveries d
  JOIN public.followup_messages m ON d.message_id = m.id
  JOIN public.followup_prospects p ON d.prospect_id = p.id
  WHERE m.sequence_id = p_sequence_id
    AND d.delivery_status NOT IN ('pending', 'failed');
  
  RETURN COALESCE(v_metrics, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

COMMIT;

