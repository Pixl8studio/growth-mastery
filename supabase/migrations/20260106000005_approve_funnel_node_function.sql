-- Migration: Atomic funnel node approval function
-- Issue #407 - Transaction safety for node approval workflow
--
-- This function handles node approval with row-level locking to prevent
-- race conditions when multiple approval requests occur simultaneously.
CREATE OR REPLACE FUNCTION public.approve_funnel_node (
  p_project_id UUID,
  p_node_type TEXT,
  p_user_id UUID,
  p_content_to_approve JSONB
) RETURNS TABLE (
  success BOOLEAN,
  approved_at TIMESTAMPTZ,
  approved_count INTEGER,
  total_count INTEGER,
  all_approved BOOLEAN,
  error_message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_node_id UUID;
    v_approved_at TIMESTAMPTZ := NOW();
    v_approved_count INTEGER;
    v_total_count INTEGER;
BEGIN
    -- Select with row-level lock to prevent concurrent updates
    SELECT id INTO v_node_id
    FROM public.funnel_node_data
    WHERE funnel_project_id = p_project_id
      AND node_type = p_node_type
      AND user_id = p_user_id
    FOR UPDATE;

    -- Handle node not found
    IF v_node_id IS NULL THEN
        RETURN QUERY SELECT
            FALSE,
            NULL::TIMESTAMPTZ,
            0,
            0,
            FALSE,
            'Node not found'::TEXT;
        RETURN;
    END IF;

    -- Update the node with approval status
    UPDATE public.funnel_node_data
    SET
        is_approved = TRUE,
        approved_at = v_approved_at,
        approved_content = p_content_to_approve,
        status = 'completed',
        updated_at = NOW()
    WHERE id = v_node_id;

    -- Count approved nodes for this project
    SELECT
        COUNT(*) FILTER (WHERE is_approved = TRUE),
        COUNT(*)
    INTO v_approved_count, v_total_count
    FROM public.funnel_node_data
    WHERE funnel_project_id = p_project_id
      AND user_id = p_user_id;

    -- Update config table with approval progress
    UPDATE public.funnel_map_config
    SET
        nodes_approved_count = v_approved_count,
        total_nodes_count = v_total_count,
        all_nodes_approved = (v_approved_count >= v_total_count),
        updated_at = NOW()
    WHERE funnel_project_id = p_project_id
      AND user_id = p_user_id;

    -- Return success with counts
    RETURN QUERY SELECT
        TRUE,
        v_approved_at,
        v_approved_count,
        v_total_count,
        (v_approved_count >= v_total_count),
        NULL::TEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT
EXECUTE ON FUNCTION public.approve_funnel_node (UUID, TEXT, UUID, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.approve_funnel_node IS 'Atomically approve a funnel node with row-level locking to prevent race conditions. Updates both funnel_node_data and funnel_map_config tables in a single transaction.';

-- Rollback instructions (commented out for safety)
-- DROP FUNCTION IF EXISTS public.approve_funnel_node(UUID, TEXT, UUID, JSONB);
