/**
 * Integration tests for app/api/auth/logout/route.ts
 * Tests logout API endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock Supabase client
const mockGetUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: mockGetUser,
            signOut: mockSignOut,
        },
    })),
}));

// Import after mocks are set up
const { POST } = await import("@/app/api/auth/logout/route");

describe("POST /api/auth/logout", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should log out authenticated user and redirect to login", async () => {
        const mockUser = {
            id: "user-123",
            email: "test@example.com",
        };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSignOut.mockResolvedValue({ error: null });

        const request = new NextRequest("http://localhost:3000/api/auth/logout", {
            method: "POST",
        });

        const response = await POST(request);

        expect(mockSignOut).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
            { userId: mockUser.id },
            "User logging out"
        );
        expect(response.status).toBe(307); // Temporary redirect
        expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("should log out unauthenticated user and redirect to login", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
        mockSignOut.mockResolvedValue({ error: null });

        const request = new NextRequest("http://localhost:3000/api/auth/logout", {
            method: "POST",
        });

        const response = await POST(request);

        expect(mockSignOut).toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("should return 500 when signOut fails", async () => {
        const mockUser = {
            id: "user-123",
            email: "test@example.com",
        };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSignOut.mockRejectedValue(new Error("SignOut failed"));

        const request = new NextRequest("http://localhost:3000/api/auth/logout", {
            method: "POST",
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(logger.error).toHaveBeenCalled();

        const body = await response.json();
        expect(body).toEqual({
            success: false,
            error: "Logout failed",
        });
    });

    it("should handle errors during user fetch", async () => {
        mockGetUser.mockRejectedValue(new Error("Database error"));

        const request = new NextRequest("http://localhost:3000/api/auth/logout", {
            method: "POST",
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(logger.error).toHaveBeenCalled();

        const body = await response.json();
        expect(body).toEqual({
            success: false,
            error: "Logout failed",
        });
    });

    it("should handle signOut error response", async () => {
        const mockUser = {
            id: "user-123",
            email: "test@example.com",
        };

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSignOut.mockResolvedValue({ error: new Error("Session expired") });

        const request = new NextRequest("http://localhost:3000/api/auth/logout", {
            method: "POST",
        });

        // signOut error should still redirect (graceful handling)
        const response = await POST(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });
});
