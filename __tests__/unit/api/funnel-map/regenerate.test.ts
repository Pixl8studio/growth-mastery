/**
 * Unit Tests for Funnel Map Regenerate API
 * Tests authentication, validation, confirmation workflow, and AI regeneration
 *
 * Related: GitHub Issue #407 - Per-node Draft Regeneration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ============================================
// MOCKS
// ============================================

const mockSupabaseAuth = vi.fn();
const mockSupabaseSelectSingle = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseSelect = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: mockSupabaseAuth,
        },
        from: vi.fn((table: string) => {
            if (table === "funnel_node_data") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: mockSupabaseSelectSingle,
                                })),
                            })),
                        })),
                    })),
                    update: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => mockSupabaseUpdate()),
                            })),
                        })),
                    })),
                };
            }
            if (table === "business_profiles") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: mockSupabaseSelect,
                        })),
                    })),
                };
            }
            if (table === "funnel_map_config") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn().mockResolvedValue({
                                data: { pathway_type: "direct_purchase" },
                                error: null,
                            }),
                        })),
                    })),
                    update: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            eq: vi.fn(() =>
                                Promise.resolve({ data: null, error: null })
                            ),
                        })),
                    })),
                };
            }
            return {
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    })),
                })),
            };
        }),
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
    captureMessage: vi.fn(),
    addBreadcrumb: vi.fn(),
}));

const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/middleware/rate-limit", () => ({
    checkRateLimit: mockCheckRateLimit,
    getRateLimitIdentifier: vi.fn(() => "user:test-user-id"),
}));

const mockGenerateWithAI = vi.fn();
vi.mock("@/lib/ai/client", () => ({
    generateWithAI: mockGenerateWithAI,
}));

// ============================================
// TEST DATA
// ============================================

const TEST_USER = {
    id: "test-user-id",
    email: "test@example.com",
};

const TEST_PROJECT_ID = "123e4567-e89b-12d3-a456-426614174000";

const VALID_REGENERATE_REQUEST = {
    projectId: TEST_PROJECT_ID,
    nodeType: "registration" as const,
};

const VALID_NODE_DATA = {
    id: "node-123",
    is_approved: false,
    approved_at: null,
    approved_content: {},
    draft_content: {
        headline: "Old Headline",
    },
};

const VALID_BUSINESS_PROFILE = {
    business_name: "Test Business",
    ideal_customer: "Entrepreneurs",
    transformation: "10x revenue",
    offer_name: "Master Course",
};

const NEW_DRAFT_CONTENT = {
    headline: "Transform Your Business Today",
    subheadline: "Join thousands who have achieved success",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function createRegenerateRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/funnel-map/regenerate", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    });
}

// ============================================
// TESTS
// ============================================

describe("Funnel Map Regenerate API", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default: authenticated user
        mockSupabaseAuth.mockResolvedValue({ data: { user: TEST_USER } });

        // Default: node exists and is not approved
        mockSupabaseSelectSingle.mockResolvedValue({
            data: VALID_NODE_DATA,
            error: null,
        });

        // Default: business profile exists
        mockSupabaseSelect.mockResolvedValue({
            data: VALID_BUSINESS_PROFILE,
            error: null,
        });

        // Default: rate limit passes
        mockCheckRateLimit.mockResolvedValue(null);

        // Default: AI returns valid response
        mockGenerateWithAI.mockResolvedValue(NEW_DRAFT_CONTENT);

        // Default: update succeeds
        mockSupabaseUpdate.mockResolvedValue({ error: null });
    });

    describe("Authentication", () => {
        it("should return 401 when not authenticated", async () => {
            mockSupabaseAuth.mockResolvedValueOnce({ data: { user: null } });

            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest(VALID_REGENERATE_REQUEST)
            );

            expect(response.status).toBe(401);
            const data = await response.json();
            expect(data.error).toBe("Authentication required");
        });
    });

    describe("Rate Limiting", () => {
        it("should return 429 when rate limit exceeded", async () => {
            const rateLimitResponse = NextResponse.json(
                { error: "Rate limit exceeded" },
                { status: 429 }
            );
            mockCheckRateLimit.mockResolvedValueOnce(rateLimitResponse);

            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest(VALID_REGENERATE_REQUEST)
            );

            expect(response.status).toBe(429);
        });
    });

    describe("Request Validation", () => {
        it("should return 400 for invalid projectId format", async () => {
            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest({
                    ...VALID_REGENERATE_REQUEST,
                    projectId: "invalid-uuid",
                })
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe("Invalid request");
        });

        it("should return 400 for invalid nodeType", async () => {
            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest({
                    ...VALID_REGENERATE_REQUEST,
                    nodeType: "invalid_node_type",
                })
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe("Invalid request");
        });
    });

    describe("Node Existence Validation", () => {
        it("should return 404 when node not found", async () => {
            mockSupabaseSelectSingle.mockResolvedValueOnce({
                data: null,
                error: { message: "Not found" },
            });

            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest(VALID_REGENERATE_REQUEST)
            );

            expect(response.status).toBe(404);
            const data = await response.json();
            expect(data.error).toBe("Node not found");
            expect(data.hint).toContain("must exist before");
        });
    });

    describe("Approved Content Confirmation", () => {
        it("should return 409 when node is approved without confirmation", async () => {
            mockSupabaseSelectSingle.mockResolvedValueOnce({
                data: {
                    ...VALID_NODE_DATA,
                    is_approved: true,
                    approved_at: new Date().toISOString(),
                    approved_content: { headline: "Approved content" },
                },
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest(VALID_REGENERATE_REQUEST)
            );

            expect(response.status).toBe(409);
            const data = await response.json();
            expect(data.error).toBe("Node is already approved");
            expect(data.requiresConfirmation).toBe(true);
            expect(data.message).toContain("confirmOverwrite: true");
        });

        it("should allow regeneration of approved content with confirmation", async () => {
            mockSupabaseSelectSingle.mockResolvedValueOnce({
                data: {
                    ...VALID_NODE_DATA,
                    is_approved: true,
                    approved_at: new Date().toISOString(),
                    approved_content: { headline: "Approved content" },
                },
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest({
                    ...VALID_REGENERATE_REQUEST,
                    confirmOverwrite: true,
                })
            );

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.overwroteApproved).toBe(true);
        });
    });

    describe("Business Profile Validation", () => {
        it("should return 400 when business profile not found", async () => {
            mockSupabaseSelect.mockResolvedValueOnce({
                data: null,
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest(VALID_REGENERATE_REQUEST)
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe("Business profile not found");
            expect(data.hint).toContain("Complete Step 1");
        });
    });

    describe("Regeneration Success", () => {
        it("should regenerate node and return new content", async () => {
            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest(VALID_REGENERATE_REQUEST)
            );

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.nodeType).toBe("registration");
            expect(data.draftContent).toEqual(NEW_DRAFT_CONTENT);
            expect(data.overwroteApproved).toBe(false);
        });

        it("should call AI with correct context", async () => {
            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            await POST(createRegenerateRequest(VALID_REGENERATE_REQUEST));

            expect(mockGenerateWithAI).toHaveBeenCalled();
            const aiCall = mockGenerateWithAI.mock.calls[0];
            const messages = aiCall[0];

            // Should have system and user messages
            expect(messages.length).toBe(2);
            expect(messages[0].role).toBe("system");
            expect(messages[1].role).toBe("user");

            // System message should contain business context
            expect(messages[0].content).toContain("Test Business");
        });
    });

    describe("Error Handling", () => {
        it("should return 500 on update failure", async () => {
            mockSupabaseUpdate.mockResolvedValueOnce({
                error: { message: "Database error" },
            });

            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest(VALID_REGENERATE_REQUEST)
            );

            expect(response.status).toBe(500);
            const data = await response.json();
            expect(data.error).toBe("Failed to save regenerated draft");
        });

        it("should return 500 on AI failure", async () => {
            mockGenerateWithAI.mockRejectedValueOnce(new Error("AI unavailable"));

            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest(VALID_REGENERATE_REQUEST)
            );

            expect(response.status).toBe(500);
        });

        it("should report errors to Sentry", async () => {
            const { captureException } = await import("@sentry/nextjs");
            mockSupabaseUpdate.mockResolvedValueOnce({
                error: { message: "Test error" },
            });

            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            await POST(createRegenerateRequest(VALID_REGENERATE_REQUEST));

            expect(captureException).toHaveBeenCalled();
        });
    });

    describe("All Valid Node Types", () => {
        const validNodeTypes = [
            "traffic_source",
            "registration",
            "registration_confirmation",
            "masterclass",
            "core_offer",
            "checkout",
            "upsells",
            "upsell_1",
            "upsell_2",
            "order_bump",
            "call_booking",
            "call_booking_confirmation",
            "sales_call",
            "thank_you",
        ];

        it.each(validNodeTypes)("should accept nodeType: %s", async (nodeType) => {
            const { POST } = await import("@/app/api/funnel-map/regenerate/route");
            const response = await POST(
                createRegenerateRequest({
                    projectId: TEST_PROJECT_ID,
                    nodeType,
                })
            );

            expect(response.status).toBe(200);
        });
    });
});
