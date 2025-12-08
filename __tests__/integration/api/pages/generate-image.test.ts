/**
 * Generate Image API Integration Tests
 * Tests AI image generation and upload to Supabase Storage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/pages/generate-image/route";
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

// Mock AI client
vi.mock("@/lib/ai/client", () => ({
    generateImageWithAI: vi.fn(async () => ({
        url: "https://example.com/generated-image.png",
        revisedPrompt: "A professional business image",
    })),
}));

// Mock fetch
global.fetch = vi.fn(async () => ({
    ok: true,
    blob: async () => new Blob(["fake image data"], { type: "image/png" }),
})) as any;

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
                    insert: vi.fn(() => ({
                        select: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: {
                                    id: "media-id",
                                    public_url: "https://storage.example.com/image.png",
                                },
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            return {};
        }),
        storage: {
            from: vi.fn(() => ({
                upload: vi.fn(async () => ({
                    error: null,
                })),
                getPublicUrl: vi.fn(() => ({
                    data: {
                        publicUrl: "https://storage.example.com/image.png",
                    },
                })),
            })),
        },
    })),
}));

describe("POST /api/pages/generate-image", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate and upload image successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/generate-image",
            {
                method: "POST",
                body: JSON.stringify({
                    prompt: "A professional business meeting",
                    projectId: "test-project-id",
                    size: "1024x1024",
                    quality: "standard",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.imageUrl).toBeDefined();
        expect(data.mediaId).toBeDefined();
        expect(data.revisedPrompt).toBeDefined();
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
            "http://localhost:3000/api/pages/generate-image",
            {
                method: "POST",
                body: JSON.stringify({
                    prompt: "Test prompt",
                    projectId: "test-project-id",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when prompt is missing", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/generate-image",
            {
                method: "POST",
                body: JSON.stringify({
                    projectId: "test-project-id",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Prompt");
    });

    it("should return 400 when prompt is empty", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/generate-image",
            {
                method: "POST",
                body: JSON.stringify({
                    prompt: "   ",
                    projectId: "test-project-id",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Prompt");
    });

    it("should return 400 when prompt is too long", async () => {
        const longPrompt = "a".repeat(5000);
        const request = new NextRequest(
            "http://localhost:3000/api/pages/generate-image",
            {
                method: "POST",
                body: JSON.stringify({
                    prompt: longPrompt,
                    projectId: "test-project-id",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("too long");
    });

    it("should return 400 when projectId is missing", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/generate-image",
            {
                method: "POST",
                body: JSON.stringify({
                    prompt: "Test prompt",
                }),
            }
        );

        const response = await POST(request);
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
            "http://localhost:3000/api/pages/generate-image",
            {
                method: "POST",
                body: JSON.stringify({
                    prompt: "Test prompt",
                    projectId: "invalid-project-id",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain("Project not found");
    });

    it("should handle AI generation errors", async () => {
        vi.mocked(
            (await import("@/lib/ai/client")).generateImageWithAI
        ).mockRejectedValueOnce(new Error("AI service error"));

        const request = new NextRequest(
            "http://localhost:3000/api/pages/generate-image",
            {
                method: "POST",
                body: JSON.stringify({
                    prompt: "Test prompt",
                    projectId: "test-project-id",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBeDefined();
    });

    it("should handle storage upload errors", async () => {
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
                                data: {
                                    id: "test-project-id",
                                    user_id: "test-user-id",
                                },
                                error: null,
                            })),
                        })),
                    })),
                })),
            })),
            storage: {
                from: vi.fn(() => ({
                    upload: vi.fn(async () => ({
                        error: { message: "Upload failed" },
                    })),
                })),
            },
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/generate-image",
            {
                method: "POST",
                body: JSON.stringify({
                    prompt: "Test prompt",
                    projectId: "test-project-id",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toContain("upload");
    });

    it("should accept optional pageId parameter", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/generate-image",
            {
                method: "POST",
                body: JSON.stringify({
                    prompt: "Test prompt",
                    projectId: "test-project-id",
                    pageId: "test-page-id",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
