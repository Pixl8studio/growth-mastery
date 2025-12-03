/**
 * Tests for Instagram Integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

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
const { getInstagramAccounts, getInstagramAccountDetails, verifyInstagramAccess } =
    await import("@/lib/integrations/instagram");

describe("Instagram Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getInstagramAccounts", () => {
        it("fetches Instagram account linked to Facebook page", async () => {
            const mockPageData = {
                instagram_business_account: {
                    id: "ig-123",
                },
            };

            const mockAccountDetails = {
                id: "ig-123",
                username: "testuser",
                name: "Test User",
                profile_picture_url: "https://example.com/pic.jpg",
                followers_count: 1000,
            };

            // First call for page data
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockPageData,
            });

            // Second call for account details
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockAccountDetails,
            });

            const result = await getInstagramAccounts("page-123", "page-access-token");

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("ig-123");
            expect(result[0].username).toBe("testuser");
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it("returns empty array when no Instagram account linked", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "page-123" }), // No instagram_business_account field
            });

            const result = await getInstagramAccounts("page-123", "page-access-token");

            expect(result).toEqual([]);
        });

        it("throws error when fetching Instagram account fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Invalid page ID" },
                }),
            });

            await expect(getInstagramAccounts("invalid-page", "token")).rejects.toThrow(
                "Failed to fetch Instagram account"
            );
        });
    });

    describe("getInstagramAccountDetails", () => {
        it("fetches Instagram account details successfully", async () => {
            const mockAccount = {
                id: "ig-456",
                username: "businessaccount",
                name: "Business Account",
                profile_picture_url: "https://example.com/business.jpg",
                followers_count: 5000,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockAccount,
            });

            const result = await getInstagramAccountDetails("ig-456", "access-token");

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("ig-456");
            expect(result[0].username).toBe("businessaccount");
            expect(result[0].followers_count).toBe(5000);
        });

        it("throws error when fetching details fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: { message: "Account not found" },
                }),
            });

            await expect(
                getInstagramAccountDetails("invalid-id", "token")
            ).rejects.toThrow("Failed to fetch Instagram details");
        });
    });

    describe("verifyInstagramAccess", () => {
        it("returns true for valid Instagram account access", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "ig-789" }),
            });

            const result = await verifyInstagramAccess("ig-789", "valid-token");

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("ig-789"));
        });

        it("returns false for invalid access", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
            });

            const result = await verifyInstagramAccess("ig-789", "invalid-token");

            expect(result).toBe(false);
        });

        it("returns false when fetch throws error", async () => {
            mockFetch.mockRejectedValueOnce(new Error("Network error"));

            const result = await verifyInstagramAccess("ig-789", "token");

            expect(result).toBe(false);
        });
    });
});
