/**
 * Unit tests for lib/auth.ts
 * Tests authentication utilities and protected route helpers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

// Mock next/navigation
vi.mock("next/navigation", () => ({
    redirect: vi.fn(() => {
        throw new Error("NEXT_REDIRECT");
    }),
}));

// Mock Supabase client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: mockGetUser,
        },
        from: mockFrom,
    })),
}));

// Import after mocks are set up
const {
    requireAuth,
    getCurrentUser,
    isAuthenticated,
    getUserProfile,
    getCurrentUserWithProfile,
    getCurrentUserWithProfileForAPI,
} = await import("@/lib/auth");

describe("lib/auth", () => {
    const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00.000Z",
    };

    const mockProfile = {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        created_at: "2024-01-01T00:00:00.000Z",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ eq: mockEq });
        mockEq.mockReturnValue({ single: mockSingle });
    });

    describe("requireAuth", () => {
        it("should return user when authenticated", async () => {
            mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

            const result = await requireAuth();

            expect(result).toEqual(mockUser);
            expect(redirect).not.toHaveBeenCalled();
        });

        it("should redirect to /login when user is not authenticated", async () => {
            mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

            await expect(requireAuth()).rejects.toThrow();
            expect(redirect).toHaveBeenCalledWith("/login");
        });

        it("should redirect to /login with redirect param when redirectTo is provided", async () => {
            mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

            await expect(requireAuth("/dashboard")).rejects.toThrow();
            expect(redirect).toHaveBeenCalledWith("/login?redirect=%2Fdashboard");
        });

        it("should redirect when getUser returns error", async () => {
            mockGetUser.mockResolvedValue({
                data: { user: null },
                error: new Error("Auth error"),
            });

            await expect(requireAuth()).rejects.toThrow();
            expect(redirect).toHaveBeenCalledWith("/login");
        });
    });

    describe("getCurrentUser", () => {
        it("should return user when authenticated", async () => {
            mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

            const result = await getCurrentUser();

            expect(result).toEqual(mockUser);
        });

        it("should return null when user is not authenticated", async () => {
            mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

            const result = await getCurrentUser();

            expect(result).toBeNull();
        });

        it("should return null when getUser returns error", async () => {
            mockGetUser.mockResolvedValue({
                data: { user: null },
                error: new Error("Auth error"),
            });

            const result = await getCurrentUser();

            expect(result).toBeNull();
        });
    });

    describe("isAuthenticated", () => {
        it("should return true when user is authenticated", async () => {
            mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

            const result = await isAuthenticated();

            expect(result).toBe(true);
        });

        it("should return false when user is not authenticated", async () => {
            mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

            const result = await isAuthenticated();

            expect(result).toBe(false);
        });
    });

    describe("getUserProfile", () => {
        it("should return user profile successfully", async () => {
            mockSingle.mockResolvedValue({ data: mockProfile, error: null });

            const result = await getUserProfile("user-123");

            expect(result).toEqual(mockProfile);
            expect(mockFrom).toHaveBeenCalledWith("user_profiles");
            expect(mockSelect).toHaveBeenCalledWith("*");
            expect(mockEq).toHaveBeenCalledWith("id", "user-123");
        });

        it("should throw error when profile not found", async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: new Error("Profile not found"),
            });

            await expect(getUserProfile("user-123")).rejects.toThrow(
                "Profile not found"
            );
        });

        it("should throw error when database query fails", async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: new Error("Database error"),
            });

            await expect(getUserProfile("user-123")).rejects.toThrow("Database error");
        });
    });

    describe("getCurrentUserWithProfile", () => {
        it("should return user and profile when authenticated", async () => {
            mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
            mockSingle.mockResolvedValue({ data: mockProfile, error: null });

            const result = await getCurrentUserWithProfile();

            expect(result).toEqual({
                user: mockUser,
                profile: mockProfile,
            });
        });

        it("should redirect when user is not authenticated", async () => {
            mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

            await expect(getCurrentUserWithProfile()).rejects.toThrow();
            expect(redirect).toHaveBeenCalledWith("/login");
        });
    });

    describe("getCurrentUserWithProfileForAPI", () => {
        it("should return user and profile when authenticated", async () => {
            mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
            mockSingle.mockResolvedValue({ data: mockProfile, error: null });

            const result = await getCurrentUserWithProfileForAPI();

            expect(result).toEqual({
                user: mockUser,
                profile: mockProfile,
            });
        });

        it("should throw Unauthorized error when user is not authenticated", async () => {
            mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

            await expect(getCurrentUserWithProfileForAPI()).rejects.toThrow(
                "Unauthorized"
            );
            expect(redirect).not.toHaveBeenCalled();
        });

        it("should throw error when profile fetch fails", async () => {
            mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
            mockSingle.mockResolvedValue({
                data: null,
                error: new Error("Profile not found"),
            });

            await expect(getCurrentUserWithProfileForAPI()).rejects.toThrow(
                "Profile not found"
            );
        });
    });
});
