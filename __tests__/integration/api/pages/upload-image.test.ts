/**
 * Upload Image API Integration Tests
 * Tests image upload to Supabase Storage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/pages/upload-image/route";
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

// Mock createImageBitmap
global.createImageBitmap = vi.fn(async () => ({
    width: 1024,
    height: 768,
    close: vi.fn(),
})) as any;

describe("POST /api/pages/upload-image", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should upload image successfully", async () => {
        const formData = new FormData();
        const file = new File(["fake image data"], "test.png", { type: "image/png" });
        formData.append("image", file);
        formData.append("projectId", "test-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.imageUrl).toBeDefined();
        expect(data.mediaId).toBeDefined();
        expect(data.filename).toBe("test.png");
    });

    it("should upload image with optional pageId", async () => {
        const formData = new FormData();
        const file = new File(["fake image data"], "test.png", { type: "image/png" });
        formData.append("image", file);
        formData.append("projectId", "test-project-id");
        formData.append("pageId", "test-page-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should accept JPEG images", async () => {
        const formData = new FormData();
        const file = new File(["fake image data"], "test.jpg", { type: "image/jpeg" });
        formData.append("image", file);
        formData.append("projectId", "test-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should accept WebP images", async () => {
        const formData = new FormData();
        const file = new File(["fake image data"], "test.webp", { type: "image/webp" });
        formData.append("image", file);
        formData.append("projectId", "test-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should accept GIF images", async () => {
        const formData = new FormData();
        const file = new File(["fake image data"], "test.gif", { type: "image/gif" });
        formData.append("image", file);
        formData.append("projectId", "test-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
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

        const formData = new FormData();
        const file = new File(["fake image data"], "test.png", { type: "image/png" });
        formData.append("image", file);
        formData.append("projectId", "test-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when image file is missing", async () => {
        const formData = new FormData();
        formData.append("projectId", "test-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Image file");
    });

    it("should return 400 when projectId is missing", async () => {
        const formData = new FormData();
        const file = new File(["fake image data"], "test.png", { type: "image/png" });
        formData.append("image", file);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Project ID");
    });

    it("should return 400 when file is too large", async () => {
        const formData = new FormData();
        // Create a file that's larger than 5MB
        const largeData = new Array(6 * 1024 * 1024).fill("a").join("");
        const file = new File([largeData], "large.png", { type: "image/png" });
        formData.append("image", file);
        formData.append("projectId", "test-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("too large");
    });

    it("should return 400 when file type is not allowed", async () => {
        const formData = new FormData();
        const file = new File(["fake data"], "test.txt", { type: "text/plain" });
        formData.append("image", file);
        formData.append("projectId", "test-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Unsupported file type");
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

        const formData = new FormData();
        const file = new File(["fake image data"], "test.png", { type: "image/png" });
        formData.append("image", file);
        formData.append("projectId", "invalid-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain("Project not found");
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

        const formData = new FormData();
        const file = new File(["fake image data"], "test.png", { type: "image/png" });
        formData.append("image", file);
        formData.append("projectId", "test-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toContain("upload");
    });

    it("should sanitize filenames", async () => {
        const formData = new FormData();
        const file = new File(["fake image data"], "test file@#$%.png", {
            type: "image/png",
        });
        formData.append("image", file);
        formData.append("projectId", "test-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should handle image dimension reading errors gracefully", async () => {
        // Mock createImageBitmap to fail
        global.createImageBitmap = vi
            .fn()
            .mockRejectedValueOnce(new Error("Cannot read dimensions"));

        const formData = new FormData();
        const file = new File(["fake image data"], "test.png", { type: "image/png" });
        formData.append("image", file);
        formData.append("projectId", "test-project-id");

        const request = new NextRequest(
            "http://localhost:3000/api/pages/upload-image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await POST(request);
        const data = await response.json();

        // Should still succeed even if dimensions can't be read
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
