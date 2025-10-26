/**
 * Tests for Agent Config Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSupabase = {
    from: vi.fn(),
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
    createAgentConfig,
    getAgentConfig,
    getAgentConfigForOffer,
    getDefaultAgentConfig,
    listAgentConfigs,
    updateAgentConfig,
    deleteAgentConfig,
    activateAgentConfig,
    getAgentConfigForProspect,
} = await import("@/lib/followup/agent-config-service");

describe("Agent Config Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createAgentConfig", () => {
        it("creates agent config with required fields", async () => {
            const mockConfig = {
                id: "config-123",
                user_id: "user-123",
                funnel_project_id: "funnel-123",
                name: "Main Offer Config",
                is_active: true,
            };

            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockConfig,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await createAgentConfig("user-123", {
                funnel_project_id: "funnel-123",
                name: "Main Offer Config",
            });

            expect(result.success).toBe(true);
            expect(result.config?.id).toBe("config-123");
        });

        it("links config to specific offer when provided", async () => {
            const mockConfig = {
                id: "config-123",
                offer_id: "offer-456",
                name: "Upsell Config",
            };

            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockConfig,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await createAgentConfig("user-123", {
                funnel_project_id: "funnel-123",
                offer_id: "offer-456",
                name: "Upsell Config",
            });

            expect(result.success).toBe(true);
            expect(result.config?.offer_id).toBe("offer-456");
        });
    });

    describe("getAgentConfigForOffer", () => {
        it("returns offer-specific config when available", async () => {
            const mockConfig = {
                id: "config-123",
                offer_id: "offer-456",
                is_active: true,
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockConfig,
                                error: null,
                            }),
                        }),
                    }),
                }),
            });

            const result = await getAgentConfigForOffer("offer-456");

            expect(result.success).toBe(true);
            expect(result.config?.offer_id).toBe("offer-456");
        });

        it("returns success without config when not found", async () => {
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: null,
                                error: { code: "PGRST116" }, // Not found
                            }),
                        }),
                    }),
                }),
            });

            const result = await getAgentConfigForOffer("offer-456");

            expect(result.success).toBe(true);
            expect(result.config).toBeUndefined();
        });
    });

    describe("getDefaultAgentConfig", () => {
        it("returns default config for funnel", async () => {
            const mockConfig = {
                id: "config-default",
                funnel_project_id: "funnel-123",
                offer_id: null,
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        is: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockConfig,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            });

            const result = await getDefaultAgentConfig("funnel-123");

            expect(result.success).toBe(true);
            expect(result.config?.offer_id).toBeNull();
        });
    });

    describe("activateAgentConfig", () => {
        it("deactivates other configs and activates target", async () => {
            const mockConfig = {
                offer_id: "offer-123",
                funnel_project_id: "funnel-123",
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockConfig,
                                    error: null,
                                }),
                            }),
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                neq: vi.fn().mockResolvedValue({
                                    error: null,
                                }),
                                is: vi.fn().mockReturnValue({
                                    neq: vi.fn().mockResolvedValue({
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await activateAgentConfig("config-123");

            expect(result.success).toBe(true);
        });
    });

    describe("listAgentConfigs", () => {
        it("returns all configs for a funnel", async () => {
            const mockConfigs = [
                { id: "config-1", name: "Main Offer", offer_id: null },
                { id: "config-2", name: "Upsell", offer_id: "offer-123" },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockConfigs,
                    error: null,
                }),
            };

            mockSupabase.from.mockReturnValue(mockChain);

            const result = await listAgentConfigs("funnel-123");

            expect(result.success).toBe(true);
            expect(result.configs).toHaveLength(2);
        });
    });

    describe("getAgentConfigForProspect", () => {
        it("returns prospect's assigned config", async () => {
            const mockProspect = {
                agent_config_id: "config-123",
                funnel_project_id: "funnel-123",
            };

            const mockConfig = {
                id: "config-123",
                name: "Prospect's Config",
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_prospects") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockProspect,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockConfig,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await getAgentConfigForProspect("prospect-123");

            expect(result.success).toBe(true);
            expect(result.config?.id).toBe("config-123");
        });
    });
});
