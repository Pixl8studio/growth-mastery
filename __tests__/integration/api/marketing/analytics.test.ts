/**
 * Analytics API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/marketing/analytics/route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/marketing/analytics-collector-service", () => ({
    getDashboardAnalytics: vi.fn(() =>
        Promise.resolve({
            success: true,
            dashboard: {
                totalPosts: 10,
                totalViews: 1000,
                totalEngagements: 100,
            },
        })
    ),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "user-123" } },
                error: null,
            })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => ({
                        data: { user_id: "user-123" },
                        error: null,
                    })),
                })),
            })),
        })),
    })),
}));

describe("GET /api/marketing/analytics", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns analytics dashboard successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/analytics?funnel_project_id=project-123"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.dashboard).toBeDefined();
    });

    it("returns 400 when funnel_project_id is missing", async () => {
        const request = new NextRequest("http://localhost/api/marketing/analytics");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("funnel_project_id is required");
    });

    it("returns 401 for unauthorized project access", async () => {
        vi.mocked(createClient).mockReturnValue({
            auth: {
                getUser: vi.fn(() => ({
                    data: { user: { id: "user-123" } },
                    error: null,
                })),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn(() => ({
                            data: { user_id: "different-user" },
                            error: null,
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest(
            "http://localhost/api/marketing/analytics?funnel_project_id=project-123"
        );
        const response = await GET(request);

        expect(response.status).toBe(401);
    });

    it("accepts optional date range parameters", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/analytics?funnel_project_id=project-123&start_date=2024-01-01&end_date=2024-12-31"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
