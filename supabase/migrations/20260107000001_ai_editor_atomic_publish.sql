-- Migration: Atomic AI Editor Page Publish Function
-- Purpose: Provide atomic publish/unpublish operations for AI editor pages
--          to prevent data inconsistency from partial updates
--
-- NOTE ON MANUAL CREATION:
-- This migration was manually created to introduce a new PostgreSQL function.
-- It addresses the PR #414 concern about best-effort rollback being insufficient
-- for maintaining data consistency during publish operations.
--
-- ROLLBACK PROCEDURE:
-- To rollback this migration, run:
--   DROP FUNCTION IF EXISTS publish_ai_editor_page(UUID, UUID, TEXT);
--   DROP FUNCTION IF EXISTS unpublish_ai_editor_page(UUID, UUID);
--
-- ============================================
-- ATOMIC PUBLISH FUNCTION
-- ============================================
-- This function atomically:
-- 1. Validates page ownership
-- 2. Checks slug availability
-- 3. Updates page status, slug, published_url, and published_at
-- 4. Returns the published page data
--
-- On any failure, the entire transaction is rolled back.
CREATE OR REPLACE FUNCTION publish_ai_editor_page (p_page_id UUID, p_user_id UUID, p_slug TEXT) RETURNS JSONB AS $$
DECLARE
    v_page ai_editor_pages%ROWTYPE;
    v_existing_slug_count INTEGER;
    v_published_url TEXT;
    v_result JSONB;
BEGIN
    -- Lock the page row for update to prevent race conditions
    SELECT * INTO v_page
    FROM ai_editor_pages
    WHERE id = p_page_id
    FOR UPDATE;

    -- Validate page exists
    IF v_page.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Page not found',
            'error_code', 'PAGE_NOT_FOUND'
        );
    END IF;

    -- Validate ownership
    IF v_page.user_id != p_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You do not have access to this page',
            'error_code', 'UNAUTHORIZED'
        );
    END IF;

    -- Check slug availability (excluding current page)
    SELECT COUNT(*) INTO v_existing_slug_count
    FROM ai_editor_pages
    WHERE slug = p_slug
      AND id != p_page_id
      AND status = 'published';

    IF v_existing_slug_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Slug is already in use by another page',
            'error_code', 'SLUG_COLLISION'
        );
    END IF;

    -- Generate published URL (format: /p/{slug})
    v_published_url := '/p/' || p_slug;

    -- Atomic update of all publish-related fields
    UPDATE ai_editor_pages
    SET
        status = 'published',
        slug = p_slug,
        published_url = v_published_url,
        published_at = NOW(),
        updated_at = NOW(),
        version = COALESCE(version, 0) + 1
    WHERE id = p_page_id;

    -- Create version record for the publish event
    INSERT INTO ai_editor_versions (
        page_id,
        version,
        html_content,
        change_description
    ) VALUES (
        p_page_id,
        COALESCE(v_page.version, 0) + 1,
        v_page.html_content,
        'Page published with slug: ' || p_slug
    );

    -- Return success with page data
    SELECT jsonb_build_object(
        'success', true,
        'page', jsonb_build_object(
            'id', id,
            'title', title,
            'slug', slug,
            'status', status,
            'published_url', published_url,
            'published_at', published_at,
            'version', version
        )
    ) INTO v_result
    FROM ai_editor_pages
    WHERE id = p_page_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ATOMIC UNPUBLISH FUNCTION
-- ============================================
-- This function atomically unpublishes a page
CREATE OR REPLACE FUNCTION unpublish_ai_editor_page (p_page_id UUID, p_user_id UUID) RETURNS JSONB AS $$
DECLARE
    v_page ai_editor_pages%ROWTYPE;
    v_result JSONB;
BEGIN
    -- Lock the page row for update
    SELECT * INTO v_page
    FROM ai_editor_pages
    WHERE id = p_page_id
    FOR UPDATE;

    -- Validate page exists
    IF v_page.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Page not found',
            'error_code', 'PAGE_NOT_FOUND'
        );
    END IF;

    -- Validate ownership
    IF v_page.user_id != p_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You do not have access to this page',
            'error_code', 'UNAUTHORIZED'
        );
    END IF;

    -- Atomic update
    UPDATE ai_editor_pages
    SET
        status = 'draft',
        published_url = NULL,
        published_at = NULL,
        updated_at = NOW()
    WHERE id = p_page_id;

    -- Return success
    SELECT jsonb_build_object(
        'success', true,
        'page', jsonb_build_object(
            'id', id,
            'title', title,
            'slug', slug,
            'status', status
        )
    ) INTO v_result
    FROM ai_editor_pages
    WHERE id = p_page_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT
EXECUTE ON FUNCTION publish_ai_editor_page TO authenticated;

GRANT
EXECUTE ON FUNCTION unpublish_ai_editor_page TO authenticated;

COMMENT ON FUNCTION publish_ai_editor_page IS 'Atomically publishes an AI editor page with slug validation and all publish fields updated in a single transaction';

COMMENT ON FUNCTION unpublish_ai_editor_page IS 'Atomically unpublishes an AI editor page, clearing publish-related fields';
