-- Migration: Presentation Generator Enhancements
-- Related: GitHub Issue #327 - Enhanced Presentation Generator
-- This migration adds:
-- 1. RPC function to prevent race conditions in progress updates
-- 2. Storage bucket for presentation media (DALL-E images)

-- Create RPC function for atomic progress updates
-- Uses GREATEST() to ensure progress only increases (prevents race conditions)
CREATE OR REPLACE FUNCTION update_presentation_progress(
    p_presentation_id UUID,
    p_progress INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE presentations
    SET generation_progress = GREATEST(generation_progress, p_progress)
    WHERE id = p_presentation_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_presentation_progress(UUID, INTEGER) TO authenticated;

-- Create storage bucket for presentation media if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'presentation-media',
    'presentation-media',
    true,
    10485760, -- 10MB max file size
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for authenticated users to upload
CREATE POLICY "Users can upload presentation media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'presentation-media'
    AND (storage.foldername(name))[1] = 'presentations'
);

-- Create storage policy for public read access
CREATE POLICY "Public read access for presentation media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'presentation-media');

-- Create storage policy for users to update their own images
CREATE POLICY "Users can update presentation media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'presentation-media')
WITH CHECK (bucket_id = 'presentation-media');

-- Create storage policy for users to delete their own images
CREATE POLICY "Users can delete presentation media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'presentation-media');

-- Add comment for documentation
COMMENT ON FUNCTION update_presentation_progress(UUID, INTEGER) IS
'Atomically updates presentation generation progress. Uses GREATEST() to prevent race conditions where out-of-order updates could show progress going backward.';
