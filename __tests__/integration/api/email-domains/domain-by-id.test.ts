/**
 * Email Domain by ID API Tests
 *
 * Tests for GET /api/email-domains/[domainId] and DELETE /api/email-domains/[domainId]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, DELETE } from "@/app/api/email-domains/[domainId]/route";
import {
    createMockRequest,
    parseJsonResponse,
    createRouteContext,
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

vi.mock("@sentry/nextjs", () => ({
    captureException: vi.fn(),
}));

vi.mock("@/lib/followup/providers/mailgun-provider", () => ({
    getMailgunProvider: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getMailgunProvider } from "@/lib/followup/providers/mailgun-provider";

describe("GET /api/email-domains/[domainId]", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockDomainId = "domain-123";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return domain details for authenticated user", async () => {
        const mockDomain = {
            id: mockDomainId,
            user_id: "user-123",
            domain: "example.com",
            subdomain: "mail",
            full_domain: "mail.example.com",
            verification_status: "verified",
            sender_email: "noreply@mail.example.com",
        };

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockDomain,
                    error: null,
                }),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "GET",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}`,
        });

        const response = await GET(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{
            success: boolean;
            domain: typeof mockDomain;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.domain.id).toBe(mockDomainId);
        expect(data.domain.full_domain).toBe("mail.example.com");
    });

    it("should return 404 when domain not found", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                }),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "GET",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}`,
        });

        const response = await GET(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(404);
        expect(data.error).toBe("Domain not found");
    });

    it("should return 401 when not authenticated", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "Not authenticated" },
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "GET",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}`,
        });

        const response = await GET(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when domain belongs to another user", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null, // RLS filters out domains from other users
                    error: { code: "PGRST116" },
                }),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "GET",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}`,
        });

        const response = await GET(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(404);
        expect(data.error).toBe("Domain not found");
    });
});

describe("DELETE /api/email-domains/[domainId]", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockDomainId = "domain-123";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should delete domain successfully", async () => {
        const mockDomain = {
            id: mockDomainId,
            user_id: "user-123",
            full_domain: "mail.example.com",
        };

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockDomain,
                    error: null,
                }),
                delete: vi.fn().mockReturnThis(),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const mockMailgunProvider = {
            deleteDomain: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(getMailgunProvider).mockResolvedValue(mockMailgunProvider as any);

        const request = createMockRequest({
            method: "DELETE",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}`,
        });

        const response = await DELETE(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockMailgunProvider.deleteDomain).toHaveBeenCalledWith(
            "mail.example.com"
        );
    });

    it("should return 404 when domain not found", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                }),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "DELETE",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}`,
        });

        const response = await DELETE(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(404);
        expect(data.error).toBe("Domain not found");
    });

    it("should return 401 when not authenticated", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "Not authenticated" },
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "DELETE",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}`,
        });

        const response = await DELETE(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should still delete from database if Mailgun provider not available", async () => {
        const mockDomain = {
            id: mockDomainId,
            user_id: "user-123",
            full_domain: "mail.example.com",
        };

        // Create a query builder that handles both select/single and delete chains
        const eqFn = vi.fn();
        const mockQueryBuilder = {
            select: vi.fn().mockReturnThis(),
            eq: eqFn,
            single: vi.fn().mockResolvedValue({
                data: mockDomain,
                error: null,
            }),
            delete: vi.fn().mockReturnThis(),
        };
        // Chain eq returns self for select path, resolved value for delete path
        eqFn.mockImplementation(() => mockQueryBuilder);
        // Override eq to resolve for delete chain
        mockQueryBuilder.delete.mockReturnValue({
            eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        });

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
            from: vi.fn().mockReturnValue(mockQueryBuilder),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getMailgunProvider).mockResolvedValue(null);

        const request = createMockRequest({
            method: "DELETE",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}`,
        });

        const response = await DELETE(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should handle database delete error", async () => {
        const mockDomain = {
            id: mockDomainId,
            user_id: "user-123",
            full_domain: "mail.example.com",
        };

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockDomain,
                    error: null,
                }),
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        error: { message: "Delete failed" },
                    }),
                }),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getMailgunProvider).mockResolvedValue(null);

        const request = createMockRequest({
            method: "DELETE",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}`,
        });

        const response = await DELETE(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to delete email domain");
    });
});
