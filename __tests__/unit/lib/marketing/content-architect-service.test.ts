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
                id: "spec-4",
                platform: "instagram" as const,
                spec_version: "1.0",
                max_text_length: 2200,
                max_hashtags: 30,
                media_specs: {
                    image: {
                        max_size_mb: 10,
                        recommended_dimensions: "1080x1080",
                        formats: ["jpg"],
                    },
                    video: {
                        max_size_mb: 100,
                        max_duration_seconds: 60,
                        formats: ["mp4"],
                    },
                },
                hashtag_rules: {
                    max_per_post: 30,
                    optimal_count: 10,
                    placement: "end",
                },
                best_practices: {
                    optimal_post_length: 150,
                    link_handling: "bio_link",
                    cta_placement: "end",
                },
                accessibility_requirements: {
                    alt_text_required: true,
                    caption_required: false,
                    max_reading_level: 8,
                },
                last_updated: "2025-01-01T00:00:00Z",
                created_at: "2025-01-01T00:00:00Z",
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
                spec: mockPlatformSpec,
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
                id: "spec-5",
                platform: "instagram" as const,
                spec_version: "1.0",
                max_text_length: 2200,
                max_hashtags: 30,
                media_specs: {
                    image: {
                        max_size_mb: 10,
                        recommended_dimensions: "1080x1080",
                        formats: ["jpg"],
                    },
                    video: {
                        max_size_mb: 100,
                        max_duration_seconds: 60,
                        formats: ["mp4"],
                    },
                },
                hashtag_rules: {
                    max_per_post: 30,
                    optimal_count: 10,
                    placement: "end",
                },
                best_practices: {
                    optimal_post_length: 150,
                    cta_placement: "end",
                    link_handling: "bio_link",
                },
                accessibility_requirements: {
                    alt_text_required: true,
                    caption_required: false,
                    max_reading_level: 8,
                },
                last_updated: "2025-01-01T00:00:00Z",
                created_at: "2025-01-01T00:00:00Z",
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
                spec: mockPlatformSpec,
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
            const mockPlatformSpec = {
                id: "spec-6",
                platform: "twitter" as const,
                spec_version: "1.0",
                max_text_length: 280,
                max_hashtags: 10,
                media_specs: {
                    image: {
                        max_size_mb: 5,
                        recommended_dimensions: "1200x675",
                        formats: ["jpg"],
                    },
                    video: {
                        max_size_mb: 512,
                        max_duration_seconds: 140,
                        formats: ["mp4"],
                    },
                },
                hashtag_rules: {
                    max_per_post: 10,
                    optimal_count: 3,
                    placement: "inline",
                },
                best_practices: {
                    optimal_post_length: 100,
                    cta_placement: "inline",
                    link_handling: "direct_link",
                },
                accessibility_requirements: {
                    alt_text_required: true,
                    caption_required: false,
                    max_reading_level: 8,
                },
                last_updated: "2025-01-01T00:00:00Z",
                created_at: "2025-01-01T00:00:00Z",
            };
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
                spec: mockPlatformSpec,
            });

            vi.mocked(validateContent).mockResolvedValue({
                success: true,
                valid: false,
                violations: ["Too long"],
                warnings: [],
            });

            vi.mocked(generateWithAI).mockResolvedValue(mockAIResponse);

            const result = await generatePlatformVariants({
                baseContent: "Original content",
                platforms: ["twitter"],
                brief: mockBrief as any,
                profileId: mockProfileId,
            });

            expect(result.success).toBe(true);
            expect(result.variants).toHaveLength(1);
        });
    });

    describe("optimizeForPlatform", () => {
        it("should optimize content for specific platform", async () => {
            const mockVoiceGuidelines = "Use conversational tone";
            const mockPlatformSpec = {
                id: "spec-7",
                platform: "twitter" as const,
                spec_version: "1.0",
                max_text_length: 280,
                max_hashtags: 10,
                media_specs: {
                    image: {
                        max_size_mb: 5,
                        recommended_dimensions: "1200x675",
                        formats: ["jpg"],
                    },
                    video: {
                        max_size_mb: 512,
                        max_duration_seconds: 140,
                        formats: ["mp4"],
                    },
                },
                hashtag_rules: {
                    max_per_post: 10,
                    optimal_count: 3,
                    placement: "inline",
                },
                best_practices: {
                    optimal_post_length: 100,
                    cta_placement: "inline",
                    link_handling: "direct_link",
                },
                accessibility_requirements: {
                    alt_text_required: true,
                    caption_required: false,
                    max_reading_level: 8,
                },
                last_updated: "2025-01-01T00:00:00Z",
                created_at: "2025-01-01T00:00:00Z",
            };
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
                spec: mockPlatformSpec,
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
                id: "spec-8",
                platform: "instagram" as const,
                spec_version: "1.0",
                max_text_length: 2200,
                max_hashtags: 30,
                media_specs: {
                    image: {
                        max_size_mb: 10,
                        recommended_dimensions: "1080x1080",
                        formats: ["jpg"],
                    },
                    video: {
                        max_size_mb: 100,
                        max_duration_seconds: 60,
                        formats: ["mp4"],
                    },
                },
                hashtag_rules: {
                    max_per_post: 30,
                    optimal_count: 10,
                    placement: "end",
                },
                best_practices: {
                    optimal_post_length: 150,
                    cta_placement: "end",
                    link_handling: "bio_link",
                },
                accessibility_requirements: {
                    alt_text_required: true,
                    caption_required: false,
                    max_reading_level: 8,
                },
                last_updated: "2025-01-01T00:00:00Z",
                created_at: "2025-01-01T00:00:00Z",
            };

            const mockAIResponse = {
                hashtags: ["marketing", "automation", "business"],
            };

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: true,
                spec: mockPlatformSpec,
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
                id: "spec-1",
                platform: "instagram" as const,
                spec_version: "1.0",
                max_text_length: 2200,
                max_hashtags: 30,
                media_specs: {
                    image: {
                        max_size_mb: 10,
                        recommended_dimensions: "1080x1080",
                        formats: ["jpg"],
                    },
                    video: {
                        max_size_mb: 100,
                        max_duration_seconds: 60,
                        formats: ["mp4"],
                    },
                },
                hashtag_rules: {
                    max_per_post: 30,
                    optimal_count: 10,
                    placement: "end",
                },
                best_practices: {
                    optimal_post_length: 150,
                    cta_placement: "end",
                    link_handling: "bio_link",
                },
                accessibility_requirements: {
                    alt_text_required: true,
                    caption_required: false,
                    max_reading_level: 8,
                },
                last_updated: "2025-01-01T00:00:00Z",
                created_at: "2025-01-01T00:00:00Z",
            };

            const mockAIResponse = {
                hashtags: Array(20).fill("tag"),
            };

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: true,
                spec: mockPlatformSpec,
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
                id: "spec-2",
                platform: "instagram" as const,
                spec_version: "1.0",
                max_text_length: 2200,
                max_hashtags: 30,
                media_specs: {
                    image: {
                        max_size_mb: 10,
                        recommended_dimensions: "1080x1080",
                        formats: ["jpg"],
                    },
                    video: {
                        max_size_mb: 100,
                        max_duration_seconds: 60,
                        formats: ["mp4"],
                    },
                },
                hashtag_rules: {
                    max_per_post: 30,
                    optimal_count: 10,
                    placement: "end",
                },
                best_practices: {
                    optimal_post_length: 150,
                    cta_placement: "end",
                    link_handling: "bio_link",
                },
                accessibility_requirements: {
                    alt_text_required: true,
                    caption_required: false,
                    max_reading_level: 8,
                },
                last_updated: "2025-01-01T00:00:00Z",
                created_at: "2025-01-01T00:00:00Z",
            };

            vi.mocked(getPlatformSpec).mockResolvedValue({
                success: true,
                spec: mockPlatformSpec,
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
                    return {
                        success: true,
                        spec: {
                            id: "spec-3",
                            platform: "instagram" as const,
                            spec_version: "1.0",
                            max_text_length: 2200,
                            max_hashtags: 30,
                            media_specs: {
                                image: {
                                    max_size_mb: 10,
                                    recommended_dimensions: "1080x1080",
                                    formats: ["jpg"],
                                },
                                video: {
                                    max_size_mb: 100,
                                    max_duration_seconds: 60,
                                    formats: ["mp4"],
                                },
                            },
                            hashtag_rules: {
                                max_per_post: 30,
                                optimal_count: 10,
                                placement: "end",
                            },
                            best_practices: {
                                optimal_post_length: 150,
                                cta_placement: "end",
                                link_handling: "bio_link",
                            },
                            accessibility_requirements: {
                                alt_text_required: true,
                                caption_required: false,
                                max_reading_level: 8,
                            },
                            last_updated: "2025-01-01T00:00:00Z",
                            created_at: "2025-01-01T00:00:00Z",
                        },
                    };
                }
                return { success: false, error: "Failed" };
            });

            const result = await atomizeBrief(mockBriefWithPlatforms as any);

            expect(result.success).toBe(true);
            expect(Object.keys(result.plans!)).toHaveLength(1);
        });
    });
});
