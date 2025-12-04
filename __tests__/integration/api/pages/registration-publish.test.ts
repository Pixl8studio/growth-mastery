/**
 * Registration Page Publish API Integration Tests
 * Tests publish status toggle for registration pages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/pages/registration/[pageId]/publish/route";
import { NextRequest } from "next/server";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
    getCurrentUserWithProfileForAPI: vi.fn(async () => ({
        user: { id: "test-user-id", email: "test@example.com" },
        profile: { id: "test-profile-id" },
    })),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        from: vi.fn(() => ({
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        select: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: {
                                    id: "test-page-id",
                                    is_published: true,
                                    headline: "Test Page",
                                },
                                error: null,
                            })),
                        })),
                    })),
                })),
            })),
        })),
    })),
}));

describe("POST /api/pages/registration/[pageId]/publish", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should publish a registration page successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/publish",
            {
                method: "POST",
                body: JSON.stringify({
                    published: true,
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
        expect(data.page.is_published).toBe(true);
    });

    it("should unpublish a registration page successfully", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            from: vi.fn(() => ({
                update: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(async () => ({
                                    data: {
                                        id: "test-page-id",
                                        is_published: false,
                                    },
                                    error: null,
                                })),
                            })),
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/publish",
            {
                method: "POST",
                body: JSON.stringify({
                    published: false,
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.page.is_published).toBe(false);
    });

    it("should return 401 when user is not authenticated", async () => {
        vi.mocked((await import("@/lib/auth")).getCurrentUserWithProfileForAPI).mockRejectedValueOnce(
            new Error("Unauthorized")
        );

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/publish",
            {
                method: "POST",
                body: JSON.stringify({
                    published: true,
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 when database update fails", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            from: vi.fn(() => ({
                update: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(async () => ({
                                    data: null,
                                    error: { message: "Database error" },
                                })),
                            })),
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/publish",
            {
                method: "POST",
                body: JSON.stringify({
                    published: true,
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to update page");
    });

    it("should handle user not owning the page", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            from: vi.fn(() => ({
                update: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(async () => ({
                                    data: null,
                                    error: { message: "No rows found" },
                                })),
                            })),
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id/publish",
            {
                method: "POST",
                body: JSON.stringify({
                    published: true,
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to update page");
    });
});
