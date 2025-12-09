/**
 * Integration Tests: Stripe Disconnect Route
 * Tests for app/api/stripe/disconnect/route.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/stripe/disconnect/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn((_table: string) => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(),
                })),
            })),
        })),
    })),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        })),
    },
}));

vi.mock("@/lib/stripe/connect", () => ({
    disconnectStripe: vi.fn(),
}));

describe("POST /api/stripe/disconnect", () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
        mockRequest = {
            url: "http://localhost:3000/api/stripe/disconnect",
            method: "POST",
            headers: new Headers(),
        } as NextRequest;

        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should successfully disconnect Stripe account", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { disconnectStripe } = await import("@/lib/stripe/connect");

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: "user_123" } },
                }),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({
                            data: { stripe_account_id: "acct_test123" },
                        }),
                    })),
                })),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(disconnectStripe).mockResolvedValue();

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        expect(disconnectStripe).toHaveBeenCalledWith("user_123", "acct_test123");
    });

    it("should return 401 for unauthenticated user", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 400 when no Stripe account is connected", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: "user_123" } },
                }),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({
                            data: { stripe_account_id: null },
                        }),
                    })),
                })),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "No Stripe account connected" });
    });

    it("should return 400 when profile has no stripe_account_id field", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: "user_123" } },
                }),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({
                            data: {},
                        }),
                    })),
                })),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "No Stripe account connected" });
    });

    it("should return 500 when disconnectStripe fails", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { disconnectStripe } = await import("@/lib/stripe/connect");

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: "user_123" } },
                }),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({
                            data: { stripe_account_id: "acct_test123" },
                        }),
                    })),
                })),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(disconnectStripe).mockRejectedValue(
            new Error("Stripe deauthorization failed")
        );

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Failed to disconnect Stripe account" });
    });

    it("should handle database errors gracefully", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockRejectedValue(new Error("Database error")),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Failed to disconnect Stripe account" });
    });

    it("should call disconnectStripe with correct parameters", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { disconnectStripe } = await import("@/lib/stripe/connect");

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: "user_456" } },
                }),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({
                            data: { stripe_account_id: "acct_another123" },
                        }),
                    })),
                })),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(disconnectStripe).mockResolvedValue();

        await POST(mockRequest);

        expect(disconnectStripe).toHaveBeenCalledWith("user_456", "acct_another123");
    });

    it("should handle null profile gracefully", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: "user_123" } },
                }),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                        }),
                    })),
                })),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "No Stripe account connected" });
    });
});
