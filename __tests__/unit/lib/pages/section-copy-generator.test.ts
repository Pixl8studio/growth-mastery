import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSectionCopy } from "@/lib/pages/section-copy-generator";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn() })),
    },
}));
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { generateWithAI } from "@/lib/ai/client";

describe("Section Copy Generator", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should generate hero section copy", async () => {
        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { transcript_text: "Build a coaching business" },
                            error: null,
                        }),
                    };
                }
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { name: "Coaching Program" },
                            error: null,
                        }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateWithAI).mockResolvedValue({
            headline: "Transform Your Life",
            subheadline: "Join our proven program",
            cta: "Get Started Now",
        });

        const result = await generateSectionCopy({
            sectionType: "hero",
            pageType: "registration",
            projectId: "project-123",
        });

        expect(result.headline).toBe("Transform Your Life");
        expect(result.subheadline).toBe("Join our proven program");
        expect(result.cta).toBe("Get Started Now");
    });

    it("should generate benefits section copy", async () => {
        const mockSupabase = {
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { transcript_text: "Benefits text" },
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateWithAI).mockResolvedValue({
            headline: "What You'll Get",
            bullets: ["Benefit 1", "Benefit 2", "Benefit 3"],
        });

        const result = await generateSectionCopy({
            sectionType: "benefits",
            pageType: "enrollment",
            projectId: "project-123",
        });

        expect(result.headline).toBe("What You'll Get");
        expect(result.bullets).toHaveLength(3);
    });

    it("should handle missing intake data", async () => {
        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Not found" },
                        }),
                    };
                }
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { name: "Project" },
                            error: null,
                        }),
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateWithAI).mockResolvedValue({
            headline: "Generic Headline",
            body: "Generic body copy",
        });

        const result = await generateSectionCopy({
            sectionType: "problem",
            pageType: "registration",
            projectId: "project-123",
        });

        expect(result.headline).toBeDefined();
    });

    it("should use custom prompt when provided", async () => {
        const mockSupabase = {
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateWithAI).mockResolvedValue({
            headline: "Custom Headline",
        });

        const result = await generateSectionCopy({
            sectionType: "hero",
            pageType: "watch",
            projectId: "project-123",
            customPrompt: "Make it urgent",
        });

        expect(result.headline).toBeDefined();
    });
});
