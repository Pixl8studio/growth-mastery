/**
 * Tests for Meta Ads Integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock environment variables
vi.mock("@/lib/env", () => ({
    env: {
        META_APP_ID: "test-meta-app-id",
        META_APP_SECRET: "test-meta-app-secret",
    },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks are defined
const {
    getAdAccounts,
    getAdAccount,
    createCampaign,
    updateCampaignStatus,
    createAdSet,
    createLeadAdCreative,
    createAd,
    updateAdStatus,
    getAdInsights,
    getCampaignInsights,
    uploadAdImage,
    createCustomAudience,
    createLookalikeAudience,
    searchInterests,
    getDeliveryEstimate,
    sendConversionEvent,
} = await import("@/lib/integrations/meta-ads");

describe("Meta Ads Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getAdAccounts", () => {
        it("fetches all ad accounts for user", async () => {
            const mockAccounts = [
                {
                    id: "act_123",
                    account_id: "123",
                    name: "Account 1",
                    account_status: 1,
                    currency: "USD",
                    timezone_name: "America/New_York",
                    balance: "10000",
                },
                {
                    id: "act_456",
                    account_id: "456",
                    name: "Account 2",
                    account_status: 1,
                    currency: "USD",
                    timezone_name: "America/Los_Angeles",
                    balance: "5000",
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockAccounts }),
            });

            const result = await getAdAccounts("access-token-123");

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe("act_123");
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/me/adaccounts"),
                expect.objectContaining({
                    headers: {
                        Authorization: "Bearer access-token-123",
                    },
                })
            );
        });

        it("returns empty array when no accounts found", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: null }),
            });

            const result = await getAdAccounts("access-token-123");

            expect(result).toEqual([]);
        });

        it("throws error when fetching accounts fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Unauthorized" },
                }),
            });

            await expect(getAdAccounts("invalid-token")).rejects.toThrow(
                "Failed to fetch ad accounts"
            );
        });
    });

    describe("getAdAccount", () => {
        it("fetches specific ad account details", async () => {
            const mockAccount = {
                id: "act_123",
                account_id: "123",
                name: "Test Account",
                account_status: 1,
                currency: "USD",
                timezone_name: "America/New_York",
                balance: "10000",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockAccount,
            });

            const result = await getAdAccount("act_123", "access-token-123");

            expect(result.id).toBe("act_123");
            expect(result.name).toBe("Test Account");
        });

        it("throws error when account not found", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Account not found" },
                }),
            });

            await expect(getAdAccount("invalid-account", "token")).rejects.toThrow(
                "Failed to fetch ad account"
            );
        });
    });

    describe("createCampaign", () => {
        it("creates campaign successfully", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "campaign-123" }),
            });

            const result = await createCampaign(
                "act_123",
                "Summer Campaign",
                "LEAD_GENERATION",
                "PAUSED",
                "access-token-123"
            );

            expect(result.id).toBe("campaign-123");
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/act_123/campaigns"),
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        Authorization: "Bearer access-token-123",
                    }),
                })
            );
        });

        it("throws error when campaign creation fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid objective" },
                }),
            });

            await expect(
                createCampaign("act_123", "Test", "LEAD_GENERATION", "PAUSED", "token")
            ).rejects.toThrow("Failed to create campaign");
        });
    });

    describe("updateCampaignStatus", () => {
        it("updates campaign status", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

            const result = await updateCampaignStatus(
                "campaign-123",
                "ACTIVE",
                "access-token-123"
            );

            expect(result.success).toBe(true);
        });

        it("throws error when update fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Campaign not found" },
                }),
            });

            await expect(
                updateCampaignStatus("invalid-campaign", "ACTIVE", "token")
            ).rejects.toThrow("Failed to update campaign");
        });
    });

    describe("createAdSet", () => {
        it("creates ad set with targeting", async () => {
            const targeting = {
                geo_locations: { countries: ["US"] },
                age_min: 25,
                age_max: 55,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "adset-123" }),
            });

            const result = await createAdSet(
                "campaign-123",
                "Ad Set 1",
                targeting,
                1000,
                "IMPRESSIONS",
                "LEAD_GENERATION",
                "LOWEST_COST_WITHOUT_CAP",
                "PAUSED",
                "access-token-123"
            );

            expect(result.id).toBe("adset-123");
        });

        it("throws error when ad set creation fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid targeting" },
                }),
            });

            await expect(
                createAdSet(
                    "campaign-123",
                    "Test",
                    { geo_locations: {} },
                    1000,
                    "IMPRESSIONS",
                    "LEAD_GENERATION",
                    "LOWEST_COST_WITHOUT_CAP",
                    "PAUSED",
                    "token"
                )
            ).rejects.toThrow("Failed to create ad set");
        });
    });

    describe("createLeadAdCreative", () => {
        it("creates lead ad creative", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "creative-123" }),
            });

            const result = await createLeadAdCreative(
                "act_123",
                "Creative 1",
                "page-123",
                "image-hash-123",
                "Primary text here",
                "Headline text",
                "Description text",
                "LEARN_MORE",
                "form-123",
                "access-token-123"
            );

            expect(result.id).toBe("creative-123");
        });

        it("throws error when creative creation fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid image hash" },
                }),
            });

            await expect(
                createLeadAdCreative(
                    "act_123",
                    "Test",
                    "page-123",
                    "invalid-hash",
                    "Text",
                    "Headline",
                    "Desc",
                    "LEARN_MORE",
                    "form-123",
                    "token"
                )
            ).rejects.toThrow("Failed to create ad creative");
        });
    });

    describe("createAd", () => {
        it("creates ad successfully", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "ad-123" }),
            });

            const result = await createAd(
                "adset-123",
                "Ad 1",
                "creative-123",
                "PAUSED",
                "access-token-123"
            );

            expect(result.id).toBe("ad-123");
        });

        it("throws error when ad creation fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid creative" },
                }),
            });

            await expect(
                createAd("adset-123", "Test", "invalid-creative", "PAUSED", "token")
            ).rejects.toThrow("Failed to create ad");
        });
    });

    describe("updateAdStatus", () => {
        it("updates ad status", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

            const result = await updateAdStatus("ad-123", "ACTIVE", "access-token-123");

            expect(result.success).toBe(true);
        });
    });

    describe("getAdInsights", () => {
        it("fetches ad performance metrics", async () => {
            const mockInsights = {
                data: [
                    {
                        impressions: "10000",
                        clicks: "500",
                        spend: "100.00",
                        ctr: "5.0",
                    },
                ],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockInsights,
            });

            const result = await getAdInsights(
                "ad-123",
                "last_7d",
                ["impressions", "clicks", "spend"],
                "access-token-123"
            );

            expect(result.data).toHaveLength(1);
            expect(result.data[0].impressions).toBe("10000");
        });

        it("throws error when fetching insights fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Ad not found" },
                }),
            });

            await expect(
                getAdInsights("invalid-ad", "last_7d", ["impressions"], "token")
            ).rejects.toThrow("Failed to fetch ad insights");
        });
    });

    describe("getCampaignInsights", () => {
        it("fetches campaign insights with default fields", async () => {
            const mockInsights = {
                data: [
                    {
                        impressions: "50000",
                        clicks: "2500",
                        spend: "500.00",
                    },
                ],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockInsights,
            });

            const result = await getCampaignInsights(
                "campaign-123",
                "last_30d",
                "access-token-123"
            );

            expect(result.data).toHaveLength(1);
        });
    });

    describe("uploadAdImage", () => {
        it("uploads image and returns hash", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    images: {
                        "image-url": {
                            hash: "image-hash-123",
                        },
                    },
                }),
            });

            const result = await uploadAdImage(
                "act_123",
                "https://example.com/image.jpg",
                "access-token-123"
            );

            expect(result.hash).toBe("image-hash-123");
        });

        it("throws error when upload fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid image URL" },
                }),
            });

            await expect(
                uploadAdImage("act_123", "invalid-url", "token")
            ).rejects.toThrow("Failed to upload ad image");
        });
    });

    describe("createCustomAudience", () => {
        it("creates custom audience", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "audience-123" }),
            });

            const result = await createCustomAudience(
                "act_123",
                "Custom Audience 1",
                "Customer list",
                "access-token-123"
            );

            expect(result.id).toBe("audience-123");
        });

        it("throws error when audience creation fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid parameters" },
                }),
            });

            await expect(
                createCustomAudience("act_123", "Test", "Desc", "token")
            ).rejects.toThrow("Failed to create custom audience");
        });
    });

    describe("createLookalikeAudience", () => {
        it("creates lookalike audience", async () => {
            const spec = {
                source_audience_id: "audience-123",
                ratio: 0.01,
                country: "US",
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "lookalike-456" }),
            });

            const result = await createLookalikeAudience(
                "act_123",
                "Lookalike Audience",
                spec,
                "access-token-123"
            );

            expect(result.id).toBe("lookalike-456");
        });

        it("throws error when lookalike creation fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid source audience" },
                }),
            });

            await expect(
                createLookalikeAudience(
                    "act_123",
                    "Test",
                    { source_audience_id: "invalid", ratio: 0.01, country: "US" },
                    "token"
                )
            ).rejects.toThrow("Failed to create lookalike audience");
        });
    });

    describe("searchInterests", () => {
        it("searches for interest targeting suggestions", async () => {
            const mockInterests = [
                { id: "interest-1", name: "Technology" },
                { id: "interest-2", name: "Tech Gadgets" },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockInterests }),
            });

            const result = await searchInterests("technology", "access-token-123");

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe("Technology");
        });

        it("returns empty array when no interests found", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: null }),
            });

            const result = await searchInterests("xyz123", "access-token-123");

            expect(result).toEqual([]);
        });
    });

    describe("getDeliveryEstimate", () => {
        it("gets delivery estimate for targeting", async () => {
            const targeting = {
                geo_locations: { countries: ["US"] },
                age_min: 25,
                age_max: 55,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: [
                        {
                            estimate_ready: true,
                            users_lower_bound: 100000,
                            users_upper_bound: 500000,
                        },
                    ],
                }),
            });

            const result = await getDeliveryEstimate(
                "act_123",
                targeting,
                "LEAD_GENERATION",
                "access-token-123"
            );

            expect(result.estimate_ready).toBe(true);
            expect(result.users_lower_bound).toBe(100000);
            expect(result.users_upper_bound).toBe(500000);
        });

        it("returns default values when estimate not ready", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [] }),
            });

            const result = await getDeliveryEstimate(
                "act_123",
                { geo_locations: {} },
                "LEAD_GENERATION",
                "access-token-123"
            );

            expect(result.estimate_ready).toBe(false);
            expect(result.users_lower_bound).toBe(0);
            expect(result.users_upper_bound).toBe(0);
        });
    });

    describe("sendConversionEvent", () => {
        it("sends conversion event to Conversions API", async () => {
            const eventData = {
                event_name: "Lead",
                event_time: Math.floor(Date.now() / 1000),
                user_data: {
                    em: "hashed-email",
                    client_ip_address: "192.168.1.1",
                    client_user_agent: "Mozilla/5.0...",
                },
                action_source: "website" as const,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ events_received: 1 }),
            });

            const result = await sendConversionEvent(
                "pixel-123",
                "access-token-123",
                eventData
            );

            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/pixel-123/events"),
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        it("throws error when sending conversion fails", async () => {
            const eventData = {
                event_name: "Purchase",
                event_time: Math.floor(Date.now() / 1000),
                user_data: {},
                action_source: "website" as const,
            };

            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid event data" },
                }),
            });

            await expect(
                sendConversionEvent("pixel-123", "token", eventData)
            ).rejects.toThrow("Failed to send conversion event");
        });
    });
});
