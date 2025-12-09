/**
 * Integration Tests: Stripe Connect Route
 * Tests for app/api/stripe/connect/route.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/stripe/connect/route";
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
    generateConnectUrl: vi.fn(),
}));

describe("POST /api/stripe/connect", () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
        mockRequest = {
            url: "http://localhost:3000/api/stripe/connect",
            method: "GET",
            headers: new Headers(),
        } as NextRequest;

        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should redirect to Stripe Connect URL for authenticated user", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateConnectUrl } = await import("@/lib/stripe/connect");

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
                            data: { email: "test@example.com" },
                        }),
                    })),
                })),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateConnectUrl).mockResolvedValue(
            "https://connect.stripe.com/oauth/authorize?client_id=ca_test"
        );

        const response = await GET(mockRequest);

        expect(response.status).toBe(307); // Redirect status
        expect(response.headers.get("location")).toContain(
            "https://connect.stripe.com/oauth/authorize"
        );
        expect(generateConnectUrl).toHaveBeenCalledWith("user_123", "test@example.com");
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

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 404 when user profile not found", async () => {
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

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "Profile not found" });
    });

    it("should return 500 when Stripe Connect URL generation fails", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateConnectUrl } = await import("@/lib/stripe/connect");

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
                            data: { email: "test@example.com" },
                        }),
                    })),
                })),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateConnectUrl).mockRejectedValue(
            new Error("Stripe configuration error")
        );

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Failed to initiate Stripe Connect" });
    });

    it("should handle database errors gracefully", async () => {
        const { createClient } = await import("@/lib/supabase/server");

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockRejectedValue(new Error("Database error")),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const response = await GET(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Failed to initiate Stripe Connect" });
    });

    it("should use correct user email from profile", async () => {
        const { createClient } = await import("@/lib/supabase/server");
        const { generateConnectUrl } = await import("@/lib/stripe/connect");

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
                            data: { email: "another@example.com" },
                        }),
                    })),
                })),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(generateConnectUrl).mockResolvedValue(
            "https://connect.stripe.com/oauth/authorize"
        );

        await GET(mockRequest);

        expect(generateConnectUrl).toHaveBeenCalledWith(
            "user_456",
            "another@example.com"
        );
    });
});
