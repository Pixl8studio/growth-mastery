/**
 * Integration tests for funnel integration disconnect route
 * Tests disconnection of calendar and social integrations
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
    getCurrentUser: () => mockGetCurrentUser(),
}));

// Mock Supabase
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        from: mockFrom,
    })),
}));

// Import after mocks
const { POST } = await import(
    "@/app/api/funnel/[projectId]/integrations/disconnect/route"
);

describe("POST /api/funnel/[projectId]/integrations/disconnect", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const projectId = "project-123";

    beforeEach(() => {
        vi.clearAllMocks();
        // Set up chainable mock
        mockFrom.mockReturnValue({
            delete: mockDelete,
        });
        mockDelete.mockReturnValue({
            eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    eq: mockEq,
                }),
            }),
        });
        mockEq.mockResolvedValue({ data: null, error: null });
    });

    it("should disconnect calendar integration", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/disconnect`,
            {
                method: "POST",
                body: JSON.stringify({
                    provider: "google",
                    type: "calendar",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ projectId }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockFrom).toHaveBeenCalledWith("funnel_calendar_connections");
    });

    it("should disconnect social integration", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/disconnect`,
            {
                method: "POST",
                body: JSON.stringify({
                    provider: "facebook",
                    type: "social",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ projectId }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockFrom).toHaveBeenCalledWith("funnel_social_connections");
    });

    it("should return 401 for unauthenticated user", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/disconnect`,
            {
                method: "POST",
                body: JSON.stringify({
                    provider: "google",
                    type: "calendar",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ projectId }),
        });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when provider is missing", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/disconnect`,
            {
                method: "POST",
                body: JSON.stringify({
                    type: "calendar",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ projectId }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Provider is required");
    });

    it("should default to social connections when type not calendar", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/disconnect`,
            {
                method: "POST",
                body: JSON.stringify({
                    provider: "linkedin",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ projectId }),
        });

        expect(response.status).toBe(200);
        expect(mockFrom).toHaveBeenCalledWith("funnel_social_connections");
    });

    it("should return 500 on database error", async () => {
        mockGetCurrentUser.mockResolvedValue(mockUser);
        mockFrom.mockImplementation(() => {
            throw new Error("Database error");
        });

        const request = new NextRequest(
            `http://localhost:3000/api/funnel/${projectId}/integrations/disconnect`,
            {
                method: "POST",
                body: JSON.stringify({
                    provider: "google",
                    type: "calendar",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ projectId }),
        });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to disconnect integration");
    });
});
