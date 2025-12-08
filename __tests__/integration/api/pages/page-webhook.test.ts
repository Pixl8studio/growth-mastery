/**
 * Page Webhook API Integration Tests
 * Tests webhook configuration management for individual pages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, POST } from "@/app/api/pages/[pageId]/webhook/route";
import { NextRequest } from "next/server";

// Mock webhook service
vi.mock("@/lib/webhook-service", () => ({
    getWebhookConfig: vi.fn(async () => ({
        enabled: true,
        url: "https://webhook.example.com/endpoint",
        secret: "test-secret",
        isInherited: false,
    })),
    sendWebhookDirect: vi.fn(async () => ({
        success: true,
        statusCode: 200,
        error: null,
    })),
    buildRegistrationPayload: vi.fn((data) => data),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
        })),
    },
}));

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        auth: {
            getUser: vi.fn(async () => ({
                data: {
                    user: { id: "test-user-id", email: "test@example.com" },
                },
                error: null,
            })),
        },
        from: vi.fn((table) => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(async () => ({
                        data: {
                            id: "test-page-id",
                            user_id: "test-user-id",
                            webhook_enabled: true,
                            webhook_url: "https://webhook.example.com/endpoint",
                            webhook_secret: "test-secret",
                            webhook_inherit_global: false,
                            headline: "Test Page",
                        },
                        error: null,
                    })),
                })),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(async () => ({
                    data: { id: "test-page-id" },
                    error: null,
                })),
            })),
        })),
    })),
}));

describe("GET /api/pages/[pageId]/webhook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should get webhook configuration successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook?pageType=registration"
        );

        const response = await GET(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.pageConfig).toBeDefined();
        expect(data.effectiveConfig).toBeDefined();
    });

    it("should return 400 when pageType is missing", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook"
        );

        const response = await GET(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("pageType");
    });

    it("should return 400 when pageType is invalid", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook?pageType=invalid"
        );

        const response = await GET(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("pageType");
    });

    it("should return 401 when user is not authenticated", async () => {
        vi.mocked(
            (await import("@/lib/supabase/server")).createClient
        ).mockResolvedValueOnce({
            auth: {
                getUser: vi.fn(async () => ({
                    data: { user: null },
                    error: { message: "Unauthorized" },
                })),
            },
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook?pageType=registration"
        );

        const response = await GET(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Not authenticated");
    });

    it("should return 404 when page is not found", async () => {
        vi.mocked(
            (await import("@/lib/supabase/server")).createClient
        ).mockResolvedValueOnce({
            auth: {
                getUser: vi.fn(async () => ({
                    data: {
                        user: { id: "test-user-id" },
                    },
                    error: null,
                })),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn(async () => ({
                            data: null,
                            error: { message: "Not found" },
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook?pageType=registration"
        );

        const response = await GET(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(404);
    });
});

describe("PUT /api/pages/[pageId]/webhook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should update webhook configuration successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook",
            {
                method: "PUT",
                body: JSON.stringify({
                    pageType: "registration",
                    webhook_enabled: true,
                    webhook_url: "https://new-webhook.example.com/endpoint",
                    webhook_secret: "new-secret",
                    webhook_inherit_global: false,
                }),
            }
        );

        const response = await PUT(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.pageConfig).toBeDefined();
        expect(data.effectiveConfig).toBeDefined();
    });

    it("should return 400 when webhook URL is invalid", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook",
            {
                method: "PUT",
                body: JSON.stringify({
                    pageType: "registration",
                    webhook_enabled: true,
                    webhook_url: "not-a-valid-url",
                    webhook_inherit_global: false,
                }),
            }
        );

        const response = await PUT(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("URL");
    });

    it("should allow inheriting global webhook configuration", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook",
            {
                method: "PUT",
                body: JSON.stringify({
                    pageType: "registration",
                    webhook_inherit_global: true,
                }),
            }
        );

        const response = await PUT(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 401 when user does not own the page", async () => {
        vi.mocked(
            (await import("@/lib/supabase/server")).createClient
        ).mockResolvedValueOnce({
            auth: {
                getUser: vi.fn(async () => ({
                    data: {
                        user: { id: "test-user-id" },
                    },
                    error: null,
                })),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn(async () => ({
                            data: {
                                id: "test-page-id",
                                user_id: "different-user-id",
                            },
                            error: null,
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook",
            {
                method: "PUT",
                body: JSON.stringify({
                    pageType: "registration",
                    webhook_enabled: true,
                }),
            }
        );

        const response = await PUT(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toContain("authorized");
    });
});

describe("POST /api/pages/[pageId]/webhook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should test webhook successfully", async () => {
        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook",
            {
                method: "POST",
                body: JSON.stringify({
                    pageType: "registration",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.statusCode).toBe(200);
    });

    it("should return 400 when webhook is not configured", async () => {
        vi.mocked(
            (await import("@/lib/webhook-service")).getWebhookConfig
        ).mockResolvedValueOnce({
            enabled: false,
            url: null,
            secret: null,
            isInherited: false,
        });

        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook",
            {
                method: "POST",
                body: JSON.stringify({
                    pageType: "registration",
                }),
            }
        );

        const response = await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.notConfigured).toBe(true);
    });

    it("should include webhook test payload", async () => {
        const buildPayloadMock = vi.mocked(
            (await import("@/lib/webhook-service")).buildRegistrationPayload
        );

        const request = new NextRequest(
            "http://localhost:3000/api/pages/test-page-id/webhook",
            {
                method: "POST",
                body: JSON.stringify({
                    pageType: "registration",
                }),
            }
        );

        await POST(request, {
            params: Promise.resolve({ pageId: "test-page-id" }),
        });

        expect(buildPayloadMock).toHaveBeenCalledWith(
            expect.objectContaining({
                email: "test@example.com",
                name: "Test User",
                pageId: "test-page-id",
            })
        );
    });
});
