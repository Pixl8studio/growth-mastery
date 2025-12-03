/**
 * Approval Queue API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/marketing/variants/approval-queue/route";
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
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                        data: [
                            { id: "variant-1", approval_status: "pending" },
                            { id: "variant-2", approval_status: "pending" },
                        ],
                        error: null,
                    })),
                })),
            })),
        })),
    })),
}));

describe("GET /api/marketing/variants/approval-queue", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns approval queue successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/variants/approval-queue"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.variants).toBeDefined();
        expect(data.variants.length).toBe(2);
    });

    it("filters by approval status", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/variants/approval-queue?approval_status=approved"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("filters by platform", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/variants/approval-queue?platform=instagram"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
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
            "http://localhost/api/marketing/variants/approval-queue"
        );
        const response = await GET(request);

        expect(response.status).toBe(401);
    });
});
