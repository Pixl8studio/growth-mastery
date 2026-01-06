-- Migration: Fix Conversation History Ordering
-- Purpose: Add secondary sort key to prevent non-deterministic ordering
--          when messages have identical timestamps
--
-- ROLLBACK PROCEDURE:
-- To rollback this migration, restore the previous version of the function:
--   See migration 20260106000002_funnel_map_atomic_update.sql for the original function
--
-- This migration modifies the merge_funnel_node_conversation function to include
-- the message 'id' as a secondary sort key, ensuring deterministic ordering.

-- ============================================
-- UPDATED ATOMIC JSONB MERGE FUNCTION
-- ============================================
-- Added: Secondary sort key using message 'id' for deterministic ordering
-- when timestamps are identical (e.g., rapid-fire messages in same millisecond)
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
        -- Secondary sort by message 'id' ensures deterministic ordering when timestamps match
        conversation_history = (
            SELECT jsonb_agg(elem ORDER BY rn)
            FROM (
                SELECT elem, ROW_NUMBER() OVER (
                    ORDER BY
                        COALESCE((elem->>'timestamp')::timestamptz, NOW()) DESC,
                        elem->>'id' DESC
                ) as rn
                FROM jsonb_array_elements(
                    COALESCE(funnel_node_data.conversation_history, '[]'::jsonb) || jsonb_build_array(p_new_message)
                ) AS elem
                ORDER BY COALESCE((elem->>'timestamp')::timestamptz, NOW()) DESC, elem->>'id' DESC
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

COMMENT ON FUNCTION merge_funnel_node_conversation IS 'Atomically updates funnel node conversation history and merges suggested changes. Uses timestamp + id for deterministic ordering.';
