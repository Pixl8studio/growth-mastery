-- ===========================================
-- Genie AI - Row Level Security & Functions
-- Migration: RLS policies, triggers, and helper functions
-- Created: 2025-01-23
-- ===========================================

BEGIN;

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 1;
BEGIN
  -- Generate base username from email
  base_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  base_username := REGEXP_REPLACE(base_username, '[^a-z0-9]+', '-', 'g');
  base_username := REGEXP_REPLACE(base_username, '^-+|-+$', '', 'g');
  
  -- Ensure username is at least 3 characters
  IF LENGTH(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;
  
  -- Find unique username
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;
  
  -- Insert user profile
  INSERT INTO public.user_profiles (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Updated_at triggers
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_funnel_projects_updated_at
  BEFORE UPDATE ON public.funnel_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_deck_structures_updated_at
  BEFORE UPDATE ON public.deck_structures
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_enrollment_pages_updated_at
  BEFORE UPDATE ON public.enrollment_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_talk_tracks_updated_at
  BEFORE UPDATE ON public.talk_tracks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_watch_pages_updated_at
  BEFORE UPDATE ON public.watch_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_registration_pages_updated_at
  BEFORE UPDATE ON public.registration_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_funnel_flows_updated_at
  BEFORE UPDATE ON public.funnel_flows
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create user profile trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vapi_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamma_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talk_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- USER PROFILES POLICIES
-- ===========================================

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ===========================================
-- FUNNEL PROJECTS POLICIES
-- ===========================================

CREATE POLICY "Users can view own projects"
  ON public.funnel_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON public.funnel_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.funnel_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.funnel_projects FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- VAPI TRANSCRIPTS POLICIES
-- ===========================================

CREATE POLICY "Users can view own transcripts"
  ON public.vapi_transcripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transcripts"
  ON public.vapi_transcripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcripts"
  ON public.vapi_transcripts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcripts"
  ON public.vapi_transcripts FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- OFFERS POLICIES
-- ===========================================

CREATE POLICY "Users can view own offers"
  ON public.offers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own offers"
  ON public.offers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own offers"
  ON public.offers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own offers"
  ON public.offers FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- DECK STRUCTURES POLICIES
-- ===========================================

CREATE POLICY "Users can view own decks"
  ON public.deck_structures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own decks"
  ON public.deck_structures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decks"
  ON public.deck_structures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decks"
  ON public.deck_structures FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- GAMMA DECKS POLICIES
-- ===========================================

CREATE POLICY "Users can view own gamma decks"
  ON public.gamma_decks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own gamma decks"
  ON public.gamma_decks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gamma decks"
  ON public.gamma_decks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gamma decks"
  ON public.gamma_decks FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- ENROLLMENT PAGES POLICIES
-- ===========================================

CREATE POLICY "Users can view own enrollment pages"
  ON public.enrollment_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own enrollment pages"
  ON public.enrollment_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment pages"
  ON public.enrollment_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own enrollment pages"
  ON public.enrollment_pages FOR DELETE
  USING (auth.uid() = user_id);

-- Public can view published enrollment pages
CREATE POLICY "Public can view published enrollment pages"
  ON public.enrollment_pages FOR SELECT
  USING (is_published = true);

-- ===========================================
-- TALK TRACKS POLICIES
-- ===========================================

CREATE POLICY "Users can view own talk tracks"
  ON public.talk_tracks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own talk tracks"
  ON public.talk_tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own talk tracks"
  ON public.talk_tracks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own talk tracks"
  ON public.talk_tracks FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- PITCH VIDEOS POLICIES
-- ===========================================

CREATE POLICY "Users can view own videos"
  ON public.pitch_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own videos"
  ON public.pitch_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
  ON public.pitch_videos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos"
  ON public.pitch_videos FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- WATCH PAGES POLICIES
-- ===========================================

CREATE POLICY "Users can view own watch pages"
  ON public.watch_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own watch pages"
  ON public.watch_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watch pages"
  ON public.watch_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watch pages"
  ON public.watch_pages FOR DELETE
  USING (auth.uid() = user_id);

-- Public can view published watch pages
CREATE POLICY "Public can view published watch pages"
  ON public.watch_pages FOR SELECT
  USING (is_published = true);

-- ===========================================
-- REGISTRATION PAGES POLICIES
-- ===========================================

CREATE POLICY "Users can view own registration pages"
  ON public.registration_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own registration pages"
  ON public.registration_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own registration pages"
  ON public.registration_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own registration pages"
  ON public.registration_pages FOR DELETE
  USING (auth.uid() = user_id);

-- Public can view published registration pages
CREATE POLICY "Public can view published registration pages"
  ON public.registration_pages FOR SELECT
  USING (is_published = true);

-- ===========================================
-- FUNNEL FLOWS POLICIES
-- ===========================================

CREATE POLICY "Users can view own flows"
  ON public.funnel_flows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flows"
  ON public.funnel_flows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flows"
  ON public.funnel_flows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flows"
  ON public.funnel_flows FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- CONTACTS POLICIES
-- ===========================================

CREATE POLICY "Users can view own contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- CONTACT EVENTS POLICIES
-- ===========================================

CREATE POLICY "Users can view own contact events"
  ON public.contact_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE contacts.id = contact_events.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can insert contact events"
  ON public.contact_events FOR INSERT
  WITH CHECK (true); -- Allow tracking from public pages

-- ===========================================
-- ANALYTICS POLICIES
-- ===========================================

CREATE POLICY "Users can view own analytics"
  ON public.funnel_analytics FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.funnel_projects
      WHERE funnel_projects.id = funnel_analytics.funnel_project_id
      AND funnel_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can insert analytics"
  ON public.funnel_analytics FOR INSERT
  WITH CHECK (true); -- Allow tracking from public pages

-- ===========================================
-- WEBHOOK LOGS POLICIES
-- ===========================================

CREATE POLICY "Users can view own webhook logs"
  ON public.webhook_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert webhook logs"
  ON public.webhook_logs FOR INSERT
  WITH CHECK (true); -- Service role can log

-- ===========================================
-- PAYMENT TRANSACTIONS POLICIES
-- ===========================================

CREATE POLICY "Users can view own transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage transactions"
  ON public.payment_transactions FOR ALL
  USING (true); -- Service role manages payments

-- ===========================================
-- STRIPE ACCOUNTS POLICIES
-- ===========================================

CREATE POLICY "Users can view own stripe account"
  ON public.stripe_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stripe account"
  ON public.stripe_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage stripe accounts"
  ON public.stripe_accounts FOR INSERT
  WITH CHECK (true); -- Service role creates

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;
