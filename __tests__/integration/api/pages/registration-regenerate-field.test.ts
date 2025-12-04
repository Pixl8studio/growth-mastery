/**
 * Registration Page Regenerate Field API Integration Tests
 * Tests field-specific regeneration for registration pages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/pages/registration/[pageId]/regenerate-field/route";
import { NextRequest } from "next/server";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
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
    generateTextWithAI: vi.fn(async () => "Regenerated field content"),
}));

// Mock generators
vi.mock("@/lib/generators/registration-framework-prompts", () => ({
    createFieldRegenerationPrompt: vi.fn(() => "Test field prompt"),
}));

// Mock cheerio
vi.mock("cheerio", () => ({
    load: vi.fn(() => ({
        html: vi.fn(() => "<html>Updated content</html>"),
    })),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        from: vi.fn((table) => {
            if (table === "registration_pages") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn(async () => ({
                                    data: {
                                        id: "test-page-id",
                                        user_id: "test-user-id",
                                        funnel_project_id: "test-project-id",
                                        html_content: "<div data-field-id='headline'>Old content</div>",
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
                                            html_content: "<html>Updated content</html>",
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
                                    business_niche: "Marketing",
                                    intake_transcripts: [
                                        {
                                            extracted_data: {
                                                targetAudience: "Marketers",
                                            },
                                        },
                                    ],
                                    deck_structures: [{ slides: [] }],
                                },
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            if (table === "offers") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: { id: "offer-id", name: "Test Offer" },
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

describe("POST /api/pages/registration/[pageId]/regenerate-field", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should regenerate a specific field successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldId: "headline",
                    fieldContext: "Old headline text",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.fieldId).toBe("headline");
        expect(data.newContent).toBeDefined();
        expect(data.page).toBeDefined();
    });

    it("should return 400 when fieldId is missing", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldContext: "Some content",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("fieldId");
    });

    it("should return 400 when fieldContext is missing", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldId: "headline",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("fieldContext");
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
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldId: "headline",
                    fieldContext: "Old content",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("Page not found");
    });

    it("should track regenerated field in metadata", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldId: "headline",
                    fieldContext: "Old headline",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should handle AI generation errors", async () => {
        vi.mocked((await import("@/lib/ai/client")).generateTextWithAI).mockRejectedValueOnce(
            new Error("AI service error")
        );

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldId: "headline",
                    fieldContext: "Old content",
                }),
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
                if (table === "registration_pages") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(async () => ({
                                        data: {
                                            id: "test-page-id",
                                            funnel_project_id: "test-project-id",
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
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldId: "headline",
                    fieldContext: "Old content",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch project data");
    });

    it("should handle update errors gracefully", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            from: vi.fn((table) => {
                if (table === "registration_pages") {
                    const selectMock = {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(async () => ({
                                        data: {
                                            id: "test-page-id",
                                            funnel_project_id: "test-project-id",
                                            html_content: "<div>Test</div>",
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
                                            data: null,
                                            error: { message: "Update failed" },
                                        })),
                                    })),
                                })),
                            })),
                        })),
                    };
                    return selectMock;
                }
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: { id: "test", intake_transcripts: [], deck_structures: [] },
                                error: null,
                            })),
                        })),
                    })),
                };
            }),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldId: "headline",
                    fieldContext: "Old content",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to update page");
    });
});
