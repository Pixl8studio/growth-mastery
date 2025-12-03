/**
 * Variant Approve API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/variants/[variantId]/approve/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "user-123" } },
                error: null,
            })),
        },
        from: vi.fn(() => ({
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn(() => ({
                            data: {
                                id: "variant-123",
                                approval_status: "approved",
                            },
                            error: null,
                        })),
                    })),
                })),
            })),
        })),
    })),
}));

describe("POST /api/marketing/variants/[variantId]/approve", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("approves variant successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/variants/variant-123/approve",
            {
                method: "POST",
                body: JSON.stringify({
                    notes: "Looks good!",
                }),
            }
        );

        const context = { params: Promise.resolve({ variantId: "variant-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.variant.approval_status).toBe("approved");
    });

    it("returns 401 for unauthenticated requests", async () => {
        vi.mocked(await import("@/lib/supabase/server")).createClient = vi.fn(
            () =>
                ({
                    auth: {
                        getUser: vi.fn(() => ({
                            data: { user: null },
                            error: null,
                        })),
                    },
                }) as any
        );

        const request = new NextRequest(
            "http://localhost/api/marketing/variants/variant-123/approve",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const context = { params: Promise.resolve({ variantId: "variant-123" }) };
        const response = await POST(request, context);

        expect(response.status).toBe(401);
    });
});
