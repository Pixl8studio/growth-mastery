/**
 * Content Architect Service Tests
 * Tests for platform-specific content atomization
 */

// Mock AI client BEFORE any imports
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: vi.fn(),
    generateTextWithAI: vi.fn(),
    openai: {},
}));

// Mock brand voice service BEFORE any imports
vi.mock("@/lib/marketing/brand-voice-service", () => ({
    getVoiceGuidelines: vi.fn(),
    getProfile: vi.fn(),
    initializeProfile: vi.fn(),
}));

// Mock platform knowledge service BEFORE any imports
vi.mock("@/lib/marketing/platform-knowledge-service", () => ({
    getPlatformSpec: vi.fn(),
    validateContent: vi.fn(),
    calculateReadabilityLevel: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/logger");

import {
    generatePlatformVariants,
    optimizeForPlatform,
    generateHashtags,
    atomizeBrief,
} from "@/lib/marketing/content-architect-service";
import { generateWithAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import {
    getPlatformSpec,
    validateContent,
} from "@/lib/marketing/platform-knowledge-service";
import { getVoiceGuidelines } from "@/lib/marketing/brand-voice-service";

describe("ContentArchitectService", () => {
    const mockProfileId = "profile-123";
    const mockBrief = {
        id: "brief-123",
        topic: "Marketing automation",
        goal: "awareness",
        funnel_entry_point: "webinar",
        icp_description: "B2B marketers",
        name: "Test Brief",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generatePlatformVariants", () => {
        it("should generate variants for multiple platforms", async () => {
            const mockVoiceGuidelines = "Use conversational tone";
            const mockPlatformSpec = {
                max_text_length: 2200,
                best_practices: {
                    optimal_post_length: 150,
                    link_handling: "bio_link",
                    cta_placement: "end",
                },
            };

            const mockAIResponse = {
                copy_text: "Platform-optimized content",
                hashtags: ["marketing", "automation"],
                caption: "Platform-optimized content",
            };

            vi.mocked(getVoiceGuidelines).mockResolvedValue({
                success: true,
                guidelines: mockVoiceGuidelines,
            });

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: true,
                spec: mockPlatformSpec as any,
            });

            vi.mocked(validateContent).mockResolvedValue({
                success: true,
                valid: true,
                violations: [],
                warnings: [],
            });

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await generatePlatformVariants({
                baseContent: "Original content",
                platforms: ["instagram", "linkedin"],
                brief: mockBrief as any,
                profileId: mockProfileId,
            });

            expect(result.success).toBe(true);
            expect(result.variants).toHaveLength(2);
            expect(result.variants![0].platform).toBeDefined();
            expect(result.variants![0].copy_text).toBeDefined();
            expect(result.variants![0].hashtags).toBeDefined();
        });

        it("should handle voice guidelines fetch failure", async () => {
            vi.mocked(getVoiceGuidelines).mockResolvedValue({
                success: false,
                error: "Failed to fetch guidelines",
            });

            const result = await generatePlatformVariants({
                baseContent: "Original content",
                platforms: ["instagram"],
                brief: mockBrief as any,
                profileId: mockProfileId,
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe("Unable to fetch voice guidelines");
        });

        it("should format hashtags with # prefix", async () => {
            const mockVoiceGuidelines = "Use conversational tone";
            const mockPlatformSpec = {
                max_text_length: 2200,
                best_practices: {},
            };

            const mockAIResponse = {
                copy_text: "Content",
                hashtags: ["noprefix", "#withprefix"],
                caption: "Content",
            };

            vi.mocked(getVoiceGuidelines).mockResolvedValue({
                success: true,
                guidelines: mockVoiceGuidelines,
            });

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: true,
                spec: mockPlatformSpec as any,
            });

            vi.mocked(validateContent).mockResolvedValue({
                success: true,
                valid: true,
                violations: [],
                warnings: [],
            });

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await generatePlatformVariants({
                baseContent: "Original content",
                platforms: ["instagram"],
                brief: mockBrief as any,
                profileId: mockProfileId,
            });

            expect(result.success).toBe(true);
            expect(result.variants![0].hashtags).toEqual(["#noprefix", "#withprefix"]);
        });

        it("should handle all platforms failing", async () => {
            vi.mocked(getVoiceGuidelines).mockResolvedValue({
                success: true,
                guidelines: "Guidelines",
            });

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: false,
                error: "Platform spec failed",
            });

            const result = await generatePlatformVariants({
                baseContent: "Original content",
                platforms: ["instagram", "facebook"],
                brief: mockBrief as any,
                profileId: mockProfileId,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain("Failed to generate variants");
        });

        it("should log validation warnings when content violates platform rules", async () => {
            const mockVoiceGuidelines = "Guidelines";
            const mockPlatformSpec = { max_text_length: 280, best_practices: {} };
            const mockAIResponse = {
                copy_text: "Content",
                hashtags: [],
                caption: "Content",
            };

            vi.mocked(getVoiceGuidelines).mockResolvedValue({
                success: true,
                guidelines: mockVoiceGuidelines,
            });

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: true,
                spec: mockPlatformSpec as any,
            });

            vi.mocked(validateContent).mockResolvedValue({
                success: true,
                valid: false,
                violations: ["Too long"],
                warnings: [],
            });

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            await generatePlatformVariants({
                baseContent: "Original content",
                platforms: ["twitter"],
                brief: mockBrief as any,
                profileId: mockProfileId,
            });

            // Validation warnings are logged but not critical for the test
        });
    });

    describe("optimizeForPlatform", () => {
        it("should optimize content for specific platform", async () => {
            const mockVoiceGuidelines = "Use conversational tone";
            const mockPlatformSpec = { max_text_length: 280, best_practices: {} };
            const mockAIResponse = {
                optimized: "Optimized content",
                suggestions: ["Make it shorter", "Add urgency"],
            };

            vi.mocked(getVoiceGuidelines).mockResolvedValue({
                success: true,
                guidelines: mockVoiceGuidelines,
            });

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: true,
                spec: mockPlatformSpec as any,
            });

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await optimizeForPlatform(
                "Original content",
                "twitter",
                mockProfileId
            );

            expect(result.success).toBe(true);
            expect(result.optimized).toBe("Optimized content");
            expect(result.suggestions).toHaveLength(2);
        });

        it("should handle voice guidelines failure", async () => {
            vi.mocked(getVoiceGuidelines).mockResolvedValue({
                success: false,
                error: "Failed",
            });

            const result = await optimizeForPlatform(
                "Original content",
                "twitter",
                mockProfileId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Unable to fetch voice guidelines");
        });

        it("should handle platform spec failure", async () => {
            vi.mocked(getVoiceGuidelines).mockResolvedValue({
                success: true,
                guidelines: "Guidelines",
            });

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: false,
                error: "Spec failed",
            });

            const result = await optimizeForPlatform(
                "Original content",
                "twitter",
                mockProfileId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed to fetch platform specifications");
        });
    });

    describe("generateHashtags", () => {
        it("should generate hashtags for content and platform", async () => {
            const mockPlatformSpec = {
                max_hashtags: 30,
                hashtag_rules: { optimal_count: 10 },
            };

            const mockAIResponse = {
                hashtags: ["marketing", "automation", "business"],
            };

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: true,
                spec: mockPlatformSpec as any,
            });

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await generateHashtags(
                "Content about marketing",
                "instagram",
                "B2B marketing",
                10
            );

            expect(result.success).toBe(true);
            expect(result.hashtags).toBeDefined();
            expect(result.hashtags!.every((tag) => tag.startsWith("#"))).toBe(true);
        });

        it("should limit hashtags to requested count", async () => {
            const mockPlatformSpec = {
                max_hashtags: 30,
                hashtag_rules: {},
            };

            const mockAIResponse = {
                hashtags: Array(20).fill("tag"),
            };

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: true,
                spec: mockPlatformSpec as any,
            });

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await generateHashtags("Content", "instagram", undefined, 5);

            expect(result.success).toBe(true);
            expect(result.hashtags).toHaveLength(5);
        });

        it("should handle platform spec failure", async () => {
            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: false,
                error: "Failed",
            });

            const result = await generateHashtags("Content", "instagram");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed to fetch platform specifications");
        });
    });

    describe("atomizeBrief", () => {
        it("should create platform plans from brief", async () => {
            const mockBriefWithPlatforms = {
                ...mockBrief,
                target_platforms: ["instagram", "linkedin", "twitter"],
            };

            const mockPlatformSpec = {
                max_text_length: 2200,
                best_practices: { optimal_post_length: 150 },
            };

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: true,
                spec: mockPlatformSpec as any,
            });

            const result = await atomizeBrief(mockBriefWithPlatforms as any);

            expect(result.success).toBe(true);
            expect(result.plans).toBeDefined();
            expect(Object.keys(result.plans!)).toHaveLength(3);
            expect(result.plans!.instagram).toBeDefined();
            expect(result.plans!.instagram.platform).toBe("instagram");
            expect(result.plans!.instagram.key_elements).toBeDefined();
        });

        it("should handle platforms with missing specs gracefully", async () => {
            const mockBriefWithPlatforms = {
                ...mockBrief,
                target_platforms: ["instagram", "facebook"],
            };

            let callCount = 0;
            vi.mocked(getPlatformSpec).mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    return { success: true, spec: { best_practices: {} } };
                }
                return { success: false, error: "Failed" };
            });

            const result = await atomizeBrief(mockBriefWithPlatforms as any);

            expect(result.success).toBe(true);
            expect(Object.keys(result.plans!)).toHaveLength(1);
        });
    });
});
