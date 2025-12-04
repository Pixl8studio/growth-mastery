/**
 * Unit Tests for Validation Schemas
 * Tests Zod schema validation for ad requests
 */

import { describe, it, expect } from "vitest";
import {
    CreateCampaignSchema,
    AdVariationSchema,
    AudienceConfigSchema,
    OptimizeCampaignSchema,
    GetMetricsSchema,
    GenerateVariationsSchema,
} from "@/lib/ads/validation-schemas";
import { z } from "zod";

describe("Validation Schemas", () => {
    describe("AdVariationSchema", () => {
        it("should validate valid ad variation", () => {
            const validVariation = {
                id: "test-1",
                variation_number: 1,
                framework: "plus_minus",
                primary_text: "Valid primary text",
                headline: "Valid Headline",
                link_description: "Valid description",
                hooks: {
                    long: "Long hook text",
                    short: "Short hook",
                    curiosity: "Curiosity hook",
                },
                call_to_action: "LEARN_MORE",
                body_copy: "Body copy text",
                selected: false,
            };

            const result = AdVariationSchema.safeParse(validVariation);

            expect(result.success).toBe(true);
        });

        it("should enforce primary text max 95 characters", () => {
            const invalidVariation = {
                id: "test-1",
                variation_number: 1,
                framework: "test",
                primary_text:
                    "This is a very long primary text that exceeds the 95 character limit for Meta ads and should fail",
                headline: "Valid Headline",
                link_description: "Valid",
                hooks: {
                    long: "Long",
                    short: "Short",
                    curiosity: "Curiosity",
                },
                call_to_action: "LEARN_MORE",
            };

            const result = AdVariationSchema.safeParse(invalidVariation);

            expect(result.success).toBe(false);
        });

        it("should enforce headline max 40 characters", () => {
            const invalidVariation = {
                id: "test-1",
                variation_number: 1,
                framework: "test",
                primary_text: "Valid text",
                headline: "This is a very long headline that exceeds forty characters",
                link_description: "Valid",
                hooks: {
                    long: "Long",
                    short: "Short",
                    curiosity: "Curiosity",
                },
                call_to_action: "LEARN_MORE",
            };

            const result = AdVariationSchema.safeParse(invalidVariation);

            expect(result.success).toBe(false);
        });

        it("should enforce link description max 30 characters", () => {
            const invalidVariation = {
                id: "test-1",
                variation_number: 1,
                framework: "test",
                primary_text: "Valid text",
                headline: "Valid Headline",
                link_description: "This description is way too long for Meta ads",
                hooks: {
                    long: "Long",
                    short: "Short",
                    curiosity: "Curiosity",
                },
                call_to_action: "LEARN_MORE",
            };

            const result = AdVariationSchema.safeParse(invalidVariation);

            expect(result.success).toBe(false);
        });

        it("should enforce variation number between 1 and 10", () => {
            const invalidVariation = {
                id: "test-1",
                variation_number: 11,
                framework: "test",
                primary_text: "Valid",
                headline: "Valid",
                link_description: "Valid",
                hooks: {
                    long: "Long",
                    short: "Short",
                    curiosity: "Curiosity",
                },
                call_to_action: "LEARN_MORE",
            };

            const result = AdVariationSchema.safeParse(invalidVariation);

            expect(result.success).toBe(false);
        });

        it("should require hooks object with long, short, and curiosity", () => {
            const invalidVariation = {
                id: "test-1",
                variation_number: 1,
                framework: "test",
                primary_text: "Valid",
                headline: "Valid",
                link_description: "Valid",
                hooks: {
                    long: "Long hook",
                },
                call_to_action: "LEARN_MORE",
            };

            const result = AdVariationSchema.safeParse(invalidVariation);

            expect(result.success).toBe(false);
        });
    });

    describe("AudienceConfigSchema", () => {
        it("should validate valid audience config", () => {
            const validConfig = {
                type: "interest",
                description: "Business owners in US",
                targeting: {
                    geo_locations: {
                        countries: ["US"],
                        regions: [{ key: "3847", name: "California" }],
                    },
                    age_min: 25,
                    age_max: 55,
                    interests: [{ id: "123", name: "Business" }],
                },
            };

            const result = AudienceConfigSchema.safeParse(validConfig);

            expect(result.success).toBe(true);
        });

        it("should enforce audience type enum", () => {
            const invalidConfig = {
                type: "invalid_type",
                targeting: {
                    geo_locations: {
                        countries: ["US"],
                    },
                },
            };

            const result = AudienceConfigSchema.safeParse(invalidConfig);

            expect(result.success).toBe(false);
        });

        it("should enforce age_min between 18 and 65", () => {
            const invalidConfig = {
                type: "interest",
                targeting: {
                    geo_locations: {
                        countries: ["US"],
                    },
                    age_min: 16,
                },
            };

            const result = AudienceConfigSchema.safeParse(invalidConfig);

            expect(result.success).toBe(false);
        });

        it("should enforce age_max between 18 and 65", () => {
            const invalidConfig = {
                type: "interest",
                targeting: {
                    geo_locations: {
                        countries: ["US"],
                    },
                    age_max: 70,
                },
            };

            const result = AudienceConfigSchema.safeParse(invalidConfig);

            expect(result.success).toBe(false);
        });

        it("should allow lookalike audience type", () => {
            const validConfig = {
                type: "lookalike",
                source_file: "customers.csv",
                targeting: {
                    geo_locations: {
                        countries: ["US"],
                    },
                },
            };

            const result = AudienceConfigSchema.safeParse(validConfig);

            expect(result.success).toBe(true);
        });
    });

    describe("CreateCampaignSchema", () => {
        it("should validate valid campaign creation request", () => {
            const validRequest = {
                funnel_project_id: "550e8400-e29b-41d4-a716-446655440000",
                ad_account_id: "act_123456789",
                variations: [
                    {
                        id: "var-1",
                        variation_number: 1,
                        framework: "plus_minus",
                        primary_text: "Test",
                        headline: "Test",
                        link_description: "Test",
                        hooks: {
                            long: "Long",
                            short: "Short",
                            curiosity: "Curious",
                        },
                        call_to_action: "LEARN_MORE",
                        selected: false,
                    },
                ],
                audience_config: {
                    type: "interest",
                    targeting: {
                        geo_locations: {
                            countries: ["US"],
                        },
                    },
                },
                daily_budget_cents: 5000,
            };

            const result = CreateCampaignSchema.safeParse(validRequest);

            expect(result.success).toBe(true);
        });

        it("should enforce funnel_project_id is UUID", () => {
            const invalidRequest = {
                funnel_project_id: "not-a-uuid",
                ad_account_id: "act_123",
                variations: [
                    {
                        id: "var-1",
                        variation_number: 1,
                        framework: "test",
                        primary_text: "Test",
                        headline: "Test",
                        link_description: "Test",
                        hooks: {
                            long: "Long",
                            short: "Short",
                            curiosity: "Curious",
                        },
                        call_to_action: "LEARN_MORE",
                        selected: false,
                    },
                ],
                audience_config: {
                    type: "interest",
                    targeting: {
                        geo_locations: {
                            countries: ["US"],
                        },
                    },
                },
                daily_budget_cents: 5000,
            };

            const result = CreateCampaignSchema.safeParse(invalidRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain(
                    "Invalid funnel project ID"
                );
            }
        });

        it("should enforce at least one variation required", () => {
            const invalidRequest = {
                funnel_project_id: "550e8400-e29b-41d4-a716-446655440000",
                ad_account_id: "act_123",
                variations: [],
                audience_config: {
                    type: "interest",
                    targeting: {
                        geo_locations: {
                            countries: ["US"],
                        },
                    },
                },
                daily_budget_cents: 5000,
            };

            const result = CreateCampaignSchema.safeParse(invalidRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain(
                    "At least one variation required"
                );
            }
        });

        it("should enforce maximum 10 variations", () => {
            const variations = Array.from({ length: 11 }, (_, i) => ({
                id: `var-${i}`,
                variation_number: i + 1,
                framework: "test",
                primary_text: "Test",
                headline: "Test",
                link_description: "Test",
                hooks: {
                    long: "Long",
                    short: "Short",
                    curiosity: "Curious",
                },
                call_to_action: "LEARN_MORE",
                selected: false,
            }));

            const invalidRequest = {
                funnel_project_id: "550e8400-e29b-41d4-a716-446655440000",
                ad_account_id: "act_123",
                variations,
                audience_config: {
                    type: "interest",
                    targeting: {
                        geo_locations: {
                            countries: ["US"],
                        },
                    },
                },
                daily_budget_cents: 5000,
            };

            const result = CreateCampaignSchema.safeParse(invalidRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                // Zod returns the default "Too big" message, but we validate the max is enforced
                expect(result.error.issues.length).toBeGreaterThan(0);
                const variationsError = result.error.issues.find((issue) =>
                    issue.path.includes("variations")
                );
                expect(variationsError).toBeDefined();
            }
        });

        it("should enforce daily budget is positive", () => {
            const invalidRequest = {
                funnel_project_id: "550e8400-e29b-41d4-a716-446655440000",
                ad_account_id: "act_123",
                variations: [
                    {
                        id: "var-1",
                        variation_number: 1,
                        framework: "test",
                        primary_text: "Test",
                        headline: "Test",
                        link_description: "Test",
                        hooks: {
                            long: "Long",
                            short: "Short",
                            curiosity: "Curious",
                        },
                        call_to_action: "LEARN_MORE",
                        selected: false,
                    },
                ],
                audience_config: {
                    type: "interest",
                    targeting: {
                        geo_locations: {
                            countries: ["US"],
                        },
                    },
                },
                daily_budget_cents: -100,
            };

            const result = CreateCampaignSchema.safeParse(invalidRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain(
                    "Budget must be positive"
                );
            }
        });

        it("should enforce daily budget max $10,000", () => {
            const invalidRequest = {
                funnel_project_id: "550e8400-e29b-41d4-a716-446655440000",
                ad_account_id: "act_123",
                variations: [
                    {
                        id: "var-1",
                        variation_number: 1,
                        framework: "test",
                        primary_text: "Test",
                        headline: "Test",
                        link_description: "Test",
                        hooks: {
                            long: "Long",
                            short: "Short",
                            curiosity: "Curious",
                        },
                        call_to_action: "LEARN_MORE",
                        selected: false,
                    },
                ],
                audience_config: {
                    type: "interest",
                    targeting: {
                        geo_locations: {
                            countries: ["US"],
                        },
                    },
                },
                daily_budget_cents: 1500000, // $15,000
            };

            const result = CreateCampaignSchema.safeParse(invalidRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain(
                    "Daily budget cannot exceed $10,000"
                );
            }
        });
    });

    describe("GenerateVariationsSchema", () => {
        it("should validate valid request", () => {
            const validRequest = {
                funnel_project_id: "550e8400-e29b-41d4-a716-446655440000",
            };

            const result = GenerateVariationsSchema.safeParse(validRequest);

            expect(result.success).toBe(true);
        });

        it("should enforce funnel_project_id is UUID", () => {
            const invalidRequest = {
                funnel_project_id: "not-a-uuid",
            };

            const result = GenerateVariationsSchema.safeParse(invalidRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain(
                    "Invalid funnel project ID"
                );
            }
        });
    });

    describe("OptimizeCampaignSchema", () => {
        it("should validate request with campaign_id", () => {
            const validRequest = {
                campaign_id: "550e8400-e29b-41d4-a716-446655440000",
                autopilot: true,
            };

            const result = OptimizeCampaignSchema.safeParse(validRequest);

            expect(result.success).toBe(true);
        });

        it("should validate request without campaign_id (optimize all)", () => {
            const validRequest = {
                autopilot: false,
            };

            const result = OptimizeCampaignSchema.safeParse(validRequest);

            expect(result.success).toBe(true);
        });

        it("should default autopilot to false", () => {
            const request = {};

            const result = OptimizeCampaignSchema.parse(request);

            expect(result.autopilot).toBe(false);
        });

        it("should enforce campaign_id is UUID when provided", () => {
            const invalidRequest = {
                campaign_id: "not-a-uuid",
                autopilot: false,
            };

            const result = OptimizeCampaignSchema.safeParse(invalidRequest);

            expect(result.success).toBe(false);
        });
    });

    describe("GetMetricsSchema", () => {
        it("should validate valid metrics request", () => {
            const validRequest = {
                campaign_id: "550e8400-e29b-41d4-a716-446655440000",
                date_range: "30",
            };

            const result = GetMetricsSchema.safeParse(validRequest);

            expect(result.success).toBe(true);
        });

        it("should default date_range to 30", () => {
            const request = {};

            const result = GetMetricsSchema.parse(request);

            expect(result.date_range).toBe("30");
        });

        it("should enforce date_range enum values", () => {
            const invalidRequest = {
                date_range: "90",
            };

            const result = GetMetricsSchema.safeParse(invalidRequest);

            expect(result.success).toBe(false);
        });

        it("should accept all valid date_range values", () => {
            const validRanges = ["7", "14", "30", "lifetime"];

            validRanges.forEach((range) => {
                const request = { date_range: range };
                const result = GetMetricsSchema.safeParse(request);
                expect(result.success).toBe(true);
            });
        });
    });

    describe("Zod Error Messages", () => {
        it("should provide clear error messages for invalid data", () => {
            const invalidRequest = {
                funnel_project_id: "not-a-uuid",
                ad_account_id: "",
                variations: [],
                daily_budget_cents: -100,
            };

            const result = CreateCampaignSchema.safeParse(invalidRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                const errors = result.error.issues.map((issue) => issue.message);
                expect(errors.length).toBeGreaterThan(0);
            }
        });

        it("should handle missing required fields", () => {
            const invalidRequest = {};

            const result = CreateCampaignSchema.safeParse(invalidRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.length).toBeGreaterThan(0);
            }
        });
    });
});
