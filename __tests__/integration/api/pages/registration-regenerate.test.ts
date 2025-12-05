/**
 * Registration Page Regenerate API Integration Tests
 * Tests full page regeneration using AI for registration pages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/pages/registration/[pageId]/regenerate/route";
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
    generateTextWithAI: vi.fn(async () => {
        return JSON.stringify({
            heroHeadline: "Transform Your Business in 90 Days",
            heroSubheadline: "Join Our Exclusive Masterclass",
        });
    }),
}));

// Mock generators
vi.mock("@/lib/generators/registration-framework-prompts", () => ({
    createFullPageRegenerationPrompt: vi.fn(() => "Test prompt"),
}));

vi.mock("@/lib/generators/registration-page-generator", () => ({
    generateRegistrationHTML: vi.fn(() => "<html>Generated content</html>"),
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
                                        theme: {
                                            primary: "#2563eb",
                                            secondary: "#10b981",
                                        },
                                        regeneration_metadata: {
                                            regeneration_count: 1,
                                        },
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
                                            html_content: "<html>Generated content</html>",
                                            headline: "Transform Your Business in 90 Days",
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
                                                businessNiche: "Digital Marketing",
                                            },
                                        },
                                    ],
                                    deck_structures: [
                                        {
                                            id: "deck-id",
                                            slides: [],
                                        },
                                    ],
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
                                data: {
                                    id: "offer-id",
                                    name: "Test Offer",
                                    price: 997,
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

describe("POST /api/pages/registration/[pageId]/regenerate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should regenerate registration page successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate",
            {
                method: "POST",
                body: JSON.stringify({
                    preserveEditedFields: false,
                }),
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

    it("should handle preserveEditedFields option", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate",
            {
                method: "POST",
                body: JSON.stringify({
                    preserveEditedFields: true,
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
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate",
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

    it("should handle AI generation errors", async () => {
        vi.mocked((await import("@/lib/ai/client")).generateTextWithAI).mockRejectedValueOnce(
            new Error("AI service unavailable")
        );

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate",
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

    it("should handle invalid AI response format", async () => {
        vi.mocked((await import("@/lib/ai/client")).generateTextWithAI).mockResolvedValueOnce(
            "Invalid response without JSON"
        );

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate",
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
                                    error: { message: "Project not found" },
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate",
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

    it("should increment regeneration count", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/regenerate",
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
    });
});
