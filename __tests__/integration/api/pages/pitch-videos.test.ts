/**
 * Pitch Videos API Integration Tests
 * Tests retrieving pitch videos for a project
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/pages/pitch-videos/route";
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

// Mock Cloudflare client
vi.mock("@/lib/cloudflare/client", () => ({
    getThumbnailUrl: vi.fn((videoId) => `https://cloudflare.com/thumbnails/${videoId}`),
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
            if (table === "pitch_videos") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            order: vi.fn(async () => ({
                                data: [
                                    {
                                        id: "video-1",
                                        title: "Pitch Video 1",
                                        video_id: "cf-video-1",
                                        duration: 120,
                                        created_at: "2024-01-01T00:00:00Z",
                                    },
                                    {
                                        id: "video-2",
                                        title: null,
                                        video_id: "cf-video-2",
                                        duration: null,
                                        created_at: "2024-01-02T00:00:00Z",
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

describe("GET /api/pages/pitch-videos", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fetch pitch videos successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/pitch-videos?projectId=test-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.videos).toBeDefined();
        expect(Array.isArray(data.videos)).toBe(true);
        expect(data.videos.length).toBe(2);
    });

    it("should include thumbnail URLs from Cloudflare", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/pitch-videos?projectId=test-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.videos[0].thumbnail_url).toBe("https://cloudflare.com/thumbnails/cf-video-1");
        expect(data.videos[1].thumbnail_url).toBe("https://cloudflare.com/thumbnails/cf-video-2");
    });

    it("should use default title for videos without title", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/pitch-videos?projectId=test-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.videos[0].title).toBe("Pitch Video 1");
        expect(data.videos[1].title).toBe("Untitled Video");
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

        const request = new NextRequest(
            "http://localhost:3000/api/pages/pitch-videos?projectId=test-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when projectId is missing", async () => {
        const request = new NextRequest("http://localhost:3000/api/pages/pitch-videos");

        const response = await GET(request);
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

        const request = new NextRequest(
            "http://localhost:3000/api/pages/pitch-videos?projectId=invalid-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain("Project not found");
    });

    it("should handle database errors when fetching videos", async () => {
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
                if (table === "pitch_videos") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                order: vi.fn(async () => ({
                                    data: null,
                                    error: { message: "Database error" },
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/pitch-videos?projectId=test-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch pitch videos");
    });

    it("should return empty array when no videos exist", async () => {
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
                if (table === "pitch_videos") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                order: vi.fn(async () => ({
                                    data: [],
                                    error: null,
                                })),
                            })),
                        })),
                    };
                }
                return {};
            }),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/pitch-videos?projectId=test-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.videos).toEqual([]);
    });
});
