import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/ai-assistant/context/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
        })),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

import { createClient } from "@/lib/supabase/server";

describe("POST /api/ai-assistant/context", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should load context with project data", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "user_profiles") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { full_name: "Test User" },
                            error: null,
                        }),
                    };
                }
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    id: "project-123",
                                    name: "Test Project",
                                    slug: "test-project",
                                    status: "active",
                                },
                            ],
                            error: null,
                        }),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "project-123",
                                name: "Test Project",
                                slug: "test-project",
                                status: "active",
                            },
                            error: null,
                        }),
                    };
                }
                if (table === "offers") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockResolvedValue({
                            data: [{ id: "offer-1", name: "Main Offer", price: 997 }],
                            error: null,
                        }),
                    };
                }
                if (table === "contacts") {
                    return {
                        select: vi.fn().mockResolvedValue({ count: 50, error: null }),
                    };
                }
                if (table === "payment_transactions") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [{ amount: 997 }, { amount: 1997 }],
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                projectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.context).toBeDefined();
        expect(data.context.user.id).toBe("user-123");
        expect(data.context.currentProject).toBeDefined();
        expect(data.context.currentProject.id).toBe("project-123");
        expect(data.context.offers).toBeDefined();
        expect(data.context.analytics).toBeDefined();
    });

    it("should load context without project data", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "user_profiles") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { full_name: "Test User" },
                            error: null,
                        }),
                    };
                }
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: [],
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {},
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.context).toBeDefined();
        expect(data.context.user.id).toBe("user-123");
        expect(data.context.currentProject).toBeNull();
        expect(data.context.offers).toHaveLength(0);
    });

    it("should return 401 for unauthenticated users", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({
                        data: { user: null },
                        error: { message: "Unauthorized" },
                    }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {},
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should handle missing user profile gracefully", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "user_profiles") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: null,
                        }),
                    };
                }
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: [],
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {},
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.context).toBeDefined();
        expect(data.context.user.fullName).toBeUndefined();
    });

    it("should return 500 on database error", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => {
                throw new Error("Database error");
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {},
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to load context");
    });
});
