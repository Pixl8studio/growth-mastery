-- ===========================================
-- Custom Domains Table
-- Migration: Add support for custom domains via Vercel API
-- Created: 2025-01-27
-- ===========================================

BEGIN;

-- Create function for updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create custom_domains table
CREATE TABLE IF NOT EXISTS public.custom_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  
  -- Domain details
  domain TEXT NOT NULL UNIQUE,
  is_subdomain BOOLEAN DEFAULT true,
  
  -- Verification status
  verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending',
  vercel_domain_id TEXT,
  
  -- DNS configuration
  dns_instructions JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_custom_domains_user ON public.custom_domains(user_id);
CREATE INDEX idx_custom_domains_domain ON public.custom_domains(domain);
CREATE INDEX idx_custom_domains_verified ON public.custom_domains(verified) WHERE verified = true;
CREATE INDEX idx_custom_domains_project ON public.custom_domains(funnel_project_id);

-- Enable Row Level Security
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own domains"
  ON public.custom_domains FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own domains"
  ON public.custom_domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains"
  ON public.custom_domains FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains"
  ON public.custom_domains FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_custom_domains_updated_at
  BEFORE UPDATE ON public.custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
