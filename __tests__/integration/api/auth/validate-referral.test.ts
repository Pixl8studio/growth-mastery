/**
 * Integration tests for app/api/auth/validate-referral/route.ts
 * Tests referral code validation API endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        })),
    },
}));

// Mock Supabase client
const mockSelect = vi.fn();
const mockIlike = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        from: mockFrom,
    })),
}));

// Import after mocks are set up
const { POST } = await import("@/app/api/auth/validate-referral/route");

describe("POST /api/auth/validate-referral", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ ilike: mockIlike });
        mockIlike.mockReturnValue({ eq: mockEq });
        mockEq.mockReturnValue({ single: mockSingle });
    });

    it("should validate active referral code successfully", async () => {
        const mockReferralCode = {
            id: "ref-123",
            code: "WELCOME2024",
            is_active: true,
            max_uses: 100,
            current_uses: 50,
        };

        mockSingle.mockResolvedValue({ data: mockReferralCode, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/auth/validate-referral",
            {
                method: "POST",
                body: JSON.stringify({ code: "welcome2024" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(mockFrom).toHaveBeenCalledWith("referral_codes");
        expect(mockIlike).toHaveBeenCalledWith("code", "WELCOME2024");
        expect(mockEq).toHaveBeenCalledWith("is_active", true);

        const body = await response.json();
        expect(body).toEqual({ valid: true });
    });

    it("should return 200 with valid=false for non-existent code", async () => {
        mockSingle.mockResolvedValue({
            data: null,
            error: { code: "PGRST116" }, // No rows returned
        });

        const request = new NextRequest(
            "http://localhost:3000/api/auth/validate-referral",
            {
                method: "POST",
                body: JSON.stringify({ code: "INVALID" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toEqual({
            valid: false,
            message: "Invalid or inactive referral code",
        });
    });

    it("should reject code with invalid format", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/auth/validate-referral",
            {
                method: "POST",
                body: JSON.stringify({ code: "invalid-code!" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toEqual({
            valid: false,
            message: "Invalid referral code format",
        });

        // Should not query database
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it("should reject code that reached max uses", async () => {
        const mockReferralCode = {
            id: "ref-123",
            code: "MAXED",
            is_active: true,
            max_uses: 100,
            current_uses: 100,
        };

        mockSingle.mockResolvedValue({ data: mockReferralCode, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/auth/validate-referral",
            {
                method: "POST",
                body: JSON.stringify({ code: "MAXED" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toEqual({
            valid: false,
            message: "This referral code has reached its usage limit",
        });
    });

    it("should accept code with null max_uses", async () => {
        const mockReferralCode = {
            id: "ref-123",
            code: "UNLIMITED",
            is_active: true,
            max_uses: null,
            current_uses: 1000,
        };

        mockSingle.mockResolvedValue({ data: mockReferralCode, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/auth/validate-referral",
            {
                method: "POST",
                body: JSON.stringify({ code: "UNLIMITED" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toEqual({ valid: true });
    });

    it("should return 200 with error message when code is missing", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/auth/validate-referral",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toEqual({
            valid: false,
            message: "Referral code is required",
        });
    });

    it("should return 200 with error message when code is not a string", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/auth/validate-referral",
            {
                method: "POST",
                body: JSON.stringify({ code: 12345 }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toEqual({
            valid: false,
            message: "Referral code is required",
        });
    });

    it("should trim and uppercase the code", async () => {
        const mockReferralCode = {
            id: "ref-123",
            code: "TRIMMED",
            is_active: true,
            max_uses: null,
            current_uses: 0,
        };

        mockSingle.mockResolvedValue({ data: mockReferralCode, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/auth/validate-referral",
            {
                method: "POST",
                body: JSON.stringify({ code: "  trimmed  " }),
            }
        );

        const response = await POST(request);

        expect(mockIlike).toHaveBeenCalledWith("code", "TRIMMED");
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toEqual({ valid: true });
    });

    it("should return 500 when database query fails", async () => {
        mockSingle.mockResolvedValue({
            data: null,
            error: { code: "DATABASE_ERROR", message: "Connection failed" },
        });

        const request = new NextRequest(
            "http://localhost:3000/api/auth/validate-referral",
            {
                method: "POST",
                body: JSON.stringify({ code: "TESTCODE" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(500);

        const body = await response.json();
        expect(body).toEqual({
            valid: false,
            message: "Failed to validate referral code",
        });
    });

    it("should handle special characters in code gracefully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/auth/validate-referral",
            {
                method: "POST",
                body: JSON.stringify({ code: "CODE@#$%" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toEqual({
            valid: false,
            message: "Invalid referral code format",
        });
    });

    it("should accept alphanumeric codes", async () => {
        const mockReferralCode = {
            id: "ref-123",
            code: "CODE123",
            is_active: true,
            max_uses: null,
            current_uses: 0,
        };

        mockSingle.mockResolvedValue({ data: mockReferralCode, error: null });

        const request = new NextRequest(
            "http://localhost:3000/api/auth/validate-referral",
            {
                method: "POST",
                body: JSON.stringify({ code: "code123" }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toEqual({ valid: true });
    });
});
