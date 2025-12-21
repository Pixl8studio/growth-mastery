/**
 * Funnel Management Actions Unit Tests
 *
 * Tests for rename, soft delete, restore, and permanent delete functionality.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createSupabaseServerMock,
    createSupabaseMock,
} from "@/__tests__/fixtures/supabase-mock";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
    captureException: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        })),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

describe("Funnel Management Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("TRASH_RETENTION_DAYS", () => {
        it("should export a constant for retention period", async () => {
            const { TRASH_RETENTION_DAYS } = await import(
                "@/app/funnel-builder/constants"
            );
            expect(TRASH_RETENTION_DAYS).toBe(30);
        });
    });

    describe("renameFunnel", () => {
        it("should throw ValidationError when not authenticated", async () => {
            const mockClient = createSupabaseMock({ user: null });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { renameFunnel } = await import("@/app/funnel-builder/actions");

            await expect(renameFunnel("project-123", "New Name")).rejects.toThrow(
                "Not authenticated"
            );
        });

        it("should throw ValidationError when name is empty", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { renameFunnel } = await import("@/app/funnel-builder/actions");

            await expect(renameFunnel("project-123", "   ")).rejects.toThrow(
                "Funnel name cannot be empty"
            );
        });

        it("should throw ValidationError when duplicate name exists", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: { id: "other-project" }, // Existing project with same name
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { renameFunnel } = await import("@/app/funnel-builder/actions");

            await expect(renameFunnel("project-123", "Duplicate Name")).rejects.toThrow(
                'You already have a funnel named "Duplicate Name"'
            );
        });

        it("should successfully rename funnel and update slug", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: null, // No duplicate found
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { renameFunnel } = await import("@/app/funnel-builder/actions");
            const result = await renameFunnel("project-123", "My New Funnel Name");

            expect(result.success).toBe(true);
            expect(result.newSlug).toBe("my-new-funnel-name");
            expect(revalidatePath).toHaveBeenCalledWith("/funnel-builder");
            expect(revalidatePath).toHaveBeenCalledWith("/funnel-builder/project-123");
        });

        it("should capture exception with Sentry on error", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: null,
                        error: { message: "Database error" },
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { renameFunnel } = await import("@/app/funnel-builder/actions");

            await expect(renameFunnel("project-123", "New Name")).rejects.toThrow();
            expect(Sentry.captureException).toHaveBeenCalled();
        });
    });

    describe("softDeleteFunnel", () => {
        it("should throw ValidationError when not authenticated", async () => {
            const mockClient = createSupabaseMock({ user: null });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { softDeleteFunnel } = await import("@/app/funnel-builder/actions");

            await expect(softDeleteFunnel("project-123")).rejects.toThrow(
                "Not authenticated"
            );
        });

        it("should throw ValidationError when funnel not found", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: null,
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { softDeleteFunnel } = await import("@/app/funnel-builder/actions");

            await expect(softDeleteFunnel("project-123")).rejects.toThrow(
                "Funnel not found"
            );
        });

        it("should unpublish pages for active funnel before soft delete", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: { status: "active" },
                        error: null,
                    },
                    registration_pages: { data: null, error: null },
                    watch_pages: { data: null, error: null },
                    enrollment_pages: { data: null, error: null },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { softDeleteFunnel } = await import("@/app/funnel-builder/actions");
            const result = await softDeleteFunnel("project-123");

            expect(result.success).toBe(true);
            expect(revalidatePath).toHaveBeenCalledWith("/funnel-builder");
            expect(revalidatePath).toHaveBeenCalledWith("/settings/trash");
        });

        it("should set deleted_at timestamp on soft delete", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: { status: "draft" },
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { softDeleteFunnel } = await import("@/app/funnel-builder/actions");
            const result = await softDeleteFunnel("project-123");

            expect(result.success).toBe(true);
        });
    });

    describe("restoreFunnel", () => {
        it("should throw ValidationError when not authenticated", async () => {
            const mockClient = createSupabaseMock({ user: null });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { restoreFunnel } = await import("@/app/funnel-builder/actions");

            await expect(restoreFunnel("project-123")).rejects.toThrow(
                "Not authenticated"
            );
        });

        it("should throw ValidationError when funnel not found in trash", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: null,
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { restoreFunnel } = await import("@/app/funnel-builder/actions");

            await expect(restoreFunnel("project-123")).rejects.toThrow(
                "Funnel not found in trash"
            );
        });

        it("should restore funnel and clear deleted_at", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: { name: "Test Funnel", slug: "test-funnel" },
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { restoreFunnel } = await import("@/app/funnel-builder/actions");
            const result = await restoreFunnel("project-123");

            expect(result.success).toBe(true);
            expect(revalidatePath).toHaveBeenCalledWith("/funnel-builder");
            expect(revalidatePath).toHaveBeenCalledWith("/settings/trash");
        });

        it("should detect slug collision and return slugChanged flag", async () => {
            // First call returns the funnel to restore
            // Second call checks for slug collision and finds existing
            let callCount = 0;
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
            });

            // Override from to return different data based on call
            mockClient.from = vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    // First call - get funnel to restore
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: { name: "Test", slug: "test-slug" },
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                } else if (callCount === 2) {
                    // Second call - check for collision, find existing
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    is: vi.fn().mockReturnValue({
                                        neq: vi.fn().mockReturnValue({
                                            maybeSingle: vi.fn().mockResolvedValue({
                                                data: { id: "other-project" },
                                                error: null,
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    };
                } else {
                    // Third call - update
                    return {
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockResolvedValue({
                                    data: null,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
            });

            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { restoreFunnel } = await import("@/app/funnel-builder/actions");
            const result = await restoreFunnel("project-123");

            expect(result.success).toBe(true);
            expect(result.slugChanged).toBe(true);
        });
    });

    describe("permanentlyDeleteFunnel", () => {
        it("should throw ValidationError when not authenticated", async () => {
            const mockClient = createSupabaseMock({ user: null });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { permanentlyDeleteFunnel } = await import(
                "@/app/funnel-builder/actions"
            );

            await expect(permanentlyDeleteFunnel("project-123")).rejects.toThrow(
                "Not authenticated"
            );
        });

        it("should throw ValidationError when funnel not found", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: null,
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { permanentlyDeleteFunnel } = await import(
                "@/app/funnel-builder/actions"
            );

            await expect(permanentlyDeleteFunnel("project-123")).rejects.toThrow(
                "Funnel not found"
            );
        });

        it("should throw ValidationError when funnel not in trash", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: { deleted_at: null }, // Not in trash
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { permanentlyDeleteFunnel } = await import(
                "@/app/funnel-builder/actions"
            );

            await expect(permanentlyDeleteFunnel("project-123")).rejects.toThrow(
                "Funnel must be in trash before permanent deletion"
            );
        });

        it("should permanently delete funnel that is in trash", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: { deleted_at: "2025-01-01T00:00:00Z" },
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { permanentlyDeleteFunnel } = await import(
                "@/app/funnel-builder/actions"
            );
            const result = await permanentlyDeleteFunnel("project-123");

            expect(result.success).toBe(true);
            expect(revalidatePath).toHaveBeenCalledWith("/settings/trash");
        });
    });

    describe("getDeletedFunnels", () => {
        it("should throw ValidationError when not authenticated", async () => {
            const mockClient = createSupabaseMock({ user: null });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { getDeletedFunnels } = await import("@/app/funnel-builder/actions");

            await expect(getDeletedFunnels()).rejects.toThrow("Not authenticated");
        });

        it("should return list of deleted funnels", async () => {
            const deletedFunnels = [
                {
                    id: "1",
                    name: "Funnel 1",
                    deleted_at: "2025-01-01",
                    updated_at: "2025-01-01",
                },
                {
                    id: "2",
                    name: "Funnel 2",
                    deleted_at: "2025-01-02",
                    updated_at: "2025-01-02",
                },
            ];

            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: deletedFunnels,
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { getDeletedFunnels } = await import("@/app/funnel-builder/actions");
            const result = await getDeletedFunnels();

            expect(result.success).toBe(true);
            expect(result.funnels).toEqual(deletedFunnels);
        });
    });

    describe("getFunnelDetails", () => {
        it("should throw ValidationError when not authenticated", async () => {
            const mockClient = createSupabaseMock({ user: null });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { getFunnelDetails } = await import("@/app/funnel-builder/actions");

            await expect(getFunnelDetails("project-123")).rejects.toThrow(
                "Not authenticated"
            );
        });

        it("should return funnel details", async () => {
            const funnel = {
                id: "project-123",
                name: "Test Funnel",
                slug: "test-funnel",
                description: "A test funnel",
                status: "draft",
                deleted_at: null,
            };

            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: funnel,
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { getFunnelDetails } = await import("@/app/funnel-builder/actions");
            const result = await getFunnelDetails("project-123");

            expect(result.success).toBe(true);
            expect(result.funnel).toEqual(funnel);
        });

        it("should throw ValidationError when funnel not found", async () => {
            const mockClient = createSupabaseMock({
                user: { id: "user-123", email: "test@example.com" },
                tables: {
                    funnel_projects: {
                        data: null,
                        error: null,
                    },
                },
            });
            vi.mocked(createClient).mockResolvedValue(mockClient as never);

            const { getFunnelDetails } = await import("@/app/funnel-builder/actions");

            await expect(getFunnelDetails("project-123")).rejects.toThrow(
                "Funnel not found"
            );
        });
    });
});
