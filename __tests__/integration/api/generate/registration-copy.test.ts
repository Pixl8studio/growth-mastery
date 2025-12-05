/**
 * Registration Copy Generation API Integration Tests
 * Tests the POST /api/generate/registration-copy endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/registration-copy/route";
import { NextRequest } from "next/server";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

// Mock AI client
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: vi.fn(),
}));

// Mock prompts
vi.mock("@/lib/ai/prompts", () => ({
    createRegistrationCopyPrompt: vi.fn(),
}));

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

describe("POST /api/generate/registration-copy", () => {
    const mockUserId = "user-123";
    const mockProjectId = "project-123e4567-e89b-12d3-a456-426614174000";
    const mockDeckStructureId = "deck-123e4567-e89b-12d3-a456-426614174000";

    const mockProject = {
        id: mockProjectId,
        user_id: mockUserId,
        name: "My Webinar Project",
        business_niche: "Business Coaching",
        target_audience: "Entrepreneurs",
    };

    const mockDeckStructure = {
        id: mockDeckStructureId,
        user_id: mockUserId,
        slides: [
            { slideNumber: 1, title: "Slide 1", description: "Content 1" },
            { slideNumber: 2, title: "Slide 2", description: "Content 2" },
        ],
    };

    const mockRegistrationCopy = {
        headline: "Join Our Free Masterclass",
        subheadline: "Learn the secrets to scaling your business",
        benefits: [
            "Discover proven strategies",
            "Get actionable insights",
            "Transform your approach",
        ],
        form_fields: ["name", "email"],
        cta_button: "Save My Spot",
        privacy_note: "We respect your privacy",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate registration copy successfully with deck structure", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");
        const { createRegistrationCopyPrompt } = await import("@/lib/ai/prompts");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId, email: "test@example.com" } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockProject,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "deck_structures") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockDeckStructure,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateWithAI).mockResolvedValue(mockRegistrationCopy);
        vi.mocked(createRegistrationCopyPrompt).mockReturnValue("mock prompt");

        const request = new NextRequest(
            "http://localhost/api/generate/registration-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    deckStructureId: mockDeckStructureId,
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.copy).toEqual(mockRegistrationCopy);
        expect(createRegistrationCopyPrompt).toHaveBeenCalledWith(
            expect.objectContaining({
                name: mockProject.name,
                niche: mockProject.business_niche,
                targetAudience: mockProject.target_audience,
            }),
            mockDeckStructure.slides
        );
    });

    it("should generate registration copy successfully without deck structure", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");
        const { createRegistrationCopyPrompt } = await import("@/lib/ai/prompts");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockProject,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateWithAI).mockResolvedValue(mockRegistrationCopy);
        vi.mocked(createRegistrationCopyPrompt).mockReturnValue("mock prompt");

        const request = new NextRequest(
            "http://localhost/api/generate/registration-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(createRegistrationCopyPrompt).toHaveBeenCalledWith(
            expect.any(Object),
            undefined
        );
    });

    it("should return 401 for unauthenticated users", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: null },
                        error: null,
                    })
                ),
            },
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/registration-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(401);
    });

    it("should return 400 for missing projectId", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/registration-copy",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid UUID in projectId", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/registration-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: "invalid-uuid",
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 for invalid UUID in deckStructureId", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/registration-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    deckStructureId: "not-a-uuid",
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 when project not found", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: null,
                                            error: { message: "Not found" },
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            "http://localhost/api/generate/registration-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Project not found");
    });

    it("should handle deck structure not found gracefully", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockProject,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "deck_structures") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: null,
                                            error: { message: "Not found" },
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateWithAI).mockResolvedValue(mockRegistrationCopy);

        const request = new NextRequest(
            "http://localhost/api/generate/registration-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                    deckStructureId: mockDeckStructureId,
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 500 when AI generation fails", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: { id: mockUserId } },
                        error: null,
                    })
                ),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockProject,
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateWithAI).mockRejectedValue(new Error("AI service error"));

        const request = new NextRequest(
            "http://localhost/api/generate/registration-copy",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: mockProjectId,
                }),
            }
        );

        const response = await POST(request);
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe("Failed to generate registration copy");
    });
});
