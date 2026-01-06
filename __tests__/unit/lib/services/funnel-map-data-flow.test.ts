/**
 * Unit Tests for Funnel Map Data Flow Service
 * Tests data extraction, content selection, and downstream readiness checks
 *
 * Related: GitHub Issue #407 - Downstream Integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FunnelNodeData, FunnelNodeType } from "@/types/funnel-map";

// ============================================
// MOCKS
// ============================================

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi
                                .fn()
                                .mockResolvedValue({ data: null, error: null }),
                        })),
                        single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    })),
                })),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                        data: { id: "new-offer-id" },
                        error: null,
                    }),
                })),
            })),
        })),
    })),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        })),
    },
}));

vi.mock("@sentry/nextjs", () => ({
    captureException: vi.fn(),
}));

// ============================================
// TEST DATA
// ============================================

const TEST_PROJECT_ID = "123e4567-e89b-12d3-a456-426614174000";
const TEST_USER_ID = "test-user-id";

function createMockNode(
    nodeType: FunnelNodeType,
    overrides: Partial<FunnelNodeData> = {}
): FunnelNodeData {
    return {
        id: `node-${nodeType}`,
        funnel_project_id: TEST_PROJECT_ID,
        user_id: TEST_USER_ID,
        node_type: nodeType,
        draft_content: {},
        refined_content: {},
        approved_content: {},
        conversation_history: [],
        status: "draft",
        is_active: true,
        pathway_type: "direct_purchase",
        is_approved: false,
        approved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    } as FunnelNodeData;
}

function createContext(nodes: FunnelNodeData[]): {
    projectId: string;
    userId: string;
    nodeData: Map<FunnelNodeType, FunnelNodeData>;
} {
    const nodeData = new Map<FunnelNodeType, FunnelNodeData>();
    for (const node of nodes) {
        nodeData.set(node.node_type, node);
    }
    return { projectId: TEST_PROJECT_ID, userId: TEST_USER_ID, nodeData };
}

// ============================================
// TESTS
// ============================================

describe("Funnel Map Data Flow Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getApprovedContent", () => {
        it("should return null for unapproved node", async () => {
            const { getApprovedContent } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("registration", {
                    is_approved: false,
                    draft_content: { headline: "Test" },
                }),
            ]);

            const result = getApprovedContent(context, "registration");
            expect(result).toBeNull();
        });

        it("should return approved content for approved node", async () => {
            const { getApprovedContent } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("registration", {
                    is_approved: true,
                    approved_content: { headline: "Approved Headline" },
                }),
            ]);

            const result = getApprovedContent(context, "registration");
            expect(result).toEqual({ headline: "Approved Headline" });
        });

        it("should return null for non-existent node", async () => {
            const { getApprovedContent } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([]);

            const result = getApprovedContent(context, "registration");
            expect(result).toBeNull();
        });
    });

    describe("getNodeContent", () => {
        it("should prefer approved content when approved", async () => {
            const { getNodeContent } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("registration", {
                    is_approved: true,
                    approved_content: { headline: "Approved" },
                    refined_content: { headline: "Refined" },
                    draft_content: { headline: "Draft" },
                }),
            ]);

            const result = getNodeContent(context, "registration");
            expect(result).toEqual({ headline: "Approved" });
        });

        it("should fall back to refined content when not approved", async () => {
            const { getNodeContent } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("registration", {
                    is_approved: false,
                    refined_content: { headline: "Refined" },
                    draft_content: { headline: "Draft" },
                }),
            ]);

            const result = getNodeContent(context, "registration");
            expect(result).toEqual({ headline: "Refined" });
        });

        it("should fall back to draft content when no refined content", async () => {
            const { getNodeContent } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("registration", {
                    is_approved: false,
                    refined_content: {},
                    draft_content: { headline: "Draft" },
                }),
            ]);

            const result = getNodeContent(context, "registration");
            expect(result).toEqual({ headline: "Draft" });
        });

        it("should return null for non-existent node", async () => {
            const { getNodeContent } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([]);

            const result = getNodeContent(context, "registration");
            expect(result).toBeNull();
        });
    });

    describe("extractRegistrationPageData", () => {
        it("should extract all registration fields correctly", async () => {
            const { extractRegistrationPageData } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("registration", {
                    draft_content: {
                        headline: "Transform Your Business",
                        subheadline: "Join our exclusive webinar",
                        bullet_points: ["Point 1", "Point 2", "Point 3"],
                        cta_text: "Register Now",
                        access_type: "live",
                        event_datetime: "2024-01-15T18:00:00Z",
                        social_proof: "5000+ students enrolled",
                    },
                }),
            ]);

            const result = extractRegistrationPageData(context);

            expect(result.headline).toBe("Transform Your Business");
            expect(result.subheadline).toBe("Join our exclusive webinar");
            expect(result.bulletPoints).toEqual(["Point 1", "Point 2", "Point 3"]);
            expect(result.ctaText).toBe("Register Now");
            expect(result.accessType).toBe("live");
            expect(result.eventDatetime).toBe("2024-01-15T18:00:00Z");
            expect(result.socialProof).toBe("5000+ students enrolled");
        });

        it("should return defaults for missing content", async () => {
            const { extractRegistrationPageData } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([createMockNode("registration")]);

            const result = extractRegistrationPageData(context);

            expect(result.headline).toBeNull();
            expect(result.bulletPoints).toEqual([]);
        });
    });

    describe("extractMasterclassData", () => {
        it("should extract all masterclass fields correctly", async () => {
            const { extractMasterclassData } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("masterclass", {
                    draft_content: {
                        title: "Master Class Title",
                        promise: "Transform your skills",
                        hook: "What if you could...",
                        origin_story: "My journey started...",
                        content_pillars: ["Pillar 1", "Pillar 2"],
                        poll_questions: ["Question 1?", "Question 2?"],
                        belief_shifts: "Change your mindset",
                        transition_to_offer: "And that's why...",
                        offer_messaging: "Here's what you get",
                    },
                }),
            ]);

            const result = extractMasterclassData(context);

            expect(result.title).toBe("Master Class Title");
            expect(result.promise).toBe("Transform your skills");
            expect(result.contentPillars).toEqual(["Pillar 1", "Pillar 2"]);
            expect(result.pollQuestions).toEqual(["Question 1?", "Question 2?"]);
        });
    });

    describe("extractCoreOfferData", () => {
        it("should extract 7 Ps framework correctly", async () => {
            const { extractCoreOfferData } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("core_offer", {
                    draft_content: {
                        promise: "10x your revenue",
                        person: "Entrepreneurs",
                        problem: "Scaling is hard",
                        product: "Ultimate Course",
                        process: "Step-by-step system",
                        proof: "1000+ success stories",
                        price: 997,
                        guarantee: "30-day money back",
                        urgency: "Limited spots",
                        bonuses: ["Bonus 1", "Bonus 2"],
                    },
                }),
            ]);

            const result = extractCoreOfferData(context);

            expect(result.promise).toBe("10x your revenue");
            expect(result.person).toBe("Entrepreneurs");
            expect(result.problem).toBe("Scaling is hard");
            expect(result.product).toBe("Ultimate Course");
            expect(result.process).toBe("Step-by-step system");
            expect(result.proof).toBe("1000+ success stories");
            expect(result.price).toBe(997);
            expect(result.guarantee).toBe("30-day money back");
            expect(result.urgency).toBe("Limited spots");
            expect(result.bonuses).toEqual(["Bonus 1", "Bonus 2"]);
        });

        it("should handle complex price object", async () => {
            const { extractCoreOfferData } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("core_offer", {
                    draft_content: {
                        price: { webinar: 497, regular: 997 },
                    },
                }),
            ]);

            const result = extractCoreOfferData(context);
            expect(result.price).toEqual({ webinar: 497, regular: 997 });
        });
    });

    describe("extractUpsellData", () => {
        it("should extract upsell 1 data correctly", async () => {
            const { extractUpsellData } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("upsell_1", {
                    draft_content: {
                        headline: "Wait! Special Offer",
                        promise: "Double your results",
                        price: 297,
                        time_limit: "24 hours",
                        is_downsell: "no",
                    },
                }),
            ]);

            const result = extractUpsellData(context, 1);

            expect(result.headline).toBe("Wait! Special Offer");
            expect(result.promise).toBe("Double your results");
            expect(result.price).toBe(297);
            expect(result.timeLimit).toBe("24 hours");
            expect(result.isDownsell).toBe(false);
        });

        it("should extract upsell 2 data correctly", async () => {
            const { extractUpsellData } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("upsell_2", {
                    draft_content: {
                        headline: "One More Thing",
                        is_downsell: "yes",
                    },
                }),
            ]);

            const result = extractUpsellData(context, 2);

            expect(result.headline).toBe("One More Thing");
            expect(result.isDownsell).toBe(true);
        });
    });

    describe("checkDownstreamReadiness", () => {
        it("should return ready when all required nodes are approved", async () => {
            const { checkDownstreamReadiness } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("registration", { is_approved: true }),
                createMockNode("masterclass", { is_approved: true }),
            ]);

            const result = checkDownstreamReadiness(context, [
                "registration",
                "masterclass",
            ]);

            expect(result.ready).toBe(true);
            expect(result.missingApprovals).toEqual([]);
        });

        it("should return not ready with missing approvals", async () => {
            const { checkDownstreamReadiness } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("registration", { is_approved: true }),
                createMockNode("masterclass", { is_approved: false }),
            ]);

            const result = checkDownstreamReadiness(context, [
                "registration",
                "masterclass",
            ]);

            expect(result.ready).toBe(false);
            expect(result.missingApprovals).toEqual(["masterclass"]);
        });

        it("should include non-existent nodes as missing", async () => {
            const { checkDownstreamReadiness } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const context = createContext([
                createMockNode("registration", { is_approved: true }),
            ]);

            const result = checkDownstreamReadiness(context, [
                "registration",
                "masterclass",
            ]);

            expect(result.ready).toBe(false);
            expect(result.missingApprovals).toContain("masterclass");
        });
    });

    describe("getRequiredNodesForStep", () => {
        it("should return correct nodes for brand_design", async () => {
            const { getRequiredNodesForStep } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const result = getRequiredNodesForStep("brand_design");
            expect(result).toEqual(["traffic_source", "registration", "masterclass"]);
        });

        it("should return correct nodes for deck_structure", async () => {
            const { getRequiredNodesForStep } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const result = getRequiredNodesForStep("deck_structure");
            expect(result).toEqual(["masterclass", "core_offer"]);
        });

        it("should return correct nodes for registration_page", async () => {
            const { getRequiredNodesForStep } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const result = getRequiredNodesForStep("registration_page");
            expect(result).toEqual(["registration"]);
        });

        it("should return correct nodes for enrollment_page", async () => {
            const { getRequiredNodesForStep } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const result = getRequiredNodesForStep("enrollment_page");
            expect(result).toEqual(["core_offer"]);
        });

        it("should return correct nodes for watch_page", async () => {
            const { getRequiredNodesForStep } = await import(
                "@/lib/services/funnel-map-data-flow"
            );

            const result = getRequiredNodesForStep("watch_page");
            expect(result).toEqual(["masterclass"]);
        });
    });
});

describe("extractPrice helper", () => {
    it("should extract number price", async () => {
        const { extractPrice } = await import("@/types/funnel-map");
        expect(extractPrice(997)).toBe(997);
    });

    it("should extract webinar price from object", async () => {
        const { extractPrice } = await import("@/types/funnel-map");
        expect(extractPrice({ webinar: 497, regular: 997 })).toBe(497);
    });

    it("should fall back to regular price", async () => {
        const { extractPrice } = await import("@/types/funnel-map");
        expect(extractPrice({ regular: 997 })).toBe(997);
    });

    it("should return null for null input", async () => {
        const { extractPrice } = await import("@/types/funnel-map");
        expect(extractPrice(null)).toBeNull();
    });

    it("should return null for undefined input", async () => {
        const { extractPrice } = await import("@/types/funnel-map");
        expect(extractPrice(undefined)).toBeNull();
    });

    it("should return null for string input", async () => {
        const { extractPrice } = await import("@/types/funnel-map");
        expect(extractPrice("997")).toBeNull();
    });

    it("should return null for empty object", async () => {
        const { extractPrice } = await import("@/types/funnel-map");
        expect(extractPrice({})).toBeNull();
    });

    it("should return null for NaN", async () => {
        const { extractPrice } = await import("@/types/funnel-map");
        expect(extractPrice(NaN)).toBeNull();
    });

    it("should handle object with non-numeric webinar", async () => {
        const { extractPrice } = await import("@/types/funnel-map");
        expect(extractPrice({ webinar: "not a number" })).toBeNull();
    });
});
