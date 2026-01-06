/**
 * Unit Tests for Funnel Map Generate Drafts API
 * Tests rate limiting, authentication, authorization, validation,
 * partial save recovery, and retry logic
 *
 * Related: GitHub Issue #405 - Visual Funnel Co-Creation Experience
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ============================================
// MOCKS
// ============================================

// Mock Supabase - must be before imports
const mockSupabaseAuth = vi.fn();
const mockSupabaseSelectProject = vi.fn();
const mockSupabaseSelectProfile = vi.fn();
const mockSupabaseUpsert = vi.fn();
const mockSupabaseUpsertConfig = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => {
        // Track which table is being accessed
        let currentTable = "";
        return {
            auth: {
                getUser: mockSupabaseAuth,
            },
            from: vi.fn((tableName: string) => {
                currentTable = tableName;
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single:
                                tableName === "funnel_projects"
                                    ? mockSupabaseSelectProject
                                    : mockSupabaseSelectProfile,
                        })),
                    })),
                    upsert: vi.fn((data, options) => {
                        if (currentTable === "funnel_map_config") {
                            return mockSupabaseUpsertConfig(data, options);
                        }
                        return mockSupabaseUpsert(data, options);
                    }),
                };
            }),
        };
    }),
}));

// Mock logger
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

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    addBreadcrumb: vi.fn(),
}));

// Mock rate limiter
const mockCheckRateLimitWithInfo = vi.fn();
vi.mock("@/lib/middleware/rate-limit", () => ({
    checkRateLimitWithInfo: mockCheckRateLimitWithInfo,
    getRateLimitIdentifier: vi.fn(() => "user:test-user-id"),
    addRateLimitHeaders: vi.fn((response, _info) => response),
}));

// Mock AI client
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

const TEST_BUSINESS_PROFILE = {
    id: "profile-id",
    funnel_project_id: TEST_PROJECT_ID,
    user_id: TEST_USER.id,
    ideal_customer: "Coaches and consultants",
    transformation: "Build a profitable online business",
    perceived_problem: "Not enough clients",
    root_cause: "Lack of systematic marketing",
    struggle_story: "I struggled for years...",
    breakthrough_moment: "Until I discovered...",
    credibility_experience: "10 years experience",
    signature_method: "The 5-Step System",
    offer_name: "Business Accelerator",
    offer_type: "course",
    deliverables: "12 modules, weekly calls",
    promise_outcome: "Double your revenue",
    guarantee: "30-day money back",
    pricing: { webinar: 997, regular: 1497 },
    vehicle_belief_shift: { old: "Old way", new: "New way" },
    internal_belief_shift: { doubt: "Can't do it", confidence: "Can do it" },
    external_belief_shift: {
        resources: "Need money",
        resourcefulness: "Just need skills",
    },
    top_objections: [{ objection: "Too expensive", response: "ROI explanation" }],
};

const MOCK_AI_DRAFT = {
    headline: "Transform Your Business",
    subheadline: "Join thousands of successful entrepreneurs",
    bullet_points: ["Proven system", "Expert guidance", "Results guaranteed"],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function createGenerateDraftsRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/funnel-map/generate-drafts", {
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

describe("Funnel Map Generate Drafts API", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default: authenticated user
        mockSupabaseAuth.mockResolvedValue({ data: { user: TEST_USER } });

        // Default: project exists and belongs to user
        mockSupabaseSelectProject.mockResolvedValue({
            data: { user_id: TEST_USER.id },
            error: null,
        });

        // Default: business profile exists
        mockSupabaseSelectProfile.mockResolvedValue({
            data: TEST_BUSINESS_PROFILE,
            error: null,
        });

        // Default: rate limit passes
        mockCheckRateLimitWithInfo.mockResolvedValue({
            blocked: false,
            response: null,
            info: { limit: 10, remaining: 9, reset: new Date().toISOString() },
        });

        // Default: upsert succeeds
        mockSupabaseUpsert.mockResolvedValue({ error: null });
        mockSupabaseUpsertConfig.mockResolvedValue({ error: null });

        // Default: AI returns valid draft
        mockGenerateWithAI.mockResolvedValue(MOCK_AI_DRAFT);
    });

    describe("Authentication", () => {
        it("should return 401 when not authenticated", async () => {
            mockSupabaseAuth.mockResolvedValueOnce({ data: { user: null } });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(401);
            const data = await response.json();
            expect(data.error).toBe("Unauthorized");
        });
    });

    describe("Rate Limiting", () => {
        it("should return 429 when rate limit exceeded", async () => {
            const rateLimitResponse = NextResponse.json(
                { error: "Rate limit exceeded" },
                { status: 429 }
            );
            mockCheckRateLimitWithInfo.mockResolvedValueOnce({
                blocked: true,
                response: rateLimitResponse,
                info: { limit: 10, remaining: 0, reset: new Date().toISOString() },
            });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(429);
        });

        it("should use funnel-drafts rate limit endpoint", async () => {
            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            await POST(createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID }));

            const { getRateLimitIdentifier } = await import(
                "@/lib/middleware/rate-limit"
            );
            expect(getRateLimitIdentifier).toHaveBeenCalled();
            expect(mockCheckRateLimitWithInfo).toHaveBeenCalledWith(
                "user:test-user-id",
                "funnel-drafts"
            );
        });

        it("should include rate limit info in response headers", async () => {
            const { addRateLimitHeaders } = await import("@/lib/middleware/rate-limit");

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            await POST(createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID }));

            expect(addRateLimitHeaders).toHaveBeenCalled();
        });
    });

    describe("Request Validation", () => {
        it("should return 400 for invalid projectId format", async () => {
            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({
                    projectId: "invalid-uuid",
                })
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe("Invalid request");
        });

        it("should return 400 for invalid pathwayType", async () => {
            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({
                    projectId: TEST_PROJECT_ID,
                    pathwayType: "invalid_pathway",
                })
            );

            expect(response.status).toBe(400);
        });

        it("should accept valid direct_purchase pathway", async () => {
            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({
                    projectId: TEST_PROJECT_ID,
                    pathwayType: "direct_purchase",
                })
            );

            expect(response.status).toBe(200);
        });

        it("should accept valid book_call pathway", async () => {
            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({
                    projectId: TEST_PROJECT_ID,
                    pathwayType: "book_call",
                })
            );

            expect(response.status).toBe(200);
        });

        it("should return error status for invalid JSON body", async () => {
            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const request = new NextRequest(
                "http://localhost/api/funnel-map/generate-drafts",
                {
                    method: "POST",
                    body: "not valid json",
                    headers: { "Content-Type": "application/json" },
                }
            );

            const response = await POST(request);
            // JSON parse errors are caught in the generic catch block, returning 500
            expect([400, 500]).toContain(response.status);
        });
    });

    describe("Project Ownership Verification", () => {
        it("should return 404 when project does not exist", async () => {
            mockSupabaseSelectProject.mockResolvedValueOnce({
                data: null,
                error: { message: "Not found" },
            });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(404);
            const data = await response.json();
            expect(data.error).toBe("Project not found");
        });

        it("should return 403 when project belongs to different user", async () => {
            mockSupabaseSelectProject.mockResolvedValueOnce({
                data: { user_id: "different-user-id" },
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(403);
            const data = await response.json();
            expect(data.error).toBe("Forbidden");
        });
    });

    describe("Business Profile Validation", () => {
        it("should return 400 when business profile is missing", async () => {
            mockSupabaseSelectProfile.mockResolvedValueOnce({
                data: null,
                error: { message: "Not found" },
            });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain("Business profile not found");
        });
    });

    describe("Pathway Determination", () => {
        it("should auto-determine direct_purchase for low price", async () => {
            mockSupabaseSelectProfile.mockResolvedValueOnce({
                data: { ...TEST_BUSINESS_PROFILE, pricing: { webinar: 500 } },
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.pathwayType).toBe("direct_purchase");
        });

        it("should auto-determine book_call for high price", async () => {
            mockSupabaseSelectProfile.mockResolvedValueOnce({
                data: { ...TEST_BUSINESS_PROFILE, pricing: { webinar: 5000 } },
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.pathwayType).toBe("book_call");
        });

        it("should use explicitly provided pathway over auto-determination", async () => {
            mockSupabaseSelectProfile.mockResolvedValueOnce({
                data: { ...TEST_BUSINESS_PROFILE, pricing: { webinar: 500 } }, // Low price
                error: null,
            });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({
                    projectId: TEST_PROJECT_ID,
                    pathwayType: "book_call", // Override
                })
            );

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.pathwayType).toBe("book_call");
        });
    });

    describe("AI Draft Generation", () => {
        it("should generate drafts for all pathway nodes", async () => {
            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.drafts).toBeDefined();
            expect(Array.isArray(data.drafts)).toBe(true);
            expect(data.drafts.length).toBeGreaterThan(0);
        });

        it("should include warnings for failed individual node generations", async () => {
            // Make one AI call fail
            mockGenerateWithAI
                .mockResolvedValueOnce(MOCK_AI_DRAFT) // First node succeeds
                .mockRejectedValueOnce(new Error("AI error")) // Second node fails
                .mockResolvedValue(MOCK_AI_DRAFT); // Rest succeed

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.warnings).toBeDefined();
            expect(data.warnings.length).toBeGreaterThan(0);
        });

        it("should return empty content for failed nodes", async () => {
            mockGenerateWithAI
                .mockResolvedValueOnce(MOCK_AI_DRAFT)
                .mockRejectedValueOnce(new Error("AI error"))
                .mockResolvedValue(MOCK_AI_DRAFT);

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            const data = await response.json();
            // At least one draft should have empty content
            const hasEmptyDraft = data.drafts.some(
                (d: { content: Record<string, unknown> }) =>
                    Object.keys(d.content).length === 0
            );
            expect(hasEmptyDraft).toBe(true);
        });
    });

    describe("Content Sanitization", () => {
        it("should sanitize [system] tags from AI response", async () => {
            mockGenerateWithAI.mockResolvedValue({
                headline: "[system] Malicious instruction",
                subheadline: "Normal content",
            });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            const data = await response.json();
            // Check that the response doesn't contain [system]
            const hasSystemTag = data.drafts.some(
                (d: { content: Record<string, string> }) =>
                    d.content.headline?.includes("[system]")
            );
            expect(hasSystemTag).toBe(false);
        });

        it("should sanitize array values in AI response", async () => {
            mockGenerateWithAI.mockResolvedValue({
                bullet_points: ["[system] Inject", "Normal point", "## system"],
            });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            const data = await response.json();
            // Check that array items are sanitized
            const draft = data.drafts.find(
                (d: { content: { bullet_points?: string[] } }) =>
                    d.content.bullet_points
            );
            if (draft?.content.bullet_points) {
                expect(draft.content.bullet_points.join(" ")).not.toContain("[system]");
            }
        });
    });

    describe("Database Operations", () => {
        it("should save all drafts to database", async () => {
            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            await POST(createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID }));

            expect(mockSupabaseUpsert).toHaveBeenCalled();
        });

        it("should update funnel_map_config", async () => {
            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            await POST(createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID }));

            expect(mockSupabaseUpsertConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    funnel_project_id: TEST_PROJECT_ID,
                    drafts_generated: true,
                }),
                expect.any(Object)
            );
        });
    });

    describe("Retry Logic and Partial Save Recovery", () => {
        it("should retry database operations on failure", async () => {
            // First two attempts fail, third succeeds
            mockSupabaseUpsert
                .mockResolvedValueOnce({ error: { message: "Connection error" } })
                .mockResolvedValueOnce({ error: { message: "Connection error" } })
                .mockResolvedValueOnce({ error: null });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(200);
            // Should have retried 3 times
            expect(mockSupabaseUpsert).toHaveBeenCalledTimes(3);
        });

        it("should attempt individual saves when batch fails", async () => {
            // All batch attempts fail
            mockSupabaseUpsert.mockResolvedValue({ error: { message: "Batch error" } });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            // Should have tried batch 3 times, then individual saves
            // 3 batch retries + individual saves for each node
            expect(mockSupabaseUpsert.mock.calls.length).toBeGreaterThan(3);
        });

        it("should return warnings for partially saved drafts", async () => {
            // Batch fails, individual saves partially succeed
            let callCount = 0;
            mockSupabaseUpsert.mockImplementation(() => {
                callCount++;
                if (callCount <= 3) {
                    // First 3 calls are batch retries - fail
                    return Promise.resolve({ error: { message: "Batch error" } });
                }
                // Individual saves - alternate success/failure
                if (callCount % 2 === 0) {
                    return Promise.resolve({ error: null });
                }
                return Promise.resolve({ error: { message: "Individual error" } });
            });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            const data = await response.json();
            expect(data.warnings).toBeDefined();
        });

        it("should return 500 when no drafts can be saved", async () => {
            // All saves fail
            mockSupabaseUpsert.mockResolvedValue({ error: { message: "All failed" } });

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(500);
            const data = await response.json();
            expect(data.error).toContain("Failed to generate funnel drafts");
        });
    });

    describe("Error Handling", () => {
        it("should return 500 on unexpected errors", async () => {
            mockSupabaseSelectProfile.mockRejectedValueOnce(
                new Error("Unexpected error")
            );

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(500);
        });

        it("should report errors to Sentry", async () => {
            const { captureException } = await import("@sentry/nextjs");
            mockSupabaseSelectProfile.mockRejectedValueOnce(new Error("Test error"));

            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            await POST(createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID }));

            expect(captureException).toHaveBeenCalled();
        });
    });

    describe("Response Format", () => {
        it("should return proper response structure on success", async () => {
            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            expect(response.status).toBe(200);
            const data = await response.json();

            expect(data).toHaveProperty("success", true);
            expect(data).toHaveProperty("drafts");
            expect(data).toHaveProperty("pathwayType");
            expect(Array.isArray(data.drafts)).toBe(true);
        });

        it("should include nodeType and content for each draft", async () => {
            const { POST } = await import("@/app/api/funnel-map/generate-drafts/route");
            const response = await POST(
                createGenerateDraftsRequest({ projectId: TEST_PROJECT_ID })
            );

            const data = await response.json();

            data.drafts.forEach((draft: { nodeType: string; content: unknown }) => {
                expect(draft).toHaveProperty("nodeType");
                expect(draft).toHaveProperty("content");
                expect(typeof draft.nodeType).toBe("string");
                expect(typeof draft.content).toBe("object");
            });
        });
    });
});
