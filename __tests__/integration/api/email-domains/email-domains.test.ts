/**
 * Email Domains API Tests
 *
 * Tests for POST /api/email-domains and GET /api/email-domains
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/email-domains/route";
import {
    createMockRequest,
    createMockRequestWithParams,
    parseJsonResponse,
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

describe("POST /api/email-domains", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should create email domain successfully", async () => {
        const mockDomain = {
            id: "domain-123",
            domain: "example.com",
            subdomain: "mail",
            full_domain: "mail.example.com",
            user_id: "user-123",
            verification_status: "pending",
            sender_email: "noreply@mail.example.com",
        };

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
            from: vi.fn().mockImplementation((table: string) => {
                if (table === "email_domains") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { code: "PGRST116" }, // Not found
                        }),
                        insert: vi.fn().mockReturnThis(),
                    };
                }
                return {};
            }),
        };

        // Setup insert chain
        const insertMock = vi.fn().mockReturnThis();
        const selectMock = vi.fn().mockReturnThis();
        const singleMock = vi.fn().mockResolvedValue({
            data: mockDomain,
            error: null,
        });

        mockSupabase.from = vi.fn().mockImplementation((table: string) => {
            if (table === "email_domains") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: "PGRST116" },
                    }),
                    insert: vi.fn().mockReturnValue({
                        select: selectMock.mockReturnValue({
                            single: singleMock,
                        }),
                    }),
                };
            }
            return {};
        });

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        // Mock Mailgun provider
        const mockMailgunProvider = {
            createDomain: vi.fn().mockResolvedValue({
                domain: { name: "mail.example.com" },
                sending_dns_records: [
                    {
                        record_type: "TXT",
                        value: "v=spf1 include:mailgun.org ~all",
                        name: "mail.example.com",
                    },
                    {
                        record_type: "TXT",
                        value: "k=rsa; p=MIGfMA0GCSq...",
                        name: "k1._domainkey.mail.example.com",
                    },
                ],
                receiving_dns_records: [],
            }),
        };

        vi.mocked(getMailgunProvider).mockResolvedValue(mockMailgunProvider as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "example.com",
                subdomain: "mail",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            success: boolean;
            domain: typeof mockDomain;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.domain).toBeDefined();
    });

    it("should return 400 for invalid domain format", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "invalid domain!",
                subdomain: "mail",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(400);
        expect(data.error).toBe("Invalid domain format");
    });

    it("should return 400 for invalid subdomain format", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "example.com",
                subdomain: "invalid subdomain!",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(400);
        expect(data.error).toBe("Invalid subdomain format");
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
            body: {
                domain: "example.com",
                subdomain: "mail",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when domain already exists", async () => {
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
                    data: { id: "existing-domain-id" },
                    error: null,
                }),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "example.com",
                subdomain: "mail",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(400);
        expect(data.error).toBe("Domain already exists");
    });

    it("should return 503 when Mailgun is not configured", async () => {
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
        vi.mocked(getMailgunProvider).mockResolvedValue(null);

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "example.com",
                subdomain: "mail",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(503);
        expect(data.error).toBe("Mailgun not configured");
    });

    it("should return 404 when funnel project not found", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
            from: vi.fn().mockImplementation((table: string) => {
                if (table === "email_domains") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { code: "PGRST116" },
                        }),
                    };
                }
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { code: "PGRST116" },
                        }),
                    };
                }
                return {};
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "example.com",
                subdomain: "mail",
                funnel_project_id: "nonexistent-project",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(404);
        expect(data.error).toBe("Funnel not found");
    });

    it("should return 500 when Mailgun domain creation fails", async () => {
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

        const mockMailgunProvider = {
            createDomain: vi.fn().mockResolvedValue(null),
        };
        vi.mocked(getMailgunProvider).mockResolvedValue(mockMailgunProvider as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                domain: "example.com",
                subdomain: "mail",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to create domain in Mailgun");
    });
});

describe("GET /api/email-domains", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // TODO: Fix mock - route uses query reassignment pattern (let query = ...; query = query.or(...))
    // that requires the query builder to be both chainable and thenable after .order()
    it.skip("should return all domains for authenticated user", async () => {
        const mockDomains = [
            {
                id: "domain-1",
                domain: "example1.com",
                subdomain: "mail",
                full_domain: "mail.example1.com",
                verification_status: "verified",
            },
            {
                id: "domain-2",
                domain: "example2.com",
                subdomain: "email",
                full_domain: "email.example2.com",
                verification_status: "pending",
            },
        ];

        // Create a query builder that is both chainable and awaitable
        // by mixing a mock object with Promise.prototype methods
        const createQueryBuilder = (resolveData: unknown) => {
            const promise = Promise.resolve({ data: resolveData, error: null });
            const builder = Object.assign(promise, {
                select: vi.fn(),
                eq: vi.fn(),
                or: vi.fn(),
                order: vi.fn(),
            });
            builder.select.mockReturnValue(builder);
            builder.eq.mockReturnValue(builder);
            builder.or.mockReturnValue(builder);
            builder.order.mockReturnValue(builder);
            return builder;
        };

        const mockQueryBuilder = createQueryBuilder(mockDomains);

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

        const request = createMockRequest({
            method: "GET",
            url: "http://localhost:3000/api/email-domains",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{
            success: boolean;
            domains: typeof mockDomains;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.domains).toHaveLength(2);
    });

    // TODO: Fix mock - same issue as above
    it.skip("should filter domains by funnel_project_id", async () => {
        const mockDomains = [
            {
                id: "domain-1",
                domain: "example.com",
                funnel_project_id: "project-123",
                verification_status: "verified",
            },
        ];

        // Create a query builder that is both chainable and awaitable
        const createQueryBuilder = (resolveData: unknown) => {
            const promise = Promise.resolve({ data: resolveData, error: null });
            const builder = Object.assign(promise, {
                select: vi.fn(),
                eq: vi.fn(),
                or: vi.fn(),
                order: vi.fn(),
            });
            builder.select.mockReturnValue(builder);
            builder.eq.mockReturnValue(builder);
            builder.or.mockReturnValue(builder);
            builder.order.mockReturnValue(builder);
            return builder;
        };

        const mockQueryBuilder = createQueryBuilder(mockDomains);

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

        const request = createMockRequestWithParams(
            "http://localhost:3000/api/email-domains",
            { funnel_project_id: "project-123" }
        );

        const response = await GET(request);
        const data = await parseJsonResponse<{
            success: boolean;
            domains: typeof mockDomains;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.domains).toHaveLength(1);
        expect(mockSupabase.from).toHaveBeenCalledWith("email_domains");
    });

    // TODO: Fix mock - same issue as above
    it.skip("should return empty array when user has no domains", async () => {
        // Create a query builder that is both chainable and awaitable
        const createQueryBuilder = (resolveData: unknown) => {
            const promise = Promise.resolve({ data: resolveData, error: null });
            const builder = Object.assign(promise, {
                select: vi.fn(),
                eq: vi.fn(),
                or: vi.fn(),
                order: vi.fn(),
            });
            builder.select.mockReturnValue(builder);
            builder.eq.mockReturnValue(builder);
            builder.or.mockReturnValue(builder);
            builder.order.mockReturnValue(builder);
            return builder;
        };

        const mockQueryBuilder = createQueryBuilder([]);

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

        const request = createMockRequest({
            method: "GET",
            url: "http://localhost:3000/api/email-domains",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{
            success: boolean;
            domains: unknown[];
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.domains).toHaveLength(0);
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
            url: "http://localhost:3000/api/email-domains",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    // TODO: Fix mock - same issue as above
    it.skip("should return 500 on database error", async () => {
        // Create a query builder that resolves with an error (Supabase pattern)
        const createQueryBuilderWithDbError = () => {
            const promise = Promise.resolve({
                data: null,
                error: { message: "Database error", code: "PGRST500" },
            });
            const builder = Object.assign(promise, {
                select: vi.fn(),
                eq: vi.fn(),
                or: vi.fn(),
                order: vi.fn(),
            });
            builder.select.mockReturnValue(builder);
            builder.eq.mockReturnValue(builder);
            builder.or.mockReturnValue(builder);
            builder.order.mockReturnValue(builder);
            return builder;
        };

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
            from: vi.fn().mockReturnValue(createQueryBuilderWithDbError()),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "GET",
            url: "http://localhost:3000/api/email-domains",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{ success: boolean; error: string }>(
            response
        );

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to list email domains");
    });
});
