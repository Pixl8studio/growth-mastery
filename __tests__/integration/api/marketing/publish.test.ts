/**
 * Publish API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/publish/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/marketing/publisher-service", () => ({
    publishNow: vi.fn(() =>
        Promise.resolve({
            success: true,
            providerPostId: "post-123",
            platformUrl: "https://platform.com/post/123",
        })
    ),
}));

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
                    single: vi.fn(() => ({
                        data: { user_id: "user-123", platform: "instagram" },
                        error: null,
                    })),
                })),
            })),
        })),
    })),
}));

describe("POST /api/marketing/publish", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("publishes content successfully", async () => {
        const request = new NextRequest("http://localhost/api/marketing/publish", {
            method: "POST",
            body: JSON.stringify({
                post_variant_id: "variant-123",
                platform: "instagram",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.provider_post_id).toBe("post-123");
    });

    it("returns 400 when post_variant_id is missing", async () => {
        const request = new NextRequest("http://localhost/api/marketing/publish", {
            method: "POST",
            body: JSON.stringify({ platform: "instagram" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("post_variant_id is required");
    });

    it("returns 400 when platform is missing", async () => {
        const request = new NextRequest("http://localhost/api/marketing/publish", {
            method: "POST",
            body: JSON.stringify({ post_variant_id: "variant-123" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("platform is required");
    });
});
