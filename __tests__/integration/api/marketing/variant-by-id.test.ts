/**
 * Variant By ID API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/marketing/variants/[variantId]/route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/marketing/preflight-service", () => ({
    runPreflightValidation: vi.fn(() =>
        Promise.resolve({
            success: true,
            result: { passed: true, issues: [] },
        })
    ),
    createPreflightStatus: vi.fn((result) => result),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "user-123" } },
                error: null,
            })),
        },
        from: vi.fn((table: string) => {
            if (table === "marketing_post_variants") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: {
                                    id: "variant-123",
                                    user_id: "user-123",
                                    platform: "instagram",
                                    content_brief_id: "brief-123",
                                },
                                error: null,
                            })),
                        })),
                    })),
                    update: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(() => ({
                                    data: { id: "variant-123" },
                                    error: null,
                                })),
                            })),
                        })),
                    })),
                };
            }
            if (table === "marketing_content_briefs") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: { marketing_profile_id: "profile-123" },
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            return {};
        }),
    })),
}));

describe("GET /api/marketing/variants/[variantId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns variant successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/variants/variant-123"
        );
        const context = { params: Promise.resolve({ variantId: "variant-123" }) };
        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.variant).toBeDefined();
    });

    it("returns 404 when variant not found", async () => {
        vi.mocked(createClient).mockReturnValue({
            auth: {
                getUser: vi.fn(() => ({
                    data: { user: { id: "user-123" } },
                    error: null,
                })),
            },
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn(() => ({
                            data: null,
                            error: new Error("Not found"),
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest(
            "http://localhost/api/marketing/variants/variant-123"
        );
        const context = { params: Promise.resolve({ variantId: "variant-123" }) };
        const response = await GET(request, context);

        expect(response.status).toBe(404);
    });
});

describe("PUT /api/marketing/variants/[variantId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("updates variant successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/variants/variant-123",
            {
                method: "PUT",
                body: JSON.stringify({
                    copy_text: "Updated copy",
                }),
            }
        );

        const context = { params: Promise.resolve({ variantId: "variant-123" }) };
        const response = await PUT(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
