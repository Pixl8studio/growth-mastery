/**
 * Integration tests for referral code system
 * Tests the complete signup flow with referral codes
 */

import { describe, it, expect } from "vitest";

describe("Referral Code System", () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    describe("Referral Code Validation API", () => {
        it("should validate POWERGROWTH code successfully", async () => {
            const response = await fetch(`${API_BASE_URL}/api/auth/validate-referral`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: "POWERGROWTH" }),
            });

            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.valid).toBe(true);
        });

        it("should validate lowercase powergrowth code (case-insensitive)", async () => {
            const response = await fetch(`${API_BASE_URL}/api/auth/validate-referral`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: "powergrowth" }),
            });

            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.valid).toBe(true);
        });

        it("should validate mixed case PowerGrowth code (case-insensitive)", async () => {
            const response = await fetch(`${API_BASE_URL}/api/auth/validate-referral`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: "PowerGrowth" }),
            });

            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.valid).toBe(true);
        });

        it("should reject invalid referral code", async () => {
            const response = await fetch(`${API_BASE_URL}/api/auth/validate-referral`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: "INVALIDCODE123" }),
            });

            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.valid).toBe(false);
            expect(data.message).toBeDefined();
        });

        it("should reject empty referral code", async () => {
            const response = await fetch(`${API_BASE_URL}/api/auth/validate-referral`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: "" }),
            });

            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.valid).toBe(false);
        });

        it("should reject referral code with special characters", async () => {
            const response = await fetch(`${API_BASE_URL}/api/auth/validate-referral`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: "CODE-WITH-DASH!" }),
            });

            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.valid).toBe(false);
            expect(data.message).toContain("Invalid referral code format");
        });

        it("should handle missing code parameter", async () => {
            const response = await fetch(`${API_BASE_URL}/api/auth/validate-referral`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            });

            const data = await response.json();
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(data.valid).toBe(false);
        });
    });

    describe("Input Sanitization", () => {
        it("should handle code with leading/trailing whitespace", async () => {
            const response = await fetch(`${API_BASE_URL}/api/auth/validate-referral`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: "  POWERGROWTH  " }),
            });

            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.valid).toBe(true);
        });

        it("should reject code that exceeds length after sanitization", async () => {
            const longCode = "A".repeat(100);
            const response = await fetch(`${API_BASE_URL}/api/auth/validate-referral`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: longCode }),
            });

            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.valid).toBe(false);
        });
    });
});

describe("Admin Referral Code Management", () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    describe("GET /api/admin/referral-codes", () => {
        it("should require authentication", async () => {
            const response = await fetch(`${API_BASE_URL}/api/admin/referral-codes`, {
                method: "GET",
            });

            // Should return 401 or redirect to login
            expect([401, 302, 307]).toContain(response.status);
        });
    });

    describe("POST /api/admin/referral-codes", () => {
        it("should require authentication", async () => {
            const response = await fetch(`${API_BASE_URL}/api/admin/referral-codes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code: "TESTCODE",
                    description: "Test code",
                }),
            });

            // Should return 401 or redirect to login
            expect([401, 302, 307]).toContain(response.status);
        });
    });
});
