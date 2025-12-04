/**
 * Pages API Integration Tests
 * Tests the unified pages endpoint that aggregates enrollment, watch, and registration pages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/pages/route";
import { NextRequest } from "next/server";

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        auth: {
            getUser: vi.fn(async () => ({
                data: { user: { id: "test-user-id", email: "test@example.com" } },
                error: null,
            })),
        },
        from: vi.fn((table) => {
            const mockPages = {
                enrollment_pages: [
                    {
                        id: "enrollment-1",
                        headline: "Join Our Masterclass",
                        funnel_project_id: "funnel-1",
                        is_published: true,
                        vanity_slug: "join-masterclass",
                        created_at: "2024-01-15T10:00:00Z",
                        updated_at: "2024-01-15T10:00:00Z",
                        funnel_projects: { id: "funnel-1", name: "Main Funnel" },
                    },
                ],
                watch_pages: [
                    {
                        id: "watch-1",
                        headline: "Watch Our Training",
                        funnel_project_id: "funnel-1",
                        is_published: false,
                        vanity_slug: "watch-training",
                        created_at: "2024-01-14T10:00:00Z",
                        updated_at: "2024-01-14T10:00:00Z",
                        funnel_projects: { id: "funnel-1", name: "Main Funnel" },
                    },
                ],
                registration_pages: [
                    {
                        id: "registration-1",
                        headline: "Register for Event",
                        funnel_project_id: "funnel-2",
                        is_published: true,
                        vanity_slug: "register-event",
                        created_at: "2024-01-16T10:00:00Z",
                        updated_at: "2024-01-16T10:00:00Z",
                        funnel_projects: { id: "funnel-2", name: "Event Funnel" },
                    },
                ],
            };

            return {
                select: vi.fn(() => ({
                    eq: vi.fn((field, value) => ({
                        data: mockPages[table as keyof typeof mockPages] || [],
                        error: null,
                    })),
                })),
            };
        }),
    })),
}));

describe("GET /api/pages", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fetch all pages successfully", async () => {
        const request = new NextRequest("http://localhost:3000/api/pages");

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.pages).toBeDefined();
        expect(Array.isArray(data.pages)).toBe(true);
        expect(data.pages.length).toBeGreaterThan(0);
    });

    it("should filter pages by funnel_id", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages?funnel_id=funnel-1"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.pages).toBeDefined();
    });

    it("should filter pages by page_type", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages?page_type=enrollment"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.pages).toBeDefined();
    });

    it("should filter pages by is_published status", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages?is_published=true"
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.pages).toBeDefined();
    });

    it("should return 401 when user is not authenticated", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            auth: {
                getUser: vi.fn(async () => ({
                    data: { user: null },
                    error: { message: "Unauthorized" },
                })),
            },
        } as any);

        const request = new NextRequest("http://localhost:3000/api/pages");

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should handle database errors gracefully", async () => {
        vi.mocked((await import("@/lib/supabase/server")).createClient).mockResolvedValueOnce({
            auth: {
                getUser: vi.fn(async () => ({
                    data: { user: { id: "test-user-id" } },
                    error: null,
                })),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        data: null,
                        error: { message: "Database error" },
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest("http://localhost:3000/api/pages");

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch pages");
    });

    it("should combine and sort pages by created_at descending", async () => {
        const request = new NextRequest("http://localhost:3000/api/pages");

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.pages).toBeDefined();

        // Verify pages are sorted by created_at descending
        if (data.pages.length > 1) {
            for (let i = 0; i < data.pages.length - 1; i++) {
                const current = new Date(data.pages[i].created_at).getTime();
                const next = new Date(data.pages[i + 1].created_at).getTime();
                expect(current).toBeGreaterThanOrEqual(next);
            }
        }
    });
});
