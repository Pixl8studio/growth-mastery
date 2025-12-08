import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/domains/route";
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

describe("POST /api/domains", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.VERCEL_TOKEN = "test-token";
        process.env.VERCEL_PROJECT_ID = "test-project-id";
    });

    it("should add a custom domain successfully", async () => {
        const mockDomain = {
            id: "domain-123",
            domain: "example.com",
            user_id: "user-123",
            funnel_project_id: "project-123",
        };

        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ id: "vercel-domain-id" }),
        } as any);

        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockDomain,
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "example.com",
                funnelProjectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            domain: { id: string; domain: string; verified?: boolean };
            dnsInstructions: { type: string; host: string; value: string }[];
        }>(response);

        expect(response.status).toBe(200);
        expect(data.domain).toBeDefined();
        expect(data.dnsInstructions).toBeDefined();
    });

    it("should return 400 for invalid domain format", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "invalid domain!",
                funnelProjectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Invalid domain format");
    });

    it("should return 500 when Vercel credentials not configured", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);
        delete process.env.VERCEL_TOKEN;

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "example.com",
                funnelProjectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Domain service not configured");
    });

    it("should return 400 when Vercel API fails", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        vi.mocked(global.fetch).mockResolvedValue({
            ok: false,
            json: async () => ({ error: { message: "Domain already exists" } }),
        } as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "example.com",
                funnelProjectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toContain("Domain already exists");
    });

    it("should return 500 on database save error", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ id: "vercel-domain-id" }),
        } as any);

        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "example.com",
                funnelProjectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to save domain");
    });

    it("should handle authentication errors", async () => {
        vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "example.com",
                funnelProjectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error?: string }>(response);

        expect(response.status).toBe(500);
    });
});

describe("GET /api/domains", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return all domains for authenticated user", async () => {
        const mockDomains = [
            { id: "domain-1", domain: "example1.com", verified: true },
            { id: "domain-2", domain: "example2.com", verified: false },
        ];

        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        const mockSupabase = {
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockDomains,
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/domains",
        });

        const response = await GET();
        const data = await parseJsonResponse<{
            domains: Array<{ id: string; domain: string; verified: boolean }>;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.domains).toHaveLength(2);
    });

    it("should return empty array when user has no domains", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        const mockSupabase = {
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const response = await GET();
        const data = await parseJsonResponse<{
            domains: Array<{ id: string; domain: string; verified: boolean }>;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.domains).toHaveLength(0);
    });

    it("should return 500 on database error", async () => {
        vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

        const mockSupabase = {
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const response = await GET();
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch domains");
    });

    it("should handle authentication errors", async () => {
        vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

        const response = await GET();
        const data = await parseJsonResponse<{ error?: string }>(response);

        expect(response.status).toBe(500);
    });
});
