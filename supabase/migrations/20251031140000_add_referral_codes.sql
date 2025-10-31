-- ===========================================
-- Referral Code System
-- Migration: Add referral codes table and integrate with user signup
-- Created: 2025-10-31
-- ===========================================
BEGIN;

-- ===========================================
-- REFERRAL CODES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  -- Code details
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  -- Status and usage
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER, -- NULL means unlimited
  current_uses INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_referral_codes_code ON public.referral_codes (code);

CREATE INDEX idx_referral_codes_active ON public.referral_codes (is_active)
WHERE
  is_active = true;

CREATE INDEX idx_referral_codes_code_upper ON public.referral_codes (UPPER(code));

-- Insert initial referral code
INSERT INTO
  public.referral_codes (code, description, is_active, max_uses)
VALUES
  (
    'POWERGROWTH',
    'Initial launch referral code',
    true,
    NULL
  );

-- ===========================================
-- UPDATE USER PROFILES TABLE
-- ===========================================
-- Add referral code tracking to user profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS referral_code_id UUID REFERENCES public.referral_codes (id) ON DELETE SET NULL;

CREATE INDEX idx_user_profiles_referral_code ON public.user_profiles (referral_code_id);

-- ===========================================
-- UPDATE HANDLE_NEW_USER FUNCTION
-- ===========================================
-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with referral code support
CREATE OR REPLACE FUNCTION public.handle_new_user () RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 1;
  referral_code_text TEXT;
  referral_code_record RECORD;
BEGIN
  -- Extract referral code from metadata
  referral_code_text := NEW.raw_user_meta_data->>'referral_code';

  -- If referral code provided, look it up and validate
  IF referral_code_text IS NOT NULL AND referral_code_text != '' THEN
    -- Find the referral code (case-insensitive)
    SELECT * INTO referral_code_record
    FROM public.referral_codes
    WHERE UPPER(code) = UPPER(referral_code_text)
      AND is_active = true
      AND (max_uses IS NULL OR current_uses < max_uses);

    -- If valid code found, increment usage
    IF FOUND THEN
      UPDATE public.referral_codes
      SET current_uses = current_uses + 1,
          updated_at = NOW()
      WHERE id = referral_code_record.id;
    END IF;
  END IF;

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

  -- Insert user profile with referral code reference
  INSERT INTO public.user_profiles (id, email, username, full_name, referral_code_id)
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    referral_code_record.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user ();

-- ===========================================
-- UPDATED_AT TRIGGER FOR REFERRAL CODES
-- ===========================================
CREATE TRIGGER set_referral_codes_updated_at BEFORE
UPDATE ON public.referral_codes FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at ();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Public can view active referral codes (for validation)
CREATE POLICY "Public can view active referral codes" ON public.referral_codes FOR
SELECT
  USING (is_active = true);

-- Authenticated users can view all referral codes (for future admin panel)
CREATE POLICY "Authenticated users can view all referral codes" ON public.referral_codes FOR
SELECT
  TO authenticated USING (true);

-- Service role can manage referral codes
CREATE POLICY "Service role can insert referral codes" ON public.referral_codes FOR INSERT TO service_role
WITH
  CHECK (true);

CREATE POLICY "Service role can update referral codes" ON public.referral_codes
FOR UPDATE
  TO service_role USING (true);

CREATE POLICY "Service role can delete referral codes" ON public.referral_codes FOR DELETE TO service_role USING (true);

COMMIT;
