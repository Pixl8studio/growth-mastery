-- Add page_media table for tracking uploaded and AI-generated images
-- This supports the enhanced page editor with image generation and upload capabilities
-- Create enum for media types
CREATE TYPE page_media_type AS ENUM(
  'uploaded_image',
  'ai_generated_image',
  'pitch_video'
);

-- Create page_media table
CREATE TABLE page_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_project_id UUID NOT NULL REFERENCES funnel_projects (id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages (id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  media_type page_media_type NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  prompt TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_page_media_funnel_project ON page_media (funnel_project_id);

CREATE INDEX idx_page_media_page_id ON page_media (page_id);

CREATE INDEX idx_page_media_user_id ON page_media (user_id);

CREATE INDEX idx_page_media_type ON page_media (media_type);

CREATE INDEX idx_page_media_created_at ON page_media (created_at DESC);

-- Enable RLS
ALTER TABLE page_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access media for their own projects
CREATE POLICY "Users can view their own project media" ON page_media FOR
SELECT
  USING (user_id = auth.uid ());

CREATE POLICY "Users can insert their own project media" ON page_media FOR INSERT
WITH
  CHECK (user_id = auth.uid ());

CREATE POLICY "Users can update their own project media" ON page_media
FOR UPDATE
  USING (user_id = auth.uid ());

CREATE POLICY "Users can delete their own project media" ON page_media FOR DELETE USING (user_id = auth.uid ());

-- Add trigger for updated_at
CREATE TRIGGER update_page_media_updated_at BEFORE
UPDATE ON page_media FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

-- Add comment for documentation
COMMENT ON TABLE page_media IS 'Stores metadata for uploaded images, AI-generated images, and video references used in funnel pages';

COMMENT ON COLUMN page_media.prompt IS 'AI generation prompt for DALL-E generated images';

COMMENT ON COLUMN page_media.metadata IS 'JSON object containing width, height, file_size, mime_type, etc.';

-- Storage bucket will be created via Supabase dashboard or management API
-- Bucket name: page-media
-- Access: public (for displaying images on published pages)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
