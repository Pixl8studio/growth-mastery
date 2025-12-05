/**
 * Watch Page API Integration Tests
 * Tests watch page update endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/pages/watch/[pageId]/route";
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
    getCurrentUserWithProfile: vi.fn(async () => ({
        user: { id: "test-user-id", email: "test@example.com" },
        profile: { id: "test-profile-id" },
    })),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    neq: vi.fn(() => ({
                        single: vi.fn(async () => ({
                            data: null,
                            error: null,
                        })),
                    })),
                })),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        select: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: {
                                    id: "test-page-id",
                                    vanity_slug: "new-slug",
                                    updated_at: new Date().toISOString(),
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

describe("PATCH /api/pages/watch/[pageId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should update vanity_slug successfully", async () => {
        const request = new NextRequest("http://localhost:3000/api/pages/watch/test-page-id", {
            method: "PATCH",
            body: JSON.stringify({
                vanity_slug: "new-slug",
            }),
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.page).toBeDefined();
    });

    it("should return 400 when slug already exists", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        neq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: { id: "existing-page-id" },
                                error: null,
                            })),
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest("http://localhost:3000/api/pages/watch/test-page-id", {
            method: "PATCH",
            body: JSON.stringify({
                vanity_slug: "existing-slug",
            }),
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Slug already in use");
    });

    it("should handle database errors", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        neq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: null,
                                error: null,
                            })),
                        })),
                    })),
                })),
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

        const request = new NextRequest("http://localhost:3000/api/pages/watch/test-page-id", {
            method: "PATCH",
            body: JSON.stringify({
                vanity_slug: "new-slug",
            }),
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to update page");
    });

    it("should handle authentication errors", async () => {
        vi.mocked((await import("@/lib/auth")).getCurrentUserWithProfile).mockRejectedValueOnce(
            new Error("Auth error")
        );

        const request = new NextRequest("http://localhost:3000/api/pages/watch/test-page-id", {
            method: "PATCH",
            body: JSON.stringify({
                vanity_slug: "new-slug",
            }),
        });

        const response = await PATCH(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Internal server error");
    });
});
