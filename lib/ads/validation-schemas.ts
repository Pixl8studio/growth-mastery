/**
 * Zod Validation Schemas for Ads Manager API
 * Validates all incoming API requests to prevent malformed data
 */

import { z } from "zod";

/**
 * Ad Variation Schema
 */
export const AdVariationSchema = z.object({
    id: z.string(),
    variation_number: z.number().int().min(1).max(10),
    framework: z.string(),
    primary_text: z.string().max(95),
    headline: z.string().max(40),
    link_description: z.string().max(30),
    hooks: z.object({
        long: z.string(),
        short: z.string(),
        curiosity: z.string(),
    }),
    call_to_action: z.string(),
    body_copy: z.string().optional(),
    selected: z.boolean().optional(),
});

/**
 * Audience Configuration Schema
 */
export const AudienceConfigSchema = z.object({
    type: z.enum(["interest", "lookalike", "custom", "saved"]),
    description: z.string().optional(),
    source_file: z.string().optional(),
    targeting: z.object({
        geo_locations: z.object({
            countries: z.array(z.string()).optional(),
            regions: z
                .array(z.object({ key: z.string(), name: z.string() }))
                .optional(),
            cities: z.array(z.object({ key: z.string(), name: z.string() })).optional(),
        }),
        age_min: z.number().int().min(18).max(65).optional(),
        age_max: z.number().int().min(18).max(65).optional(),
        interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
    }),
});

/**
 * Create Campaign Request Schema
 */
export const CreateCampaignSchema = z.object({
    funnel_project_id: z.string().uuid("Invalid funnel project ID"),
    ad_account_id: z.string().min(1, "Ad account ID is required"),
    variations: z
        .array(AdVariationSchema)
        .min(1, "At least one variation required")
        .max(10, "Maximum 10 variations allowed"),
    audience_config: AudienceConfigSchema,
    daily_budget_cents: z
        .number()
        .int()
        .positive("Budget must be positive")
        .max(1000000, "Daily budget cannot exceed $10,000"),
});

/**
 * Generate Variations Request Schema
 */
export const GenerateVariationsSchema = z.object({
    funnel_project_id: z.string().uuid("Invalid funnel project ID"),
});

/**
 * Optimize Campaign Request Schema
 */
export const OptimizeCampaignSchema = z.object({
    campaign_id: z.string().uuid().optional(),
    autopilot: z.boolean().default(false),
});

/**
 * Get Metrics Query Schema
 */
export const GetMetricsSchema = z.object({
    campaign_id: z.string().uuid().optional(),
    date_range: z.enum(["7", "14", "30", "lifetime"]).default("30"),
});

/**
 * Create Audience Request Schema
 */
export const CreateAudienceSchema = z.object({
    funnel_project_id: z.string().uuid(),
    name: z.string().min(1).max(100),
    audience_type: z.enum(["lookalike", "interest", "custom", "saved"]),
    source_data: z.record(z.string(), z.any()),
    targeting_spec: z.record(z.string(), z.any()),
});

/**
 * Update Campaign Status Schema
 */
export const UpdateCampaignStatusSchema = z.object({
    status: z.enum(["active", "paused", "archived"]),
});
