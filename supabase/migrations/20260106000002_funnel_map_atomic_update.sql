-- Migration: Atomic JSONB Update Function
-- Purpose: Provide atomic JSONB merge for conversation updates to prevent race conditions
--
-- NOTE ON MANUAL CREATION:
-- This migration was manually created rather than auto-generated via `supabase db diff`
-- because it introduces a new PostgreSQL function (not modifications to existing schema).
-- Subsequent modifications should use `supabase db diff` per project standards.
--
-- APPLIED VIA: Supabase Management API (2026-01-06)
-- SUPERSEDED BY: 20260106000003_fix_conversation_ordering.sql (improved ordering logic)
--
-- ROLLBACK PROCEDURE:
-- To rollback this migration, run:
--   DROP FUNCTION IF EXISTS merge_funnel_node_conversation(UUID, UUID, TEXT, JSONB, JSONB);
--
-- This will remove the atomic merge function. The application will need to be updated
-- to use direct INSERT/UPDATE operations (with potential race conditions) or an alternative
-- approach if this function is rolled back.

-- ============================================
-- ATOMIC JSONB MERGE FUNCTION
-- ============================================
-- This function atomically merges new content into refined_content
-- and appends to conversation_history, preventing race conditions
CREATE OR REPLACE FUNCTION merge_funnel_node_conversation(
    p_funnel_project_id UUID,
    p_user_id UUID,
    p_node_type TEXT,
    p_new_message JSONB,
    p_suggested_changes JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Insert or update with atomic operations
    INSERT INTO public.funnel_node_data (
        funnel_project_id,
        user_id,
        node_type,
        conversation_history,
        refined_content,
        status
    )
    VALUES (
        p_funnel_project_id,
        p_user_id,
        p_node_type,
        jsonb_build_array(p_new_message),
        COALESCE(p_suggested_changes, '{}'::jsonb),
        'in_progress'
    )
    ON CONFLICT (funnel_project_id, node_type)
    DO UPDATE SET
        -- Append new message to conversation history (keep last 100 messages)
        -- Uses COALESCE on timestamp casting to handle malformed JSONB gracefully
        conversation_history = (
            SELECT jsonb_agg(elem)
            FROM (
                SELECT elem
                FROM jsonb_array_elements(
                    COALESCE(funnel_node_data.conversation_history, '[]'::jsonb) || jsonb_build_array(p_new_message)
                ) AS elem
                ORDER BY COALESCE((elem->>'timestamp')::timestamptz, NOW()) DESC
                LIMIT 100
            ) sub
        ),
        -- Merge suggested changes into refined_content atomically
        refined_content = CASE
            WHEN p_suggested_changes IS NOT NULL
            THEN COALESCE(funnel_node_data.refined_content, '{}'::jsonb) || p_suggested_changes
            ELSE funnel_node_data.refined_content
        END,
        status = 'in_progress',
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION merge_funnel_node_conversation TO authenticated;

COMMENT ON FUNCTION merge_funnel_node_conversation IS 'Atomically updates funnel node conversation history and merges suggested changes to prevent race conditions';
