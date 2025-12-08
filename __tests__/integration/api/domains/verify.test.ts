import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/domains/[domainId]/verify/route";
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

describe("POST /api/domains/[domainId]/verify", () => {
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

    it("should verify domain successfully when properly configured", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
                verified: true,
                configuration: {
                    configuredBy: "CNAME",
                },
            }),
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
                        update: vi.fn(() => ({
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
            method: "POST",
        });

        const response = await POST(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{
            verified: boolean;
            status: string;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.verified).toBe(true);
        expect(data.status).toBe("verified");
    });

    it("should return pending status when domain not yet configured", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
                verified: true,
                configuration: null,
            }),
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
                        update: vi.fn(() => ({
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
            method: "POST",
        });

        const response = await POST(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{
            verified: boolean;
            status: string;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.verified).toBe(false);
        expect(data.status).toBe("pending");
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
            method: "POST",
        });

        const response = await POST(request, {
            params: Promise.resolve({ domainId: "nonexistent" }),
        });
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("Domain not found");
    });

    it("should return 500 when Vercel credentials not configured", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);
        delete process.env.VERCEL_TOKEN;

        const request = createMockRequest({
            method: "POST",
        });

        const response = await POST(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Domain service not configured");
    });

    it("should return 500 when Vercel API check fails", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        vi.mocked(global.fetch).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Vercel error" }),
        } as any);

        const mockSupabase = {
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockDomain,
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
        });

        const response = await POST(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to check verification status");
    });

    it("should handle A record configuration", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
                verified: true,
                configuration: {
                    configuredBy: "A",
                },
            }),
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
                        update: vi.fn(() => ({
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
            method: "POST",
        });

        const response = await POST(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{
            verified: boolean;
            status: string;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.verified).toBe(true);
        expect(data.status).toBe("verified");
    });

    it("should return 500 when database update fails", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
                verified: true,
                configuration: {
                    configuredBy: "CNAME",
                },
            }),
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
                        update: vi.fn(() => ({
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
            method: "POST",
        });

        const response = await POST(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to update verification");
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
            method: "POST",
        });

        const response = await POST(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("Domain not found");
    });

    it("should handle authentication errors", async () => {
        vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

        const request = createMockRequest({
            method: "POST",
        });

        const response = await POST(request, {
            params: Promise.resolve({ domainId: "domain-123" }),
        });
        const data = await parseJsonResponse<{ error?: string }>(response);

        expect(response.status).toBe(500);
    });
});
