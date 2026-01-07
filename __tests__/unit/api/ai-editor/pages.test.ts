/**
 * Unit tests for AI Editor Pages API
 * Tests slug validation, error responses, and CRUD operations
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/ai-editor/pages/[pageId]/route";
import { NextRequest } from "next/server";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
    captureException: vi.fn(),
}));

// Mock Supabase client
const mockSupabaseClient = {
    auth: {
        getUser: vi.fn(),
    },
    from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => mockSupabaseClient),
}));

describe("AI Editor Pages API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Slug Validation", () => {
        beforeEach(() => {
            mockSupabaseClient.auth.getUser.mockResolvedValue({
                data: { user: { id: "test-user-id" } },
                error: null,
            });
        });

        const createPutRequest = (body: Record<string, unknown>) => {
            return new NextRequest(
                "http://localhost:3000/api/ai-editor/pages/test-page-id",
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                }
            );
        };

        const mockExistingPage = () => {
            mockSupabaseClient.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "test-page-id",
                                title: "Test Page",
                                slug: "existing-slug",
                                funnel_projects: { user_id: "test-user-id" },
                            },
                            error: null,
                        }),
                    }),
                }),
            });
        };

        it("should reject slugs that are too short", async () => {
            mockExistingPage();

            const request = createPutRequest({ slug: "ab" });
            const params = { params: Promise.resolve({ pageId: "test-page-id" }) };

            const response = await PUT(request, params);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.code).toBe("INVALID_SLUG");
            expect(data.error).toContain("Invalid slug format");
        });

        it("should reject slugs that are too long", async () => {
            mockExistingPage();

            const longSlug = "a".repeat(51);
            const request = createPutRequest({ slug: longSlug });
            const params = { params: Promise.resolve({ pageId: "test-page-id" }) };

            const response = await PUT(request, params);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.code).toBe("INVALID_SLUG");
        });

        it("should reject slugs with uppercase letters", async () => {
            mockExistingPage();

            const request = createPutRequest({ slug: "MyPage" });
            const params = { params: Promise.resolve({ pageId: "test-page-id" }) };

            const response = await PUT(request, params);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.code).toBe("INVALID_SLUG");
        });

        it("should reject slugs with special characters", async () => {
            mockExistingPage();

            const request = createPutRequest({ slug: "my_page!" });
            const params = { params: Promise.resolve({ pageId: "test-page-id" }) };

            const response = await PUT(request, params);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.code).toBe("INVALID_SLUG");
        });

        it("should reject reserved slugs", async () => {
            mockExistingPage();

            const request = createPutRequest({ slug: "admin" });
            const params = { params: Promise.resolve({ pageId: "test-page-id" }) };

            const response = await PUT(request, params);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.code).toBe("RESERVED_SLUG");
            expect(data.error).toContain("reserved");
        });

        it("should accept valid slugs", async () => {
            mockSupabaseClient.from.mockImplementation((table) => {
                if (table === "ai_editor_pages") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: {
                                        id: "test-page-id",
                                        title: "Test Page",
                                        funnel_projects: { user_id: "test-user-id" },
                                    },
                                    error: null,
                                }),
                                neq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: null,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: {
                                            id: "test-page-id",
                                            slug: "my-valid-slug",
                                        },
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return {};
            });

            const request = createPutRequest({ slug: "my-valid-slug" });
            const params = { params: Promise.resolve({ pageId: "test-page-id" }) };

            const response = await PUT(request, params);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.page).toBeDefined();
        });
    });

    describe("Error Response Format", () => {
        it("should return standardized error with code for unauthorized", async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/ai-editor/pages/test-id",
                { method: "GET" }
            );
            const params = { params: Promise.resolve({ pageId: "test-id" }) };

            const response = await GET(request, params);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Unauthorized");
            expect(data.code).toBe("AUTH_REQUIRED");
        });

        it("should return standardized error with code for not found", async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValue({
                data: { user: { id: "test-user-id" } },
                error: null,
            });

            mockSupabaseClient.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Not found" },
                        }),
                    }),
                }),
            });

            const request = new NextRequest(
                "http://localhost:3000/api/ai-editor/pages/invalid-id",
                { method: "GET" }
            );
            const params = { params: Promise.resolve({ pageId: "invalid-id" }) };

            const response = await GET(request, params);
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe("Page not found");
            expect(data.code).toBe("PAGE_NOT_FOUND");
        });

        it("should return standardized error with code for access denied", async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValue({
                data: { user: { id: "test-user-id" } },
                error: null,
            });

            mockSupabaseClient.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "test-page-id",
                                funnel_projects: { user_id: "different-user-id" },
                            },
                            error: null,
                        }),
                    }),
                }),
            });

            const request = new NextRequest(
                "http://localhost:3000/api/ai-editor/pages/test-page-id",
                { method: "GET" }
            );
            const params = { params: Promise.resolve({ pageId: "test-page-id" }) };

            const response = await GET(request, params);
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.error).toContain("access");
            expect(data.code).toBe("ACCESS_DENIED");
        });
    });

    describe("DELETE endpoint", () => {
        it("should return standardized error for unauthorized delete", async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const request = new NextRequest(
                "http://localhost:3000/api/ai-editor/pages/test-id",
                { method: "DELETE" }
            );
            const params = { params: Promise.resolve({ pageId: "test-id" }) };

            const response = await DELETE(request, params);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.code).toBe("AUTH_REQUIRED");
        });
    });
});
