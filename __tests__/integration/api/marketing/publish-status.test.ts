/**
 * Publish Status API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/marketing/publish/[publishId]/status/route";
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
        from: vi.fn((table: string) => {
            if (table === "marketing_content_calendar") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: {
                                    id: "publish-123",
                                    user_id: "user-123",
                                    publish_status: "published",
                                    post_variant_id: "variant-123",
                                },
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            if (table === "marketing_analytics") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: { views: 100, likes: 10 },
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

describe("GET /api/marketing/publish/[publishId]/status", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns publish status successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/publish/publish-123/status"
        );
        const context = { params: Promise.resolve({ publishId: "publish-123" }) };
        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.entry).toBeDefined();
    });

    it("returns 404 when publish entry not found", async () => {
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
            "http://localhost/api/marketing/publish/publish-123/status"
        );
        const context = { params: Promise.resolve({ publishId: "publish-123" }) };
        const response = await GET(request, context);

        expect(response.status).toBe(404);
    });
});
