-- Migration: Auto-Generation Tracking
-- Track auto-generation status for funnel projects
BEGIN;

-- Add auto_generation_status column to funnel_projects
ALTER TABLE public.funnel_projects
ADD COLUMN IF NOT EXISTS auto_generation_status JSONB DEFAULT '{
  "last_generated_at": null,
  "intake_id_used": null,
  "generated_steps": [],
  "regeneration_count": 0,
  "generation_errors": [],
  "is_generating": false
}'::jsonb;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_funnel_projects_auto_generation ON public.funnel_projects USING gin (auto_generation_status);

-- Add comment
COMMENT ON COLUMN public.funnel_projects.auto_generation_status IS 'Tracks auto-generation status including last generation timestamp, intake ID used, which steps were generated, regeneration count, and any errors encountered';

COMMIT;
