import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/contacts/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        })),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock("@/lib/webhook-service", () => ({
    sendWebhook: vi.fn(),
    buildRegistrationPayload: vi.fn(() => ({})),
}));

import { createClient } from "@/lib/supabase/server";

describe("GET /api/contacts", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return contacts for authenticated user", async () => {
        const mockContacts = [
            { id: "contact-1", email: "contact1@example.com", name: "Contact 1" },
            { id: "contact-2", email: "contact2@example.com", name: "Contact 2" },
        ];

        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                range: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockContacts,
                    error: null,
                    count: 2,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/contacts?page=1&pageSize=10",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{
            success: boolean;
            contacts: Array<{ id: string; email: string; name?: string }>;
            pagination: { total: number; page: number; pageSize: number };
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.contacts).toHaveLength(2);
        expect(data.pagination.total).toBe(2);
    });

    it("should return 401 for unauthenticated users", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "Unauthorized" },
                }),
            },
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/contacts",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should filter contacts by funnelProjectId", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => {
                const queryChain = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    range: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                        count: 0,
                    }),
                };
                return queryChain;
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/contacts?funnelProjectId=project-123",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{
            success: boolean;
            contacts: Array<{ id: string; email: string }>;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should filter contacts by stage", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                range: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/contacts?stage=registered",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{
            success: boolean;
            contacts: Array<{ id: string; email: string }>;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should search contacts by email or name", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                range: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/contacts?search=john",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{
            success: boolean;
            contacts: Array<{ id: string; email: string }>;
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 500 on database error", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi
                    .fn()
                    .mockResolvedValue({ data: { user: mockUser }, error: null }),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                range: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                    count: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            url: "http://localhost:3000/api/contacts",
        });

        const response = await GET(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch contacts");
    });
});

describe("POST /api/contacts", () => {
    const mockProject = { user_id: "user-123" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should create contact with valid data", async () => {
        const mockContact = {
            id: "contact-123",
            email: "new@example.com",
            name: "New Contact",
            funnel_project_id: "project-123",
        };

        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockProject,
                            error: null,
                        }),
                    };
                }
                if (table === "contacts") {
                    return {
                        upsert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockContact,
                            error: null,
                        }),
                    };
                }
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { name: "Test Project", slug: "test-project" },
                            error: null,
                        }),
                    };
                }
                if (table === "user_profiles") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { username: "testuser" },
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                email: "new@example.com",
                name: "New Contact",
                funnelProjectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            success: boolean;
            contact: {
                id: string;
                email: string;
                name?: string;
                funnel_project_id?: string;
            };
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.contact).toBeDefined();
        expect(data.contact.email).toBe("new@example.com");
    });

    it("should return 400 for invalid email", async () => {
        const mockSupabase = {
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                email: "invalid-email",
                name: "Test",
                funnelProjectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing required fields", async () => {
        const mockSupabase = {
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                email: "test@example.com",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Invalid input");
    });

    it("should return 404 when project not found", async () => {
        const mockSupabase = {
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                email: "test@example.com",
                name: "Test",
                funnelProjectId: "nonexistent-project",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("Project not found");
    });

    it("should handle UTM data", async () => {
        const mockContact = {
            id: "contact-123",
            email: "new@example.com",
            name: "New Contact",
        };

        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockProject,
                            error: null,
                        }),
                    };
                }
                if (table === "contacts") {
                    return {
                        upsert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockContact,
                            error: null,
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: {},
                        error: null,
                    }),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                email: "new@example.com",
                name: "New Contact",
                funnelProjectId: "project-123",
                utmData: {
                    source: "facebook",
                    medium: "cpc",
                    campaign: "summer-sale",
                },
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{
            success: boolean;
            contact: { id: string; email: string };
        }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 500 on database error", async () => {
        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "funnel_projects") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockProject,
                            error: null,
                        }),
                    };
                }
                if (table === "contacts") {
                    return {
                        upsert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Database error" },
                        }),
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                email: "test@example.com",
                name: "Test",
                funnelProjectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to create contact");
    });
});
