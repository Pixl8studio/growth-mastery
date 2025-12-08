/**
 * Registration Page API Integration Tests
 * Tests registration page update endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, PUT } from "@/app/api/pages/registration/[pageId]/route";
import { NextRequest } from "next/server";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
        })),
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
        from: vi.fn((table) => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    neq: vi.fn(() => ({
                        single: vi.fn(async () => ({
                            data: null,
                            error: null,
                        })),
                    })),
                    single: vi.fn(async () => ({
                        data: {
                            id: "test-page-id",
                            user_id: "test-user-id",
                            vanity_slug: "test-slug",
                        },
                        error: null,
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
                                    html_content: "<div>Test</div>",
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

describe("PATCH /api/pages/registration/[pageId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should update vanity_slug successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id",
            {
                method: "PATCH",
                body: JSON.stringify({
                    vanity_slug: "new-slug",
                }),
            }
        );

        const response = await PATCH(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.page).toBeDefined();
    });

    it("should return 400 when slug already exists", async () => {
        vi.mocked(
            (await import("@/lib/supabase/server")).createClient
        ).mockResolvedValueOnce({
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

        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id",
            {
                method: "PATCH",
                body: JSON.stringify({
                    vanity_slug: "existing-slug",
                }),
            }
        );

        const response = await PATCH(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Slug already in use");
    });
});

describe("PUT /api/pages/registration/[pageId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should update HTML content successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id",
            {
                method: "PUT",
                body: JSON.stringify({
                    html_content: "<div class='test'>Updated Content</div>",
                }),
            }
        );

        const response = await PUT(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.page).toBeDefined();
    });

    it("should return 400 when html_content is missing", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/registration/test-page-id",
            {
                method: "PUT",
                body: JSON.stringify({}),
            }
        );

        const response = await PUT(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("html_content is required");
    });
});
