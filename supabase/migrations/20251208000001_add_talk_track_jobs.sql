-- ===========================================
-- Talk Track Jobs Table
-- Migration: Add background job tracking for talk track generation
-- Created: 2025-12-08
-- Fixes: GitHub Issue #51 - Generate Talk Track doesn't complete
-- ===========================================

BEGIN;

-- ===========================================
-- TALK TRACK JOBS TABLE
-- Tracks background generation jobs for talk tracks
-- ===========================================

CREATE TABLE IF NOT EXISTS public.talk_track_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects(id) ON DELETE CASCADE,
  deck_structure_id UUID NOT NULL REFERENCES public.deck_structures(id) ON DELETE CASCADE,

  -- Job status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100 percentage
  current_chunk INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,

  -- Result reference
  talk_track_id UUID REFERENCES public.talk_tracks(id) ON DELETE SET NULL,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_talk_track_jobs_user ON public.talk_track_jobs(user_id);
CREATE INDEX idx_talk_track_jobs_project ON public.talk_track_jobs(funnel_project_id);
CREATE INDEX idx_talk_track_jobs_status ON public.talk_track_jobs(status);
CREATE INDEX idx_talk_track_jobs_active ON public.talk_track_jobs(funnel_project_id, status)
  WHERE status IN ('pending', 'processing');

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE public.talk_track_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view their own talk track jobs"
  ON public.talk_track_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own jobs
CREATE POLICY "Users can create their own talk track jobs"
  ON public.talk_track_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own jobs (for client-side status checks)
CREATE POLICY "Users can update their own talk track jobs"
  ON public.talk_track_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own jobs
CREATE POLICY "Users can delete their own talk track jobs"
  ON public.talk_track_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- UPDATED_AT TRIGGER
-- ===========================================

CREATE TRIGGER set_talk_track_jobs_updated_at
  BEFORE UPDATE ON public.talk_track_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
