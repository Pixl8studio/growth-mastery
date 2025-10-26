/**
 * Tests for Prospect Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn(),
};

const mockCreateClient = vi.fn().mockResolvedValue(mockSupabase);

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: mockCreateClient,
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Import after mocks are defined
const {
    createProspect,
    updateProspectWatchData,
    updateProspectIntakeData,
    markProspectConverted,
    optOutProspect,
    getProspect,
    getProspectByEmail,
    listProspects,
} = await import("@/lib/followup/prospect-service");

describe("Prospect Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createProspect", () => {
        it("creates prospect with required fields", async () => {
            const mockProspect = {
                id: "prospect-123",
                user_id: "user-123",
                email: "test@example.com",
                first_name: "John",
                segment: "no_show",
                watch_percentage: 0,
            };

            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockProspect,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await createProspect("user-123", {
                funnel_project_id: "funnel-123",
                email: "test@example.com",
                first_name: "John",
            });

            expect(result.success).toBe(true);
            expect(result.prospect).toMatchObject({
                id: "prospect-123",
                email: "test@example.com",
            });
        });

        it("returns error when creation fails", async () => {
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Database error" },
                        }),
                    }),
                }),
            });

            const result = await createProspect("user-123", {
                funnel_project_id: "funnel-123",
                email: "test@example.com",
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });
    });

    describe("updateProspectWatchData", () => {
        it("updates watch percentage and segment", async () => {
            const mockProspect = {
                id: "prospect-123",
                watch_percentage: 75,
                watch_duration_seconds: 1800,
                segment: "engaged",
            };

            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockProspect,
                                error: null,
                            }),
                        }),
                    }),
                }),
            });

            const result = await updateProspectWatchData("prospect-123", {
                watch_percentage: 75,
                watch_duration_seconds: 1800,
                last_watched_at: new Date().toISOString(),
            });

            expect(result.success).toBe(true);
            expect(result.prospect?.segment).toBe("engaged");
        });
    });

    describe("updateProspectIntakeData", () => {
        it("updates challenge and goal notes", async () => {
            const mockProspect = {
                id: "prospect-123",
                challenge_notes: "Struggling with lead generation",
                goal_notes: "Double revenue in 6 months",
            };

            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockProspect,
                                error: null,
                            }),
                        }),
                    }),
                }),
            });

            const result = await updateProspectIntakeData("prospect-123", {
                challenge_notes: "Struggling with lead generation",
                goal_notes: "Double revenue in 6 months",
            });

            expect(result.success).toBe(true);
            expect(result.prospect?.challenge_notes).toBe(
                "Struggling with lead generation"
            );
        });
    });

    describe("markProspectConverted", () => {
        it("marks prospect as converted and cancels pending deliveries", async () => {
            const mockProspect = {
                id: "prospect-123",
                converted: true,
                converted_at: expect.any(String),
                next_scheduled_touch: null,
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_prospects") {
                    return {
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockProspect,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                // followup_deliveries
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
            });

            const result = await markProspectConverted("prospect-123", 499.99);

            expect(result.success).toBe(true);
            expect(result.prospect?.converted).toBe(true);
        });
    });

    describe("optOutProspect", () => {
        it("sets consent state to opted_out", async () => {
            const mockProspect = {
                id: "prospect-123",
                consent_state: "opted_out",
                opted_out_at: expect.any(String),
                opt_out_reason: "User requested",
            };

            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockProspect,
                                error: null,
                            }),
                        }),
                    }),
                }),
            });

            const result = await optOutProspect("prospect-123", "User requested");

            expect(result.success).toBe(true);
            expect(result.prospect?.consent_state).toBe("opted_out");
        });
    });

    describe("getProspect", () => {
        it("retrieves prospect by ID", async () => {
            const mockProspect = {
                id: "prospect-123",
                email: "test@example.com",
                segment: "hot",
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockProspect,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await getProspect("prospect-123");

            expect(result.success).toBe(true);
            expect(result.prospect?.id).toBe("prospect-123");
        });

        it("returns error when prospect not found", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Not found" },
                        }),
                    }),
                }),
            });

            const result = await getProspect("prospect-123");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Not found");
        });
    });

    describe("getProspectByEmail", () => {
        it("retrieves prospect by email and funnel", async () => {
            const mockProspect = {
                id: "prospect-123",
                email: "test@example.com",
                funnel_project_id: "funnel-123",
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockProspect,
                                error: null,
                            }),
                        }),
                    }),
                }),
            });

            const result = await getProspectByEmail("test@example.com", "funnel-123");

            expect(result.success).toBe(true);
            expect(result.prospect?.email).toBe("test@example.com");
        });

        it("returns success with no prospect when not found", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: null,
                                error: { code: "PGRST116" }, // Not found code
                            }),
                        }),
                    }),
                }),
            });

            const result = await getProspectByEmail("test@example.com", "funnel-123");

            expect(result.success).toBe(true);
            expect(result.prospect).toBeUndefined();
        });
    });

    describe("listProspects", () => {
        it("lists all prospects for a funnel", async () => {
            const mockProspects = [
                { id: "1", email: "test1@example.com", segment: "hot" },
                { id: "2", email: "test2@example.com", segment: "engaged" },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockProspects,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await listProspects("user-123", "funnel-123");

            expect(result.success).toBe(true);
            expect(result.prospects).toHaveLength(2);
        });

        it("filters prospects by segment", async () => {
            const mockProspects = [
                { id: "1", email: "test1@example.com", segment: "hot" },
            ];

            const mockFinalChain = {
                eq: vi.fn().mockResolvedValue({
                    data: mockProspects,
                    error: null,
                }),
                gte: vi.fn().mockResolvedValue({
                    data: mockProspects,
                    error: null,
                }),
            };

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnValue(mockFinalChain),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await listProspects("user-123", "funnel-123", {
                segment: "hot",
            });

            expect(result.success).toBe(true);
            expect(result.prospects).toHaveLength(1);
        });
    });
});
