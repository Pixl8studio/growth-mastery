/**
 * Integration Tests for Ad Accounts API
 * Tests GET /api/ads/accounts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/ads/accounts/route";
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
    getAdAccounts: vi.fn(),
}));

vi.mock("@/lib/crypto/token-encryption", () => ({
    decryptToken: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getAdAccounts } from "@/lib/integrations/meta-ads";
import { decryptToken } from "@/lib/crypto/token-encryption";

describe("GET /api/ads/accounts", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fetch ad accounts for authenticated user", async () => {
        const mockMetaAccounts = [
            {
                id: "act_123456789",
                account_id: "123456789",
                name: "Test Ad Account",
                account_status: 1,
                currency: "USD",
                timezone_name: "America/Los_Angeles",
            },
            {
                id: "act_987654321",
                account_id: "987654321",
                name: "Second Ad Account",
                account_status: 1,
                currency: "USD",
                timezone_name: "America/New_York",
            },
        ];

        const mockStoredAccounts = [
            {
                id: "db-account-1",
                user_id: "user-123",
                meta_ad_account_id: "123456789",
                account_name: "Test Ad Account",
                account_status: "1",
                currency: "USD",
                timezone: "America/Los_Angeles",
                is_active: true,
            },
            {
                id: "db-account-2",
                user_id: "user-123",
                meta_ad_account_id: "987654321",
                account_name: "Second Ad Account",
                account_status: "1",
                currency: "USD",
                timezone: "America/New_York",
                is_active: true,
            },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_oauth_connections") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "connection-123",
                                access_token_encrypted: "encrypted-token",
                            },
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_ad_accounts") {
                    return {
                        upsert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockStoredAccounts[0],
                            error: null,
                        }),
                        eq: vi.fn().mockReturnThis(),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockResolvedValue({
                        data: mockStoredAccounts,
                        error: null,
                    }),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(decryptToken).mockResolvedValue("decrypted-token");
        vi.mocked(getAdAccounts).mockResolvedValue(mockMetaAccounts as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/accounts",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.accounts).toHaveLength(2);
        expect(data.accounts[0].meta_ad_account_id).toBe("123456789");
        expect(data.accounts[1].meta_ad_account_id).toBe("987654321");
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
            url: "http://localhost:3000/api/ads/accounts",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("should return 400 when Facebook not connected", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
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
            url: "http://localhost:3000/api/ads/accounts",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Facebook not connected");
    });

    it("should store and update accounts in database", async () => {
        const mockMetaAccounts = [
            {
                id: "act_123456789",
                account_id: "123456789",
                name: "Test Ad Account",
                account_status: 1,
                currency: "USD",
                timezone_name: "America/Los_Angeles",
            },
        ];

        let upsertedData: any = null;

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_oauth_connections") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "connection-123",
                                access_token_encrypted: "encrypted-token",
                            },
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_ad_accounts") {
                    return {
                        upsert: vi.fn().mockImplementation((data) => {
                            upsertedData = data;
                            return {
                                select: vi.fn().mockReturnThis(),
                                single: vi.fn().mockResolvedValue({
                                    data: {
                                        id: "db-account-1",
                                        ...data,
                                    },
                                    error: null,
                                }),
                            };
                        }),
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    id: "db-account-1",
                                    user_id: mockUser.id,
                                    meta_ad_account_id: "123456789",
                                    account_name: "Test Ad Account",
                                },
                            ],
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
        vi.mocked(getAdAccounts).mockResolvedValue(mockMetaAccounts as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/accounts",
        });

        await GET(request);

        expect(upsertedData).toBeTruthy();
        expect(upsertedData.user_id).toBe(mockUser.id);
        expect(upsertedData.meta_ad_account_id).toBe("123456789");
        expect(upsertedData.account_name).toBe("Test Ad Account");
        expect(upsertedData.currency).toBe("USD");
        expect(upsertedData.is_active).toBe(true);
    });

    it("should decrypt access token before calling Meta API", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_oauth_connections") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "connection-123",
                                access_token_encrypted: "encrypted-token-abc",
                            },
                            error: null,
                        }),
                    };
                }
                if (table === "marketing_ad_accounts") {
                    return {
                        upsert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {},
                            error: null,
                        }),
                        eq: vi.fn().mockResolvedValue({
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
        vi.mocked(decryptToken).mockResolvedValue("decrypted-token-xyz");
        vi.mocked(getAdAccounts).mockResolvedValue([]);

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/accounts",
        });

        await GET(request);

        expect(decryptToken).toHaveBeenCalledWith("encrypted-token-abc");
        expect(getAdAccounts).toHaveBeenCalledWith("decrypted-token-xyz");
    });

    it("should handle Meta API errors gracefully", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn((table: string) => {
                if (table === "marketing_oauth_connections") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "connection-123",
                                access_token_encrypted: "encrypted-token",
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
        vi.mocked(getAdAccounts).mockRejectedValue(new Error("Meta API error"));

        const request = createMockRequest({
            url: "http://localhost:3000/api/ads/accounts",
        });

        const response = await GET(request);
        const data = await parseJsonResponse(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Internal server error");
    });
});
