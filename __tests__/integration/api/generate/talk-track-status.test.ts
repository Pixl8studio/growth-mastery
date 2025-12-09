/**
 * Talk Track Status API Integration Tests
 * Tests the GET /api/generate/talk-track/status/[jobId] endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/generate/talk-track/status/[jobId]/route";
import { NextRequest } from "next/server";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("GET /api/generate/talk-track/status/[jobId]", () => {
    const mockUserId = "user-123";
    const mockJobId = "job-123e4567-e89b-12d3-a456-426614174000";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return job status when job is processing", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockJob = {
            id: mockJobId,
            user_id: mockUserId,
            status: "processing",
            progress: 50,
            current_chunk: 3,
            total_chunks: 6,
            error_message: null,
            talk_track_id: null,
            created_at: "2024-01-01T00:00:00Z",
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
                if (table === "talk_track_jobs") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockJob,
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
            `http://localhost/api/generate/talk-track/status/${mockJobId}`
        );

        const context = {
            params: Promise.resolve({ jobId: mockJobId }),
        };

        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.job).toBeDefined();
        expect(data.job.id).toBe(mockJobId);
        expect(data.job.status).toBe("processing");
        expect(data.job.progress).toBe(50);
        expect(data.job.current_chunk).toBe(3);
        expect(data.job.total_chunks).toBe(6);
    });

    it("should return job status when job is completed", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockTalkTrackId = "track-123e4567-e89b-12d3-a456-426614174000";

        const mockJob = {
            id: mockJobId,
            user_id: mockUserId,
            status: "completed",
            progress: 100,
            current_chunk: 6,
            total_chunks: 6,
            error_message: null,
            talk_track_id: mockTalkTrackId,
            created_at: "2024-01-01T00:00:00Z",
            completed_at: "2024-01-01T00:10:00Z",
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
                if (table === "talk_track_jobs") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockJob,
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
            `http://localhost/api/generate/talk-track/status/${mockJobId}`
        );

        const context = {
            params: Promise.resolve({ jobId: mockJobId }),
        };

        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.job.status).toBe("completed");
        expect(data.job.progress).toBe(100);
        expect(data.job.talk_track_id).toBe(mockTalkTrackId);
    });

    it("should return job status when job has failed", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockJob = {
            id: mockJobId,
            user_id: mockUserId,
            status: "failed",
            progress: 33,
            current_chunk: 2,
            total_chunks: 6,
            error_message: "AI generation error: rate limit exceeded",
            talk_track_id: null,
            created_at: "2024-01-01T00:00:00Z",
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
                if (table === "talk_track_jobs") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockJob,
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
            `http://localhost/api/generate/talk-track/status/${mockJobId}`
        );

        const context = {
            params: Promise.resolve({ jobId: mockJobId }),
        };

        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.job.status).toBe("failed");
        expect(data.job.error_message).toBe("AI generation error: rate limit exceeded");
    });

    it("should return job status when job is pending", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockJob = {
            id: mockJobId,
            user_id: mockUserId,
            status: "pending",
            progress: 0,
            current_chunk: 0,
            total_chunks: 6,
            error_message: null,
            talk_track_id: null,
            created_at: "2024-01-01T00:00:00Z",
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
                if (table === "talk_track_jobs") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: mockJob,
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
            `http://localhost/api/generate/talk-track/status/${mockJobId}`
        );

        const context = {
            params: Promise.resolve({ jobId: mockJobId }),
        };

        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.job.status).toBe("pending");
        expect(data.job.progress).toBe(0);
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
            `http://localhost/api/generate/talk-track/status/${mockJobId}`
        );

        const context = {
            params: Promise.resolve({ jobId: mockJobId }),
        };

        const response = await GET(request, context);
        expect(response.status).toBe(401);
    });

    it("should return 404 when job not found", async () => {
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
                if (table === "talk_track_jobs") {
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
            `http://localhost/api/generate/talk-track/status/${mockJobId}`
        );

        const context = {
            params: Promise.resolve({ jobId: mockJobId }),
        };

        const response = await GET(request, context);
        expect(response.status).toBe(404);
    });

    it("should return 404 when job belongs to different user", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const _mockJob = {
            id: mockJobId,
            user_id: "different-user-456",
            status: "processing",
            progress: 50,
            current_chunk: 3,
            total_chunks: 6,
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
                if (table === "talk_track_jobs") {
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
            `http://localhost/api/generate/talk-track/status/${mockJobId}`
        );

        const context = {
            params: Promise.resolve({ jobId: mockJobId }),
        };

        const response = await GET(request, context);
        expect(response.status).toBe(404);
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
                throw new Error("Database connection error");
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = new NextRequest(
            `http://localhost/api/generate/talk-track/status/${mockJobId}`
        );

        const context = {
            params: Promise.resolve({ jobId: mockJobId }),
        };

        const response = await GET(request, context);
        expect(response.status).toBe(500);
    });
});
