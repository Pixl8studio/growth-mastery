/**
 * Brief Generation API Integration Tests
 * Tests content generation from briefs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/briefs/[briefId]/generate/route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mock services
vi.mock("@/lib/marketing/story-weaver-service", () => ({
    generateStoryAngles: vi.fn(() =>
        Promise.resolve({
            success: true,
            angles: [
                {
                    id: "angle-1",
                    story_outline: "Test outline",
                    hook: "Test hook",
                },
            ],
        })
    ),
}));

vi.mock("@/lib/marketing/content-architect-service", () => ({
    generatePlatformVariants: vi.fn(() =>
        Promise.resolve({
            success: true,
            variants: [
                {
                    platform: "instagram",
                    copy_text: "Test copy",
                },
            ],
        })
    ),
}));

vi.mock("@/lib/marketing/cta-strategist-service", () => ({
    generateCTA: vi.fn(() =>
        Promise.resolve({
            success: true,
            cta: { text: "Learn More", url: "https://test.com" },
        })
    ),
}));

vi.mock("@/lib/marketing/preflight-service", () => ({
    runPreflightValidation: vi.fn(() =>
        Promise.resolve({
            success: true,
            result: { passed: true, issues: [] },
        })
    ),
    createPreflightStatus: vi.fn((result) => result),
}));

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "user-123" } },
                error: null,
            })),
        },
        from: vi.fn((table: string) => {
            if (table === "marketing_content_briefs") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: {
                                    id: "brief-123",
                                    user_id: "user-123",
                                    marketing_profile_id: "profile-123",
                                    target_platforms: ["instagram"],
                                },
                                error: null,
                            })),
                        })),
                    })),
                    update: vi.fn(() => ({
                        eq: vi.fn(() => Promise.resolve({ data: {}, error: null })),
                    })),
                };
            }
            if (table === "marketing_post_variants") {
                return {
                    insert: vi.fn(() => ({
                        select: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: { id: "variant-123" },
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            return {};
        }),
    })),
}));

describe("POST /api/marketing/briefs/[briefId]/generate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("generates content successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/briefs/brief-123/generate",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const context = { params: Promise.resolve({ briefId: "brief-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.variants).toBeDefined();
    });

    it("returns 401 for unauthenticated requests", async () => {
        vi.mocked(createClient).mockReturnValue({
            auth: {
                getUser: vi.fn(() => ({
                    data: { user: null },
                    error: new Error("Not authenticated"),
                })),
            },
        } as any);

        const request = new NextRequest(
            "http://localhost/api/marketing/briefs/brief-123/generate",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const context = { params: Promise.resolve({ briefId: "brief-123" }) };
        const response = await POST(request, context);

        expect(response.status).toBe(401);
    });

    it("returns 404 when brief not found", async () => {
        vi.mocked(createClient).mockReturnValue({
            auth: {
                getUser: vi.fn(() => ({
                    data: { user: { id: "user-123" } },
                    error: null,
                })),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn(() => ({
                            data: null,
                            error: new Error("Not found"),
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest(
            "http://localhost/api/marketing/briefs/brief-123/generate",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const context = { params: Promise.resolve({ briefId: "brief-123" }) };
        const response = await POST(request, context);

        expect(response.status).toBe(404);
    });
});
