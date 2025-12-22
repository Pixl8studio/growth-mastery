/**
 * Unit tests for lib/admin/audit.ts
 * Tests audit log creation and retrieval
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
    captureException: vi.fn(),
}));

// Mock Supabase client
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockRange = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            insert: mockInsert,
            select: mockSelect,
        })),
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
    logAdminAction,
    logViewAction,
    logEditAction,
    logImpersonationAction,
    logAdminChangeAction,
    logEmailSentAction,
    logActionTaken,
    getAuditLogs,
    getRecentLogsForUser,
} = await import("@/lib/admin/audit");

describe("lib/admin/audit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockInsert.mockResolvedValue({ error: null });
        mockSelect.mockReturnValue({
            eq: mockEq,
            gte: mockGte,
            lte: mockLte,
            order: mockOrder,
        });
        mockEq.mockReturnValue({
            eq: mockEq,
            order: mockOrder,
            limit: mockLimit,
        });
        mockOrder.mockReturnValue({
            eq: mockEq,
            limit: mockLimit,
            range: mockRange,
        });
        mockLimit.mockResolvedValue({ data: [], error: null });
        mockRange.mockResolvedValue({ data: [], count: 0, error: null });
    });

    describe("logAdminAction", () => {
        it("should insert audit log entry without blocking", async () => {
            const entry = {
                admin_user_id: "admin-123",
                target_user_id: "user-456",
                action: "test_action",
                action_type: "view" as const,
                details: { key: "value" },
            };

            // logAdminAction is fire-and-forget, so it returns immediately
            logAdminAction(entry);

            // Wait for async operation to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            // The insert should have been called
            expect(mockInsert).toHaveBeenCalled();
        });

        it("should handle insert errors gracefully", async () => {
            mockInsert.mockResolvedValue({ error: new Error("Insert failed") });

            const entry = {
                admin_user_id: "admin-123",
                action: "test_action",
                action_type: "view" as const,
            };

            // Should not throw
            logAdminAction(entry);

            await new Promise((resolve) => setTimeout(resolve, 10));
        });
    });

    describe("logViewAction", () => {
        it("should call logAdminAction with view action_type", async () => {
            logViewAction("admin-123", "user-456", "viewed_profile");
            // Fire-and-forget function - just verify it doesn't throw
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe("logEditAction", () => {
        it("should call logAdminAction with edit action_type", async () => {
            logEditAction("admin-123", "user-456", "updated_profile", {
                field: "email",
            });
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe("logImpersonationAction", () => {
        it("should log impersonation start", async () => {
            logImpersonationAction("admin-123", "user-456", "started");
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(mockInsert).toHaveBeenCalled();
        });

        it("should log impersonation end", async () => {
            logImpersonationAction("admin-123", "user-456", "ended");
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe("logAdminChangeAction", () => {
        it("should log admin role changes", async () => {
            logAdminChangeAction("super-admin-123", "user-456", "role_changed", {
                oldRole: "user",
                newRole: "support",
            });
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe("logEmailSentAction", () => {
        it("should log email sent action with subject", async () => {
            logEmailSentAction("admin-123", "user-456", "Welcome Email", {
                template: "welcome",
            });
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe("logActionTaken", () => {
        it("should log general action taken", async () => {
            logActionTaken("admin-123", "user-456", "reset_password", {
                reason: "user_request",
            });
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe("getAuditLogs", () => {
        beforeEach(() => {
            // Setup proper chain for getAuditLogs which uses range()
            const chainWithRange = {
                eq: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                range: mockRange,
            };
            mockOrder.mockReturnValue(chainWithRange);
        });

        it("should return audit logs with pagination", async () => {
            const mockLogs = [
                {
                    id: "1",
                    admin_user_id: "admin-123",
                    target_user_id: "user-456",
                    action: "test_action",
                    action_type: "view",
                    details: {},
                    created_at: "2024-01-01T00:00:00.000Z",
                },
            ];

            mockRange.mockResolvedValue({
                data: mockLogs,
                count: 1,
                error: null,
            });

            const result = await getAuditLogs({ limit: 50, offset: 0 });

            expect(result.logs).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it("should return empty array on error", async () => {
            mockRange.mockResolvedValue({
                data: null,
                count: null,
                error: new Error("Query failed"),
            });

            const result = await getAuditLogs({});

            expect(result.logs).toEqual([]);
            expect(result.total).toBe(0);
        });
    });

    describe("getRecentLogsForUser", () => {
        it("should return recent logs for a specific user", async () => {
            const mockLogs = [
                {
                    id: "1",
                    admin_user_id: "admin-123",
                    target_user_id: "user-456",
                    action: "viewed_profile",
                    action_type: "view",
                    details: {},
                    created_at: "2024-01-01T00:00:00.000Z",
                },
            ];

            mockLimit.mockResolvedValue({ data: mockLogs, error: null });

            const result = await getRecentLogsForUser("user-456");

            expect(result).toHaveLength(1);
            expect(mockEq).toHaveBeenCalledWith("target_user_id", "user-456");
        });

        it("should respect limit parameter", async () => {
            mockLimit.mockResolvedValue({ data: [], error: null });

            await getRecentLogsForUser("user-456", 5);

            expect(mockLimit).toHaveBeenCalledWith(5);
        });

        it("should return empty array on error", async () => {
            mockLimit.mockResolvedValue({
                data: null,
                error: new Error("Query failed"),
            });

            const result = await getRecentLogsForUser("user-456");

            expect(result).toEqual([]);
        });
    });
});
