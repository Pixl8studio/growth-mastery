/**
 * Generation Status API Integration Tests
 * Tests the GET /api/generate/generation-status endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/generate/generation-status/route";
import { NextRequest } from "next/server";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
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

describe("GET /api/generate/generation-status", () => {
    const mockUserId = "user-123";
    const mockProjectId = "project-123e4567-e89b-12d3-a456-426614174000";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return generation status successfully when generating", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockProject = {
            id: mockProjectId,
            user_id: mockUserId,
            auto_generation_status: {
                is_generating: true,
                current_step: 3,
                generated_steps: [1, 2],
                generation_errors: [],
                progress: [
                    {
                        step: 1,
                        stepName: "Generate Offer",
                        status: "completed",
                        completedAt: "2024-01-01T00:00:00Z",
                    },
                    {
                        step: 2,
                        stepName: "Generate Deck",
                        status: "completed",
                        completedAt: "2024-01-01T00:05:00Z",
                    },
                    {
                        step: 3,
                        stepName: "Generate Copy",
                        status: "in_progress",
                    },
                ],
                started_at: "2024-01-01T00:00:00Z",
            },
        };

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

        const request = new NextRequest(
            `http://localhost/api/generate/generation-status?projectId=${mockProjectId}`
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.isGenerating).toBe(true);
        expect(data.currentStep).toBe(3);
        expect(data.completedSteps).toEqual([1, 2]);
        expect(data.failedSteps).toEqual([]);
        expect(data.progress).toHaveLength(3);
        expect(data.startedAt).toBe("2024-01-01T00:00:00Z");
    });

    it("should return generation status successfully when not generating", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockProject = {
            id: mockProjectId,
            user_id: mockUserId,
            auto_generation_status: {
                is_generating: false,
                current_step: null,
                generated_steps: [1, 2, 3, 4, 5],
                generation_errors: [],
                progress: [
                    {
                        step: 1,
                        stepName: "Generate Offer",
                        status: "completed",
                        completedAt: "2024-01-01T00:00:00Z",
                    },
                    {
                        step: 2,
                        stepName: "Generate Deck",
                        status: "completed",
                        completedAt: "2024-01-01T00:05:00Z",
                    },
                ],
                started_at: "2024-01-01T00:00:00Z",
            },
        };

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

        const request = new NextRequest(
            `http://localhost/api/generate/generation-status?projectId=${mockProjectId}`
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.isGenerating).toBe(false);
        expect(data.currentStep).toBeNull();
        expect(data.completedSteps).toEqual([1, 2, 3, 4, 5]);
    });

    it("should return status with failed steps", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockProject = {
            id: mockProjectId,
            user_id: mockUserId,
            auto_generation_status: {
                is_generating: false,
                current_step: null,
                generated_steps: [1, 2],
                generation_errors: [
                    { step: 3, error: "AI generation failed" },
                    { step: 4, error: "Database error" },
                ],
                progress: [],
                started_at: "2024-01-01T00:00:00Z",
            },
        };

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

        const request = new NextRequest(
            `http://localhost/api/generate/generation-status?projectId=${mockProjectId}`
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.failedSteps).toHaveLength(2);
        expect(data.failedSteps[0]).toEqual({ step: 3, error: "AI generation failed" });
    });

    it("should handle empty auto_generation_status gracefully", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockProject = {
            id: mockProjectId,
            user_id: mockUserId,
            auto_generation_status: {},
        };

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

        const request = new NextRequest(
            `http://localhost/api/generate/generation-status?projectId=${mockProjectId}`
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.isGenerating).toBe(false);
        expect(data.currentStep).toBeNull();
        expect(data.completedSteps).toEqual([]);
        expect(data.failedSteps).toEqual([]);
        expect(data.progress).toEqual([]);
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
            "http://localhost/api/generate/generation-status"
        );

        const response = await GET(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("projectId is required");
    });

    it("should return 401 for unauthenticated users", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn(() =>
                    Promise.resolve({
                        data: { user: null },
                        error: { message: "Not authenticated" },
                    })
                ),
            },
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            `http://localhost/api/generate/generation-status?projectId=${mockProjectId}`
        );

        const response = await GET(request);
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
            `http://localhost/api/generate/generation-status?projectId=${mockProjectId}`
        );

        const response = await GET(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe("Project not found or access denied");
    });

    it("should return 500 when database query fails", async () => {
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
            from: vi.fn(() => {
                throw new Error("Database connection failed");
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            `http://localhost/api/generate/generation-status?projectId=${mockProjectId}`
        );

        const response = await GET(request);
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe("Failed to get generation status");
    });
});
