/**
 * Tests for Offer Routing Service
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

// Mock content selector service
vi.mock("@/lib/followup/content-selector-service", () => ({
    determinePriceBand: vi.fn((price: number) => {
        if (price < 1000) return "low";
        if (price < 5000) return "mid";
        return "high";
    }),
}));

// Import after mocks are defined
const {
    getOfferContext,
    routeProspectToSequence,
    getPriceAwareMessagingRules,
    getOfferTypeMessagingRules,
    linkProspectToOffer,
} = await import("@/lib/followup/offer-routing-service");

describe("Offer Routing Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getOfferContext", () => {
        it("fetches offer and calculates price band", async () => {
            const mockOffer = {
                id: "offer-123",
                name: "Premium Coaching",
                price: 2999,
                offer_type: "main",
            };

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockOffer,
                            error: null,
                        }),
                    }),
                }),
            });

            const result = await getOfferContext("offer-123");

            expect(result.success).toBe(true);
            expect(result.context?.offer_name).toBe("Premium Coaching");
            expect(result.context?.price_band).toBe("mid");
        });
    });

    describe("routeProspectToSequence", () => {
        it("routes prospect to matching sequence", async () => {
            const mockProspect = {
                id: "prospect-123",
                segment: "engaged",
                funnel_project_id: "funnel-123",
                agent_config_id: "config-123",
            };

            const mockSequence = {
                id: "sequence-123",
                name: "Main Follow-Up",
                target_segments: ["engaged", "hot"],
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
                if (table === "followup_sequences") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        contains: vi.fn().mockReturnValue({
                                            single: vi.fn().mockResolvedValue({
                                                data: mockSequence,
                                                error: null,
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await routeProspectToSequence("prospect-123");

            expect(result.success).toBe(true);
            expect(result.sequence_id).toBe("sequence-123");
        });

        it("returns error when no matching sequence found", async () => {
            const mockProspect = {
                id: "prospect-123",
                segment: "no_show",
                funnel_project_id: "funnel-123",
                agent_config_id: "config-123",
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
                if (table === "followup_sequences") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        contains: vi.fn().mockReturnValue({
                                            single: vi.fn().mockResolvedValue({
                                                data: null,
                                                error: { code: "PGRST116" },
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await routeProspectToSequence("prospect-123");

            expect(result.success).toBe(false);
            expect(result.error).toContain("No automated sequence");
        });
    });

    describe("getPriceAwareMessagingRules", () => {
        it("returns casual tone for low price band", () => {
            const rules = getPriceAwareMessagingRules("low");

            expect(rules.tone).toBe("casual");
            expect(rules.touch_count_recommendation).toBe(3);
        });

        it("returns professional tone for mid price band", () => {
            const rules = getPriceAwareMessagingRules("mid");

            expect(rules.tone).toBe("professional");
            expect(rules.proof_emphasis).toBe("strong");
            expect(rules.touch_count_recommendation).toBe(5);
        });

        it("returns consultative tone for high price band", () => {
            const rules = getPriceAwareMessagingRules("high");

            expect(rules.tone).toBe("consultative");
            expect(rules.proof_emphasis).toBe("comprehensive");
            expect(rules.touch_count_recommendation).toBe(7);
            expect(rules.urgency_level).toBe("subtle");
        });
    });

    describe("getOfferTypeMessagingRules", () => {
        it("returns transformation emphasis for main offers", () => {
            const rules = getOfferTypeMessagingRules("main");

            expect(rules.emphasis).toBe("transformation");
            expect(rules.cta_style).toBe("direct");
            expect(rules.proof_type).toBe("case_study");
        });

        it("returns complementary CTA for upsells", () => {
            const rules = getOfferTypeMessagingRules("upsell");

            expect(rules.emphasis).toBe("enhancement");
            expect(rules.cta_style).toBe("complementary");
        });

        it("returns gentle CTA for downsells", () => {
            const rules = getOfferTypeMessagingRules("downsell");

            expect(rules.emphasis).toBe("accessibility");
            expect(rules.cta_style).toBe("gentle");
        });
    });

    describe("linkProspectToOffer", () => {
        it("links prospect to offer's agent config", async () => {
            const mockAgentConfig = {
                id: "config-123",
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === "followup_agent_configs") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockAgentConfig,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                if (table === "followup_prospects") {
                    return {
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                error: null,
                            }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await linkProspectToOffer("prospect-123", "offer-123");

            expect(result.success).toBe(true);
        });
    });
});
