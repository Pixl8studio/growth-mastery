/**
 * Story Weaver Service Tests
 * Tests for story angle generation and content expansion
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

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/logger");

import {
    generateStoryAngles,
    expandStory,
    generateFrameworkStory,
    adaptToFramework,
    generateStoryVariants,
} from "@/lib/marketing/story-weaver-service";
import { generateWithAI, generateTextWithAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { getVoiceGuidelines } from "@/lib/marketing/brand-voice-service";

describe("StoryWeaverService", () => {
    const mockProfileId = "profile-123";
    const mockBrief = {
        id: "brief-123",
        topic: "Marketing automation",
        goal: "awareness",
        icp_description: "B2B marketers",
        transformation_focus: "Efficient workflows",
        funnel_entry_point: "webinar",
    };

    const mockVoiceGuidelines = "Use conversational tone with authenticity";

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getVoiceGuidelines).mockResolvedValue({
            success: true,
            guidelines: mockVoiceGuidelines,
        });
    });

    describe("generateStoryAngles", () => {
        it("should generate 3 story angles", async () => {
            const mockAngles = {
                angles: [
                    {
                        angle: "Founder",
                        framework: "founder_saga",
                        hook: "3 years ago, I almost gave up...",
                        story_outline: "Struggle → Discovery → Transformation",
                        key_message: "Automation changed everything",
                        estimated_length: 150,
                    },
                    {
                        angle: "Myth-Buster",
                        framework: "myth_buster",
                        hook: "Everyone thinks automation is complex...",
                        story_outline: "Myth → Reality → Proof",
                        key_message: "It's simpler than you think",
                        estimated_length: 180,
                    },
                    {
                        angle: "Industry POV",
                        framework: "philosophy_pov",
                        hook: "The future of marketing is...",
                        story_outline: "Trend → Insight → Application",
                        key_message: "Automation is the new standard",
                        estimated_length: 200,
                    },
                ],
            };

            vi.mocked(generateWithAI).mockResolvedValue(mockAngles);

            const result = await generateStoryAngles(mockBrief as any, mockProfileId);

            expect(result.success).toBe(true);
            expect(result.angles).toHaveLength(3);
            expect(result.angles![0].framework).toBe("founder_saga");
            expect(result.angles![1].framework).toBe("myth_buster");
            expect(result.angles![2].framework).toBe("philosophy_pov");
        });

        it("should handle voice guidelines fetch failure", async () => {
            vi.mocked(getVoiceGuidelines).mockResolvedValue({
                success: false,
                error: "Failed to fetch",
            });

            const result = await generateStoryAngles(mockBrief as any, mockProfileId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Unable to fetch voice guidelines");
        });

        it("should handle AI generation errors", async () => {
            vi.mocked(generateWithAI).mockRejectedValue(new Error("AI error"));

            const result = await generateStoryAngles(mockBrief as any, mockProfileId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("AI error");
        });
    });

    describe("expandStory", () => {
        it("should expand story angle into full content", async () => {
            const mockAngle = {
                angle: "Founder",
                framework: "founder_saga" as const,
                hook: "3 years ago, I almost gave up...",
                story_outline: "Struggle → Discovery → Transformation",
                key_message: "Automation changed everything",
                estimated_length: 150,
            };

            const mockExpandedContent =
                "3 years ago, I almost gave up on my marketing agency. I was working 80-hour weeks...";

            vi.mocked(generateTextWithAI).mockResolvedValue(mockExpandedContent);

            const result = await expandStory(
                mockAngle,
                mockBrief as any,
                mockProfileId,
                300
            );

            expect(result.success).toBe(true);
            expect(result.content).toBe(mockExpandedContent);
        });

        it("should use target length for token calculation", async () => {
            const mockAngle = {
                framework: "founder_saga" as const,
                hook: "Hook",
                story_outline: "Outline",
                key_message: "Message",
            };

            const mockContent = "Expanded content";
            vi.mocked(generateTextWithAI).mockResolvedValue(mockContent);

            await expandStory(mockAngle as any, mockBrief as any, mockProfileId, 500);

            expect(generateTextWithAI).toHaveBeenCalledWith(
                expect.any(Array),
                expect.objectContaining({
                    maxTokens: 1000, // 500 * 2
                })
            );
        });

        it("should handle voice guidelines failure", async () => {
            vi.mocked(getVoiceGuidelines).mockResolvedValue({
                success: false,
                error: "Failed",
            });

            const mockAngle = {
                framework: "founder_saga" as const,
                hook: "Hook",
                story_outline: "Outline",
                key_message: "Message",
            };

            const result = await expandStory(
                mockAngle as any,
                mockBrief as any,
                mockProfileId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Unable to fetch voice guidelines");
        });
    });

    describe("generateFrameworkStory", () => {
        it("should generate founder saga story", async () => {
            const mockContent = "Personal founder story content...";
            vi.mocked(generateTextWithAI).mockResolvedValue(mockContent);

            const result = await generateFrameworkStory(
                "founder_saga",
                mockBrief as any,
                mockProfileId
            );

            expect(result.success).toBe(true);
            expect(result.content).toBe(mockContent);
            expect(generateTextWithAI).toHaveBeenCalledWith(
                expect.any(Array),
                expect.objectContaining({
                    temperature: 0.7,
                })
            );
        });

        it("should generate myth buster story", async () => {
            const mockContent = "Myth-busting content...";
            vi.mocked(generateTextWithAI).mockResolvedValue(mockContent);

            const result = await generateFrameworkStory(
                "myth_buster",
                mockBrief as any,
                mockProfileId
            );

            expect(result.success).toBe(true);
            expect(result.content).toBe(mockContent);
        });

        it("should generate philosophy POV story", async () => {
            const mockContent = "Thought leadership content...";
            vi.mocked(generateTextWithAI).mockResolvedValue(mockContent);

            const result = await generateFrameworkStory(
                "philosophy_pov",
                mockBrief as any,
                mockProfileId
            );

            expect(result.success).toBe(true);
            expect(result.content).toBe(mockContent);
        });

        it("should generate current event story", async () => {
            const mockContent = "Timely content...";
            vi.mocked(generateTextWithAI).mockResolvedValue(mockContent);

            const result = await generateFrameworkStory(
                "current_event",
                mockBrief as any,
                mockProfileId
            );

            expect(result.success).toBe(true);
            expect(result.content).toBe(mockContent);
        });

        it("should generate how-to story", async () => {
            const mockContent = "Actionable how-to content...";
            vi.mocked(generateTextWithAI).mockResolvedValue(mockContent);

            const result = await generateFrameworkStory(
                "how_to",
                mockBrief as any,
                mockProfileId
            );

            expect(result.success).toBe(true);
            expect(result.content).toBe(mockContent);
        });

        it("should handle generation errors", async () => {
            vi.mocked(generateTextWithAI).mockRejectedValue(
                new Error("Generation failed")
            );

            const result = await generateFrameworkStory(
                "founder_saga",
                mockBrief as any,
                mockProfileId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Generation failed");
        });
    });

    describe("adaptToFramework", () => {
        it("should adapt content to different framework", async () => {
            const originalContent = "This is original content about automation";
            const adaptedContent =
                "Here's the myth everyone believes about automation...";

            vi.mocked(generateTextWithAI).mockResolvedValue(adaptedContent);

            const result = await adaptToFramework(
                originalContent,
                "myth_buster",
                mockProfileId
            );

            expect(result.success).toBe(true);
            expect(result.adapted).toBe(adaptedContent);
        });

        it("should maintain core message while adapting", async () => {
            const originalContent = "Automation saves time";
            const adaptedContent = "3 years ago, automation saved my business...";

            vi.mocked(generateTextWithAI).mockResolvedValue(adaptedContent);

            const result = await adaptToFramework(
                originalContent,
                "founder_saga",
                mockProfileId
            );

            expect(result.success).toBe(true);
            expect(result.adapted).toBeDefined();
        });

        it("should handle adaptation errors", async () => {
            vi.mocked(generateTextWithAI).mockRejectedValue(
                new Error("Adaptation failed")
            );

            const result = await adaptToFramework("Content", "how_to", mockProfileId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Adaptation failed");
        });
    });

    describe("generateStoryVariants", () => {
        it("should generate multiple story variants", async () => {
            vi.mocked(generateTextWithAI)
                .mockResolvedValueOnce("Founder story content")
                .mockResolvedValueOnce("Myth buster content")
                .mockResolvedValueOnce("Philosophy content");

            const result = await generateStoryVariants(
                mockBrief as any,
                mockProfileId,
                3
            );

            expect(result.success).toBe(true);
            expect(result.variants).toHaveLength(3);
            expect(result.variants![0].framework).toBeDefined();
            expect(result.variants![0].content).toBeDefined();
        });

        it("should handle requested count", async () => {
            vi.mocked(generateTextWithAI)
                .mockResolvedValueOnce("Content 1")
                .mockResolvedValueOnce("Content 2")
                .mockResolvedValueOnce("Content 3")
                .mockResolvedValueOnce("Content 4")
                .mockResolvedValueOnce("Content 5");

            const result = await generateStoryVariants(
                mockBrief as any,
                mockProfileId,
                5
            );

            expect(result.success).toBe(true);
            expect(result.variants).toHaveLength(5);
        });

        it("should handle partial failures", async () => {
            vi.mocked(generateTextWithAI)
                .mockResolvedValueOnce("Content 1")
                .mockRejectedValueOnce(new Error("Failed"))
                .mockResolvedValueOnce("Content 3");

            const result = await generateStoryVariants(
                mockBrief as any,
                mockProfileId,
                3
            );

            expect(result.success).toBe(true);
            expect(result.variants).toHaveLength(2); // Only successful ones
        });

        it("should fail when no variants generated", async () => {
            vi.mocked(generateTextWithAI).mockRejectedValue(new Error("All failed"));

            const result = await generateStoryVariants(
                mockBrief as any,
                mockProfileId,
                3
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed to generate any variants");
        });

        it("should randomize framework selection for small counts", async () => {
            vi.mocked(generateTextWithAI)
                .mockResolvedValueOnce("Content 1")
                .mockResolvedValueOnce("Content 2");

            const result = await generateStoryVariants(
                mockBrief as any,
                mockProfileId,
                2
            );

            expect(result.success).toBe(true);
            expect(result.variants).toHaveLength(2);
        });
    });
});
