/**
 * Marketing Briefs API Integration Tests
 * Tests content brief creation and listing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/marketing/briefs/route";
import { NextRequest } from "next/server";

// Mock Supabase client
const mockSupabaseClient = () => {
    const mockAuth = {
        getUser: vi.fn(),
    };

    const mockFrom = vi.fn((table: string) => {
        if (table === "marketing_content_briefs") {
            return {
                insert: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn(() => ({
                            data: {
                                id: "brief-123",
                                user_id: "user-123",
                                name: "Test Brief",
                                goal: "Test goal",
                                topic: "Test topic",
                                status: "draft",
                            },
                            error: null,
                        })),
                    })),
                })),
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn(() => ({
                            data: [
                                {
                                    id: "brief-1",
                                    name: "Brief 1",
                                    status: "draft",
                                },
                            ],
                            error: null,
                        })),
                    })),
                })),
            };
        }

        if (table === "funnel_projects") {
            return {
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn(() => ({
                            data: { user_id: "user-123" },
                            error: null,
                        })),
                    })),
                })),
            };
        }

        return {};
    });

    return {
        auth: mockAuth,
        from: mockFrom,
    };
};

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => mockSupabaseClient()),
}));

describe("POST /api/marketing/briefs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates a new brief successfully", async () => {
        const mockClient = mockSupabaseClient();
        mockClient.auth.getUser.mockResolvedValue({
            data: { user: { id: "user-123", email: "test@example.com" } },
            error: null,
        });

        vi.mocked(await import("@/lib/supabase/server")).createClient = vi.fn(
            () => mockClient as any
        );

        const request = new NextRequest("http://localhost/api/marketing/briefs", {
            method: "POST",
            body: JSON.stringify({
                name: "Test Brief",
                goal: "Test goal",
                topic: "Test topic",
                target_platforms: ["instagram", "twitter"],
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.brief).toBeDefined();
    });

    it("returns 401 for unauthenticated requests", async () => {
        const mockClient = mockSupabaseClient();
        mockClient.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error("Not authenticated"),
        });

        vi.mocked(await import("@/lib/supabase/server")).createClient = vi.fn(
            () => mockClient as any
        );

        const request = new NextRequest("http://localhost/api/marketing/briefs", {
            method: "POST",
            body: JSON.stringify({
                name: "Test Brief",
                goal: "Test goal",
                topic: "Test topic",
            }),
        });

        const response = await POST(request);

        expect(response.status).toBe(401);
    });

    it("returns 400 when name is missing", async () => {
        const mockClient = mockSupabaseClient();
        mockClient.auth.getUser.mockResolvedValue({
            data: { user: { id: "user-123", email: "test@example.com" } },
            error: null,
        });

        vi.mocked(await import("@/lib/supabase/server")).createClient = vi.fn(
            () => mockClient as any
        );

        const request = new NextRequest("http://localhost/api/marketing/briefs", {
            method: "POST",
            body: JSON.stringify({
                goal: "Test goal",
                topic: "Test topic",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("name is required");
    });

    it("returns 400 when goal is missing", async () => {
        const mockClient = mockSupabaseClient();
        mockClient.auth.getUser.mockResolvedValue({
            data: { user: { id: "user-123", email: "test@example.com" } },
            error: null,
        });

        vi.mocked(await import("@/lib/supabase/server")).createClient = vi.fn(
            () => mockClient as any
        );

        const request = new NextRequest("http://localhost/api/marketing/briefs", {
            method: "POST",
            body: JSON.stringify({
                name: "Test Brief",
                topic: "Test topic",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("goal is required");
    });

    it("returns 400 when topic is missing", async () => {
        const mockClient = mockSupabaseClient();
        mockClient.auth.getUser.mockResolvedValue({
            data: { user: { id: "user-123", email: "test@example.com" } },
            error: null,
        });

        vi.mocked(await import("@/lib/supabase/server")).createClient = vi.fn(
            () => mockClient as any
        );

        const request = new NextRequest("http://localhost/api/marketing/briefs", {
            method: "POST",
            body: JSON.stringify({
                name: "Test Brief",
                goal: "Test goal",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("topic is required");
    });
});

describe("GET /api/marketing/briefs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns briefs for authenticated user", async () => {
        const mockClient = mockSupabaseClient();
        mockClient.auth.getUser.mockResolvedValue({
            data: { user: { id: "user-123", email: "test@example.com" } },
            error: null,
        });

        vi.mocked(await import("@/lib/supabase/server")).createClient = vi.fn(
            () => mockClient as any
        );

        const request = new NextRequest("http://localhost/api/marketing/briefs");

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.briefs).toBeDefined();
        expect(Array.isArray(data.briefs)).toBe(true);
    });

    it("returns 401 for unauthenticated requests", async () => {
        const mockClient = mockSupabaseClient();
        mockClient.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error("Not authenticated"),
        });

        vi.mocked(await import("@/lib/supabase/server")).createClient = vi.fn(
            () => mockClient as any
        );

        const request = new NextRequest("http://localhost/api/marketing/briefs");

        const response = await GET(request);

        expect(response.status).toBe(401);
    });
});
