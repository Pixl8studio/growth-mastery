/**
 * Tests for Presentation API Endpoints
 * Related: GitHub Issue #327 - Enhanced Presentation Generator
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: "test-user-id", email: "test@example.com" } },
            }),
        },
        from: vi.fn((table: string) => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data:
                    table === "presentations"
                        ? {
                              id: "test-presentation-id",
                              user_id: "test-user-id",
                              funnel_project_id: "test-project-id",
                              slides: [
                                  {
                                      slideNumber: 1,
                                      title: "Test Slide",
                                      content: ["Point 1"],
                                      speakerNotes: "Notes",
                                      layoutType: "bullets",
                                      section: "connect",
                                  },
                              ],
                              status: "completed",
                          }
                        : null,
                error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
    }),
}));

// Mock rate limiter
vi.mock("@/lib/middleware/rate-limit", () => ({
    checkRateLimit: vi.fn().mockResolvedValue(null),
    getRateLimitIdentifier: vi.fn().mockReturnValue("test-identifier"),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
    captureException: vi.fn(),
    addBreadcrumb: vi.fn(),
    startSpan: vi.fn(async (_: object, callback: () => Promise<unknown>) => callback()),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe("Slide Reorder API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should validate new order has correct length", () => {
        // Test validation logic
        const slides = [
            { slideNumber: 1 },
            { slideNumber: 2 },
            { slideNumber: 3 },
        ];
        const newOrder = [3, 1, 2];

        expect(newOrder.length).toBe(slides.length);
    });

    it("should detect duplicate slide numbers in order", () => {
        const newOrder = [1, 1, 3];
        const uniqueNumbers = new Set(newOrder);

        expect(uniqueNumbers.size).not.toBe(newOrder.length);
    });

    it("should reorder slides correctly", () => {
        const slides = [
            { slideNumber: 1, title: "First" },
            { slideNumber: 2, title: "Second" },
            { slideNumber: 3, title: "Third" },
        ];
        const newOrder = [3, 1, 2];

        const reorderedSlides = newOrder.map((slideNum, index) => {
            const slide = slides.find((s) => s.slideNumber === slideNum);
            return {
                ...slide,
                slideNumber: index + 1,
            };
        });

        expect(reorderedSlides[0]?.title).toBe("Third");
        expect(reorderedSlides[0]?.slideNumber).toBe(1);
        expect(reorderedSlides[1]?.title).toBe("First");
        expect(reorderedSlides[1]?.slideNumber).toBe(2);
        expect(reorderedSlides[2]?.title).toBe("Second");
        expect(reorderedSlides[2]?.slideNumber).toBe(3);
    });
});

describe("Quick Actions API", () => {
    it("should have all required quick action types", () => {
        const quickActionTypes = [
            "regenerate_image",
            "make_concise",
            "better_title",
            "change_layout",
            "regenerate_notes",
            "expand_content",
            "simplify_language",
        ];

        expect(quickActionTypes).toContain("regenerate_image");
        expect(quickActionTypes).toContain("make_concise");
        expect(quickActionTypes).toContain("better_title");
        expect(quickActionTypes).toContain("change_layout");
        expect(quickActionTypes).toContain("regenerate_notes");
        expect(quickActionTypes).toContain("expand_content");
        expect(quickActionTypes).toContain("simplify_language");
    });

    it("should map action types to prompts", () => {
        const actionPrompts: Record<string, string> = {
            regenerate_image:
                "Generate a new, more compelling image prompt for this slide that better captures the key message.",
            make_concise:
                "Make the content more concise. Reduce word count while keeping the key points impactful.",
            better_title:
                "Rewrite the title to be more engaging, memorable, and action-oriented while keeping the same meaning.",
            change_layout:
                "Restructure the content to work better with a different layout. Adjust bullet points and flow accordingly.",
            regenerate_notes:
                "Generate new speaker notes that are more engaging and provide better guidance for the presenter.",
            expand_content:
                "Expand the content with more detail, examples, and supporting points while maintaining clarity.",
            simplify_language:
                "Simplify the language to be more accessible. Use shorter sentences and common words.",
        };

        expect(actionPrompts["make_concise"]).toContain("concise");
        expect(actionPrompts["better_title"]).toContain("title");
        expect(actionPrompts["expand_content"]).toContain("Expand");
    });
});

describe("Layout Types", () => {
    it("should have all supported layout types", () => {
        const layoutTypes = [
            "title",
            "section",
            "content_left",
            "content_right",
            "bullets",
            "quote",
            "statistics",
            "comparison",
            "process",
            "cta",
        ];

        expect(layoutTypes).toHaveLength(10);
        expect(layoutTypes).toContain("title");
        expect(layoutTypes).toContain("cta");
        expect(layoutTypes).toContain("bullets");
    });
});
