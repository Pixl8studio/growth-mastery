-- ===========================================
-- Brand Designs: Add UNIQUE constraint on funnel_project_id
-- Migration: Fix upsert operation by adding required unique constraint
-- Created: 2025-12-10
-- Issue: #248 - Brand Design AI Generation Failure
-- ===========================================
BEGIN;

-- Add unique constraint on funnel_project_id
-- This is required for the upsert operation in /api/generate/brand-design
-- to work correctly with onConflict: "funnel_project_id"
ALTER TABLE public.brand_designs
ADD CONSTRAINT brand_designs_funnel_project_id_key UNIQUE (funnel_project_id);

COMMIT;
