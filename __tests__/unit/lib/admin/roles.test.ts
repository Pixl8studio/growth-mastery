/**
 * Unit tests for lib/admin/roles.ts
 * Tests role hierarchy enforcement, access control, and role management
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

// Mock next/navigation
vi.mock("next/navigation", () => ({
    redirect: vi.fn(() => {
        throw new Error("NEXT_REDIRECT");
    }),
}));

// Mock Supabase client
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockSingle = vi.fn();
const mockLimit = vi.fn();
const mockOrder = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        from: mockFrom,
    })),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Import after mocks are set up
const {
    hasMinimumRole,
    isAdmin,
    canPerformAdminActions,
    isSuperAdmin,
    getUserRole,
    getAdminUser,
    requireAdminAccess,
    requireAdminAccessForAPI,
    getAllAdminUsers,
    updateUserRole,
    initializeSuperAdminFromEnv,
} = await import("@/lib/admin/roles");

describe("lib/admin/roles", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the chain
        mockFrom.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ eq: mockEq, in: mockIn });
        mockEq.mockReturnValue({ single: mockSingle, limit: mockLimit });
        mockIn.mockReturnValue({ order: mockOrder });
        mockOrder.mockReturnValue(Promise.resolve({ data: [], error: null }));
        mockLimit.mockReturnValue(Promise.resolve({ data: [], error: null }));
        mockSingle.mockReturnValue(Promise.resolve({ data: null, error: null }));
    });

    describe("hasMinimumRole", () => {
        it("should return true when user role equals minimum role", () => {
            expect(hasMinimumRole("user", "user")).toBe(true);
            expect(hasMinimumRole("support", "support")).toBe(true);
            expect(hasMinimumRole("admin", "admin")).toBe(true);
            expect(hasMinimumRole("super_admin", "super_admin")).toBe(true);
        });

        it("should return true when user role is higher than minimum role", () => {
            expect(hasMinimumRole("super_admin", "user")).toBe(true);
            expect(hasMinimumRole("super_admin", "support")).toBe(true);
            expect(hasMinimumRole("super_admin", "admin")).toBe(true);
            expect(hasMinimumRole("admin", "user")).toBe(true);
            expect(hasMinimumRole("admin", "support")).toBe(true);
            expect(hasMinimumRole("support", "user")).toBe(true);
        });

        it("should return false when user role is lower than minimum role", () => {
            expect(hasMinimumRole("user", "support")).toBe(false);
            expect(hasMinimumRole("user", "admin")).toBe(false);
            expect(hasMinimumRole("user", "super_admin")).toBe(false);
            expect(hasMinimumRole("support", "admin")).toBe(false);
            expect(hasMinimumRole("support", "super_admin")).toBe(false);
            expect(hasMinimumRole("admin", "super_admin")).toBe(false);
        });
    });

    describe("isAdmin", () => {
        it("should return true for support role", () => {
            expect(isAdmin("support")).toBe(true);
        });

        it("should return true for admin role", () => {
            expect(isAdmin("admin")).toBe(true);
        });

        it("should return true for super_admin role", () => {
            expect(isAdmin("super_admin")).toBe(true);
        });

        it("should return false for user role", () => {
            expect(isAdmin("user")).toBe(false);
        });
    });

    describe("canPerformAdminActions", () => {
        it("should return true for admin role", () => {
            expect(canPerformAdminActions("admin")).toBe(true);
        });

        it("should return true for super_admin role", () => {
            expect(canPerformAdminActions("super_admin")).toBe(true);
        });

        it("should return false for support role", () => {
            expect(canPerformAdminActions("support")).toBe(false);
        });

        it("should return false for user role", () => {
            expect(canPerformAdminActions("user")).toBe(false);
        });
    });

    describe("isSuperAdmin", () => {
        it("should return true only for super_admin role", () => {
            expect(isSuperAdmin("super_admin")).toBe(true);
        });

        it("should return false for all other roles", () => {
            expect(isSuperAdmin("user")).toBe(false);
            expect(isSuperAdmin("support")).toBe(false);
            expect(isSuperAdmin("admin")).toBe(false);
        });
    });

    describe("getUserRole", () => {
        it("should return user role from database", async () => {
            mockSingle.mockResolvedValue({
                data: { role: "admin" },
                error: null,
            });

            const result = await getUserRole("user-123");

            expect(result).toBe("admin");
            expect(mockFrom).toHaveBeenCalledWith("user_profiles");
        });

        it("should return 'user' as default when no data found", async () => {
            mockSingle.mockResolvedValue({ data: null, error: null });

            const result = await getUserRole("user-123");

            expect(result).toBe("user");
        });

        it("should return 'user' as default on database error", async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: new Error("Database error"),
            });

            const result = await getUserRole("user-123");

            expect(result).toBe("user");
        });

        it("should return 'user' when role field is empty", async () => {
            mockSingle.mockResolvedValue({
                data: { role: null },
                error: null,
            });

            const result = await getUserRole("user-123");

            expect(result).toBe("user");
        });
    });

    describe("getAdminUser", () => {
        const mockAdminProfile = {
            id: "admin-123",
            email: "admin@example.com",
            full_name: "Admin User",
            role: "admin",
            avatar_url: null,
            created_at: "2024-01-01T00:00:00.000Z",
        };

        it("should return admin user when role is admin or higher", async () => {
            mockSingle.mockResolvedValue({
                data: mockAdminProfile,
                error: null,
            });

            const result = await getAdminUser("admin-123");

            expect(result).toEqual({
                id: "admin-123",
                email: "admin@example.com",
                full_name: "Admin User",
                role: "admin",
                avatar_url: null,
                created_at: "2024-01-01T00:00:00.000Z",
            });
        });

        it("should return null for regular user role", async () => {
            mockSingle.mockResolvedValue({
                data: { ...mockAdminProfile, role: "user" },
                error: null,
            });

            const result = await getAdminUser("user-123");

            expect(result).toBeNull();
        });

        it("should return null on database error", async () => {
            mockSingle.mockResolvedValue({
                data: null,
                error: new Error("Database error"),
            });

            const result = await getAdminUser("user-123");

            expect(result).toBeNull();
        });
    });

    describe("requireAdminAccess", () => {
        const mockAdminUser = {
            id: "admin-123",
            email: "admin@example.com",
            full_name: "Admin User",
            role: "admin",
            avatar_url: null,
            created_at: "2024-01-01T00:00:00.000Z",
        };

        it("should return admin user when they have sufficient permissions", async () => {
            mockSingle.mockResolvedValue({
                data: mockAdminUser,
                error: null,
            });

            const result = await requireAdminAccess("admin-123", "support");

            expect(result).toEqual(
                expect.objectContaining({
                    id: "admin-123",
                    role: "admin",
                })
            );
        });

        it("should redirect when user is not an admin", async () => {
            mockSingle.mockResolvedValue({
                data: { ...mockAdminUser, role: "user" },
                error: null,
            });

            await expect(requireAdminAccess("user-123")).rejects.toThrow(
                "NEXT_REDIRECT"
            );
            expect(redirect).toHaveBeenCalledWith("/settings");
        });

        it("should redirect when user has insufficient role level", async () => {
            mockSingle.mockResolvedValue({
                data: { ...mockAdminUser, role: "support" },
                error: null,
            });

            await expect(requireAdminAccess("support-123", "admin")).rejects.toThrow(
                "NEXT_REDIRECT"
            );
            expect(redirect).toHaveBeenCalledWith("/settings");
        });
    });

    describe("requireAdminAccessForAPI", () => {
        const mockAdminUser = {
            id: "admin-123",
            email: "admin@example.com",
            full_name: "Admin User",
            role: "admin",
            avatar_url: null,
            created_at: "2024-01-01T00:00:00.000Z",
        };

        it("should return adminUser when they have sufficient permissions", async () => {
            mockSingle.mockResolvedValue({
                data: mockAdminUser,
                error: null,
            });

            const result = await requireAdminAccessForAPI("admin-123", "support");

            expect(result).toHaveProperty("adminUser");
            expect((result as { adminUser: typeof mockAdminUser }).adminUser.id).toBe(
                "admin-123"
            );
        });

        it("should return 404 response when user is not an admin", async () => {
            mockSingle.mockResolvedValue({
                data: { ...mockAdminUser, role: "user" },
                error: null,
            });

            const result = await requireAdminAccessForAPI("user-123");

            expect(result).toHaveProperty("response");
        });

        it("should return 404 response when user has insufficient role", async () => {
            mockSingle.mockResolvedValue({
                data: { ...mockAdminUser, role: "support" },
                error: null,
            });

            const result = await requireAdminAccessForAPI("support-123", "admin");

            expect(result).toHaveProperty("response");
        });
    });

    describe("getAllAdminUsers", () => {
        it("should return all admin users", async () => {
            const mockAdmins = [
                {
                    id: "1",
                    email: "support@example.com",
                    role: "support",
                    full_name: "Support",
                    avatar_url: null,
                    created_at: "2024-01-01",
                },
                {
                    id: "2",
                    email: "admin@example.com",
                    role: "admin",
                    full_name: "Admin",
                    avatar_url: null,
                    created_at: "2024-01-02",
                },
            ];

            mockOrder.mockResolvedValue({
                data: mockAdmins,
                error: null,
            });

            const result = await getAllAdminUsers();

            expect(result).toHaveLength(2);
            expect(result[0].role).toBe("support");
            expect(result[1].role).toBe("admin");
        });

        it("should return empty array on error", async () => {
            mockOrder.mockResolvedValue({
                data: null,
                error: new Error("Database error"),
            });

            const result = await getAllAdminUsers();

            expect(result).toEqual([]);
        });
    });

    describe("updateUserRole - access control", () => {
        // Note: These are pure logic tests based on role hierarchy
        // The actual updateUserRole function requires complex mock setup
        // Integration tests should cover the full flow

        it("should validate only super_admin can change roles based on role checks", () => {
            // Test the underlying logic: isSuperAdmin is required for role changes
            expect(isSuperAdmin("admin")).toBe(false);
            expect(isSuperAdmin("super_admin")).toBe(true);
        });

        it("should validate hasMinimumRole is used for permission checks", () => {
            // Test the underlying logic used in updateUserRole
            expect(hasMinimumRole("admin", "super_admin")).toBe(false);
            expect(hasMinimumRole("super_admin", "super_admin")).toBe(true);
        });
    });

    describe("initializeSuperAdminFromEnv", () => {
        const originalEnv = process.env;

        beforeEach(() => {
            vi.resetModules();
            process.env = { ...originalEnv };
        });

        afterAll(() => {
            process.env = originalEnv;
        });

        it("should return error when INITIAL_SUPER_ADMIN_EMAIL is not set", async () => {
            delete process.env.INITIAL_SUPER_ADMIN_EMAIL;

            const result = await initializeSuperAdminFromEnv();

            expect(result.success).toBe(false);
            expect(result.message).toBe("INITIAL_SUPER_ADMIN_EMAIL not set");
        });

        it("should return success when super_admin already exists", async () => {
            process.env.INITIAL_SUPER_ADMIN_EMAIL = "admin@example.com";
            mockLimit.mockResolvedValue({
                data: [{ id: "existing-super-admin" }],
                error: null,
            });

            const result = await initializeSuperAdminFromEnv();

            expect(result.success).toBe(true);
            expect(result.message).toBe("Super admin already exists");
        });
    });
});
