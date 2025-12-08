/**
 * Integration Tests for Campaign Creation API
 * Tests POST /api/ads/campaigns/create
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/ads/campaigns/create/route";
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

vi.mock("@/lib/integrations/meta-ads", () => ({
    createCampaign: vi.fn(),
    createAdSet: vi.fn(),
    createLeadAdCreative: vi.fn(),
    createAd: vi.fn(),
}));

vi.mock("@/lib/crypto/token-encryption", () => ({
    decryptToken: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createCampaign, createAdSet } from "@/lib/integrations/meta-ads";
import { decryptToken } from "@/lib/crypto/token-encryption";

describe("POST /api/ads/campaigns/create", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockProject = {
        id: "project-123",
        user_id: "user-123",
        name: "Test Funnel",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should create campaign with valid data", async () => {
        const validRequest = {
            funnel_project_id: "550e8400-e29b-41d4-a716-446655440000",
            ad_account_id: "act_123456789",
            variations: [
                {
                    id: "var-1",
                    variation_number: 1,
                    framework: "plus_minus",
                    primary_text: "Test ad copy",
                    headline: "Test Headline",
                    link_description: "Test link",
                    hooks: {
                        long: "Long hook",
                        short: "Short hook",
                        curiosity: "Curiosity hook",
                    },
                    call_to_action: "LEARN_MORE",
                    selected: false,
                },
            ],
            audience_config: {
                type: "interest",
                targeting: {
                    geo_locations: {
                        countries: ["US"],
                    },
                },
            },
            daily_budget_cents: 5000,
        };

        const mockBrief = {
            id: "brief-123",
            user_id: mockUser.id,
            meta_campaign_id: "campaign-123",
            meta_adset_id: "adset-123",
        };

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
                if (table === "marketing_oauth_connections") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                access_token_encrypted: "encrypted-token",
                            },
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_content_briefs") {
                    return {
                        insert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockBrief,
                            error: null,
                        }),
                        update: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: null,
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        insert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "variant-123",
                                content_brief_id: mockBrief.id,
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
        vi.mocked(decryptToken).mockResolvedValue("decrypted-token");
        vi.mocked(createCampaign).mockResolvedValue({
            id: "campaign-123",
            name: "Test Campaign",
        } as any);
        vi.mocked(createAdSet).mockResolvedValue({
            id: "adset-123",
            name: "Test Ad Set",
        } as any);

        const request = createMockRequest({
            method: "POST",
            body: validRequest,
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            success: boolean;
            campaign: {
                meta_campaign_id: string;
                meta_adset_id: string;
                ads_created: number;
            };
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.campaign).toBeDefined();
        expect(data.campaign.meta_campaign_id).toBe("campaign-123");
        expect(data.campaign.meta_adset_id).toBe("adset-123");
        expect(data.campaign.ads_created).toBe(1);
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
                ad_account_id: "act_123",
                variations: [],
                daily_budget_cents: 5000,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 400 for invalid validation (missing fields)", async () => {
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
                // Missing required fields
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
    });

    it("should return 400 for budget exceeding limits", async () => {
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
                funnel_project_id: "550e8400-e29b-41d4-a716-446655440000",
                ad_account_id: "act_123",
                variations: [
                    {
                        id: "var-1",
                        variation_number: 1,
                        framework: "test",
                        primary_text: "Test",
                        headline: "Test",
                        link_description: "Test",
                        hooks: {
                            long: "Long",
                            short: "Short",
                            curiosity: "Curious",
                        },
                        call_to_action: "LEARN_MORE",
                        selected: false,
                    },
                ],
                audience_config: {
                    type: "interest",
                    targeting: {
                        geo_locations: {
                            countries: ["US"],
                        },
                    },
                },
                daily_budget_cents: 1500000, // Exceeds $10,000 limit
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toContain("Daily budget cannot exceed");
    });

    it("should return 401 for project not owned by user", async () => {
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
                ad_account_id: "act_123",
                variations: [
                    {
                        id: "var-1",
                        variation_number: 1,
                        framework: "test",
                        primary_text: "Test",
                        headline: "Test",
                        link_description: "Test",
                        hooks: {
                            long: "Long",
                            short: "Short",
                            curiosity: "Curious",
                        },
                        call_to_action: "LEARN_MORE",
                        selected: false,
                    },
                ],
                audience_config: {
                    type: "interest",
                    targeting: {
                        geo_locations: {
                            countries: ["US"],
                        },
                    },
                },
                daily_budget_cents: 5000,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Access denied to funnel project");
    });

    it("should create brief, Meta campaign, ad set, and variants", async () => {
        let briefInserted = false;
        let briefUpdated = false;
        let variantsCreated = 0;

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
                if (table === "marketing_oauth_connections") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                access_token_encrypted: "encrypted-token",
                            },
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_content_briefs") {
                    return {
                        insert: vi.fn().mockImplementation(() => {
                            briefInserted = true;
                            return {
                                select: vi.fn().mockReturnThis(),
                                single: vi.fn().mockResolvedValue({
                                    data: {
                                        id: "brief-123",
                                        user_id: mockUser.id,
                                    },
                                    error: null,
                                }),
                            };
                        }),
                        update: vi.fn().mockImplementation(() => {
                            briefUpdated = true;
                            return {
                                eq: vi.fn().mockResolvedValue({
                                    data: null,
                                    error: null,
                                }),
                            };
                        }),
                        select: vi.fn().mockReturnThis(),
                    };
                }
                if (table === "marketing_post_variants") {
                    return {
                        insert: vi.fn().mockImplementation(() => {
                            variantsCreated++;
                            return {
                                select: vi.fn().mockReturnThis(),
                                single: vi.fn().mockResolvedValue({
                                    data: {
                                        id: `variant-${variantsCreated}`,
                                    },
                                    error: null,
                                }),
                            };
                        }),
                        select: vi.fn().mockReturnThis(),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(decryptToken).mockResolvedValue("decrypted-token");
        vi.mocked(createCampaign).mockResolvedValue({
            id: "campaign-123",
        } as any);
        vi.mocked(createAdSet).mockResolvedValue({
            id: "adset-123",
        } as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                funnel_project_id: "550e8400-e29b-41d4-a716-446655440000",
                ad_account_id: "act_123",
                variations: [
                    {
                        id: "var-1",
                        variation_number: 1,
                        framework: "test",
                        primary_text: "Test 1",
                        headline: "Test",
                        link_description: "Test",
                        hooks: {
                            long: "Long",
                            short: "Short",
                            curiosity: "Curious",
                        },
                        call_to_action: "LEARN_MORE",
                        selected: false,
                    },
                    {
                        id: "var-2",
                        variation_number: 2,
                        framework: "test",
                        primary_text: "Test 2",
                        headline: "Test",
                        link_description: "Test",
                        hooks: {
                            long: "Long",
                            short: "Short",
                            curiosity: "Curious",
                        },
                        call_to_action: "SIGN_UP",
                        selected: false,
                    },
                ],
                audience_config: {
                    type: "interest",
                    targeting: {
                        geo_locations: {
                            countries: ["US"],
                        },
                    },
                },
                daily_budget_cents: 5000,
            },
        });

        await POST(request);

        expect(briefInserted).toBe(true);
        expect(briefUpdated).toBe(true);
        expect(variantsCreated).toBe(2);
        expect(createCampaign).toHaveBeenCalled();
        expect(createAdSet).toHaveBeenCalled();
    });

    it("should handle Zod validation errors", async () => {
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
                ad_account_id: "act_123",
                variations: [],
                daily_budget_cents: -100,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
    });

    it("should return 400 when Facebook not connected", async () => {
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
                if (table === "marketing_oauth_connections") {
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
                ad_account_id: "act_123",
                variations: [
                    {
                        id: "var-1",
                        variation_number: 1,
                        framework: "test",
                        primary_text: "Test",
                        headline: "Test",
                        link_description: "Test",
                        hooks: {
                            long: "Long",
                            short: "Short",
                            curiosity: "Curious",
                        },
                        call_to_action: "LEARN_MORE",
                        selected: false,
                    },
                ],
                audience_config: {
                    type: "interest",
                    targeting: {
                        geo_locations: {
                            countries: ["US"],
                        },
                    },
                },
                daily_budget_cents: 5000,
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Facebook not connected");
    });
});
