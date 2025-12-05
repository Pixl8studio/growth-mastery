/**
 * Watch Copy Generation API Integration Tests
 * Tests the POST /api/generate/watch-copy endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/watch-copy/route";
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
    createWatchPageCopyPrompt: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
        })),
    },
}));

describe("POST /api/generate/watch-copy", () => {
    const mockUserId = "user-123";
    const mockProjectId = "project-123e4567-e89b-12d3-a456-426614174000";

    const mockProject = {
        id: mockProjectId,
        user_id: mockUserId,
        name: "My Webinar",
        business_niche: "Health Coaching",
    };

    const mockWatchCopy = {
        headline: "Watch This Free Training",
        subheadline: "Discover how to transform your health in 30 days",
        video_introduction: "In this video, you'll learn...",
        key_points: [
            "The biggest mistake people make",
            "The simple framework that works",
            "How to get started today",
        ],
        urgency_message: "Limited time offer - watch now",
        cta_text: "Get Started Now",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate watch copy successfully with video duration", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");
        const { createWatchPageCopyPrompt } = await import("@/lib/ai/prompts");

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
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateWithAI).mockResolvedValue(mockWatchCopy);
        vi.mocked(createWatchPageCopyPrompt).mockReturnValue("mock prompt");

        const request = new NextRequest("http://localhost/api/generate/watch-copy", {
            method: "POST",
            body: JSON.stringify({
                projectId: mockProjectId,
                videoDuration: 45,
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.copy).toEqual(mockWatchCopy);
        expect(createWatchPageCopyPrompt).toHaveBeenCalledWith(
            expect.objectContaining({
                name: mockProject.name,
                niche: mockProject.business_niche,
            }),
            45
        );
    });

    it("should generate watch copy successfully without video duration", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateWithAI } = await import("@/lib/ai/client");
        const { createWatchPageCopyPrompt } = await import("@/lib/ai/prompts");

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
        vi.mocked(generateWithAI).mockResolvedValue(mockWatchCopy);
        vi.mocked(createWatchPageCopyPrompt).mockReturnValue("mock prompt");

        const request = new NextRequest("http://localhost/api/generate/watch-copy", {
            method: "POST",
            body: JSON.stringify({
                projectId: mockProjectId,
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(createWatchPageCopyPrompt).toHaveBeenCalledWith(
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

        const request = new NextRequest("http://localhost/api/generate/watch-copy", {
            method: "POST",
            body: JSON.stringify({
                projectId: mockProjectId,
            }),
        });

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

        const request = new NextRequest("http://localhost/api/generate/watch-copy", {
            method: "POST",
            body: JSON.stringify({}),
        });

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

        const request = new NextRequest("http://localhost/api/generate/watch-copy", {
            method: "POST",
            body: JSON.stringify({
                projectId: "invalid-uuid",
            }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 for negative video duration", async () => {
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

        const request = new NextRequest("http://localhost/api/generate/watch-copy", {
            method: "POST",
            body: JSON.stringify({
                projectId: mockProjectId,
                videoDuration: -5,
            }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("should return 400 for zero video duration", async () => {
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

        const request = new NextRequest("http://localhost/api/generate/watch-copy", {
            method: "POST",
            body: JSON.stringify({
                projectId: mockProjectId,
                videoDuration: 0,
            }),
        });

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

        const request = new NextRequest("http://localhost/api/generate/watch-copy", {
            method: "POST",
            body: JSON.stringify({
                projectId: mockProjectId,
            }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Project not found");
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

        const request = new NextRequest("http://localhost/api/generate/watch-copy", {
            method: "POST",
            body: JSON.stringify({
                projectId: mockProjectId,
            }),
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe("Failed to generate watch page copy");
    });
});
