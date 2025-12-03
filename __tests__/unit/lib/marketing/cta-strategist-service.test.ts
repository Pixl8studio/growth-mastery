/**
 * CTA Strategist Service Tests
 * Tests for call-to-action generation and optimization
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: vi.fn(),
    generateTextWithAI: vi.fn(),
    openai: {},
}));
vi.mock("@/lib/logger");

import {
    generateCTA,
    generateLinkStrategy,
    generateCTAVariants,
    optimizeCTA,
    analyzeCTAEffectiveness,
    generateShortLink,
} from "@/lib/marketing/cta-strategist-service";
import { generateWithAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

describe("CTAStrategistService", () => {
    const mockBrief = {
        id: "brief-123",
        name: "Test Campaign",
        topic: "Marketing automation",
        goal: "awareness",
        funnel_entry_point: "webinar",
        icp_description: "B2B marketers",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateCTA", () => {
        it("should generate platform-appropriate CTA", async () => {
            const mockAIResponse = {
                text: "DM me GUIDE for the free template",
                type: "dm_keyword" as const,
                dm_keyword: "GUIDE",
                reasoning: "DM keywords work great on Instagram",
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await generateCTA(mockBrief as any, "instagram");

            expect(result.success).toBe(true);
            expect(result.cta).toBeDefined();
            expect(result.cta!.text).toBe(mockAIResponse.text);
            expect(result.cta!.type).toBe("dm_keyword");
            expect(result.cta!.dm_keyword).toBe("GUIDE");
        });

        it("should generate link strategy when base URL provided", async () => {
            const mockAIResponse = {
                text: "Click the link to register",
                type: "direct_link" as const,
                reasoning: "Direct links work on LinkedIn",
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await generateCTA(
                mockBrief as any,
                "linkedin",
                "https://example.com/webinar"
            );

            expect(result.success).toBe(true);
            expect(result.linkStrategy).toBeDefined();
            expect(result.linkStrategy!.primary_url).toContain("utm_source=linkedin");
            expect(result.linkStrategy!.tracking_enabled).toBe(true);
        });

        it("should handle different CTA types for different platforms", async () => {
            const mockResponses = {
                instagram: {
                    text: "Link in bio",
                    type: "bio_link" as const,
                    reasoning: "Bio link is standard for Instagram",
                },
                twitter: {
                    text: "Reply YES for details",
                    type: "comment_trigger" as const,
                    comment_trigger: "YES",
                    reasoning: "Engagement-focused",
                },
            };

            for (const [platform, response] of Object.entries(mockResponses)) {
                vi.mocked(generateWithAI).mockResolvedValue(response);

                const result = await generateCTA(mockBrief as any, platform as any);

                expect(result.success).toBe(true);
                expect(result.cta!.type).toBe(response.type);
            }
        });

        it("should handle AI generation errors", async () => {
            vi.mocked(generateWithAI).mockRejectedValue(new Error("AI error"));

            const result = await generateCTA(mockBrief as any, "facebook");

            expect(result.success).toBe(false);
            expect(result.error).toBe("AI error");
        });
    });

    describe("generateLinkStrategy", () => {
        it("should create properly formatted UTM parameters", () => {
            const result = generateLinkStrategy(
                "https://example.com/page",
                "instagram",
                "Summer Campaign",
                "Product Launch"
            );

            expect(result.primary_url).toContain("utm_source=instagram");
            expect(result.primary_url).toContain("utm_medium=organic_social");
            expect(result.primary_url).toContain("utm_campaign=summer_campaign");
            expect(result.primary_url).toContain("utm_content=product_launch");
            expect(result.tracking_enabled).toBe(true);
        });

        it("should clean campaign names for URL safety", () => {
            const result = generateLinkStrategy(
                "https://example.com",
                "facebook",
                "Test Campaign!!! @#$",
                "Content with spaces & special chars"
            );

            expect(result.utm_parameters.utm_campaign).toBe("test_campaign");
            expect(result.utm_parameters.utm_content).not.toContain(" ");
            expect(result.utm_parameters.utm_content).not.toContain("&");
        });

        it("should limit content parameter length", () => {
            const longContent = "a".repeat(100);
            const result = generateLinkStrategy(
                "https://example.com",
                "linkedin",
                "Campaign",
                longContent
            );

            expect(result.utm_parameters.utm_content.length).toBeLessThanOrEqual(50);
        });

        it("should handle URLs with existing query parameters", () => {
            const result = generateLinkStrategy(
                "https://example.com?existing=param",
                "twitter",
                "Campaign",
                "Content"
            );

            expect(result.primary_url).toContain("existing=param");
            expect(result.primary_url).toContain("utm_source=twitter");
        });
    });

    describe("generateCTAVariants", () => {
        it("should generate multiple CTA variants", async () => {
            const mockAIResponse = {
                variants: [
                    {
                        text: "Sign up now - limited spots!",
                        type: "direct_link" as const,
                        style: "direct",
                    },
                    {
                        text: "Curious about the framework?",
                        type: "bio_link" as const,
                        style: "curious",
                    },
                    {
                        text: "Get the free guide inside",
                        type: "bio_link" as const,
                        style: "value",
                    },
                ],
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await generateCTAVariants(mockBrief as any, "instagram", 3);

            expect(result.success).toBe(true);
            expect(result.variants).toHaveLength(3);
            expect(result.variants![0].text).toBeDefined();
            expect(result.variants![0].type).toBeDefined();
        });

        it("should handle requested count", async () => {
            const mockAIResponse = {
                variants: Array(5)
                    .fill(null)
                    .map((_, i) => ({
                        text: `CTA ${i}`,
                        type: "bio_link" as const,
                        style: "direct",
                    })),
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await generateCTAVariants(mockBrief as any, "facebook", 5);

            expect(result.success).toBe(true);
            expect(result.variants).toHaveLength(5);
        });

        it("should handle AI errors", async () => {
            vi.mocked(generateWithAI).mockRejectedValue(new Error("Generation failed"));

            const result = await generateCTAVariants(mockBrief as any, "linkedin");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Generation failed");
        });
    });

    describe("optimizeCTA", () => {
        it("should provide optimization suggestions", async () => {
            const mockAIResponse = {
                optimized: "Register for the free webinar - spots filling fast!",
                improvements: [
                    "Added urgency with 'spots filling fast'",
                    "Made action more specific",
                    "Emphasized 'free' value proposition",
                ],
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await optimizeCTA(
                "Click here to register",
                "linkedin",
                "Drive webinar registrations"
            );

            expect(result.success).toBe(true);
            expect(result.optimized).toBe(mockAIResponse.optimized);
            expect(result.improvements).toHaveLength(3);
        });

        it("should handle weak CTAs", async () => {
            const mockAIResponse = {
                optimized: "Get your personalized marketing plan - DM me START",
                improvements: [
                    "Added specificity",
                    "Included clear action",
                    "Used DM keyword",
                ],
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await optimizeCTA(
                "Learn more",
                "instagram",
                "Generate leads"
            );

            expect(result.success).toBe(true);
            expect(result.optimized).not.toBe("Learn more");
        });

        it("should handle optimization errors", async () => {
            vi.mocked(generateWithAI).mockRejectedValue(
                new Error("Optimization failed")
            );

            const result = await optimizeCTA("CTA text", "twitter", "goal");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Optimization failed");
        });
    });

    describe("analyzeCTAEffectiveness", () => {
        it("should provide detailed effectiveness analysis", async () => {
            const mockAIResponse = {
                clarity: 9,
                specificity: 8,
                urgency: 7,
                platform_fit: 9,
                overall: 8.25,
                recommendations: [
                    "Consider adding a time constraint",
                    "Test A/B with different value propositions",
                ],
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await analyzeCTAEffectiveness(
                "DM me GUIDE for the free template",
                "instagram",
                "Full post content here..."
            );

            expect(result.success).toBe(true);
            expect(result.score).toBe(8.25);
            expect(result.analysis).toBeDefined();
            expect(result.analysis!.clarity).toBe(9);
            expect(result.analysis!.specificity).toBe(8);
            expect(result.recommendations).toHaveLength(2);
        });

        it("should identify weak CTAs", async () => {
            const mockAIResponse = {
                clarity: 5,
                specificity: 4,
                urgency: 3,
                platform_fit: 6,
                overall: 4.5,
                recommendations: [
                    "Be more specific about the action",
                    "Add urgency or scarcity",
                    "Clarify the value proposition",
                ],
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await analyzeCTAEffectiveness(
                "Check it out",
                "linkedin",
                "Post content"
            );

            expect(result.success).toBe(true);
            expect(result.score).toBeLessThan(5);
            expect(result.recommendations!.length).toBeGreaterThan(0);
        });

        it("should handle analysis errors", async () => {
            vi.mocked(generateWithAI).mockRejectedValue(new Error("Analysis failed"));

            const result = await analyzeCTAEffectiveness("CTA", "facebook", "content");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Analysis failed");
        });
    });

    describe("generateShortLink", () => {
        it("should return placeholder short link", () => {
            const result = generateShortLink(
                "https://example.com/very/long/url",
                "summer-campaign"
            );

            expect(result.success).toBe(true);
            expect(result.shortUrl).toBeDefined();
        });
    });
});
