/**
 * Email Domain Verification API Tests
 *
 * Tests for POST /api/email-domains/[domainId]/verify
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/email-domains/[domainId]/verify/route";
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

describe("POST /api/email-domains/[domainId]/verify", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockDomainId = "domain-123";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should verify domain successfully when DNS records are valid", async () => {
        const mockDomain = {
            id: mockDomainId,
            user_id: "user-123",
            full_domain: "mail.example.com",
            verification_status: "pending",
        };

        const mockUpdatedDomain = {
            ...mockDomain,
            verification_status: "verified",
            verified_at: expect.any(String),
            last_checked_at: expect.any(String),
        };

        const selectMock = vi.fn().mockReturnThis();
        const updateSingleMock = vi.fn().mockResolvedValue({
            data: mockUpdatedDomain,
            error: null,
        });

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
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            select: selectMock.mockReturnValue({
                                single: updateSingleMock,
                            }),
                        }),
                    }),
                }),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const mockMailgunProvider = {
            verifyDomain: vi.fn().mockResolvedValue({
                verified: true,
                dns_records: [
                    { record_type: "TXT", valid: true },
                    { record_type: "CNAME", valid: true },
                ],
            }),
        };
        vi.mocked(getMailgunProvider).mockResolvedValue(mockMailgunProvider as any);

        const request = createMockRequest({
            method: "POST",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}/verify`,
        });

        const response = await POST(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{
            success: boolean;
            domain: typeof mockUpdatedDomain;
            verification: {
                verified: boolean;
                dns_records: { record_type: string; valid: boolean }[];
            };
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.verification.verified).toBe(true);
        expect(data.verification.dns_records).toHaveLength(2);
        expect(mockMailgunProvider.verifyDomain).toHaveBeenCalledWith(
            "mail.example.com"
        );
    });

    it("should return pending status when DNS records are not valid", async () => {
        const mockDomain = {
            id: mockDomainId,
            user_id: "user-123",
            full_domain: "mail.example.com",
            verification_status: "pending",
        };

        const mockUpdatedDomain = {
            ...mockDomain,
            verification_status: "pending",
            last_checked_at: expect.any(String),
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
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: mockUpdatedDomain,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const mockMailgunProvider = {
            verifyDomain: vi.fn().mockResolvedValue({
                verified: false,
                dns_records: [
                    { record_type: "TXT", valid: false },
                    { record_type: "CNAME", valid: true },
                ],
            }),
        };
        vi.mocked(getMailgunProvider).mockResolvedValue(mockMailgunProvider as any);

        const request = createMockRequest({
            method: "POST",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}/verify`,
        });

        const response = await POST(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{
            success: boolean;
            verification: { verified: boolean };
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.verification.verified).toBe(false);
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
            method: "POST",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}/verify`,
        });

        const response = await POST(
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
            method: "POST",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}/verify`,
        });

        const response = await POST(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 503 when Mailgun is not configured", async () => {
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
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
        vi.mocked(getMailgunProvider).mockResolvedValue(null);

        const request = createMockRequest({
            method: "POST",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}/verify`,
        });

        const response = await POST(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(503);
        expect(data.error).toBe("Mailgun not configured");
    });

    it("should return 500 when Mailgun verification fails", async () => {
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
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const mockMailgunProvider = {
            verifyDomain: vi.fn().mockResolvedValue(null),
        };
        vi.mocked(getMailgunProvider).mockResolvedValue(mockMailgunProvider as any);

        const request = createMockRequest({
            method: "POST",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}/verify`,
        });

        const response = await POST(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to verify domain");
    });

    it("should handle database update error", async () => {
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
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi
                                    .fn()
                                    .mockRejectedValue(
                                        new Error("Database update failed")
                                    ),
                            }),
                        }),
                    }),
                }),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const mockMailgunProvider = {
            verifyDomain: vi.fn().mockResolvedValue({
                verified: true,
                dns_records: [{ record_type: "TXT", valid: true }],
            }),
        };
        vi.mocked(getMailgunProvider).mockResolvedValue(mockMailgunProvider as any);

        const request = createMockRequest({
            method: "POST",
            url: `http://localhost:3000/api/email-domains/${mockDomainId}/verify`,
        });

        const response = await POST(
            request,
            createRouteContext({ domainId: mockDomainId })
        );
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to verify email domain");
    });
});
