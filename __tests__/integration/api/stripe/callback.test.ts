/**
 * Integration Tests: Stripe Callback Route
 * Tests for app/api/stripe/callback/route.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/stripe/callback/route";
import { NextRequest } from "next/server";

// Mock dependencies
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
    completeConnect: vi.fn(),
}));

describe("GET /api/stripe/callback", () => {
    const baseUrl = "http://localhost:3000";

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_APP_URL = baseUrl;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should complete connection and redirect on success", async () => {
        const { completeConnect } = await import("@/lib/stripe/connect");

        vi.mocked(completeConnect).mockResolvedValue({ accountId: "acct_test123" });

        const mockRequest = {
            nextUrl: {
                searchParams: new URLSearchParams({
                    code: "auth_code_123",
                    state: "user_123",
                }),
            },
        } as NextRequest;

        const response = await GET(mockRequest);

        expect(response.status).toBe(307); // Redirect status
        expect(response.headers.get("location")).toBe(
            `${baseUrl}/settings/payments?success=true`
        );
        expect(completeConnect).toHaveBeenCalledWith("auth_code_123", "user_123");
    });

    it("should redirect with error when Stripe returns error parameter", async () => {
        const mockRequest = {
            nextUrl: {
                searchParams: new URLSearchParams({
                    error: "access_denied",
                    error_description: "User denied access",
                }),
            },
        } as NextRequest;

        const response = await GET(mockRequest);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain("/settings/payments?error=");
        expect(response.headers.get("location")).toContain(
            encodeURIComponent("User denied access")
        );
    });

    it("should use error parameter if error_description is missing", async () => {
        const mockRequest = {
            nextUrl: {
                searchParams: new URLSearchParams({
                    error: "access_denied",
                }),
            },
        } as NextRequest;

        const response = await GET(mockRequest);

        expect(response.headers.get("location")).toContain(
            encodeURIComponent("access_denied")
        );
    });

    it("should redirect with error when code is missing", async () => {
        const mockRequest = {
            nextUrl: {
                searchParams: new URLSearchParams({
                    state: "user_123",
                }),
            },
        } as NextRequest;

        const response = await GET(mockRequest);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain(
            "/settings/payments?error=invalid_request"
        );
    });

    it("should redirect with error when state is missing", async () => {
        const mockRequest = {
            nextUrl: {
                searchParams: new URLSearchParams({
                    code: "auth_code_123",
                }),
            },
        } as NextRequest;

        const response = await GET(mockRequest);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain(
            "/settings/payments?error=invalid_request"
        );
    });

    it("should redirect with error when completeConnect fails", async () => {
        const { completeConnect } = await import("@/lib/stripe/connect");

        vi.mocked(completeConnect).mockRejectedValue(
            new Error("Failed to exchange authorization code")
        );

        const mockRequest = {
            nextUrl: {
                searchParams: new URLSearchParams({
                    code: "invalid_code",
                    state: "user_123",
                }),
            },
        } as NextRequest;

        const response = await GET(mockRequest);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain(
            "/settings/payments?error=connection_failed"
        );
    });

    it("should use state as userId", async () => {
        const { completeConnect } = await import("@/lib/stripe/connect");

        vi.mocked(completeConnect).mockResolvedValue({ accountId: "acct_test" });

        const mockRequest = {
            nextUrl: {
                searchParams: new URLSearchParams({
                    code: "auth_code",
                    state: "user_456",
                }),
            },
        } as NextRequest;

        await GET(mockRequest);

        expect(completeConnect).toHaveBeenCalledWith("auth_code", "user_456");
    });

    it("should handle empty search params", async () => {
        const mockRequest = {
            nextUrl: {
                searchParams: new URLSearchParams(),
            },
        } as NextRequest;

        const response = await GET(mockRequest);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain("invalid_request");
    });

    it("should preserve NEXT_PUBLIC_APP_URL in redirects", async () => {
        process.env.NEXT_PUBLIC_APP_URL = "https://example.com";

        const mockRequest = {
            nextUrl: {
                searchParams: new URLSearchParams({
                    error: "access_denied",
                }),
            },
        } as NextRequest;

        const response = await GET(mockRequest);

        expect(response.headers.get("location")).toContain("https://example.com");
    });
});
