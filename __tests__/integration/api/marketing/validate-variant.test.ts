/**
 * Validate Variant API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/validate/[variantId]/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "user-123" } },
                error: null,
            })),
        },
    })),
}));

describe("POST /api/marketing/validate/[variantId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("validates variant successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/validate/variant-123",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        );

        const context = { params: Promise.resolve({ variantId: "variant-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.validation_result).toBeDefined();
        expect(data.validation_result.passed).toBe(true);
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
            "http://localhost/api/marketing/validate/variant-123",
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
