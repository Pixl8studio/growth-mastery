/**
 * Generate Section Copy API Integration Tests
 * Tests AI-powered section copy generation for pages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/pages/generate-section-copy/route";
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

// Mock section copy generator
vi.mock("@/lib/pages/section-copy-generator", () => ({
    generateSectionCopy: vi.fn(async () => ({
        headline: "Generated Headline",
        body: "Generated body content",
    })),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        auth: {
            getUser: vi.fn(async () => ({
                data: {
                    user: { id: "test-user-id", email: "test@example.com" },
                },
                error: null,
            })),
        },
        from: vi.fn((table) => {
            if (table === "funnel_projects") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn(async () => ({
                                    data: {
                                        id: "test-project-id",
                                        user_id: "test-user-id",
                                    },
                                    error: null,
                                })),
                            })),
                        })),
                    })),
                };
            }
            if (table === "pages") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: {
                                    id: "test-page-id",
                                    page_type: "registration",
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

describe("POST /api/pages/generate-section-copy", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate section copy successfully", async () => {
        const request = new NextRequest("http://localhost:3000/api/pages/generate-section-copy", {
            method: "POST",
            body: JSON.stringify({
                sectionType: "hero",
                pageId: "test-page-id",
                projectId: "test-project-id",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.copy).toBeDefined();
    });

    it("should handle custom prompts", async () => {
        const request = new NextRequest("http://localhost:3000/api/pages/generate-section-copy", {
            method: "POST",
            body: JSON.stringify({
                sectionType: "hero",
                pageId: "test-page-id",
                projectId: "test-project-id",
                customPrompt: "Focus on urgency and scarcity",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 401 when user is not authenticated", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            auth: {
                getUser: vi.fn(async () => ({
                    data: { user: null },
                    error: null,
                })),
            },
        } as any);

        const request = new NextRequest("http://localhost:3000/api/pages/generate-section-copy", {
            method: "POST",
            body: JSON.stringify({
                sectionType: "hero",
                pageId: "test-page-id",
                projectId: "test-project-id",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when sectionType is missing", async () => {
        const request = new NextRequest("http://localhost:3000/api/pages/generate-section-copy", {
            method: "POST",
            body: JSON.stringify({
                pageId: "test-page-id",
                projectId: "test-project-id",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Section type");
    });

    it("should return 400 when sectionType is empty", async () => {
        const request = new NextRequest("http://localhost:3000/api/pages/generate-section-copy", {
            method: "POST",
            body: JSON.stringify({
                sectionType: "   ",
                pageId: "test-page-id",
                projectId: "test-project-id",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Section type");
    });

    it("should return 400 when pageId is missing", async () => {
        const request = new NextRequest("http://localhost:3000/api/pages/generate-section-copy", {
            method: "POST",
            body: JSON.stringify({
                sectionType: "hero",
                projectId: "test-project-id",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Page ID");
    });

    it("should return 400 when projectId is missing", async () => {
        const request = new NextRequest("http://localhost:3000/api/pages/generate-section-copy", {
            method: "POST",
            body: JSON.stringify({
                sectionType: "hero",
                pageId: "test-page-id",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Project ID");
    });

    it("should return 404 when project is not found", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            auth: {
                getUser: vi.fn(async () => ({
                    data: { user: { id: "test-user-id" } },
                    error: null,
                })),
            },
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

        const request = new NextRequest("http://localhost:3000/api/pages/generate-section-copy", {
            method: "POST",
            body: JSON.stringify({
                sectionType: "hero",
                pageId: "test-page-id",
                projectId: "invalid-project-id",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain("Project not found");
    });

    it("should return 404 when page is not found", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            auth: {
                getUser: vi.fn(async () => ({
                    data: { user: { id: "test-user-id" } },
                    error: null,
                })),
            },
            from: vi.fn((table) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(async () => ({
                                        data: { id: "test-project-id", user_id: "test-user-id" },
                                        error: null,
                                    })),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "pages") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn(async () => ({
                                    data: null,
                                    error: { message: "Page not found" },
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        } as any);

        const request = new NextRequest("http://localhost:3000/api/pages/generate-section-copy", {
            method: "POST",
            body: JSON.stringify({
                sectionType: "hero",
                pageId: "invalid-page-id",
                projectId: "test-project-id",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("Page not found");
    });

    it("should handle generation errors", async () => {
        vi.mocked((await import("@/lib/pages/section-copy-generator")).generateSectionCopy).mockRejectedValueOnce(
            new Error("Generation failed")
        );

        const request = new NextRequest("http://localhost:3000/api/pages/generate-section-copy", {
            method: "POST",
            body: JSON.stringify({
                sectionType: "hero",
                pageId: "test-page-id",
                projectId: "test-project-id",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBeDefined();
    });
});
