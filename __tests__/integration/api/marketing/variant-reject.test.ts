/**
 * Variant Reject API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/variants/[variantId]/reject/route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
                                approval_status: "rejected",
                            },
                            error: null,
                        })),
                    })),
                })),
            })),
        })),
    })),
}));

describe("POST /api/marketing/variants/[variantId]/reject", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects variant successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/variants/variant-123/reject",
            {
                method: "POST",
                body: JSON.stringify({
                    notes: "Needs revision",
                }),
            }
        );

        const context = { params: Promise.resolve({ variantId: "variant-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.variant.approval_status).toBe("rejected");
    });

    it("returns 401 for unauthenticated requests", async () => {
        vi.mocked(createClient).mockReturnValue({
            auth: {
                getUser: vi.fn(() => ({
                    data: { user: null },
                    error: null,
                })),
            },
        } as any);

        const request = new NextRequest(
            "http://localhost/api/marketing/variants/variant-123/reject",
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
