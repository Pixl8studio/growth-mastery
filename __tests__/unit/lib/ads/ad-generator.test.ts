/**
 * Unit Tests for Ad Generator
 * Tests the AI ad generation engine and variation creation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AdGenerationRequest } from "@/types/ads";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Import after mocks are defined
const { generateAdVariations, validateAdCopy } = await import("@/lib/ads/ad-generator");

describe("Ad Generator", () => {
    let mockRequest: AdGenerationRequest;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequest = {
            funnel_project_id: "project-123",
            offer_data: {
                product_name: "Growth Accelerator",
                tagline: "Scale faster than ever",
                promise: "Double your revenue in 90 days",
                price: 997,
                currency: "USD",
                guarantee: "30-day money back guarantee",
            },
            audience_data: {
                target_audience: "online coaches",
                pain_points: [
                    "struggling to get clients",
                    "burning out from marketing",
                ],
                desired_outcome: "attract high-ticket clients consistently",
            },
            brand_voice: "professional yet conversational",
        };
    });

    describe("generateAdVariations", () => {
        it("should generate 5 ad variations", async () => {
            const variations = await generateAdVariations(mockRequest);

            expect(variations).toHaveLength(5);
            expect(variations[0].variation_number).toBe(1);
            expect(variations[4].variation_number).toBe(5);
        });

        it("should generate transformation ad (Plus Plus / Minus Minus)", async () => {
            const variations = await generateAdVariations(mockRequest);

            const transformationAd = variations.find(
                (v) => v.framework === "plus_minus"
            );

            expect(transformationAd).toBeDefined();
            expect(transformationAd?.variation_number).toBe(1);
            expect(transformationAd?.primary_text).toBeTruthy();
            expect(transformationAd?.headline).toBeTruthy();
            expect(transformationAd?.link_description).toBeTruthy();
            expect(transformationAd?.hooks).toHaveProperty("long");
            expect(transformationAd?.hooks).toHaveProperty("short");
            expect(transformationAd?.hooks).toHaveProperty("curiosity");
            expect(transformationAd?.call_to_action).toBe("LEARN_MORE");
        });

        it("should generate 6-part framework ad", async () => {
            const variations = await generateAdVariations(mockRequest);

            const sixPartAd = variations.find((v) => v.framework === "6_part");

            expect(sixPartAd).toBeDefined();
            expect(sixPartAd?.variation_number).toBe(2);
            expect(sixPartAd?.primary_text).toBeTruthy();
            expect(sixPartAd?.headline).toBeTruthy();
            expect(sixPartAd?.call_to_action).toBe("SIGN_UP");
        });

        it("should generate Hormozi value equation ad", async () => {
            const variations = await generateAdVariations(mockRequest);

            const hormoziAd = variations.find((v) => v.framework === "hormozi");

            expect(hormoziAd).toBeDefined();
            expect(hormoziAd?.variation_number).toBe(3);
            expect(hormoziAd?.primary_text).toBeTruthy();
            expect(hormoziAd?.headline).toBeTruthy();
            expect(hormoziAd?.link_description).toContain("USD997");
            expect(hormoziAd?.call_to_action).toBe("APPLY_NOW");
        });

        it("should generate social proof ad", async () => {
            const variations = await generateAdVariations(mockRequest);

            const socialProofAd = variations.find(
                (v) => v.framework === "social_proof"
            );

            expect(socialProofAd).toBeDefined();
            expect(socialProofAd?.variation_number).toBe(4);
            expect(socialProofAd?.primary_text).toBeTruthy();
            expect(socialProofAd?.headline).toBeTruthy();
        });

        it("should generate pattern interrupt ad (experimental)", async () => {
            const variations = await generateAdVariations(mockRequest);

            const experimentAd = variations.find((v) => v.framework === "experiment");

            expect(experimentAd).toBeDefined();
            expect(experimentAd?.variation_number).toBe(5);
            expect(experimentAd?.primary_text).toBeTruthy();
            expect(experimentAd?.headline).toBeTruthy();
        });

        it("should include all required fields in each variation", async () => {
            const variations = await generateAdVariations(mockRequest);

            variations.forEach((variation) => {
                expect(variation).toHaveProperty("id");
                expect(variation).toHaveProperty("variation_number");
                expect(variation).toHaveProperty("framework");
                expect(variation).toHaveProperty("primary_text");
                expect(variation).toHaveProperty("headline");
                expect(variation).toHaveProperty("link_description");
                expect(variation).toHaveProperty("hooks");
                expect(variation).toHaveProperty("call_to_action");
                expect(variation).toHaveProperty("selected");
                expect(variation.selected).toBe(false);
            });
        });

        it("should use pain points in ad copy", async () => {
            const variations = await generateAdVariations(mockRequest);

            const hasPainPoint = variations.some((v) =>
                v.primary_text.includes("struggling to get clients")
            );

            expect(hasPainPoint).toBe(true);
        });

        it("should use desired outcome in ad copy", async () => {
            const variations = await generateAdVariations(mockRequest);

            const hasDesiredOutcome = variations.some(
                (v) =>
                    v.primary_text.includes("attract high-ticket clients") ||
                    v.headline.includes("attract high-ticket clients") ||
                    v.body_copy?.includes("attract high-ticket clients")
            );

            expect(hasDesiredOutcome).toBe(true);
        });

        it("should use product name in ad copy", async () => {
            const variations = await generateAdVariations(mockRequest);

            const hasProductName = variations.some((v) =>
                v.primary_text.includes("Growth Accelerator")
            );

            expect(hasProductName).toBe(true);
        });
    });

    describe("validateAdCopy", () => {
        it("should validate ad copy within character limits", () => {
            const validAd = {
                id: "test-1",
                variation_number: 1,
                framework: "test",
                primary_text: "This is a valid primary text",
                headline: "Valid Headline",
                link_description: "Valid link description",
                hooks: {
                    long: "Long hook",
                    short: "Short",
                    curiosity: "Curiosity hook",
                },
                call_to_action: "LEARN_MORE",
                selected: false,
            };

            const result = validateAdCopy(validAd);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it("should detect primary text exceeding 95 characters", () => {
            const invalidAd = {
                id: "test-1",
                variation_number: 1,
                framework: "test",
                primary_text:
                    "This is a very long primary text that exceeds the 95 character limit for Meta ads and should be flagged",
                headline: "Valid Headline",
                link_description: "Valid link description",
                hooks: {
                    long: "Long hook",
                    short: "Short",
                    curiosity: "Curiosity hook",
                },
                call_to_action: "LEARN_MORE",
                selected: false,
            };

            const result = validateAdCopy(invalidAd);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain("Primary text too long");
        });

        it("should detect headline exceeding 40 characters", () => {
            const invalidAd = {
                id: "test-1",
                variation_number: 1,
                framework: "test",
                primary_text: "Valid primary text",
                headline: "This is a very long headline that exceeds 40 characters",
                link_description: "Valid link description",
                hooks: {
                    long: "Long hook",
                    short: "Short",
                    curiosity: "Curiosity hook",
                },
                call_to_action: "LEARN_MORE",
                selected: false,
            };

            const result = validateAdCopy(invalidAd);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain("Headline too long");
        });

        it("should detect link description exceeding 30 characters", () => {
            const invalidAd = {
                id: "test-1",
                variation_number: 1,
                framework: "test",
                primary_text: "Valid primary text",
                headline: "Valid Headline",
                link_description: "This link description is way too long for Meta ads",
                hooks: {
                    long: "Long hook",
                    short: "Short",
                    curiosity: "Curiosity hook",
                },
                call_to_action: "LEARN_MORE",
                selected: false,
            };

            const result = validateAdCopy(invalidAd);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain("Link description too long");
        });

        it("should detect multiple character limit violations", () => {
            const invalidAd = {
                id: "test-1",
                variation_number: 1,
                framework: "test",
                primary_text:
                    "This is a very long primary text that exceeds the 95 character limit for Meta ads and should be flagged",
                headline: "This is a very long headline that exceeds 40 characters",
                link_description: "This link description is way too long for Meta ads",
                hooks: {
                    long: "Long hook",
                    short: "Short",
                    curiosity: "Curiosity hook",
                },
                call_to_action: "LEARN_MORE",
                selected: false,
            };

            const result = validateAdCopy(invalidAd);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(3);
        });

        it("should validate generated variations automatically", async () => {
            const variations = await generateAdVariations(mockRequest);

            variations.forEach((variation) => {
                const validation = validateAdCopy(variation);
                expect(validation.valid).toBe(true);
                expect(variation.primary_text.length).toBeLessThanOrEqual(95);
                expect(variation.headline.length).toBeLessThanOrEqual(40);
                expect(variation.link_description.length).toBeLessThanOrEqual(30);
            });
        });
    });
});
