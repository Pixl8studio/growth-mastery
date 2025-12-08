/**
 * Integration Tests for Optimization API
 * Tests POST /api/ads/optimize and GET /api/ads/optimize
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/ads/optimize/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock("@/lib/ads/optimization-engine", () => ({
    optimizeAllCampaigns: vi.fn(),
    optimizeCampaign: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { optimizeCampaign } from "@/lib/ads/optimization-engine";

describe("POST /api/ads/optimize", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should run optimization analysis", async () => {
        const mockOptimizations = [
            {
                action: "pause_underperformer",
                reason: "CPL $11.00 is >2x industry average $5.00",
                variantId: "variant-1",
                briefId: "brief-123",
            },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(optimizeCampaign).mockResolvedValue(mockOptimizations);

        const request = createMockRequest({
            method: "POST",
            body: {
                campaign_id: "550e8400-e29b-41d4-a716-446655440000",
                autopilot: false,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            success: boolean;
            optimizations: Array<{ action: string }>;
            autopilot: boolean;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.optimizations).toHaveLength(1);
        expect(data.autopilot).toBe(false);
        expect(data.optimizations[0].action).toBe("pause_underperformer");
    });

    it("should return 401 for unauthenticated users", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "Unauthorized" },
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                autopilot: false,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should optimize with autopilot enabled", async () => {
        const mockOptimizations = [
            {
                action: "pause_underperformer",
                reason: "CPL too high",
                variantId: "variant-1",
                briefId: "brief-123",
            },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(optimizeCampaign).mockResolvedValue(mockOptimizations);

        const request = createMockRequest({
            method: "POST",
            body: {
                campaign_id: "550e8400-e29b-41d4-a716-446655440000",
                autopilot: true,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ autopilot: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.autopilot).toBe(true);
        expect(optimizeCampaign).toHaveBeenCalledWith(
            "550e8400-e29b-41d4-a716-446655440000",
            mockUser.id,
            true
        );
    });

    it("should optimize with autopilot disabled", async () => {
        const mockOptimizations = [
            {
                action: "scale_winner",
                reason: "CPL is great",
                variantId: "variant-2",
                briefId: "brief-123",
            },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(optimizeCampaign).mockResolvedValue(mockOptimizations);

        const request = createMockRequest({
            method: "POST",
            body: {
                campaign_id: "550e8400-e29b-41d4-a716-446655440000",
                autopilot: false,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ autopilot: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.autopilot).toBe(false);
        expect(optimizeCampaign).toHaveBeenCalledWith(
            "550e8400-e29b-41d4-a716-446655440000",
            mockUser.id,
            false
        );
    });

    it("should handle Zod validation for request body", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                campaign_id: "not-a-uuid",
                autopilot: false,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
    });

    it("should optimize all campaigns when campaign_id not provided", async () => {
        const mockBriefs = [{ id: "brief-1" }, { id: "brief-2" }];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_content_briefs") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        // Mock the eq chain properly
        mockSupabase.from("marketing_content_briefs").eq = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                    data: mockBriefs,
                    error: null,
                }),
            }),
        });

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(optimizeCampaign)
            .mockResolvedValueOnce([
                {
                    action: "pause_underperformer",
                    reason: "Test 1",
                    briefId: "brief-1",
                },
            ])
            .mockResolvedValueOnce([
                {
                    action: "scale_winner",
                    reason: "Test 2",
                    briefId: "brief-2",
                },
            ]);

        const request = createMockRequest({
            method: "POST",
            body: {
                autopilot: false,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            optimizations: unknown[];
        }>(response);

        expect(response.status).toBe(200);
        expect(data.optimizations).toHaveLength(2);
    });

    it("should optimize single campaign when campaign_id provided", async () => {
        const mockOptimizations = [
            {
                action: "creative_refresh",
                reason: "CTR is low",
                variantId: "variant-1",
                briefId: "brief-123",
            },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(optimizeCampaign).mockResolvedValue(mockOptimizations);

        const request = createMockRequest({
            method: "POST",
            body: {
                campaign_id: "550e8400-e29b-41d4-a716-446655440000",
                autopilot: false,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            optimizations: unknown[];
        }>(response);

        expect(response.status).toBe(200);
        expect(data.optimizations).toHaveLength(1);
        expect(optimizeCampaign).toHaveBeenCalledTimes(1);
    });
});

describe("GET /api/ads/optimize", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fetch recommended optimizations", async () => {
        const mockOptimizations = [
            {
                id: "opt-1",
                user_id: mockUser.id,
                optimization_type: "pause_underperformer",
                status: "recommended",
                reason: "CPL too high",
            },
            {
                id: "opt-2",
                user_id: mockUser.id,
                optimization_type: "scale_winner",
                status: "recommended",
                reason: "CPL is excellent",
            },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_ad_optimizations") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: mockOptimizations,
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/optimize",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{
            success: boolean;
            optimizations: Array<{ status: string }>;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.optimizations).toHaveLength(2);
        expect(data.optimizations[0].status).toBe("recommended");
    });

    it("should return 401 for unauthenticated users", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "Unauthorized" },
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/optimize",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should filter by campaign_id when provided", async () => {
        const campaignId = "550e8400-e29b-41d4-a716-446655440000";

        const mockOptimizations = [
            {
                id: "opt-1",
                user_id: mockUser.id,
                content_brief_id: campaignId,
                optimization_type: "pause_underperformer",
                status: "recommended",
            },
        ];

        let queriedCampaignId: string | null = null;

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_ad_optimizations") {
                    const selectChain = {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockImplementation((field, value) => {
                            if (field === "content_brief_id") {
                                queriedCampaignId = value;
                            }
                            return selectChain;
                        }),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: mockOptimizations,
                            error: null,
                        }),
                    };
                    return selectChain;
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: `http://localhost:3000/api/ads/optimize?campaign_id=${campaignId}`,
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{
            optimizations: unknown[];
        }>(response);

        expect(response.status).toBe(200);
        expect(data.optimizations).toHaveLength(1);
        expect(queriedCampaignId).toBe(campaignId);
    });

    it("should return empty array when no optimizations exist", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_ad_optimizations") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: [],
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/optimize",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{
            success: boolean;
            optimizations: unknown[];
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.optimizations).toEqual([]);
    });
});
