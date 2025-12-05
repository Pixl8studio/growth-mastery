/**
 * Enrollment Page Regenerate Field API Integration Tests
 * Tests field-specific regeneration for enrollment pages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/pages/enrollment/[pageId]/regenerate-field/route";
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
    generateTextWithAI: vi.fn(async () => "Regenerated enrollment field content"),
    generateWithAI: vi.fn(async () => ({
        variations: [
            "First variation",
            "Second variation",
            "Third variation",
        ],
    })),
}));

// Mock generators
vi.mock("@/lib/generators/enrollment-framework-prompts", () => ({
    createEnrollmentFieldPrompt: vi.fn(() => "Test enrollment field prompt"),
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
                                        html_content: "<div data-field-id='headline'>Old</div>",
                                        offers: {
                                            id: "offer-id",
                                            name: "Test Offer",
                                        },
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
                                            html_content: "<html>Updated</html>",
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
                                },
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            if (table === "vapi_transcripts") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            order: vi.fn(async () => ({
                                data: [
                                    {
                                        extracted_data: {
                                            targetAudience: "Marketers",
                                        },
                                    },
                                ],
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

describe("POST /api/pages/enrollment/[pageId]/regenerate-field", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should regenerate a single field successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate-field",
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

    it("should generate multiple variations when requested", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldId: "headline",
                    fieldContext: "Old headline text",
                    generateMultiple: true,
                    count: 3,
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.options).toBeDefined();
        expect(data.options.length).toBe(3);
    });

    it("should handle lengthPreference option", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate-field",
            {
                method: "POST",
                body: JSON.stringify({
                    fieldId: "headline",
                    fieldContext: "Old headline text with some words",
                    lengthPreference: "shorter",
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

    it("should return 400 when fieldId is missing", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate-field",
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
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate-field",
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
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate-field",
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
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate-field",
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

        expect(response.status).toBe(400);
        expect(data.error).toContain("offer");
    });

    it("should handle AI generation errors", async () => {
        vi.mocked((await import("@/lib/ai/client")).generateTextWithAI).mockRejectedValueOnce(
            new Error("AI error")
        );

        const request = new NextRequest(
            "http://localhost:3000/api/pages/enrollment/test-page-id/regenerate-field",
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
});
