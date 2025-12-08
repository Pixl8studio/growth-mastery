/**
 * Integration Tests for Ad Variations Generation API
 * Tests POST /api/ads/variations/generate
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/ads/variations/generate/route";
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

vi.mock("@/lib/ads/ad-generator", () => ({
    generateAdVariations: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { generateAdVariations } from "@/lib/ads/ad-generator";

describe("POST /api/ads/variations/generate", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockProject = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        user_id: mockUser.id,
        name: "Test Funnel",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate 5 ad variations", async () => {
        const mockVariations = [
            {
                id: "var-1",
                variation_number: 1,
                framework: "plus_minus",
                primary_text: "Test ad 1",
                headline: "Headline 1",
                link_description: "Link 1",
                hooks: {
                    long: "Long hook",
                    short: "Short hook",
                    curiosity: "Curious hook",
                },
                call_to_action: "LEARN_MORE",
                selected: false,
            },
            {
                id: "var-2",
                variation_number: 2,
                framework: "6_part",
                primary_text: "Test ad 2",
                headline: "Headline 2",
                link_description: "Link 2",
                hooks: {
                    long: "Long hook",
                    short: "Short hook",
                    curiosity: "Curious hook",
                },
                call_to_action: "SIGN_UP",
                selected: false,
            },
            {
                id: "var-3",
                variation_number: 3,
                framework: "hormozi",
                primary_text: "Test ad 3",
                headline: "Headline 3",
                link_description: "Link 3",
                hooks: {
                    long: "Long hook",
                    short: "Short hook",
                    curiosity: "Curious hook",
                },
                call_to_action: "APPLY_NOW",
                selected: false,
            },
            {
                id: "var-4",
                variation_number: 4,
                framework: "social_proof",
                primary_text: "Test ad 4",
                headline: "Headline 4",
                link_description: "Link 4",
                hooks: {
                    long: "Long hook",
                    short: "Short hook",
                    curiosity: "Curious hook",
                },
                call_to_action: "LEARN_MORE",
                selected: false,
            },
            {
                id: "var-5",
                variation_number: 5,
                framework: "experiment",
                primary_text: "Test ad 5",
                headline: "Headline 5",
                link_description: "Link 5",
                hooks: {
                    long: "Long hook",
                    short: "Short hook",
                    curiosity: "Curious hook",
                },
                call_to_action: "LEARN_MORE",
                selected: false,
            },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockProject,
                            error: null,
                        }),
                    };
                }
                if (table === "funnel_offers") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                product_name: "Test Product",
                                tagline: "Test tagline",
                                promise: "Test promise",
                                price: 997,
                                currency: "USD",
                                guarantee: "30-day money back",
                            },
                            error: null,
                        }),
                    };
                }
                if (table === "intake_sessions") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    extracted_data: {
                                        target_audience: "business coaches",
                                        pain_points: ["low client flow", "burnout"],
                                        desired_outcome: "consistent high-ticket sales",
                                    },
                                },
                            ],
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_profiles") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                brand_voice: "professional and empowering",
                                tone_settings: {
                                    formality: 7,
                                    enthusiasm: 8,
                                },
                            },
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
        vi.mocked(generateAdVariations).mockResolvedValue(mockVariations);

        const request = createMockRequest({
            method: "POST",
            body: {
                funnel_project_id: mockProject.id,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            success: boolean;
            variations: Array<{ framework: string }>;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.variations).toHaveLength(5);
        expect(data.variations[0].framework).toBe("plus_minus");
        expect(data.variations[1].framework).toBe("6_part");
        expect(data.variations[2].framework).toBe("hormozi");
        expect(data.variations[3].framework).toBe("social_proof");
        expect(data.variations[4].framework).toBe("experiment");
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
                funnel_project_id: "550e8400-e29b-41d4-a716-446655440000",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 400 for invalid funnel_project_id", async () => {
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
                funnel_project_id: "not-a-uuid",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toContain("Invalid funnel project ID");
    });

    it("should return 401 when user doesn't own project", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
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
            method: "POST",
            body: {
                funnel_project_id: "550e8400-e29b-41d4-a716-446655440000",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to funnel project");
    });

    it("should use offer data to generate variations", async () => {
        const mockOffer = {
            product_name: "Elite Coaching Program",
            tagline: "Transform your business",
            promise: "10x your revenue in 90 days",
            price: 5000,
            currency: "USD",
            guarantee: "60-day money back",
        };

        let generationRequest: any = null;

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockProject,
                            error: null,
                        }),
                    };
                }
                if (table === "funnel_offers") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockOffer,
                            error: null,
                        }),
                    };
                }
                if (table === "intake_sessions") {
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
                if (table === "marketing_profiles") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
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
        vi.mocked(generateAdVariations).mockImplementation((req) => {
            generationRequest = req;
            return Promise.resolve([]);
        });

        const request = createMockRequest({
            method: "POST",
            body: {
                funnel_project_id: mockProject.id,
            },
        });

        await POST(request);

        expect(generationRequest).toBeTruthy();
        expect(generationRequest.offer_data.product_name).toBe(
            "Elite Coaching Program"
        );
        expect(generationRequest.offer_data.price).toBe(5000);
        expect(generationRequest.offer_data.currency).toBe("USD");
    });

    it("should use intake data for audience targeting", async () => {
        const mockIntakeData = {
            target_audience: "SaaS founders",
            pain_points: ["high churn rate", "low MRR"],
            desired_outcome: "predictable revenue growth",
        };

        let generationRequest: any = null;

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockProject,
                            error: null,
                        }),
                    };
                }
                if (table === "funnel_offers") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                product_name: "Test",
                                price: 100,
                                currency: "USD",
                            },
                            error: null,
                        }),
                    };
                }
                if (table === "intake_sessions") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    extracted_data: mockIntakeData,
                                },
                            ],
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_profiles") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
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
        vi.mocked(generateAdVariations).mockImplementation((req) => {
            generationRequest = req;
            return Promise.resolve([]);
        });

        const request = createMockRequest({
            method: "POST",
            body: {
                funnel_project_id: mockProject.id,
            },
        });

        await POST(request);

        expect(generationRequest.audience_data.target_audience).toBe("SaaS founders");
        expect(generationRequest.audience_data.pain_points).toEqual([
            "high churn rate",
            "low MRR",
        ]);
        expect(generationRequest.audience_data.desired_outcome).toBe(
            "predictable revenue growth"
        );
    });

    it("should use brand voice from marketing profile", async () => {
        const mockProfile = {
            brand_voice: "bold and confident",
            tone_settings: {
                formality: 5,
                enthusiasm: 9,
            },
        };

        let generationRequest: any = null;

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockProject,
                            error: null,
                        }),
                    };
                }
                if (table === "funnel_offers") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                product_name: "Test",
                                price: 100,
                                currency: "USD",
                            },
                            error: null,
                        }),
                    };
                }
                if (table === "intake_sessions") {
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
                if (table === "marketing_profiles") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockProfile,
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
        vi.mocked(generateAdVariations).mockImplementation((req) => {
            generationRequest = req;
            return Promise.resolve([]);
        });

        const request = createMockRequest({
            method: "POST",
            body: {
                funnel_project_id: mockProject.id,
            },
        });

        await POST(request);

        expect(generationRequest.brand_voice).toBe("bold and confident");
        expect(generationRequest.tone_settings).toEqual({
            formality: 5,
            enthusiasm: 9,
        });
    });

    it("should return all variation frameworks", async () => {
        const mockVariations = [
            { id: "1", variation_number: 1, framework: "plus_minus" },
            { id: "2", variation_number: 2, framework: "6_part" },
            { id: "3", variation_number: 3, framework: "hormozi" },
            { id: "4", variation_number: 4, framework: "social_proof" },
            { id: "5", variation_number: 5, framework: "experiment" },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockProject,
                            error: null,
                        }),
                    };
                }
                if (table === "funnel_offers") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                product_name: "Test",
                                price: 100,
                                currency: "USD",
                            },
                            error: null,
                        }),
                    };
                }
                if (table === "intake_sessions") {
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
                if (table === "marketing_profiles") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
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
        vi.mocked(generateAdVariations).mockResolvedValue(mockVariations as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                funnel_project_id: mockProject.id,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            variations: Array<{ framework: string }>;
        }>(response);

        const frameworks = data.variations.map((v: any) => v.framework);
        expect(frameworks).toContain("plus_minus");
        expect(frameworks).toContain("6_part");
        expect(frameworks).toContain("hormozi");
        expect(frameworks).toContain("social_proof");
        expect(frameworks).toContain("experiment");
    });
});
