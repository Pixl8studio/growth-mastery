/**
 * Tests for Knowledge Base Aggregator
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

/**
 * Creates a chainable and thenable mock for Supabase queries
 */
function createChainableMock(result: { data: unknown; error: unknown }) {
    const chain: Record<string, unknown> = {};
    const methods = [
        "select",
        "eq",
        "gte",
        "lte",
        "in",
        "or",
        "not",
        "order",
        "limit",
        "single",
        "update",
    ];
    methods.forEach((method) => {
        chain[method] = vi.fn(() => chain);
    });
    // Make it thenable for await
    chain.then = (resolve: (value: unknown) => void) =>
        Promise.resolve(result).then(resolve);
    return chain;
}

// Import after mocks are defined
const { aggregateKnowledgeBase, updateAgentKnowledge } = await import(
    "@/lib/followup/knowledge-base-aggregator"
);

describe("Knowledge Base Aggregator", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("aggregateKnowledgeBase", () => {
        it("aggregates knowledge from all sources", async () => {
            // Mock transcript data
            const mockTranscripts = [
                {
                    transcript_text: "my biggest challenge is finding clients",
                    transcript_analysis: JSON.stringify({
                        challenges: ["Finding clients", "Marketing"],
                        goals: ["Scale business", "Increase revenue"],
                        objections: ["Too expensive", "No time"],
                    }),
                },
            ];

            // Mock offer data
            const mockOffer = {
                name: "Premium Course",
                description: "Learn to grow your business",
                price: 997,
                offer_type: "Course",
                benefits: ["Benefit 1", "Benefit 2"],
                delivery: "Online",
            };

            // Mock deck data
            const mockDeck = {
                slides: [
                    {
                        title: "Slide 1",
                        content: "Content 1",
                        bullet_points: ["Point 1", "Point 2"],
                    },
                ],
                proof_elements: ["Proof 1", "Proof 2"],
                testimonials: [{ quote: "Great course!", author: "John Doe" }],
            };

            // Mock enrollment page data
            const mockEnrollment = {
                testimonials: [
                    { quote: "Amazing!", author: "Jane Smith", company: "ACME Inc" },
                ],
                faqs: [{ question: "How long is it?", answer: "6 weeks" }],
                cta_text: ["Join now", "Get started"],
            };

            let _callCount = 0;
            mockSupabase.from.mockImplementation((table) => {
                _callCount++;

                if (table === "vapi_transcripts") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: mockTranscripts,
                            error: null,
                        }),
                    };
                }

                if (table === "offers") {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockOffer,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === "deck_structures") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockDeck,
                                error: null,
                            }),
                        }),
                    };
                }

                if (table === "enrollment_pages") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockEnrollment,
                                error: null,
                            }),
                        }),
                    };
                }

                return {
                    select: vi.fn().mockReturnThis(),
                };
            });

            const result = await aggregateKnowledgeBase("funnel-123", "offer-123");

            expect(result.success).toBe(true);
            expect(result.knowledge).toBeDefined();
            expect(result.knowledge?.business_context.length).toBeGreaterThan(0);
            expect(result.knowledge?.product_details.length).toBeGreaterThan(0);
            expect(result.knowledge?.common_objections.length).toBeGreaterThan(0);
            expect(result.knowledge?.proof_elements.length).toBeGreaterThan(0);
            expect(result.knowledge?.testimonials.length).toBeGreaterThan(0);
        });

        it("handles missing data sources gracefully", async () => {
            const mockChain = createChainableMock({ data: null, error: null });
            mockSupabase.from.mockReturnValue(mockChain);

            const result = await aggregateKnowledgeBase("funnel-123", "offer-123");

            expect(result.success).toBe(true);
            expect(result.knowledge).toBeDefined();
        });

        it("returns error when aggregation fails", async () => {
            mockSupabase.from.mockImplementation(() => {
                throw new Error("Database connection failed");
            });

            const result = await aggregateKnowledgeBase("funnel-123", "offer-123");

            expect(result.success).toBe(false);
            expect(result.error).toContain("Database connection failed");
        });

        it("includes source metadata", async () => {
            const mockChain = createChainableMock({ data: null, error: null });
            mockSupabase.from.mockReturnValue(mockChain);

            const result = await aggregateKnowledgeBase("funnel-123", "offer-123");

            expect(result.success).toBe(true);
            expect(result.knowledge?.sources).toBeDefined();
            expect(result.knowledge?.sources).toHaveProperty("intake_count");
            expect(result.knowledge?.sources).toHaveProperty("has_offer");
            expect(result.knowledge?.sources).toHaveProperty("has_deck");
            expect(result.knowledge?.sources).toHaveProperty("has_enrollment");
        });
    });

    describe("updateAgentKnowledge", () => {
        it("updates agent config with aggregated knowledge", async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === "followup_agent_configs") {
                    return createChainableMock({ data: null, error: null });
                }
                return createChainableMock({ data: null, error: null });
            });

            const result = await updateAgentKnowledge(
                "agent-123",
                "funnel-123",
                "offer-123"
            );

            expect(result.success).toBe(true);
            expect(result.knowledge).toBeDefined();
        });

        it("returns error when update fails", async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === "followup_agent_configs") {
                    return createChainableMock({
                        data: null,
                        error: { message: "Update failed" },
                    });
                }
                return createChainableMock({ data: null, error: null });
            });

            const result = await updateAgentKnowledge(
                "agent-123",
                "funnel-123",
                "offer-123"
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Update failed");
        });
    });
});
