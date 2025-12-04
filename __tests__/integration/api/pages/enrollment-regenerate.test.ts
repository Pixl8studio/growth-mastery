/**
 * Enrollment Page Regenerate API Integration Tests
 * Tests full page regeneration using AI for enrollment pages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/pages/enrollment/[pageId]/regenerate/route";
import { NextRequest } from "next/server";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
        })),
    },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
    getCurrentUserWithProfile: vi.fn(async () => ({
        user: { id: "test-user-id", email: "test@example.com" },
        profile: { id: "test-profile-id" },
    })),
}));

// Mock AI client
vi.mock("@/lib/ai/client", () => ({
    generateTextWithAI: vi.fn(async () => {
        return JSON.stringify({
            heroHeadline: "Enroll Today",
            heroTagline: "Limited Time Offer",
            features: ["Feature 1", "Feature 2"],
        });
    }),
}));

// Mock generators
vi.mock("@/lib/generators/enrollment-framework-prompts", () => ({
    createFullPageEnrollmentPrompt: vi.fn(() => "Test enrollment prompt"),
}));

vi.mock("@/lib/generators/enrollment-page-generator", () => ({
    generateEnrollmentHTML: vi.fn(() => "<html>Generated enrollment content</html>"),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        from: vi.fn((table) => {
            if (table === "enrollment_pages") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn(async () => ({
                                    data: {
                                        id: "test-page-id",
                                        user_id: "test-user-id",
                                        funnel_project_id: "test-project-id",
                                        offers: {
                                            id: "offer-id",
                                            name: "Test Offer",
                                            price: 997,
                                        },
                                        theme: {},
                                        regeneration_metadata: {},
                                    },
                                    error: null,
                                })),
                            })),
                        })),
                    })),
                    update: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                select: vi.fn(() => ({
                                    single: vi.fn(async () => ({
                                        data: {
                                            id: "test-page-id",
                                            html_content: "<html>Generated</html>",
                                        },
                                        error: null,
                                    })),
                                })),
                            })),
                        })),
                    })),
                };
            }
            if (table === "funnel_projects") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: {
                                    id: "test-project-id",
                                    intake_transcripts: [{ extracted_data: {} }],
                                    deck_structures: [{ slides: [] }],
                                },
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

describe("POST /api/pages/enrollment/[pageId]/regenerate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should regenerate enrollment page successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.page).toBeDefined();
        expect(data.generatedContent).toBeDefined();
    });

    it("should return 404 when page is not found", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: null,
                                error: { message: "Not found" },
                            })),
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("Page not found");
    });

    it("should return 400 when offer is missing", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: {
                                    id: "test-page-id",
                                    funnel_project_id: "test-project-id",
                                    offers: null,
                                },
                                error: null,
                            })),
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("offer");
    });

    it("should handle AI generation errors", async () => {
        vi.mocked((await import("@/lib/ai/client")).generateTextWithAI).mockRejectedValueOnce(
            new Error("AI error")
        );

        const request = new NextRequest(
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBeDefined();
    });

    it("should return 500 when project data fetch fails", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            from: vi.fn((table) => {
                if (table === "enrollment_pages") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(async () => ({
                                        data: {
                                            id: "test-page-id",
                                            funnel_project_id: "test-project-id",
                                            offers: { id: "offer-id" },
                                        },
                                        error: null,
                                    })),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn(async () => ({
                                    data: null,
                                    error: { message: "Project error" },
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch project data");
    });
});
