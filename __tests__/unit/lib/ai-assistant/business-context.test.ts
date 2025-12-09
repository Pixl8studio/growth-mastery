import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    loadBusinessContext,
    formatBusinessContextForPrompt,
} from "@/lib/ai-assistant/business-context";
import type { BusinessContext } from "@/lib/ai-assistant/business-context";

vi.mock("@/lib/supabase/client", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

import { createClient } from "@/lib/supabase/client";

describe("Business Context", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("loadBusinessContext", () => {
        it("should load full context with project", async () => {
            const mockUser = { id: "user-123", email: "test@example.com" };

            const mockSupabase = {
                auth: {
                    getUser: vi
                        .fn()
                        .mockResolvedValue({ data: { user: mockUser }, error: null }),
                },
                from: vi.fn((table: string) => {
                    if (table === "user_profiles") {
                        return {
                            select: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockReturnThis(),
                            single: vi.fn().mockResolvedValue({
                                data: { full_name: "Test User" },
                                error: null,
                            }),
                        };
                    }
                    if (table === "funnel_projects") {
                        return {
                            select: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockReturnThis(),
                            order: vi.fn().mockResolvedValue({
                                data: [
                                    {
                                        id: "project-123",
                                        name: "Test Project",
                                        slug: "test",
                                        status: "active",
                                        current_step: 3,
                                    },
                                ],
                                error: null,
                            }),
                        };
                    }
                    if (table === "offers") {
                        return {
                            select: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockReturnThis(),
                            order: vi.fn().mockResolvedValue({
                                data: [
                                    { id: "offer-1", name: "Main Offer", price: 997 },
                                ],
                                error: null,
                            }),
                        };
                    }
                    if (table === "contacts") {
                        // Query: .select().eq() - both chainable
                        const mockResult = { count: 100, error: null };
                        const chain: any = {
                            select: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockReturnThis(),
                            then: (resolve: any) => resolve(mockResult),
                        };
                        return chain;
                    }
                    if (table === "payment_transactions") {
                        // Query calls .eq() twice, so we need chainable object that's also awaitable
                        const mockResult = {
                            data: [{ amount: 997 }, { amount: 1997 }],
                            error: null,
                        };
                        const chain: any = {
                            select: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockReturnThis(),
                            then: (resolve: any) => resolve(mockResult),
                        };
                        return chain;
                    }
                    return { select: vi.fn().mockReturnThis() };
                }),
            };

            vi.mocked(createClient).mockReturnValue(mockSupabase as any);

            const result = await loadBusinessContext("project-123");

            expect(result.success).toBe(true);
            expect(result.context).toBeDefined();
            expect(result.context?.user.id).toBe("user-123");
            expect(result.context?.currentProject?.id).toBe("project-123");
            expect(result.context?.offers).toHaveLength(1);
        });

        it("should load context without project", async () => {
            const mockUser = { id: "user-123", email: "test@example.com" };

            const mockSupabase = {
                auth: {
                    getUser: vi
                        .fn()
                        .mockResolvedValue({ data: { user: mockUser }, error: null }),
                },
                from: vi.fn((table: string) => {
                    if (table === "user_profiles") {
                        return {
                            select: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockReturnThis(),
                            single: vi
                                .fn()
                                .mockResolvedValue({ data: null, error: null }),
                        };
                    }
                    if (table === "funnel_projects") {
                        return {
                            select: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockReturnThis(),
                            order: vi.fn().mockResolvedValue({ data: [], error: null }),
                        };
                    }
                    return { select: vi.fn().mockReturnThis() };
                }),
            };

            vi.mocked(createClient).mockReturnValue(mockSupabase as any);

            const result = await loadBusinessContext();

            expect(result.success).toBe(true);
            expect(result.context?.currentProject).toBeUndefined();
        });

        it("should return error when not authenticated", async () => {
            const mockSupabase = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({
                        data: { user: null },
                        error: { message: "Not authenticated" },
                    }),
                },
            };

            vi.mocked(createClient).mockReturnValue(mockSupabase as any);

            const result = await loadBusinessContext();

            expect(result.success).toBe(false);
            expect(result.error).toBe("Not authenticated");
        });
    });

    describe("formatBusinessContextForPrompt", () => {
        it("should format full context", () => {
            const context: BusinessContext = {
                user: {
                    id: "user-123",
                    email: "test@example.com",
                    fullName: "Test User",
                },
                currentProject: {
                    id: "project-123",
                    name: "Test Project",
                    slug: "test",
                    status: "active",
                    currentStep: 3,
                },
                projects: [
                    { id: "project-123", name: "Test Project", status: "active" },
                    { id: "project-456", name: "Other Project", status: "draft" },
                ],
                offers: [{ id: "offer-1", name: "Main Offer", price: 997 }],
                analytics: {
                    totalContacts: 100,
                    totalRevenue: 2994,
                    conversionRate: 2.5,
                    recentActivity: "Active",
                },
                recentActivity: [],
            };

            const formatted = formatBusinessContextForPrompt(context);

            expect(formatted).toContain("Test User");
            expect(formatted).toContain("Test Project");
            expect(formatted).toContain("Main Offer");
            expect(formatted).toContain("$997");
            expect(formatted).toContain("100");
        });

        it("should handle minimal context", () => {
            const context: BusinessContext = {
                user: {
                    id: "user-123",
                    email: "test@example.com",
                },
                projects: [],
                offers: [],
                recentActivity: [],
            };

            const formatted = formatBusinessContextForPrompt(context);

            expect(formatted).toContain("test@example.com");
        });
    });
});
