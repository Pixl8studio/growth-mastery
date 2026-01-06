-- Migration: Funnel Map Nodes
-- Purpose: Store AI-generated drafts and user refinements for each funnel node
-- This supports the Step 2 Visual Funnel Co-Creation Experience

-- ============================================
-- FUNNEL NODE DATA TABLE
-- ============================================
-- Stores content and AI conversations for each funnel node type
CREATE TABLE IF NOT EXISTS public.funnel_node_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    funnel_project_id UUID NOT NULL REFERENCES public.funnel_projects (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    -- Node identification
    node_type TEXT NOT NULL CHECK (
        node_type IN (
            'traffic_source',
            'registration',
            'masterclass',
            'core_offer',
            'checkout',
            'upsells',
            'call_booking',
            'sales_call',
            'thank_you'
        )
    ),
    -- AI-generated draft content (from Step 1 business profile)
    draft_content JSONB NOT NULL DEFAULT '{}',
    -- User-refined content (after AI conversation)
    refined_content JSONB NOT NULL DEFAULT '{}',
    -- Conversation history with AI for this node
    conversation_history JSONB NOT NULL DEFAULT '[]',
    -- Node status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'refined', 'completed')),
    -- Whether this node is included in the funnel (for optional nodes like upsells)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    -- Pathway type affects which nodes are shown
    pathway_type TEXT CHECK (pathway_type IN ('direct_purchase', 'book_call')),
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one node type per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_node_data_unique ON public.funnel_node_data (funnel_project_id, node_type);

-- Index for fast lookups by project
CREATE INDEX IF NOT EXISTS idx_funnel_node_data_project ON public.funnel_node_data (funnel_project_id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_funnel_node_data_user ON public.funnel_node_data (user_id);

-- ============================================
-- FUNNEL MAP CONFIGURATION TABLE
-- ============================================
-- Stores the overall funnel map configuration and pathway selection
CREATE TABLE IF NOT EXISTS public.funnel_map_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    funnel_project_id UUID NOT NULL UNIQUE REFERENCES public.funnel_projects (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    -- Purchase pathway: direct_purchase (<$2000) or book_call (>=$2000)
    pathway_type TEXT NOT NULL DEFAULT 'direct_purchase' CHECK (pathway_type IN ('direct_purchase', 'book_call')),
    -- Whether AI drafts have been generated
    drafts_generated BOOLEAN NOT NULL DEFAULT FALSE,
    drafts_generated_at TIMESTAMPTZ,
    -- Overall completion percentage
    completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (
        completion_percentage >= 0
        AND completion_percentage <= 100
    ),
    -- Step 2 completion flag (replaces old offer-based completion)
    is_step2_complete BOOLEAN NOT NULL DEFAULT FALSE,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_funnel_map_config_project ON public.funnel_map_config (funnel_project_id);

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================
-- Trigger function for updating timestamps
CREATE
OR REPLACE FUNCTION update_funnel_node_data_updated_at () RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for funnel_node_data
DROP TRIGGER IF EXISTS trigger_update_funnel_node_data_updated_at ON public.funnel_node_data;

CREATE TRIGGER trigger_update_funnel_node_data_updated_at BEFORE
UPDATE ON public.funnel_node_data FOR EACH ROW
EXECUTE FUNCTION update_funnel_node_data_updated_at ();

-- Trigger for funnel_map_config
DROP TRIGGER IF EXISTS trigger_update_funnel_map_config_updated_at ON public.funnel_map_config;

CREATE TRIGGER trigger_update_funnel_map_config_updated_at BEFORE
UPDATE ON public.funnel_map_config FOR EACH ROW
EXECUTE FUNCTION update_funnel_node_data_updated_at ();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS
ALTER TABLE public.funnel_node_data ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.funnel_map_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for funnel_node_data
CREATE POLICY "Users can view their own funnel node data" ON public.funnel_node_data FOR
SELECT
    USING (auth.uid () = user_id);

CREATE POLICY "Users can insert their own funnel node data" ON public.funnel_node_data FOR INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update their own funnel node data" ON public.funnel_node_data
FOR UPDATE
    USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can delete their own funnel node data" ON public.funnel_node_data FOR DELETE USING (auth.uid () = user_id);

-- RLS policies for funnel_map_config
CREATE POLICY "Users can view their own funnel map config" ON public.funnel_map_config FOR
SELECT
    USING (auth.uid () = user_id);

CREATE POLICY "Users can insert their own funnel map config" ON public.funnel_map_config FOR INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update their own funnel map config" ON public.funnel_map_config
FOR UPDATE
    USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can delete their own funnel map config" ON public.funnel_map_config FOR DELETE USING (auth.uid () = user_id);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.funnel_node_data IS 'Stores AI-generated drafts and user refinements for each funnel node in Step 2';

COMMENT ON TABLE public.funnel_map_config IS 'Stores the overall funnel map configuration including pathway type and completion status';

COMMENT ON COLUMN public.funnel_node_data.draft_content IS 'AI-generated initial content based on Step 1 business profile';

COMMENT ON COLUMN public.funnel_node_data.refined_content IS 'User-refined content after AI conversation';

COMMENT ON COLUMN public.funnel_node_data.conversation_history IS 'Array of conversation messages between user and AI for this node';
