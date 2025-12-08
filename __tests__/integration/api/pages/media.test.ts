/**
 * Page Media API Integration Tests
 * Tests retrieving uploaded and generated images for a project
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/pages/media/route";
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
            if (table === "page_media") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            order: vi.fn(async () => ({
                                data: [
                                    {
                                        id: "media-1",
                                        media_type: "uploaded_image",
                                        public_url: "https://example.com/image1.png",
                                        created_at: "2024-01-01T00:00:00Z",
                                    },
                                    {
                                        id: "media-2",
                                        media_type: "ai_generated_image",
                                        public_url: "https://example.com/image2.png",
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

describe("GET /api/pages/media", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fetch media successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/media?projectId=test-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.media).toBeDefined();
        expect(Array.isArray(data.media)).toBe(true);
        expect(data.media.length).toBe(2);
    });

    it("should filter media by pageId", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/media?projectId=test-project-id&pageId=test-page-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should filter media by mediaType", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/media?projectId=test-project-id&mediaType=uploaded_image"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 401 when user is not authenticated", async () => {
        vi.mocked(
            (await import("@/lib/supabase/server")).createClient
        ).mockResolvedValueOnce({
            auth: {
                getUser: vi.fn(async () => ({
                    data: { user: null },
                    error: null,
                })),
            },
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/media?projectId=test-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when projectId is missing", async () => {
        const request = new NextRequest("http://localhost:3000/api/pages/media");

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Project ID");
    });

    it("should return 404 when project is not found", async () => {
        vi.mocked(
            (await import("@/lib/supabase/server")).createClient
        ).mockResolvedValueOnce({
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
            "http://localhost:3000/api/pages/media?projectId=invalid-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain("Project not found");
    });

    it("should handle database errors when fetching media", async () => {
        vi.mocked(
            (await import("@/lib/supabase/server")).createClient
        ).mockResolvedValueOnce({
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
                if (table === "page_media") {
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
            "http://localhost:3000/api/pages/media?projectId=test-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch media");
    });

    it("should return empty array when no media exists", async () => {
        vi.mocked(
            (await import("@/lib/supabase/server")).createClient
        ).mockResolvedValueOnce({
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
                if (table === "page_media") {
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
            "http://localhost:3000/api/pages/media?projectId=test-project-id"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.media).toEqual([]);
    });
});
