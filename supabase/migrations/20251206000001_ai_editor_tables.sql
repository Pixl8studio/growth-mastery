-- ===========================================
-- AI Landing Page Editor v2 - Database Schema
-- Migration: Tables for AI editor pages, conversations, and versions
-- Created: 2025-12-06
-- Related: GitHub Issue #164 - Phase 1 Foundation
-- ===========================================
BEGIN;

-- ===========================================
-- AI EDITOR PAGES TABLE
-- Stores generated landing pages with their HTML content
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ai_editor_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects (id) ON DELETE CASCADE,
  page_type TEXT NOT NULL CHECK (
    page_type IN ('registration', 'watch', 'enrollment')
  ),
  title TEXT NOT NULL,
  html_content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  version INTEGER NOT NULL DEFAULT 1,
  slug TEXT,
  published_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  -- Ensure unique slug per user
  CONSTRAINT unique_ai_editor_page_slug UNIQUE (user_id, slug)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_ai_editor_pages_user_id ON public.ai_editor_pages (user_id);

CREATE INDEX IF NOT EXISTS idx_ai_editor_pages_funnel_project_id ON public.ai_editor_pages (funnel_project_id);

CREATE INDEX IF NOT EXISTS idx_ai_editor_pages_page_type ON public.ai_editor_pages (page_type);

CREATE INDEX IF NOT EXISTS idx_ai_editor_pages_status ON public.ai_editor_pages (status);

-- ===========================================
-- AI EDITOR CONVERSATIONS TABLE
-- Stores chat history for each page editing session
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ai_editor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.ai_editor_pages (id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_edits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_ai_editor_conversations_page_id ON public.ai_editor_conversations (page_id);

-- ===========================================
-- AI EDITOR VERSIONS TABLE
-- Stores version history for undo/redo functionality
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ai_editor_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.ai_editor_pages (id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  html_content TEXT NOT NULL,
  change_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure unique version per page
  CONSTRAINT unique_ai_editor_version UNIQUE (page_id, version)
);

-- Index for efficient lookups and ordering
CREATE INDEX IF NOT EXISTS idx_ai_editor_versions_page_id ON public.ai_editor_versions (page_id);

CREATE INDEX IF NOT EXISTS idx_ai_editor_versions_created_at ON public.ai_editor_versions (created_at DESC);

-- ===========================================
-- TRIGGERS FOR UPDATED_AT
-- ===========================================
CREATE TRIGGER set_ai_editor_pages_updated_at BEFORE
UPDATE ON public.ai_editor_pages FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at ();

CREATE TRIGGER set_ai_editor_conversations_updated_at BEFORE
UPDATE ON public.ai_editor_conversations FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at ();

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- Ensure users can only access their own data
-- ===========================================
-- Enable RLS on all tables
ALTER TABLE public.ai_editor_pages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_editor_conversations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_editor_versions ENABLE ROW LEVEL SECURITY;

-- AI Editor Pages Policies
CREATE POLICY "Users can view their own AI editor pages" ON public.ai_editor_pages FOR
SELECT
  TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "Users can create their own AI editor pages" ON public.ai_editor_pages FOR INSERT TO authenticated
WITH
  CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update their own AI editor pages" ON public.ai_editor_pages
FOR UPDATE
  TO authenticated USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);

CREATE POLICY "Users can delete their own AI editor pages" ON public.ai_editor_pages FOR DELETE TO authenticated USING (auth.uid () = user_id);

-- AI Editor Conversations Policies (access through page ownership)
CREATE POLICY "Users can view conversations for their own pages" ON public.ai_editor_conversations FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.ai_editor_pages
      WHERE
        ai_editor_pages.id = ai_editor_conversations.page_id
        AND ai_editor_pages.user_id = auth.uid ()
    )
  );

CREATE POLICY "Users can create conversations for their own pages" ON public.ai_editor_conversations FOR INSERT TO authenticated
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.ai_editor_pages
      WHERE
        ai_editor_pages.id = ai_editor_conversations.page_id
        AND ai_editor_pages.user_id = auth.uid ()
    )
  );

CREATE POLICY "Users can update conversations for their own pages" ON public.ai_editor_conversations
FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.ai_editor_pages
      WHERE
        ai_editor_pages.id = ai_editor_conversations.page_id
        AND ai_editor_pages.user_id = auth.uid ()
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.ai_editor_pages
      WHERE
        ai_editor_pages.id = ai_editor_conversations.page_id
        AND ai_editor_pages.user_id = auth.uid ()
    )
  );

CREATE POLICY "Users can delete conversations for their own pages" ON public.ai_editor_conversations FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT
      1
    FROM
      public.ai_editor_pages
    WHERE
      ai_editor_pages.id = ai_editor_conversations.page_id
      AND ai_editor_pages.user_id = auth.uid ()
  )
);

-- AI Editor Versions Policies (access through page ownership)
CREATE POLICY "Users can view versions for their own pages" ON public.ai_editor_versions FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.ai_editor_pages
      WHERE
        ai_editor_pages.id = ai_editor_versions.page_id
        AND ai_editor_pages.user_id = auth.uid ()
    )
  );

CREATE POLICY "Users can create versions for their own pages" ON public.ai_editor_versions FOR INSERT TO authenticated
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.ai_editor_pages
      WHERE
        ai_editor_pages.id = ai_editor_versions.page_id
        AND ai_editor_pages.user_id = auth.uid ()
    )
  );

CREATE POLICY "Users can delete versions for their own pages" ON public.ai_editor_versions FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT
      1
    FROM
      public.ai_editor_pages
    WHERE
      ai_editor_pages.id = ai_editor_versions.page_id
      AND ai_editor_pages.user_id = auth.uid ()
  )
);

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================
COMMENT ON TABLE public.ai_editor_pages IS 'Stores AI-generated landing pages with their HTML content for the v2 editor';

COMMENT ON TABLE public.ai_editor_conversations IS 'Stores chat history for conversational editing sessions';

COMMENT ON TABLE public.ai_editor_versions IS 'Stores version history for undo/redo functionality';

COMMENT ON COLUMN public.ai_editor_pages.page_type IS 'Type of landing page: registration, watch, or enrollment';

COMMENT ON COLUMN public.ai_editor_pages.html_content IS 'Complete standalone HTML content of the page';

COMMENT ON COLUMN public.ai_editor_pages.status IS 'Page status: draft or published';

COMMENT ON COLUMN public.ai_editor_pages.version IS 'Current version number, incremented on each save';

COMMENT ON COLUMN public.ai_editor_conversations.messages IS 'JSON array of chat messages with role (user/assistant) and content';

COMMENT ON COLUMN public.ai_editor_conversations.total_edits IS 'Count of successful edits applied in this conversation';

COMMENT ON COLUMN public.ai_editor_versions.change_description IS 'Human-readable description of what changed in this version';

COMMIT;
