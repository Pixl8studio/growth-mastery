import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/domains/[domainId]/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    requireAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock fetch globally
global.fetch = vi.fn();

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

describe("DELETE /api/domains/[domainId]", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockDomain = {
        id: "domain-123",
        domain: "example.com",
        user_id: "user-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.VERCEL_TOKEN = "test-token";
        process.env.VERCEL_PROJECT_ID = "test-project-id";
    });

    it("should delete domain successfully", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as any);

        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "custom_domains") {
                    const mockFetch = {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockDomain,
                            error: null,
                        }),
                        delete: vi.fn().mockReturnThis(),
                    };
                    // Return different chains for select vs delete
                    return mockFetch;
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "DELETE",
        });

        const response = await DELETE(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 404 when domain not found", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        const mockSupabase = {
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Not found" },
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "DELETE",
        });

        const response = await DELETE(request, {
            params: Promise.resolve({ domainId: "nonexistent" }),
        });
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("Domain not found");
    });

    it("should return 404 when domain belongs to different user", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        const mockSupabase = {
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Not found" },
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "DELETE",
        });

        const response = await DELETE(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("Domain not found");
    });

    it("should continue with database deletion even if Vercel deletion fails", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        vi.mocked(global.fetch).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Vercel error" }),
        } as any);

        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "custom_domains") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockDomain,
                            error: null,
                        }),
                        delete: vi.fn(() => {
                            deleteCallCount++;
                            return {
                                eq: vi.fn().mockResolvedValue({
                                    error: null,
                                }),
                            };
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "DELETE",
        });

        const response = await DELETE(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 500 on database deletion error", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as any);

        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "custom_domains") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockDomain,
                            error: null,
                        }),
                        delete: vi.fn(() => ({
                            eq: vi.fn().mockResolvedValue({
                                error: { message: "Database error" },
                            }),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "DELETE",
        });

        const response = await DELETE(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to delete domain");
    });

    it("should work when Vercel credentials not configured", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        delete process.env.VERCEL_TOKEN;

        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "custom_domains") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockDomain,
                            error: null,
                        }),
                        delete: vi.fn(() => ({
                            eq: vi.fn().mockResolvedValue({
                                error: null,
                            }),
                        })),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "DELETE",
        });

        const response = await DELETE(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should handle authentication errors", async () => {
        vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

        const request = createMockRequest({
            method: "DELETE",
        });

        const response = await DELETE(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        await parseJsonResponse<{ error?: string }>(response);

        expect(response.status).toBe(500);
    });
});
