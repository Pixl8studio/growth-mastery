/**
 * Unit Tests for Funnel Map Approve API
 * Tests authentication, validation, approval workflow, and race condition handling
 *
 * Related: GitHub Issue #407 - Explicit Approval Workflow
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ============================================
// MOCKS
// ============================================

const mockSupabaseAuth = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: mockSupabaseAuth,
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: mockSupabaseSelect,
                        })),
                    })),
                })),
            })),
        })),
        rpc: mockSupabaseRpc,
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

// ============================================
// TEST DATA
// ============================================

const TEST_USER = {
    id: "test-user-id",
    email: "test@example.com",
};

const TEST_PROJECT_ID = "123e4567-e89b-12d3-a456-426614174000";

const VALID_APPROVE_REQUEST = {
    projectId: TEST_PROJECT_ID,
    nodeType: "registration" as const,
};

const VALID_NODE_DATA = {
    id: "node-123",
    funnel_project_id: TEST_PROJECT_ID,
    node_type: "registration",
    user_id: TEST_USER.id,
    is_approved: false,
    approved_at: null,
    approved_content: {},
    draft_content: {
        headline: "Transform Your Business",
        subheadline: "Join our webinar",
    },
    refined_content: {},
    status: "draft",
};

const VALID_RPC_RESPONSE = {
    success: true,
    approved_at: new Date().toISOString(),
    approved_count: 1,
    total_count: 5,
    all_approved: false,
    error_message: null,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function createApproveRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/funnel-map/approve", {
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

describe("Funnel Map Approve API", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default: authenticated user
        mockSupabaseAuth.mockResolvedValue({ data: { user: TEST_USER } });

        // Default: node exists and belongs to user
        mockSupabaseSelect.mockResolvedValue({
            data: VALID_NODE_DATA,
            error: null,
        });

        // Default: rate limit passes
        mockCheckRateLimit.mockResolvedValue(null);

        // Default: RPC succeeds
        mockSupabaseRpc.mockResolvedValue({
            data: [VALID_RPC_RESPONSE],
            error: null,
        });
    });

    describe("Authentication", () => {
        it("should return 401 when not authenticated", async () => {
            mockSupabaseAuth.mockResolvedValueOnce({ data: { user: null } });

            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(createApproveRequest(VALID_APPROVE_REQUEST));

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

            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(createApproveRequest(VALID_APPROVE_REQUEST));

            expect(response.status).toBe(429);
        });
    });

    describe("Request Validation", () => {
        it("should return 400 for invalid projectId format", async () => {
            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(
                createApproveRequest({
                    ...VALID_APPROVE_REQUEST,
                    projectId: "invalid-uuid",
                })
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe("Invalid request");
        });

        it("should return 400 for invalid nodeType", async () => {
            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(
                createApproveRequest({
                    ...VALID_APPROVE_REQUEST,
                    nodeType: "invalid_node_type",
                })
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe("Invalid request");
        });

        it("should return 400 for missing nodeType", async () => {
            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(
                createApproveRequest({
                    projectId: TEST_PROJECT_ID,
                })
            );

            expect(response.status).toBe(400);
        });
    });

    describe("Node Validation", () => {
        it("should return 404 when node not found", async () => {
            mockSupabaseSelect.mockResolvedValueOnce({
                data: null,
                error: { message: "Not found" },
            });

            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(createApproveRequest(VALID_APPROVE_REQUEST));

            expect(response.status).toBe(404);
            const data = await response.json();
            expect(data.error).toBe("Node not found");
        });

        it("should return success for already approved node", async () => {
            mockSupabaseSelect.mockResolvedValueOnce({
                data: {
                    ...VALID_NODE_DATA,
                    is_approved: true,
                    approved_at: new Date().toISOString(),
                },
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(createApproveRequest(VALID_APPROVE_REQUEST));

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.message).toBe("Node already approved");
        });
    });

    describe("Content Validation", () => {
        it("should return 400 for incomplete content (empty required field)", async () => {
            mockSupabaseSelect.mockResolvedValueOnce({
                data: {
                    ...VALID_NODE_DATA,
                    draft_content: {
                        headline: "", // Empty required field
                        subheadline: "Valid content",
                    },
                },
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(createApproveRequest(VALID_APPROVE_REQUEST));

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe("Cannot approve incomplete content");
        });

        it("should return 400 for incomplete content (empty array)", async () => {
            mockSupabaseSelect.mockResolvedValueOnce({
                data: {
                    ...VALID_NODE_DATA,
                    node_type: "core_offer",
                    draft_content: {
                        promise: "Valid promise",
                        bonuses: [], // Empty array should fail validation
                    },
                },
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(
                createApproveRequest({
                    projectId: TEST_PROJECT_ID,
                    nodeType: "core_offer",
                })
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe("Cannot approve incomplete content");
        });
    });

    describe("Approval Success", () => {
        it("should approve node and return progress", async () => {
            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(createApproveRequest(VALID_APPROVE_REQUEST));

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.progress).toBeDefined();
            expect(data.progress.approved).toBe(1);
            expect(data.progress.total).toBe(5);
        });

        it("should call atomic RPC function", async () => {
            const { POST } = await import("@/app/api/funnel-map/approve/route");
            await POST(createApproveRequest(VALID_APPROVE_REQUEST));

            expect(mockSupabaseRpc).toHaveBeenCalledWith(
                "approve_funnel_node",
                expect.objectContaining({
                    p_project_id: TEST_PROJECT_ID,
                    p_node_type: "registration",
                    p_user_id: TEST_USER.id,
                })
            );
        });

        it("should prefer refined_content over draft_content", async () => {
            mockSupabaseSelect.mockResolvedValueOnce({
                data: {
                    ...VALID_NODE_DATA,
                    refined_content: {
                        headline: "Refined Headline",
                        subheadline: "Refined Subheadline",
                    },
                },
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/approve/route");
            await POST(createApproveRequest(VALID_APPROVE_REQUEST));

            expect(mockSupabaseRpc).toHaveBeenCalledWith(
                "approve_funnel_node",
                expect.objectContaining({
                    p_content_to_approve: expect.objectContaining({
                        headline: "Refined Headline",
                    }),
                })
            );
        });
    });

    describe("Error Handling", () => {
        it("should return 500 on RPC failure", async () => {
            mockSupabaseRpc.mockResolvedValueOnce({
                data: null,
                error: { message: "Database error" },
            });

            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(createApproveRequest(VALID_APPROVE_REQUEST));

            expect(response.status).toBe(500);
        });

        it("should return 500 when RPC returns failure", async () => {
            mockSupabaseRpc.mockResolvedValueOnce({
                data: [{ success: false, error_message: "Node not found" }],
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(createApproveRequest(VALID_APPROVE_REQUEST));

            expect(response.status).toBe(500);
        });

        it("should report errors to Sentry", async () => {
            const { captureException } = await import("@sentry/nextjs");
            mockSupabaseRpc.mockResolvedValueOnce({
                data: null,
                error: { message: "Test error" },
            });

            const { POST } = await import("@/app/api/funnel-map/approve/route");
            await POST(createApproveRequest(VALID_APPROVE_REQUEST));

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
            mockSupabaseSelect.mockResolvedValueOnce({
                data: {
                    ...VALID_NODE_DATA,
                    node_type: nodeType,
                },
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/approve/route");
            const response = await POST(
                createApproveRequest({
                    projectId: TEST_PROJECT_ID,
                    nodeType,
                })
            );

            expect(response.status).toBe(200);
        });
    });
});
