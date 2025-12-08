import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/analytics/funnel/route";
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
    },
}));

import { createClient } from "@/lib/supabase/server";

describe("GET /api/analytics/funnel", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return funnel analytics for project", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "contacts") {
                    return {
                        select: vi.fn().mockResolvedValue({ count: 100, error: null }),
                    };
                }
                if (table === "payment_transactions") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockResolvedValue({
                            data: [{ amount: "997" }, { amount: "1997" }],
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
            url: "http://localhost:3000/api/analytics/funnel?project_id=project-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{
            registrations: unknown;
            views: unknown;
            enrollments: unknown;
            revenue: unknown;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.registrations).toBeDefined();
        expect(data.views).toBeDefined();
        expect(data.enrollments).toBeDefined();
        expect(data.revenue).toBeDefined();
    });

    it("should return 401 for unauthenticated users", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "Unauthorized" },
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/analytics/funnel?project_id=project-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when project_id is missing", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/analytics/funnel",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Missing project_id");
    });

    it("should use custom time range", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "contacts") {
                    return {
                        select: vi.fn().mockResolvedValue({ count: 50, error: null }),
                    };
                }
                if (table === "payment_transactions") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockResolvedValue({
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
            url: "http://localhost:3000/api/analytics/funnel?project_id=project-123&time_range=7",
        });

        const response = await GET(request);
        await parseJsonResponse<Record<string, unknown>>(response);

        expect(response.status).toBe(200);
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
            url: "http://localhost:3000/api/analytics/funnel?project_id=project-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch analytics");
    });
});
