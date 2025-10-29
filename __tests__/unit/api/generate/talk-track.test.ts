/**
 * Talk Track Generation API Tests
 * Tests job creation and status polling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/talk-track/route";
import { GET } from "@/app/api/generate/talk-track/status/[jobId]/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(),
    })),
}));

describe("Talk Track Generation API", () => {
    const mockProjectId = "123e4567-e89b-12d3-a456-426614174000";
    const mockDeckStructureId = "123e4567-e89b-12d3-a456-426614174001";
    const mockUserId = "user-123";
    const mockJobId = "job-123";

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock fetch for Edge Function invocation
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: async () => ({ success: true }),
            } as Response)
        );
    });

    describe("POST /api/generate/talk-track", () => {
        it("should create job and return job ID immediately", async () => {
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
                    if (table === "deck_structures") {
                        return {
                            select: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    eq: vi.fn(() => ({
                                        single: vi.fn(() =>
                                            Promise.resolve({
                                                data: {
                                                    id: mockDeckStructureId,
                                                },
                                                error: null,
                                            })
                                        ),
                                    })),
                                })),
                            })),
                        };
                    }
                    if (table === "talk_track_jobs") {
                        return {
                            insert: vi.fn(() => ({
                                select: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: { id: mockJobId },
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const request = new NextRequest(
                "http://localhost/api/generate/talk-track",
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
            expect(data.jobId).toBe(mockJobId);
        });

        it("should return 401 if user not authenticated", async () => {
            const { createClient } = await import("@/lib/supabase/server");
            const mockSupabase = {
                auth: {
                    getUser: vi.fn(() =>
                        Promise.resolve({ data: { user: null }, error: null })
                    ),
                },
                from: vi.fn(),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const request = new NextRequest(
                "http://localhost/api/generate/talk-track",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: mockProjectId,
                        deckStructureId: mockDeckStructureId,
                    }),
                }
            );

            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it("should return 400 if invalid input", async () => {
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
                "http://localhost/api/generate/talk-track",
                {
                    method: "POST",
                    body: JSON.stringify({
                        projectId: "invalid-uuid",
                        deckStructureId: mockDeckStructureId,
                    }),
                }
            );

            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });

    describe("GET /api/generate/talk-track/status/[jobId]", () => {
        it("should return job status", async () => {
            const { createClient } = await import("@/lib/supabase/server");
            const mockJob = {
                id: mockJobId,
                status: "processing",
                progress: 50,
                current_chunk: 3,
                total_chunks: 6,
                error_message: null,
                talk_track_id: null,
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
                from: vi.fn(() => ({
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
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const request = new NextRequest(
                `http://localhost/api/generate/talk-track/status/${mockJobId}`
            );

            const response = await GET(request, {
                params: Promise.resolve({ jobId: mockJobId }),
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.job).toEqual(mockJob);
        });

        it("should return 404 if job not found", async () => {
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
                from: vi.fn(() => ({
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
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const request = new NextRequest(
                `http://localhost/api/generate/talk-track/status/${mockJobId}`
            );

            const response = await GET(request, {
                params: Promise.resolve({ jobId: mockJobId }),
            });

            expect(response.status).toBe(404);
        });
    });
});
