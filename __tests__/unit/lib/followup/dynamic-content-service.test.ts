/**
 * Tests for Dynamic Content Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FollowupProspect } from "@/types/followup";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock content selector service
vi.mock("@/lib/followup/content-selector-service", () => ({
    selectStoriesForProspect: vi.fn().mockResolvedValue({
        success: true,
        stories: [
            {
                id: "story-1",
                title: "Success Story",
                content: "Client doubled revenue in 3 months",
                story_type: "testimonial",
            },
            {
                id: "story-2",
                title: "Quick Win",
                content: "Saw results in first week",
                story_type: "proof_element",
            },
        ],
    }),
    getRecommendedStoryTypes: vi.fn().mockReturnValue(["testimonial", "proof_element"]),
}));

// Mock story library service
vi.mock("@/lib/followup/story-library-service", () => ({
    findMatchingStories: vi.fn().mockResolvedValue({
        success: true,
        stories: [
            {
                id: "story-objection",
                title: "Price Objection Story",
                content: "The investment paid for itself in 2 months",
                story_type: "micro_story",
            },
        ],
    }),
    recordStoryUsage: vi.fn().mockResolvedValue({ success: true }),
}));

// Import after mocks are defined
const { injectDynamicContent, buildObjectionAwareMessage } =
    await import("@/lib/followup/dynamic-content-service");

describe("Dynamic Content Service", () => {
    const mockProspect: FollowupProspect = {
        id: "prospect-123",
        user_id: "user-123",
        funnel_project_id: "funnel-123",
        contact_id: null,
        agent_config_id: null,
        email: "test@example.com",
        first_name: "John",
        phone: null,
        watch_percentage: 75,
        watch_duration_seconds: 1800,
        last_watched_at: "2025-01-26T10:00:00Z",
        replay_count: 1,
        challenge_notes: "Need more leads",
        goal_notes: "Double revenue",
        objection_hints: ["price_concern"],
        offer_clicks: 2,
        segment: "engaged",
        intent_score: 75,
        fit_score: 60,
        combined_score: 70,
        engagement_level: "warm",
        timezone: "UTC",
        locale: "en-US",
        consent_state: "opt_in",
        consent_timestamp: "2025-01-26T09:00:00Z",
        opted_out_at: null,
        opt_out_reason: null,
        total_touches: 0,
        last_touch_at: null,
        next_scheduled_touch: null,
        converted: false,
        converted_at: null,
        conversion_value: null,
        metadata: {},
        created_at: "2025-01-26T09:00:00Z",
        updated_at: "2025-01-26T10:00:00Z",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("injectDynamicContent", () => {
        it("replaces {story} placeholder with selected story", async () => {
            const message = "Here's proof: {story}\n\nClick here: {enrollment_link}";

            const result = await injectDynamicContent(message, mockProspect, {
                business_niche: "coaching",
                price_band: "mid",
            });

            expect(result.success).toBe(true);
            expect(result.content).toContain("Client doubled revenue");
            expect(result.stories_used).toHaveLength(1);
        });

        it("handles multiple story placeholders", async () => {
            const message = "First: {story_1}\n\nSecond: {story_2}\n\nDone!";

            const result = await injectDynamicContent(message, mockProspect, {
                business_niche: "coaching",
            });

            expect(result.success).toBe(true);
            expect(result.stories_used).toHaveLength(2);
        });

        it("returns original content when no placeholders", async () => {
            const message = "Simple message with no dynamic content";

            const result = await injectDynamicContent(message, mockProspect, {});

            expect(result.success).toBe(true);
            expect(result.content).toBe(message);
            expect(result.stories_used).toHaveLength(0);
        });

        it("removes placeholders when no stories available", async () => {
            const { selectStoriesForProspect } =
                await import("@/lib/followup/content-selector-service");
            vi.mocked(selectStoriesForProspect).mockResolvedValueOnce({
                success: false,
                error: "No stories found",
            });

            const message = "Check this out: {story}\n\nThanks!";

            const result = await injectDynamicContent(message, mockProspect, {});

            expect(result.success).toBe(true);
            expect(result.content).not.toContain("{story}");
            expect(result.stories_used).toHaveLength(0);
        });
    });

    describe("buildObjectionAwareMessage", () => {
        it("injects objection reframe before CTA", async () => {
            const baseMessage = "Great webinar!\n\n{enrollment_link}";

            const result = await buildObjectionAwareMessage(
                baseMessage,
                mockProspect,
                "price_concern",
                { business_niche: "coaching", price_band: "mid" }
            );

            expect(result.success).toBe(true);
            expect(result.message).toContain("You might be wondering");
            expect(result.message).toContain("the investment");
            expect(result.message).toContain("paid for itself");
            expect(result.story?.id).toBe("story-objection");
        });

        it("appends reframe when no CTA placeholder present", async () => {
            const baseMessage = "Simple message with no CTA";

            const result = await buildObjectionAwareMessage(
                baseMessage,
                mockProspect,
                "timing_concern",
                {}
            );

            expect(result.success).toBe(true);
            expect(result.message).toContain("Simple message");
            expect(result.message).toContain("---"); // Section divider
            expect(result.story).toBeDefined();
        });
    });
});
